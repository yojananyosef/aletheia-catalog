import { unzipSync, strFromU8 } from "fflate";
import { readdirSync } from "node:fs";
import { sha256Hex } from "./lib/amf";

const RELEASE_BASE =
  process.env.CATALOG_RELEASE_BASE ??
  "https://github.com/yojananyosef/aletheia-catalog/releases/latest/download";

const defs = (await Bun.file(new URL("./modules-v1.json", import.meta.url)).json()) as any[];
const distDir = new URL("../dist/", import.meta.url).pathname;
const files = readdirSync(distDir).filter((f) => f.endsWith(".amod"));

const modules = [];
for (const file of files.sort()) {
  const bytes = await Bun.file(distDir + file).arrayBuffer();
  const u8 = new Uint8Array(bytes);
  const entries = unzipSync(u8);
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  const def = defs.find((d) => d.id === manifest.id);
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
