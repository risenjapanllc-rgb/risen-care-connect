const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

const SemanticContentHasher = require("./SemanticContentHasher");

function hash(canonicalString) {
    return new SemanticContentHasher().hash(canonicalString);
}

test("canonicalString produces the independent SHA-256 UTF-8 digest", () => {
    const canonicalString = '{"semanticType":"support_record","fields":{"supportContent":"支援内容"},"customFields":{}}';
    const expected = createHash("sha256")
        .update(canonicalString, "utf8")
        .digest("hex");

    assert.deepStrictEqual(hash(canonicalString), { contentHash: expected });
});

test("contentHash is 64 lowercase hexadecimal characters", () => {
    const result = hash("canonical");

    assert.strictEqual(result.contentHash.length, 64);
    assert.match(result.contentHash, /^[0-9a-f]{64}$/);
});

test("same canonicalString produces the same contentHash", () => {
    assert.strictEqual(hash("canonical").contentHash, hash("canonical").contentHash);
});

test("one-character, leading-space, trailing-space, and newline differences change the hash", () => {
    const base = hash("本文").contentHash;

    for (const changed of ["本文。", " 本文", "本文 ", "本文\n"]) {
        assert.notStrictEqual(hash(changed).contentHash, base, changed);
    }
});

test("full-width, half-width, composed, and decomposed differences change the hash", () => {
    assert.notStrictEqual(hash("A").contentHash, hash("Ａ").contentHash);
    assert.notStrictEqual(hash("が").contentHash, hash("か\u3099").contentHash);
});

test("Japanese text hashes deterministically as UTF-8", () => {
    const canonicalString = "支援内容\n次の行";
    const expected = createHash("sha256")
        .update(Buffer.from(canonicalString, "utf8"))
        .digest("hex");

    assert.strictEqual(hash(canonicalString).contentHash, expected);
});

test("input is neither trimmed nor JSON reserialized", () => {
    const canonicalString = ' { "value" : "本文" } ';

    assert.notStrictEqual(
        hash(canonicalString).contentHash,
        hash(JSON.stringify(JSON.parse(canonicalString))).contentHash
    );
});

test("empty string is hashed as the SHA-256 known test vector", () => {
    assert.strictEqual(
        hash("").contentHash,
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
});

test("non-string inputs are rejected", () => {
    for (const input of [
        { semanticType: "support_record" },
        Buffer.from("canonical", "utf8"),
        null,
        undefined,
        123,
        true
    ]) {
        assert.throws(() => hash(input), TypeError);
    }
});