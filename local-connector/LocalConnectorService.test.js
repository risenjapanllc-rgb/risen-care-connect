"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const LocalConnectorService = require("./LocalConnectorService");

test("observeRegisteredFile passes only safe file observation to registry", async () => {
  let received;
  const service = new LocalConnectorService({ sourceDocumentRegistry: { observe: async value => { received = value; return { sourceDocumentKey: "doc-key-1" }; } } });
  service._resolveRegisteredFileDetails = async () => ({ filePath: "/secret/facility/支援記録.xlsx", fileName: "支援記録.xlsx", extension: ".xlsx", size: 123, updatedAt: "2026-09-05T12:00:00.000Z" });
  await service.observeRegisteredFile("支援記録.xlsx");
  assert.deepStrictEqual(received, { relativePath: "支援記録.xlsx", fileName: "支援記録.xlsx", updatedAt: "2026-09-05T12:00:00.000Z", size: 123 });
  assert.ok(!Object.hasOwn(received, "filePath"));
});

test("observeRegisteredFile fails before file resolution when registry is not configured", async () => {
  const service = new LocalConnectorService();
  let resolved = false;
  service._resolveRegisteredFileDetails = async () => { resolved = true; throw new Error("must not run"); };
  await assert.rejects(() => service.observeRegisteredFile("支援記録.xlsx"), /Registry is not configured/);
  assert.strictEqual(resolved, false);
});

