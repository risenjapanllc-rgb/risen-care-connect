"use strict";

const assert = require("assert");
const {
    validateResidentAdmissionDecision
} = require("./ResidentAdmissionDecision");

const base = {
    sourceDocumentKey: "document-key",
    sourceEntityKey: "subject-key",
    sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
    sourceSize: 1234
};

for (const decision of [
    "approved_new",
    "rejected",
    "deferred"
]) {
    const result = validateResidentAdmissionDecision({
        ...base,
        decision
    });

    assert.strictEqual(result.decision, decision);
    assert.strictEqual(result.reviewedByHuman, true);
}

assert.throws(
    () => validateResidentAdmissionDecision({
        ...base,
        decision: "confirmed"
    }),
    TypeError
);

assert.throws(
    () => validateResidentAdmissionDecision({
        ...base,
        sourceUpdatedAt: "",
        decision: "approved_new"
    }),
    TypeError
);

console.log("Resident admission decision tests: PASS");
