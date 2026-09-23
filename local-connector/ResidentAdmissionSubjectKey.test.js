"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const {
    createResidentAdmissionSubjectKey
} = require("./ResidentAdmissionSubjectKey");

test("creates one stable admission key for the same grouped resident", () => {
    const digest =
        crypto
            .createHash("sha256")
            .update("synthetic-resident", "utf8")
            .digest("hex");

    const first =
        createResidentAdmissionSubjectKey({
            identifierType: "name",
            identifierDigest: digest
        });

    const second =
        createResidentAdmissionSubjectKey({
            identifierType: "name",
            identifierDigest: digest
        });

    assert.strictEqual(first, second);
    assert.match(
        first,
        /^resident:name:[a-f0-9]{64}$/
    );
});

test("keeps identifier namespaces separate", () => {
    const digest =
        crypto
            .createHash("sha256")
            .update("synthetic-resident", "utf8")
            .digest("hex");

    const byName =
        createResidentAdmissionSubjectKey({
            identifierType: "name",
            identifierDigest: digest
        });

    const byCode =
        createResidentAdmissionSubjectKey({
            identifierType: "user_code",
            identifierDigest: digest
        });

    assert.notStrictEqual(byName, byCode);
});

test("fails closed for unsupported or malformed identity", () => {
    assert.throws(
        () =>
            createResidentAdmissionSubjectKey({
                identifierType: "source_row",
                identifierDigest: "a".repeat(64)
            }),
        error =>
            error?.code ===
            "resident_admission_subject_identity_invalid"
    );

    assert.throws(
        () =>
            createResidentAdmissionSubjectKey({
                identifierType: "name",
                identifierDigest: "not-a-digest"
            }),
        error =>
            error?.code ===
            "resident_admission_subject_identity_invalid"
    );
});

console.log(
    "Resident admission subject key tests: PASS"
);
