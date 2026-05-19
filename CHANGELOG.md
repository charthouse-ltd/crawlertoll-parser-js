# Changelog

All notable changes to `@crawlertoll/parser` are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## v0.1.0 — 2026-05-19 (initial)

Initial reference parser for the Context License v1 standard.

- `parse(input)` validates a Context License document against the v1
  JSON Schema and returns a tagged `ParseResult`.
- `fetchAndParse(url, options?)` fetches a publisher's well-known file
  and validates the response body.
- `formatErrors(errors)` renders a `ValidationError[]` for logging.
- Exports the frozen `contextLicenseSchema` for downstream consumers.
- Full TypeScript types mirror the v1 schema: `ContextLicense`,
  `Publisher`, `Endpoint`, `Pricing`, `Auth`, `QualitySignals`,
  `Attestation`, plus the enums for transport, pricing model, currency,
  auth scheme, and attestation algorithm.

Tracks Context License v0.1.0-draft. The schema is frozen for the
v1.x line; any breaking change ships as v2 of this package.
