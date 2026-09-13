import { buildAmod } from "./lib/amf";
import { CANON } from "./lib/canon";
import {
  APF_TXT_URL, CREEDS_TXT_URL, VINCENT_BASE_URL,
  parseApf, parseCreeds, parseVincentChapter, vincentFileName,
  type CcelEntry,
} from "./lib/ccel";

const BOOK_ALIASES: Record<string, string> = {
  MAT: "Matt", MRK: "Mark", MARK: "Mark", LUK: "Luke", LUKE: "Luke",
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

const VINCENT_EXPECTED_ENTRIES = 5720;
const APF_EXPECTED_ENTRIES = 274;
const CREEDS_EXPECTED_ENTRIES = 330;

async function fetchText(url: string, tries = 4): Promise<{ status: number; text: string }> {
  let lastErr: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return { status: 404, text: "" };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { status: 200, text: await res.text() };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error(`No se pudo descargar ${url}: ${lastErr}`);
}

async function buildVincent(): Promise<{ bookId: number; chapter: number; verse: number; text: string }[]> {
  const ntBooks = CANON.map((b, i) => ({ ...b, bookId: i + 1 })).filter((b) => b.testament === "NT");
  const jobs: { osis: string; bookId: number; chapter: number; url: string }[] = [];
  for (const b of ntBooks) {
    for (let c = 1; c <= b.chapmax; c++) {
      let file: string;
      try {
        file = vincentFileName(b.osis, c);
      } catch {
        continue;
      }
      jobs.push({ osis: b.osis, bookId: b.bookId, chapter: c, url: VINCENT_BASE_URL + file });
    }
  }
  const entries: { bookId: number; chapter: number; verse: number; text: string }[] = [];
  let missing = 0;
  const CONC = 5;
  for (let i = 0; i < jobs.length; i += CONC) {
    const batch = jobs.slice(i, i + CONC);
    const results = await Promise.all(batch.map(async (j) => ({ j, r: await fetchText(j.url) })));
    for (const { j, r } of results) {
      if (r.status === 404) {
        missing++;
        continue;
      }
      for (const v of parseVincentChapter(r.text, j.osis, j.chapter)) {
        entries.push({ bookId: j.bookId, chapter: j.chapter, verse: v.verse, text: v.text });
      }
    }
    if ((i / CONC) % 10 === 0) console.log(`  vincent: ${Math.min(i + CONC, jobs.length)}/${jobs.length} capítulos…`);
  }
  entries.sort((a, b) => a.bookId - b.bookId || a.chapter - b.chapter || a.verse - b.verse);
  console.log(`capítulos sin cobertura: ${missing}, entradas: ${entries.length}`);
  if (entries.length !== VINCENT_EXPECTED_ENTRIES) {
    throw new Error(`VINCENT con ${entries.length} entradas (esperado ${VINCENT_EXPECTED_ENTRIES}): la fuente sacred-texts cambió, revisar`);
  }
  return entries;
}

function toDictEntries(src: CcelEntry[]): { key: string; sortKey: string; strongs: null; content: string }[] {
  const seen = new Set<string>();
  const out: { key: string; sortKey: string; strongs: null; content: string }[] = [];
  for (const e of src) {
    if (!e.content || seen.has(e.key.toLowerCase())) continue;
    seen.add(e.key.toLowerCase());
    out.push({
      key: e.key,
      sortKey: e.key.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
      strongs: null,
      content: e.content,
    });
  }
  return out;
}

const defs = (await Bun.file(new URL("./modules-v1.json", import.meta.url)).json()) as any[];
const args = process.argv.slice(2);
function parseWantedIds(): string[] {
  const eq = args.find((a) => a.startsWith("--module="));
  if (eq) return [eq.split("=")[1]];
  const sp = args.indexOf("--module");
  if (sp >= 0 && args[sp + 1] && !args[sp + 1].startsWith("--")) return [args[sp + 1]];
  return defs.filter((d) => d.ccelKind && !d.deferred).map((d) => d.id);
}
const wanted = parseWantedIds();

for (const id of wanted) {
  const def = defs.find((d) => d.id === id);
  if (!def) throw new Error(`Módulo desconocido: ${id}`);
  if (!def.ccelKind) throw new Error(`${id} no es ETL manual (usa: bun run import --module=${id})`);
  if (def.deferred) {
    console.warn(`[skip] ${id}: ${def.deferred}`);
    continue;
  }
  console.log(`\n=== ${id} (${def.type}, ETL manual ${def.ccelKind})`);

  let manifest = baseManifest(def);
  manifest.features = def.features;
  let content: any;

  if (def.ccelKind === "vincent") {
    const entries = await buildVincent();
    content = { books: bookRows(), verses: entries };
    runVerseChecks(def, entries);
  } else if (def.ccelKind === "apf") {
    const { text } = await fetchText(def.sourceUrl ?? APF_TXT_URL);
    const parsed = parseApf(text);
    console.log(`entradas: ${parsed.length}`);
    if (parsed.length !== APF_EXPECTED_ENTRIES) {
      throw new Error(`APF con ${parsed.length} entradas (esperado ${APF_EXPECTED_ENTRIES}): la fuente CCEL cambió, revisar`);
    }
    const entries = toDictEntries(parsed);
    runKeyChecks(def, entries);
    content = { entries };
  } else if (def.ccelKind === "creeds") {
    const { text } = await fetchText(def.sourceUrl ?? CREEDS_TXT_URL);
    const parsed = parseCreeds(text);
    console.log(`entradas: ${parsed.length}`);
    if (parsed.length !== CREEDS_EXPECTED_ENTRIES) {
      throw new Error(`CREEDS con ${parsed.length} entradas (esperado ${CREEDS_EXPECTED_ENTRIES}): la fuente CCEL cambió, revisar`);
    }
    const entries = toDictEntries(parsed);
    runKeyChecks(def, entries);
    content = { entries };
  } else {
    throw new Error(`ccelKind desconocido: ${def.ccelKind}`);
  }

  const build1 = buildAmod(manifest, content);
  const build2 = buildAmod(manifest, content);
  if (build1.sha256 !== build2.sha256) throw new Error(`Build no determinista para ${id}`);
  console.log(`determinista ✓  db=${(build1.dbSize / 1024).toFixed(0)}KB zip=${(build1.bytes.length / 1024).toFixed(0)}KB`);
  await Bun.write(new URL(`../dist/${id}.amod`, import.meta.url).pathname, build1.bytes);
  console.log(`dist/${id}.amod  sha256=${build1.sha256}`);
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

function runVerseChecks(def: any, entries: { bookId: number; chapter: number; verse: number; text: string }[]) {
  const bookIndex = (osis: string) => {
    const normalized = BOOK_ALIASES[osis.toUpperCase()] ?? osis;
    return CANON.findIndex((b) => b.osis.toLowerCase() === normalized.toLowerCase());
  };
  for (const [ref, expected] of Object.entries(def.checks ?? {})) {
    if (ref === "keys") continue;
    const m = /^([A-Z0-9]+)\s+(\d+):(\d+)$/.exec(ref.trim());
    if (!m) throw new Error(`Referencia inválida: ${ref}`);
    const gi = bookIndex(m[1]);
    if (gi < 0) throw new Error(`Libro desconocido en check: ${m[1]}`);
    const hit = entries.find((e) => e.bookId === gi + 1 && e.chapter === +m[2] && e.verse === +m[3]);
    if (!hit || !hit.text.includes(expected as string)) {
      throw new Error(`Check ${ref} falló para ${def.id}.\n  esperado: ${expected}\n  real: ${hit?.text.slice(0, 200) ?? "(sin entrada)"}`);
    }
  }
  console.log("checks ✓");
}

function runKeyChecks(def: any, entries: { key: string }[]) {
  const keys = def.checks?.keys ?? [];
  const missing = keys.filter(
    (k: string) => !entries.some((e) => e.key.toLowerCase() === k.toLowerCase()),
  );
  if (missing.length) throw new Error(`Claves esperadas ausentes: ${missing.join(", ")}`);
  console.log(`checks ✓ (${entries.length} entradas)`);
}
