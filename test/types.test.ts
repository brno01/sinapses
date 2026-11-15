// Os tipos publicados (types/) precisam bater com o código: quem usa o pacote lê só eles.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));

describe("types/", () => {
  it("is up to date with src/ (npm run types)", () => {
    const out = mkdtempSync(join(tmpdir(), "sinapses-types-"));
    try {
      execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.types.json", "--outDir", out], { stdio: "pipe" });
      const fresh = files(out).map((f) => relative(out, f)).sort();
      expect(files("types").map((f) => relative("types", f)).sort()).toEqual(fresh);
      for (const f of fresh) expect(readFileSync(join("types", f), "utf8"), f).toBe(readFileSync(join(out, f), "utf8"));
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 60_000);
});
