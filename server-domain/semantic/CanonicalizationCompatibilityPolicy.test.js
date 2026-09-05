const test = require("node:test");
const assert = require("node:assert/strict");

const CanonicalizationCompatibilityPolicy = require("./CanonicalizationCompatibilityPolicy");

function evaluate(versions) {
    return new CanonicalizationCompatibilityPolicy().evaluate(versions);
}

test("only the registered -1 by -1 pair is compatible", () => {
    assert.deepStrictEqual(evaluate({
        currentVersion: "risen-semantic-canonicalization-1",
        existingVersion: "risen-semantic-canonicalization-1"
    }), { status: "compatible" });
});

test("unknown equal versions are incompatible", () => {
    assert.deepStrictEqual(evaluate({
        currentVersion: "risen-semantic-canonicalization-2",
        existingVersion: "risen-semantic-canonicalization-2"
    }), { status: "incompatible" });
});

test("different version pairs are incompatible in both directions", () => {
    for (const [currentVersion, existingVersion] of [
        ["risen-semantic-canonicalization-1", "risen-semantic-canonicalization-2"],
        ["risen-semantic-canonicalization-2", "risen-semantic-canonicalization-1"]
    ]) {
        assert.deepStrictEqual(
            evaluate({ currentVersion, existingVersion }),
            { status: "incompatible" }
        );
    }
});

test("missing, invalid, empty, and whitespace-only versions are incompatible", () => {
    for (const versions of [
        {},
        { currentVersion: "risen-semantic-canonicalization-1" },
        { existingVersion: "risen-semantic-canonicalization-1" },
        { currentVersion: null, existingVersion: "risen-semantic-canonicalization-1" },
        { currentVersion: 1, existingVersion: "risen-semantic-canonicalization-1" },
        { currentVersion: {}, existingVersion: "risen-semantic-canonicalization-1" },
        { currentVersion: [], existingVersion: "risen-semantic-canonicalization-1" },
        { currentVersion: "", existingVersion: "risen-semantic-canonicalization-1" },
        { currentVersion: " \n\t ", existingVersion: "risen-semantic-canonicalization-1" }
    ]) {
        assert.deepStrictEqual(evaluate(versions), { status: "incompatible" });
    }
});

test("non-plain inputs are incompatible", () => {
    for (const versions of [null, [], "versions", 123, true]) {
        assert.deepStrictEqual(evaluate(versions), { status: "incompatible" });
    }
});

test("extra, facility, client policy, mapping, and hash inputs do not affect the policy", () => {
    const versions = {
        currentVersion: "risen-semantic-canonicalization-1",
        existingVersion: "risen-semantic-canonicalization-1",
        facilityId: "facility-1",
        clientAllowlist: ["risen-semantic-canonicalization-2"],
        compatiblePairs: [[
            "risen-semantic-canonicalization-2",
            "risen-semantic-canonicalization-2"
        ]],
        mappingVersion: "mapping-2",
        contentHash: "a".repeat(64),
        credential: "credential",
        token: "token",
        password: "password",
        secret: "secret"
    };

    assert.deepStrictEqual(evaluate(versions), { status: "compatible" });
});

test("numeric suffix ordering is not used", () => {
    assert.deepStrictEqual(evaluate({
        currentVersion: "risen-semantic-canonicalization-10",
        existingVersion: "risen-semantic-canonicalization-10"
    }), { status: "incompatible" });
});

test("input is not mutated and evaluation is deterministic", () => {
    const versions = {
        currentVersion: "risen-semantic-canonicalization-1",
        existingVersion: "risen-semantic-canonicalization-1"
    };
    const before = JSON.stringify(versions);

    assert.deepStrictEqual(evaluate(versions), evaluate(versions));
    assert.strictEqual(JSON.stringify(versions), before);
});