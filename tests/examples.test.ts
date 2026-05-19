import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { parse, formatErrors } from "../src/index.js";

/**
 * Integration test: every published worked-example in the spec's
 * /standard/examples/ directory MUST validate against the schema this
 * parser ships. If this test fails, either the spec drifted or this
 * parser has a bug — both block release.
 *
 * We pin the location relative to this repo's sibling crawlertoll
 * monorepo. If the path doesn't exist (e.g. running in CI without
 * the sibling clone), the test is skipped, not failed.
 */

const EXAMPLES_DIR = join(
  __dirname,
  "..",
  "..",
  "crawlertoll",
  "standard",
  "examples",
);

function safeList(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

const exampleFiles = safeList(EXAMPLES_DIR);

describe.skipIf(exampleFiles.length === 0)(
  "spec examples in ../crawlertoll/standard/examples/ all validate",
  () => {
    for (const filename of exampleFiles) {
      it(`validates ${basename(filename)}`, () => {
        const fullPath = join(EXAMPLES_DIR, filename);
        const text = readFileSync(fullPath, "utf-8");
        const result = parse(text);
        if (!result.ok) {
          throw new Error(
            `${filename} failed validation:\n${formatErrors(result.errors)}`,
          );
        }
        expect(result.ok).toBe(true);
      });
    }
  },
);
