/**
 * @crawlertoll/parser — reference parser + TypeScript types for the
 * Context License standard.
 *
 *   import { parse, fetchAndParse } from "@crawlertoll/parser";
 *
 *   const result = parse(jsonText);
 *   if (result.ok) {
 *     console.log(result.value.publisher.name);
 *   } else {
 *     for (const err of result.errors) console.error(err.path, err.message);
 *   }
 *
 * Spec: https://context-license.org/v0.1
 * License: Apache-2.0 (the spec itself is CC0 1.0).
 */

// AJV's Draft 2020-12 build (separate from the default `ajv` import,
// which only ships Draft-07). The schema's $schema points at
// json-schema.org/draft/2020-12/schema, so this is required.
import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { contextLicenseSchema } from "./schema.js";
import type {
  ContextLicense,
  ParseResult,
  ValidationError,
} from "./types.js";

// Re-exports — surface the type system at the package root.
export * from "./types.js";
export { contextLicenseSchema } from "./schema.js";

// ─── Validator (compiled once, reused) ──────────────────────────────

const ajv = new Ajv2020({
  allErrors: true,
  strict: false, // schema declares `additionalProperties: true` on the
                 // root object per spec §2.2 (unknown fields are
                 // ignored, not rejected). strict mode complains about
                 // some legitimate spec choices.
});
addFormats(ajv);

const validator: ValidateFunction = ajv.compile(contextLicenseSchema);

// ─── parse() ────────────────────────────────────────────────────────

/**
 * Parse and validate a Context License document.
 *
 * Accepts either a raw JSON string or a pre-parsed object. Returns a
 * tagged union: `{ ok: true, value }` on success; `{ ok: false, errors }`
 * with a structured list of validation problems on failure.
 *
 * Never throws on validation errors. Throws only on malformed JSON
 * input (caller's responsibility) when a string is passed.
 */
export function parse(input: string | unknown): ParseResult {
  let doc: unknown;
  if (typeof input === "string") {
    try {
      doc = JSON.parse(input);
    } catch (err) {
      return {
        ok: false,
        errors: [
          {
            path: "$",
            message: `invalid JSON: ${(err as Error).message}`,
            keyword: "syntax",
            params: {},
          },
        ],
      };
    }
  } else {
    doc = input;
  }

  const valid = validator(doc);
  if (valid) {
    return { ok: true, value: doc as ContextLicense };
  }
  return {
    ok: false,
    errors: (validator.errors ?? []).map(toValidationError),
  };
}

function toValidationError(err: ErrorObject): ValidationError {
  // AJV's instancePath is e.g. "/publisher/slug". Normalise to a more
  // ergonomic dotted form: "publisher.slug" (or "$" at the root).
  const path = (err.instancePath || "$")
    .replace(/^\//, "")
    .replace(/\//g, ".") || "$";
  return {
    path,
    message: err.message ?? "invalid value",
    keyword: err.keyword,
    params: (err.params as Record<string, unknown>) ?? {},
  };
}

// ─── fetchAndParse() ────────────────────────────────────────────────

/**
 * Fetch a publisher's `/.well-known/context-license.json` and validate
 * the response body. Convenience wrapper around `parse()` for the
 * common buyer-side flow.
 *
 * `fetchImpl` defaults to the global `fetch`. Pass a custom
 * implementation for testing or to inject retries / caching / auth.
 *
 * Throws on network / HTTP errors; returns a `ParseResult` for
 * validation outcomes (so the caller can distinguish "couldn't reach
 * the publisher" from "publisher served an invalid file").
 */
export async function fetchAndParse(
  url: string,
  options?: {
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  },
): Promise<ParseResult> {
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error(
      "No fetch implementation available. Pass options.fetchImpl or run on a platform with global fetch.",
    );
  }
  const res = await fetchImpl(url, {
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const text = await res.text();
  return parse(text);
}

// ─── Helper: human-friendly error formatting ───────────────────────

/**
 * Render a `ValidationError[]` as a single human-readable string,
 * one error per line, indented under a header. Useful for logging or
 * surfacing in CLI tools.
 */
export function formatErrors(errors: readonly ValidationError[]): string {
  if (errors.length === 0) return "no errors";
  const lines = [
    `${errors.length} validation ${errors.length === 1 ? "error" : "errors"}:`,
  ];
  for (const err of errors) {
    lines.push(`  ${err.path}: ${err.message} (${err.keyword})`);
  }
  return lines.join("\n");
}
