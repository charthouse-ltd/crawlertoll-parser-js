# @crawlertoll/parser

Reference parser + TypeScript types for the **Context License** standard
(`/.well-known/context-license.json`). One JSON-Schema-validated parse step
gives you a fully typed `ContextLicense` object, ready to query for
pricing, auth, endpoints, attestation keys, and quality commitments.

- **Spec**: [context-license.org/v0.1](https://context-license.org/v0.1) (CC0 1.0)
- **Schema**: pinned at [`schemas.crawlertoll.com/context-license/v1.json`](https://schemas.crawlertoll.com/context-license/v1.json) — also bundled in this package at `./dist/schema.js`
- **License**: Apache-2.0 (this implementation). The spec itself is CC0 — fork freely.

> **Status**: v0.1 draft. The Context License spec is open for public RFC
> through **2026-07-15**. This parser tracks the v1.x schema line, frozen
> for the duration of v1. Breaking changes ship as v2 of this package.

---

## Install

```bash
npm install @crawlertoll/parser
# or
pnpm add @crawlertoll/parser
yarn add @crawlertoll/parser
```

Requires Node 18+ (any runtime with a global `fetch`).

> 📦 Publishing to npm is pending creation of the `@crawlertoll` npm
> organisation. Until then, install from git:
> `npm install github:nhrzxxw9dn-web/crawlertoll-parser-js`.

## Quick start

### Parse + validate

```ts
import { parse } from "@crawlertoll/parser";

const result = parse(jsonStringOrObject);

if (result.ok) {
  console.log(result.value.publisher.name);
  for (const ep of result.value.endpoints) {
    console.log(ep.name, ep.url, ep.transport);
  }
} else {
  for (const err of result.errors) {
    console.error(err.path, err.message);
  }
}
```

### Fetch a live publisher

```ts
import { fetchAndParse } from "@crawlertoll/parser";

const result = await fetchAndParse(
  "https://example.com/.well-known/context-license.json",
);

if (result.ok) {
  // Typed `ContextLicense` — discover endpoints, pricing, auth, attestation key.
}
```

`fetchAndParse` throws on network / HTTP errors so the caller can
distinguish "couldn't reach the publisher" from "publisher served an
invalid file."

### Render errors for humans

```ts
import { parse, formatErrors } from "@crawlertoll/parser";

const result = parse(json);
if (!result.ok) {
  console.error(formatErrors(result.errors));
  // → "2 validation errors:
  //      publisher.slug: must match pattern (pattern)
  //      pricing.currency: must be one of "USD", "USDC", "GBP", "EUR" (enum)"
}
```

## API

### `parse(input: string | unknown): ParseResult`

Accepts a raw JSON string or a pre-parsed object. Returns:

- `{ ok: true, value: ContextLicense }` on success
- `{ ok: false, errors: ValidationError[] }` on failure

Never throws on validation errors. Throws only on malformed JSON when a
string is passed (caller's responsibility).

### `fetchAndParse(url, options?): Promise<ParseResult>`

Convenience wrapper around `parse` for the buyer-side discovery flow.

```ts
fetchAndParse(url, {
  fetchImpl?: typeof fetch,   // default: globalThis.fetch
  signal?: AbortSignal,
  headers?: Record<string, string>,
});
```

### `formatErrors(errors: ValidationError[]): string`

Render a `ValidationError[]` as a single multi-line string for logging.

### `contextLicenseSchema`

The frozen JSON Schema object the parser uses. Pass to your own AJV / zod / etc.
if you need richer integration.

### Types

```ts
import type {
  ContextLicense,
  Publisher,
  Endpoint,
  Pricing,
  Auth,
  QualitySignals,
  Attestation,
  Transport,           // "streamable-http" | "stdio" | "sse-legacy"
  PricingModel,        // "per_query" | "per_token" | "per_tool_call" | "freemium"
  Currency,            // "USD" | "USDC" | "GBP" | "EUR"
  AuthScheme,          // "anonymous" | "api_key" | "oauth2" | "x402" | "skyfire"
  ValidationError,
  ParseResult,
} from "@crawlertoll/parser";
```

## What this parser does NOT do

- **It does not verify attestation envelopes.** That's the job of the
  buyer SDK (`@crawlertoll/client`), which uses `attestation.public_key_pem`
  from a parsed document and verifies signed response envelopes per the
  forthcoming attestation companion spec.
- **It does not pay.** No payment, no billing, no x402. Pure parsing.
- **It does not check freshness against `last_updated`.** Whether a
  document is "stale enough to refetch" is a caller policy.

## Conformance

The parser validates against the schema published at
`schemas.crawlertoll.com/context-license/v1.json` (Draft 2020-12), frozen
for v1.x. Two test groups guarantee conformance:

1. `tests/parse.test.ts` — synthetic happy / sad cases (12 cases covering
   the cardinal rejection modes: missing required, pattern mismatch, enum
   mismatch, range out-of-bounds, version drift, etc.).
2. `tests/examples.test.ts` — every worked-example in the spec repo's
   `/standard/examples/` (Iberian Property Weekly, MedXcare, Matriculix)
   must validate.

If either group fails, the parser does not ship.

## License

[Apache-2.0](./LICENSE). The spec itself is [CC0
1.0](https://context-license.org/v0.1) — fork freely.

## Contributing

The reference implementation (this parser) is the bar. Pull requests
welcome at
[`github.com/nhrzxxw9dn-web/crawlertoll-parser-js`](https://github.com/nhrzxxw9dn-web/crawlertoll-parser-js).

When the `crawlertoll` GitHub organisation is created (per the v0.1
launch plan), this repo will move to `github.com/crawlertoll/parser-js`.
The npm name `@crawlertoll/parser` is reserved against that move.
