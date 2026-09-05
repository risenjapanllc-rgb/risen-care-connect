"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Builder = require("./RelativePathLookupKeyBuilder");
test("build preserves relative path exactly", () => {
  const builder = new Builder();
  assert.strictEqual(builder.build("支援記録.xlsx"), "支援記録.xlsx");
});

test("empty and non-string values are rejected", () => {
  const builder = new Builder();
  assert.throws(() => builder.build(""), TypeError);
  assert.throws(() => builder.build(null), TypeError);
  assert.throws(() => builder.build(undefined), TypeError);
});
