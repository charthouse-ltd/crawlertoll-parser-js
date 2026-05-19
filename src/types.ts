/**
 * TypeScript types for a Context License v1.x document
 * (/.well-known/context-license.json).
 *
 * Mirrors the canonical JSON Schema at
 * https://schemas.crawlertoll.com/context-license/v1.json (also
 * shipped in this package at ./context-license-v1.json). When the
 * schema and the types disagree, the schema is authoritative — types
 * are derived for ergonomic consumption.
 *
 * Spec reference: https://context-license.org/v0.1
 */

export type Transport = "streamable-http" | "stdio" | "sse-legacy";

export type PricingModel = "per_query" | "per_token" | "per_tool_call" | "freemium";

export type Currency = "USD" | "USDC" | "GBP" | "EUR";

export type AuthScheme = "anonymous" | "api_key" | "oauth2" | "x402" | "skyfire";

export type AttestationAlgorithm = "ed25519";

export interface Publisher {
  name: string;
  slug: string;
  domain: string;
  legal_entity?: string;
  contact: string;
}

export interface Endpoint {
  name: string;
  url: string;
  transport: Transport;
  description: string;
  schema_org_types?: string[];
  discovery?: string;
}

export interface BulkTier {
  min_qty: number;
  unit_price_micros: number;
}

export interface Pricing {
  model: PricingModel;
  currency: Currency;
  unit_price_micros: number;
  included_free?: number;
  bulk_tiers?: BulkTier[];
}

export interface RateLimit {
  rpm?: number;
  rpd?: number;
}

export interface Auth {
  schemes: AuthScheme[];
  rate_limits?: Record<string, RateLimit>;
  oauth2_metadata_url?: string;
}

export interface QualitySignals {
  uptime_sla_pct: number;
  freshness_target_seconds: number;
  last_updated: string;
  citation_density_target?: number;
}

export interface Attestation {
  public_key_pem: string;
  kid: string;
  algorithm: AttestationAlgorithm;
}

export interface ContextLicense {
  $schema?: string;
  version: string;
  publisher: Publisher;
  endpoints: Endpoint[];
  pricing: Pricing;
  auth: Auth;
  terms_of_use: string;
  quality_signals: QualitySignals;
  marketplace_listings?: string[];
  attestation?: Attestation;
  /** Unknown forward-compatible fields permitted per spec §2.2. */
  [extraField: string]: unknown;
}

/** Validation error from the AJV pass — surfaced verbatim plus a
 *  human-friendly path/message pair. */
export interface ValidationError {
  /** Dotted JSON Pointer–ish path to the offending field. */
  path: string;
  /** Short human-readable message. */
  message: string;
  /** AJV's raw keyword (`required`, `enum`, `pattern`, …). */
  keyword: string;
  /** Schema params AJV emitted (e.g. allowed enum values). */
  params: Record<string, unknown>;
}

export type ParseResult =
  | { ok: true; value: ContextLicense }
  | { ok: false; errors: ValidationError[] };
