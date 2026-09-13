import { unzipSync } from "fflate";
import { loadSwordModule, extractBibleVerses, extractCommentaryEntries, normalizeStrongKey } from "./lib/sword-module";
import { buildAmod } from "./lib/amf";
import { osisToText, tidyPunctuation } from "./lib/osis-text";
import { CANON } from "./lib/canon";

const BOOK_ALIASES: Record<string, string> = {
  GEN: "Gen", EXO: "Exod", EXOD: "Exod", LEV: "Lev", NUM: "Num", DEU: "Deut", DEUT: "Deut",
  JOS: "Josh", JOSH: "Josh", JDG: "Judg", JUDG: "Judg", RUT: "Ruth", RUTH: "Ruth",
  "1SA": "1Sam", "1SAM": "1Sam", "2SA": "2Sam", "2SAM": "2Sam",
  "1KI": "1Kgs", "1KGS": "1Kgs", "2KI": "2Kgs", "2KGS": "2Kgs",
  "1CH": "1Chr", "1CHR": "1Chr", "2CH": "2Chr", "2CHR": "2Chr",
  EZR: "Ezra", EZRA: "Ezra", NEH: "Neh", EST: "Esth", ESTH: "Esth",
  JOB: "Job", PSA: "Ps", PS: "Ps", PRO: "Prov", PROV: "Prov",
  ECC: "Eccl", ECCL: "Eccl", SNG: "Song", SONG: "Song",
  ISA: "Isa", JER: "Jer", LAM: "Lam", EZK: "Ezek", EZEK: "Ezek",
  DAN: "Dan", HOS: "Hos", JOL: "Joel", JOEL: "Joel", AMO: "Amos", AMOS: "Amos",
  OBA: "Obad", OBAD: "Obad", JON: "Jonah", JONAH: "Jonah", MIC: "Mic",
  NAM: "Nah", NAH: "Nah", HAB: "Hab", ZEP: "Zeph", ZEPH: "Zeph",
  HAG: "Hag", ZEC: "Zech", ZECH: "Zech", MAL: "Mal",
  MAT: "Matt", MATT: "Matt", MRK: "Mark", MARK: "Mark", LUK: "Luke", LUKE: "Luke",
  JHN: "John", JOHN: "John", ACT: "Acts", ACTS: "Acts", ROM: "Rom",
  "1CO": "1Cor", "1COR": "1Cor", "2CO": "2Cor", "2COR": "2Cor",
  GAL: "Gal", EPH: "Eph", PHP: "Phil", PHIL: "Phil", COL: "Col",
  "1TH": "1Thess", "1THESS": "1Thess", "2TH": "2Thess", "2THESS": "2Thess",
  "1TI": "1Tim", "1TIM": "1Tim", "2TI": "2Tim", "2TIM": "2Tim",
  TIT: "Titus", TITUS: "Titus", PHM: "Phlm", PHLM: "Phlm",
  HEB: "Heb", JAS: "Jas", "1PE": "1Pet", "1PET": "1Pet",
  "2PE": "2Pet", "2PET": "2Pet", "1JN": "1John", "1JOHN": "1John",
  "2JN": "2John", "2JOHN": "2John", "3JN": "3John", "3JOHN": "3John",
  JUD: "Jude", JUDE: "Jude", REV: "Rev",
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
function parseWantedIds(): string[] {
  const eq = args.find((a) => a.startsWith("--module="));
  if (eq) return [eq.split("=")[1]];
  const sp = args.indexOf("--module");
  if (sp >= 0 && args[sp + 1] && !args[sp + 1].startsWith("--")) return [args[sp + 1]];
  // Por defecto (con o sin --all): todos los módulos no diferidos.
  return defs.filter((d) => !d.deferred).map((d) => d.id);
}
const wanted = parseWantedIds();
void flag;

for (const id of wanted) {
  const def = defs.find((d) => d.id === id);
  if (!def) throw new Error(`Módulo desconocido: ${id}`);
  if (def.ccelKind) {
    console.warn(`[skip] ${id}: ETL manual (usa: bun run import:ccel --module=${id})`);
    continue;
  }
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

  const mod = loadSwordModule(zip, {
    otShift: def.slotShift?.ot ?? 0,
    ntShift: def.slotShift?.nt ?? 0,
  });
  if (def.slotShift) console.log(`slotShift: ot=${def.slotShift.ot ?? 0} nt=${def.slotShift.nt ?? 0}`);
  const about = mod.conf.about.slice(0, 80);
  const tidy = def.textTidy ? tidyPunctuation : (s: string) => s;
  if (def.textTidy) console.log("textTidy: on (artefactos 'palabra ,' → 'palabra,')");

  let manifest;
  let content: any;

  if (def.type === "bible" && mod.kind === "bible") {
    const ex = extractBibleVerses(mod);
    console.log(`versículos: ${ex.verses.length}, headings: ${ex.sections.length}, notas: ${ex.footnotes.length}`);
    content = {
      books: bookRows(),
      verses: ex.verses.map((v) => ({ ...v, text: tidy(v.text) })),
      sections: ex.sections.map((s) => ({ ...s, title: tidy(s.title) })),
      footnotes: ex.footnotes.map((f) => ({ ...f, text: tidy(f.text) })),
    };
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
    if (def.type === "devotion") {
      const missing = keys.filter(
        (k: string) => !mod.entries.some((e: any) => e.key.toLowerCase() === k.toLowerCase()),
      );
      if (missing.length) throw new Error(`Claves esperadas ausentes: ${missing.join(", ")}`);
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
      // Diccionarios/lexicons: dedup case-insensitive, sin @LINK ni vacíos.
      // Con `normalizeKeys: "G"|"H"` (StrongsGreek/StrongsHebrew) la clave se
      // normaliza a estilo normStrong ("00001"→"G1", "00001\"→"H1", "00031A"→"G31a")
      // y puebla la columna strongs; la cabecera "00000" y la intro no-Strong
      // se descartan (documentado en tasks.md, Lote v1.1).
      const normPrefix = def.normalizeKeys === "G" || def.normalizeKeys === "H" ? def.normalizeKeys : null;
      const seen = new Set<string>();
      const entries: { key: string; sortKey: string; strongs: string | null; content: string }[] = [];
      for (const e of mod.entries) {
        let key = e.key;
        let strongs: string | null = null;
        if (normPrefix) {
          const n = normalizeStrongKey(e.key, normPrefix);
          if (!n) continue;
          key = n;
          strongs = n;
        }
        if (!key || seen.has(key.toLowerCase())) continue;
        seen.add(key.toLowerCase());
        if (e.content.startsWith("@LINK")) continue;
        const clean = osisToText(e.content).text;
        if (!clean) continue;
        entries.push({
          key,
          sortKey: key
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase(),
          strongs,
          content: clean,
        });
      }
      const missing = keys.filter(
        (k: string) => !entries.some((e) => e.key.toLowerCase() === k.toLowerCase()),
      );
      if (missing.length) throw new Error(`Claves esperadas ausentes: ${missing.join(", ")}`);
      console.log(`entradas finales: ${entries.length}, con strongs: ${entries.filter((e) => e.strongs).length}`);
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
