"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Fingerprint = require("./RecipientCertificatePreviewFingerprint");

function entry(overrides = {}) {
    return {
        resolution: "planned_new",
        identifierType: "name",
        identifierDigest: "a".repeat(64),
        residentId: null,
        displayName: "Test Resident",
        persistenceAction: "create",
        persistenceContract: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                certificateNumber: "ABC123"
            },
            contentHash: "b".repeat(64),
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-1",
            expectedContentHash: null
        },
        ...overrides
    };
}

test("same execution plan produces same fingerprint", () => {
    const fingerprint = new Fingerprint();
    assert.strictEqual(
        fingerprint.create([entry()]),
        fingerprint.create([entry()])
    );
});

test("identity change changes fingerprint", () => {
    const fingerprint = new Fingerprint();
    assert.notStrictEqual(
        fingerprint.create([entry()]),
        fingerprint.create([
            entry({ identifierDigest: "c".repeat(64) })
        ])
    );
});

test("semantic target change changes fingerprint", () => {
    const fingerprint = new Fingerprint();
    const changed = entry();
    changed.persistenceContract = {
        ...changed.persistenceContract,
        contentHash: "d".repeat(64),
        semanticContent: { certificateNumber: "XYZ999" }
    };

    assert.notStrictEqual(
        fingerprint.create([entry()]),
        fingerprint.create([changed])
    );
});

test("existing resident identity is fingerprint-bound", () => {
    const fingerprint = new Fingerprint();
    assert.notStrictEqual(
        fingerprint.create([
            entry({
                resolution: "existing",
                residentId: "resident-1"
            })
        ]),
        fingerprint.create([
            entry({
                resolution: "existing",
                residentId: "resident-2"
            })
        ])
    );
});

test("invalid identity fails closed", () => {
    const fingerprint = new Fingerprint();
    assert.throws(
        () => fingerprint.create([
            entry({ identifierDigest: "bad" })
        ]),
        TypeError
    );
});

test("entry order does not change fingerprint", () => {
    const fingerprint = new Fingerprint();

    const first = entry({
        identifierDigest: "1".repeat(64)
    });
    const second = entry({
        identifierDigest: "2".repeat(64)
    });

    assert.strictEqual(
        fingerprint.create([first, second]),
        fingerprint.create([second, first])
    );
});

test("duplicate identity fails closed", () => {
    const fingerprint = new Fingerprint();

    assert.throws(
        () => fingerprint.create([
            entry(),
            entry()
        ]),
        TypeError
    );
});
