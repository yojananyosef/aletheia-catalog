import { unzipSync } from "fflate";
import { loadSwordModule, extractBibleVerses, extractCommentaryEntries } from "./lib/sword-module";
import { buildAmod } from "./lib/amf";
import { osisToText } from "./lib/osis-text";
import { CANON } from "./lib/canon";

const BOOK_ALIASES: Record<string, string> = {
  PSA: "Ps",
  JHN: "John",
  MAT: "Matt",
  MRK: "Mark",
  LUK: "Luke",
  ROM: "Rom",
  EPH: "Eph",
};



const MIRRORS = [
  (m: string) => `https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/${m}.zip`,
  (m: string) => `https://ftp.crosswire.org/pub/sword/packages/rawzip/${m}.zip`,
];

async function downloadModule(name: string, override?: string): Promise<Uint8Array> {
  const urls = override ? [override, ...MIRRORS.map((f) => f(name))] : MIRRORS.map((f) => f(name));
  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      console.log(`descargando ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`No se pudo descargar ${name}: ${lastErr}`);
}

interface Check {
  osis: string;
  chapter: number;
  verse: number;
  contains: string;
}

function parseRef(ref: string): Check {
  const m = /^([A-Z0-9]+)\s+(\d+):(\d+)$/.exec(ref.trim());
  if (!m) throw new Error(`Referencia inválida: ${ref}`);
  return { osis: m[1], chapter: +m[2], verse: +m[3], contains: "" };
}

const defs = (await Bun.file(new URL("./modules-v1.json", import.meta.url)).json()) as any[];
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const wanted = args.some((a) => a.startsWith("--module="))
  ? [args.find((a) => a.startsWith("--module="))!.split("=")[1]]
  : flag("all")
    ? defs.filter((d) => !d.deferred).map((d) => d.id)
    : defs.filter((d) => !d.deferred).map((d) => d.id);

for (const id of wanted) {
  const def = defs.find((d) => d.id === id);
  if (!def) throw new Error(`Módulo desconocido: ${id}`);
  if (def.deferred) {
    console.warn(`[skip] ${id}: ${def.deferred}`);
    continue;
  }
  console.log(`\n=== ${id} (${def.type}, SWORD ${def.swordModule})`);
  const zip = await downloadModule(def.swordModule, def.sourceUrl);
  const files = unzipSync(zip);
  const confName = Object.keys(files).find((k) => /^mods\.d\/[^/]+\.conf$/i.test(k));
  if (!confName) throw new Error("Sin mods.d/*.conf");
  console.log("conf:", confName);

  const mod = loadSwordModule(zip);
  const about = mod.conf.about.slice(0, 80);

  let manifest;
  let content: any;

  if (def.type === "bible" && mod.kind === "bible") {
    const ex = extractBibleVerses(mod);
    console.log(`versículos: ${ex.verses.length}, headings: ${ex.sections.length}, notas: ${ex.footnotes.length}`);
    content = { books: bookRows(), verses: ex.verses, sections: ex.sections, footnotes: ex.footnotes };
    runVerseChecks(def, mod);
    manifest = baseManifest(def);
  } else if (def.type === "commentary" && mod.kind === "bible") {
    const entries = extractCommentaryEntries(mod);
    console.log(`entradas: ${entries.length}`);
    content = { books: bookRows(), verses: entries };
    runVerseChecks(def, mod);
    manifest = baseManifest(def);
  } else if (mod.kind === "dict") {
    const keys = def.checks?.keys ?? [];
    const sample = mod.entries.slice(0, 3).map((e) => e.key);
    console.log(`entradas: ${mod.entries.length}, sample keys: ${JSON.stringify(sample)}`);
    const missing = keys.filter(
      (k: string) => !mod.entries.some((e: any) => e.key.toLowerCase() === k.toLowerCase()),
    );
    if (missing.length) throw new Error(`Claves esperadas ausentes: ${missing.join(", ")}`);
    if (def.type === "devotion") {
      const devotions = mod.entries.map((e) => {
        const m = /^(\d{1,2})[.\-\/](\d{1,2})$/.exec(e.key);
        if (!m) throw new Error(`Clave de devocional no parseable: ${JSON.stringify(e.key)}`);
        
        return {
          month: +m[1],
          day: +m[2],
          title: e.key,
          scripture: null,
          content: osisToText(e.content).text,
        };
      });
      content = { devotions };
      console.log(`devocionales: ${devotions.length}`);
    } else {
      const seen = new Set<string>();
      const entries: { key: string; sortKey: string; strongs: null; content: string }[] = [];
      for (const e of mod.entries) {
        if (!e.key || seen.has(e.key.toLowerCase())) continue;
        seen.add(e.key.toLowerCase());
        if (e.content.startsWith("@LINK")) continue;
        const clean = osisToText(e.content).text;
        if (!clean) continue;
        entries.push({
          key: e.key,
          sortKey: e.key
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase(),
          strongs: null,
          content: clean,
        });
      }
      content = { entries };
    }
    manifest = baseManifest(def);
  } else {
    throw new Error(`Definición ${def.id} tipo ${def.type} incompatible con módulo ${mod.kind}`);
  }

  manifest.features = def.features;
  const build1 = buildAmod(manifest, content);
  const build2 = buildAmod(manifest, content);
  if (build1.sha256 !== build2.sha256) throw new Error(`Build no determinista para ${id}`);
  console.log(`determinista ✓  db=${(build1.dbSize / 1024).toFixed(0)}KB zip=${(build1.bytes.length / 1024).toFixed(0)}KB`);
  await Bun.write(new URL(`../dist/${id}.amod`, import.meta.url).pathname, build1.bytes);
  console.log(`dist/${id}.amod  sha256=${build1.sha256}`);
  console.log(`about: ${about}`);
}

function baseManifest(def: any) {
  return {
    amf: 1 as const,
    schemaVersion: 1 as const,
    minReaderVersion: 1 as const,
    id: def.id,
    type: def.type,
    name: def.name,
    shortName: def.shortName,
    language: def.language,
    direction: def.direction,
    version: def.version,
    publisher: def.publisher,
    license: def.license,
    copyright: def.copyright,
    source: def.source,
    attribution: def.attribution,
    features: def.features,
    dependencies: [] as never[],
  };
}

function bookRows() {
  return CANON.map((b, i) => ({
    bookId: i + 1,
    osisCode: b.osis,
    name: b.name,
    abbreviation: b.abbrev,
    testament: b.testament,
    bookOrder: i + 1,
    chapterCount: b.chapmax,
  }));
}

import { CANON } from "./lib/canon";

function runVerseChecks(def: any, mod: any) {
  const bookIndex = (osis: string) => {
    const normalized = BOOK_ALIASES[osis.toUpperCase()] ?? osis;
    return CANON.findIndex((b) => b.osis.toLowerCase() === normalized.toLowerCase());
  };
  for (const [ref, expected] of Object.entries(def.checks ?? {})) {
    if (ref === "keys") continue;
    const { osis, chapter, verse } = parseRef(ref);
    const gi = bookIndex(osis);
    if (gi < 0) throw new Error(`Libro desconocido en check: ${osis}`);
    const text = osisToText(mod.verseAt(gi, chapter, verse)).text;
    if (!text.includes(expected as string)) {
      throw new Error(`Check ${ref} falló para ${def.id}.\n  esperado: ${expected}\n  real: ${text.slice(0, 200)}`);
    }
  }
  console.log("checks ✓");
}
