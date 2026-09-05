const test = require("node:test");
const assert = require("node:assert/strict");

const CanonicalizationVersionAuthority = require("./CanonicalizationVersionAuthority");

test("returns the documented current canonicalization version", () => {
    const authority = new CanonicalizationVersionAuthority();

    assert.strictEqual(
        authority.getCurrentVersion(),
        "risen-semantic-canonicalization-1"
    );
});

test("returns the same non-empty identifier for repeated calls", () => {
    const authority = new CanonicalizationVersionAuthority();
    const first = authority.getCurrentVersion();
    const second = authority.getCurrentVersion();

    assert.strictEqual(first, second);
    assert.notStrictEqual(first, "");
});

test("does not accept client, facility, semantic, or hash input", () => {
    const authority = new CanonicalizationVersionAuthority();

    assert.strictEqual(authority.getCurrentVersion.length, 0);
    assert.strictEqual(
        authority.getCurrentVersion(
            "client-version",
            "facility-1",
            { semanticType: "support_record" },
            "a".repeat(64)
        ),
        "risen-semantic-canonicalization-1"
    );
});

test("exposes no compatibility or mappingVersion API", () => {
    const authority = new CanonicalizationVersionAuthority();

    for (const name of [
        "isCompatible",
        "compareVersions",
        "supports",
        "getMappingVersion"
    ]) {
        assert.strictEqual(authority[name], undefined, name);
    }
});

test("does not expose credential-related API", () => {
    const authority = new CanonicalizationVersionAuthority();

    for (const name of ["credential", "token", "password", "secret"]) {
        assert.strictEqual(authority[name], undefined, name);
    }
});