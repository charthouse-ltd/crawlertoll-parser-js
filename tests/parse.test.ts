import { describe, it, expect } from "vitest";
import { parse, formatErrors, fetchAndParse, contextLicenseSchema } from "../src/index.js";

const VALID_DOC = {
  $schema: "https://schemas.crawlertoll.com/context-license/v1.json",
  version: "1.0.0",
  publisher: {
    name: "Test Publisher",
    slug: "test-publisher",
    domain: "example.com",
    contact: "licensing@example.com",
  },
  endpoints: [
    {
      name: "articles",
      url: "https://example.com/mcp/articles",
      transport: "streamable-http",
      description: "Search and fetch articles.",
      schema_org_types: ["Article"],
    },
  ],
  pricing: {
    model: "per_query",
    currency: "USD",
    unit_price_micros: 5000,
  },
  auth: {
    schemes: ["api_key"],
  },
  terms_of_use: "https://example.com/license",
  quality_signals: {
    uptime_sla_pct: 99.5,
    freshness_target_seconds: 3600,
    last_updated: "2026-05-19T00:00:00Z",
  },
} as const;

describe("parse()", () => {
  it("accepts a fully valid document", () => {
    const result = parse(VALID_DOC);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.publisher.slug).toBe("test-publisher");
      expect(result.value.endpoints).toHaveLength(1);
      expect(result.value.pricing.unit_price_micros).toBe(5000);
    }
  });

  it("accepts a JSON string", () => {
    const result = parse(JSON.stringify(VALID_DOC));
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON syntax with a syntax error", () => {
    const result = parse("{not valid json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.keyword).toBe("syntax");
      expect(result.errors[0]?.path).toBe("$");
    }
  });

  it("rejects a document missing required top-level fields", () => {
    const broken = { ...VALID_DOC } as Record<string, unknown>;
    delete broken.pricing;
    delete broken.auth;
    const result = parse(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.params.missingProperty);
      expect(paths).toContain("pricing");
      expect(paths).toContain("auth");
    }
  });

  it("rejects a slug that doesn't match the spec pattern", () => {
    const broken = {
      ...VALID_DOC,
      publisher: { ...VALID_DOC.publisher, slug: "Invalid Slug!" },
    };
    const result = parse(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const slugErr = result.errors.find((e) => e.path === "publisher.slug");
      expect(slugErr).toBeDefined();
      expect(slugErr?.keyword).toBe("pattern");
    }
  });

  it("rejects an unknown auth scheme", () => {
    const broken = {
      ...VALID_DOC,
      auth: { schemes: ["api_key", "carrier-pigeon"] as unknown as ("api_key")[] },
    };
    const result = parse(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.keyword === "enum")).toBe(true);
    }
  });

  it("rejects a uptime_sla_pct outside [0, 100]", () => {
    const broken = {
      ...VALID_DOC,
      quality_signals: { ...VALID_DOC.quality_signals, uptime_sla_pct: 150 },
    };
    const result = parse(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === "quality_signals.uptime_sla_pct")).toBe(true);
    }
  });

  it("rejects a v2 schema version (only v1.x is recognised by v1 parser)", () => {
    const broken = { ...VALID_DOC, version: "2.0.0" };
    const result = parse(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === "version" && e.keyword === "pattern")).toBe(true);
    }
  });

  it("rejects an empty endpoints array", () => {
    const broken = { ...VALID_DOC, endpoints: [] };
    const result = parse(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === "endpoints" && e.keyword === "minItems")).toBe(true);
    }
  });

  it("accepts the bulk_tiers + attestation + marketplace_listings optional shape", () => {
    const rich = {
      ...VALID_DOC,
      pricing: {
        ...VALID_DOC.pricing,
        included_free: 1000,
        bulk_tiers: [{ min_qty: 100000, unit_price_micros: 4000 }],
      },
      marketplace_listings: ["https://crawlertoll.com/p/test-publisher"],
      attestation: {
        public_key_pem: "-----BEGIN PUBLIC KEY-----\nABC\n-----END PUBLIC KEY-----",
        kid: "ct_sign_test_001",
        algorithm: "ed25519" as const,
      },
    };
    const result = parse(rich);
    expect(result.ok).toBe(true);
  });

  it("ignores unknown top-level fields (forward-compat per spec §2.2)", () => {
    const withExtras = { ...VALID_DOC, custom_field: { foo: "bar" }, _meta: 42 };
    const result = parse(withExtras);
    expect(result.ok).toBe(true);
  });
});

describe("formatErrors()", () => {
  it("renders zero-error case", () => {
    expect(formatErrors([])).toBe("no errors");
  });

  it("renders single error inline", () => {
    const out = formatErrors([
      { path: "publisher.slug", message: "must match pattern", keyword: "pattern", params: {} },
    ]);
    expect(out).toContain("1 validation error");
    expect(out).toContain("publisher.slug");
    expect(out).toContain("must match pattern");
  });

  it("renders multi-error case", () => {
    const out = formatErrors([
      { path: "publisher", message: "required: contact", keyword: "required", params: {} },
      { path: "pricing.currency", message: "must be one of", keyword: "enum", params: {} },
    ]);
    expect(out).toContain("2 validation errors");
  });
});

describe("contextLicenseSchema export", () => {
  it("is the canonical v1 schema with frozen properties", () => {
    expect(contextLicenseSchema.$id).toBe(
      "https://schemas.crawlertoll.com/context-license/v1.json",
    );
    expect(Object.isFrozen(contextLicenseSchema)).toBe(true);
  });
});

describe("fetchAndParse()", () => {
  it("validates the response body via the injected fetch", async () => {
    const fakeFetch: typeof fetch = async () => {
      return new Response(JSON.stringify(VALID_DOC), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const result = await fetchAndParse("https://example.com/.well-known/context-license.json", {
      fetchImpl: fakeFetch,
    });
    expect(result.ok).toBe(true);
  });

  it("throws on non-2xx HTTP responses", async () => {
    const fakeFetch: typeof fetch = async () => new Response("not found", { status: 404 });
    await expect(
      fetchAndParse("https://example.com/.well-known/context-license.json", { fetchImpl: fakeFetch }),
    ).rejects.toThrow(/404/);
  });

  it("returns a validation failure (not throw) when the response is malformed", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ version: "1.0.0" }), { status: 200 });
    const result = await fetchAndParse("https://example.com/.well-known/context-license.json", {
      fetchImpl: fakeFetch,
    });
    expect(result.ok).toBe(false);
  });
});
