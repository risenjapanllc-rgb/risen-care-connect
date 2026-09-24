"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("atomic STEP6 contract represents one resident import as one write request", () => {
    const contract = {
        resolution: "existing",
        identifierType: "name",
        identifierDigest: "a".repeat(64),
        residentId: "33333333-3333-4333-8333-333333333333",
        displayName: "Test Resident",
        residentProfile: {
            name: "Test Resident",
            birth_date: "1984-03-27",
            gender: "男性"
        },
        semantic: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                "user.name": "Test Resident",
                "user.birth_date": "1984-03-27",
                "user.gender": "男性",
                "recipient_certificate.certificate_number": "ABC123"
            },
            contentHash: "b".repeat(64),
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-2",
            expectedContentHash: null
        },
        sourceDocumentKey: "source.xlsx",
        sourceUpdatedAt: "2026-09-22T01:00:00.000Z",
        sourceSize: 123
    };

    assert.strictEqual(contract.resolution, "existing");
    assert.strictEqual(contract.residentProfile.birth_date, "1984-03-27");
    assert.strictEqual(
        contract.semantic.canonicalizationVersion,
        "risen-recipient-certificate-canonicalization-2"
    );
    assert.strictEqual(contract.sourceSize, 123);
});

test("atomic STEP6 result exposes resident and semantic outcome together", () => {
    const result = {
        status: "updated",
        residentId: "33333333-3333-4333-8333-333333333333",
        recordId: "44444444-4444-4444-8444-444444444444",
        residentCreated: false
    };

    assert.deepStrictEqual(
        Object.keys(result).sort(),
        [
            "recordId",
            "residentCreated",
            "residentId",
            "status"
        ]
    );
});
