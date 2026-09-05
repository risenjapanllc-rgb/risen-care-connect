"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const SourceDocumentKeyGenerator = require("./SourceDocumentKeyGenerator");

test("generate returns a non-empty UUID", async () => {
    const generator = new SourceDocumentKeyGenerator();
    const key = await generator.generate();
    assert.strictEqual(typeof key, "string");
    assert.notStrictEqual(key.trim(), "");
    assert.match(key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test("repeated generation produces different opaque keys", async () => {
    const generator = new SourceDocumentKeyGenerator();
    const first = await generator.generate();
    const second = await generator.generate();
    assert.notStrictEqual(first, second);
});
