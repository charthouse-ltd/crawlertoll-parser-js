/**
 * Re-export of the canonical Context License v1 JSON Schema as a
 * frozen JS object so consumers can pass it to any JSON Schema
 * validator without re-fetching it from the network.
 *
 * The source-of-truth schema lives in this package at
 * ./context-license-v1.json (mirrored from
 * https://schemas.crawlertoll.com/context-license/v1.json, frozen
 * for the v1.x line).
 */

import schemaJson from "./context-license-v1.json" with { type: "json" };

export const contextLicenseSchema: Readonly<typeof schemaJson> = Object.freeze(schemaJson);

export default contextLicenseSchema;
