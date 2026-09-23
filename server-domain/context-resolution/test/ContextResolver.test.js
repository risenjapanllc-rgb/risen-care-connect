"use strict";

const assert = require("assert");
const { resolveSubjectContext } = require("../ContextResolver");

function field(sourceFieldKey, headerLabel) {
    return { sourceFieldKey, headerLabel };
}

const certificateResult = resolveSubjectContext({
    confirmedDocumentType: "recipient_certificate",
    fieldDefinitions: [
        field("name-field", "(氏名)"),
        field("certificate-field", "受給者証NO"),
        field("birth-field", "生年月日")
    ]
});

const nameCandidate = certificateResult.contextualCandidates.find(
    item => item.sourceFieldKey === "name-field"
);

assert.ok(
    nameCandidate,
    "confirmed recipient certificate should suggest (氏名)"
);
assert.strictEqual(nameCandidate.candidate.entityName, "user");
assert.strictEqual(nameCandidate.candidate.fieldName, "name");
assert.strictEqual(nameCandidate.humanConfirmationRequired, true);
assert.strictEqual(nameCandidate.status, "contextual_candidate");

const unknownResult = resolveSubjectContext({
    confirmedDocumentType: null,
    fieldDefinitions: [
        field("name-field", "(氏名)"),
        field("certificate-field", "受給者証NO")
    ]
});

assert.strictEqual(
    unknownResult.contextualCandidates.some(
        item => item.sourceFieldKey === "name-field"
    ),
    false,
    "(氏名) must not become user.name without confirmed document context"
);

assert.strictEqual(
    certificateResult.ambiguousFields.some(
        item => item.sourceFieldKey === "name-field"
    ),
    true,
    "(氏名) must remain human-confirmed even when suggested"
);

console.log("ContextResolver recipient certificate safety tests: PASS");
