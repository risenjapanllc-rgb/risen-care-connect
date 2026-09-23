"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    resolveSubjectContext
} = require("../server-domain/context-resolution/ContextResolver");

test("受給者証文脈でも社員番号を意味確定しない", () => {
    const result = resolveSubjectContext({
        fieldDefinitions: [
            {
                sourceFieldKey: "employee_number",
                headerLabel: "社員番号"
            },
            {
                sourceFieldKey: "certificate_number",
                headerLabel: "受給者証NO"
            },
            {
                sourceFieldKey: "valid_until",
                headerLabel: "有効期限"
            },
            {
                sourceFieldKey: "birth_date",
                headerLabel: "(生年月日)"
            }
        ],
        confirmedDocumentType: "recipient_certificate"
    });

    assert.equal(
        result.humanConfirmationRequired,
        true
    );

    const employeeNumber =
        result.ambiguousFields.find(
            field => field.headerLabel === "社員番号"
        );

    assert.ok(employeeNumber);

    assert.equal(
        Object.prototype.hasOwnProperty.call(
            employeeNumber,
            "resolvedMeaning"
        ),
        false
    );
});

test("文脈仮説は確定値として返さない", () => {
    const result = resolveSubjectContext({
        fieldDefinitions: [
            {
                sourceFieldKey: "certificate_number",
                headerLabel: "受給者証番号"
            },
            {
                sourceFieldKey: "birth_date",
                headerLabel: "生年月日"
            }
        ]
    });

    assert.equal(
        result.status,
        "hypotheses_available"
    );

    assert.ok(
        result.hypotheses.length > 0
    );

    assert.ok(
        result.hypotheses.every(
            hypothesis =>
                hypothesis.status === "hypothesis" &&
                hypothesis.humanConfirmationRequired === true
        )
    );
});
