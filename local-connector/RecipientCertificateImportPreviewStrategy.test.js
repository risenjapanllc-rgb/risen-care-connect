"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RecipientCertificateImportPreviewStrategy =
    require("./RecipientCertificateImportPreviewStrategy");

test("included subject without semantic record must not be counted as recipient certificate create", () => {
    const strategy =
        new RecipientCertificateImportPreviewStrategy();

    const result =
        strategy.build({
            subjects: [
                {
                    identifierType: "name",
                    identifierDigest:
                        "a".repeat(64),
                    displayName: "山田 太郎",
                    existingResidentConfirmed: false,
                    admissionDecision: "approved_new",
                    semanticRecords: []
                }
            ]
        });

    assert.equal(
        result.summary.recipientCertificateCreateCount,
        0
    );

    assert.equal(
        result.items[0].persistenceAction,
        null
    );

    assert.equal(
        result.items[0].persistenceContract,
        null
    );

    assert.equal(
        result.status,
        "blocked"
    );
});
