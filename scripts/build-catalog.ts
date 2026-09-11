import { unzipSync, strFromU8 } from "fflate";
import { readdirSync, existsSync } from "node:fs";
import { sha256Hex, validateManifest } from "./lib/amf";

const RELEASE_BASE =
  process.env.CATALOG_RELEASE_BASE ??
  "https://github.com/yojananyosef/aletheia-catalog/releases/latest/download";

const defs = (await Bun.file(new URL("./modules-v1.json", import.meta.url)).json()) as any[];
const distDir = new URL("../dist/", import.meta.url).pathname;
if (!existsSync(distDir)) throw new Error(`dist/ no existe. Ejecuta primero: bun run import --module=<ID>`);
const files = readdirSync(distDir).filter((f) => f.endsWith(".amod"));
if (files.length === 0) throw new Error(`dist/ sin .amod. Ejecuta primero: bun run import --module=<ID>`);

const modules = [];
for (const file of files.sort()) {
  const bytes = await Bun.file(distDir + file).arrayBuffer();
  const u8 = new Uint8Array(bytes);
  let entries;
  try {
    entries = unzipSync(u8);
  } catch {
    throw new Error(`${file}: no es un zip .amod válido`);
  }
  if (!entries["manifest.json"] || !entries["content.db"])
    throw new Error(`${file}: .amod debe contener manifest.json + content.db`);
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  validateManifest(manifest);
  if (`${manifest.id}.amod` !== file)
    throw new Error(`${file}: el nombre no coincide con manifest.id=${manifest.id}`);
  const def = defs.find((d) => d.id === manifest.id);
  if (!def) throw new Error(`${file}: id ${manifest.id} no declarado en modules-v1.json`);
  if (def.deferred) throw new Error(`${file}: ${manifest.id} está marcado deferred en modules-v1.json`);
  modules.push({
    id: manifest.id,
    type: manifest.type,
    name: manifest.name,
    shortName: manifest.shortName,
    language: manifest.language,
    version: manifest.version,
    publisher: manifest.publisher,
    license: manifest.license,
    copyright: manifest.copyright,
    attribution: manifest.attribution,
    source: manifest.source,
    features: manifest.features,
    amf: manifest.amf,
    schemaVersion: manifest.schemaVersion,
    minReaderVersion: manifest.minReaderVersion,
    sizeBytes: u8.length,
    sha256: sha256Hex(u8),
    downloadUrl: `${RELEASE_BASE}/${file}`,
    buildTool: def?.deferred ? "deferred" : "amf-1.0",
  });
  console.log(`✓ ${manifest.id} ${u8.length} bytes sha256=${sha256Hex(u8).slice(0, 16)}…`);
}

const catalog = {
  format: "amf-catalog",
  version: 1,
  generatedAt: new Date().toISOString(),
  releaseBase: RELEASE_BASE,
  modules: modules.sort((a, b) => a.id.localeCompare(b.id)),
};

await Bun.write(new URL("../catalog/catalog.json", import.meta.url).pathname, JSON.stringify(catalog, null, 2) + "\n");
console.log(`catalog/catalog.json con ${modules.length} módulos`);
