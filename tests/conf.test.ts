import { describe, test, expect } from "bun:test";
import { parseSwordConf } from "../scripts/lib/sword/conf";

describe("parseSwordConf", () => {
  test("parsea claves, ignora comentarios y secciones", () => {
    const conf = parseSwordConf([
      "# comentario",
      "[ASV]",
      "ModDrv=zText4",
      "DataPath=./modules/texts/ztext/asv/",
      "Encoding=UTF-8",
    ].join("\n"));
    expect(conf.modDrv).toBe("zText4");
    expect(conf.dataPath).toBe("./modules/texts/ztext/asv/");
    expect(conf.encoding).toBe("UTF-8");
  });

  test("une líneas de continuación multilínea", () => {
    const conf = parseSwordConf("About=Primera parte\nsegunda parte\nModDrv=RawLD4\n");
    expect(conf.about).toBe("Primera parte segunda parte");
    expect(conf.modDrv).toBe("RawLD4");
  });

  test("defaults seguros sin claves", () => {
    const conf = parseSwordConf("[X]\n");
    expect(conf.modDrv).toBe("");
    expect(conf.encoding).toBe("Latin-1");
  });
});
