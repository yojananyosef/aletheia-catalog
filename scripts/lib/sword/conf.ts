export interface SwordConf {
  raw: Record<string, string>;
  modDrv: string;
  dataPath: string;
  encoding: string;
  sourceType: string;
  distributionLicense: string;
  about: string;
  shortCode?: string;
  [key: string]: string | undefined;
}

export function parseSwordConf(text: string): SwordConf {
  const raw: Record<string, string> = {};
  let lastKey: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, "");
    if (!line.trim() || line.trim().startsWith("[") || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    const isKey = /^[A-Za-z][A-Za-z0-9]*=/.test(line) && eq > 0;
    if (isKey) {
      const key = line.slice(0, eq).trim();
      raw[key] = line.slice(eq + 1).trim();
      lastKey = key;
    } else if (lastKey) {
      raw[lastKey] += " " + line.trim();
    }
  }
  return {
    raw,
    modDrv: raw.ModDrv ?? "",
    dataPath: raw.DataPath ?? "",
    encoding: raw.Encoding ?? "Latin-1",
    sourceType: raw.SourceType ?? "",
    distributionLicense: raw.DistributionLicense ?? "",
    about: raw.About ?? "",
    shortCode: raw.ShortCode,
  };
}
