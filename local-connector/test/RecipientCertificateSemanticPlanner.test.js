"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const RecipientCertificateSemanticPlanner =
    require("../RecipientCertificateSemanticPlanner");

test("recipient certificate planner maps source values by confirmed semantic meaning", () => {
    const planner =
        new RecipientCertificateSemanticPlanner();

    const result = planner.build({
        sourceEntities: [{
            sourceEntityKey: "sheet:0:row:2",
            valuesBySourceFieldKey: {
                "sheet:0:column:0": "利用者A",
                "sheet:0:column:1": "CERT-001",
                "sheet:0:column:2": "2030-03-31"
            }
        }],
        fieldMappings: [
            {
                sourceFieldKey: "sheet:0:column:0",
                standardEntityName: "user",
                standardFieldName: "name"
            },
            {
                sourceFieldKey: "sheet:0:column:1",
                standardEntityName: "recipient_certificate",
                standardFieldName: "certificate_number"
            },
            {
                sourceFieldKey: "sheet:0:column:2",
                standardEntityName: "recipient_certificate",
                standardFieldName: "valid_until"
            }
        ]
    });

    assert.deepStrictEqual(result, [{
        sourceEntityKey: "sheet:0:row:2",
        semanticValues: {
            "user.name": "利用者A",
            "recipient_certificate.certificate_number": "CERT-001",
            "recipient_certificate.valid_until": "2030-03-31"
        }
    }]);
});

test("recipient certificate planner fails closed on duplicate semantic meaning", () => {
    const planner =
        new RecipientCertificateSemanticPlanner();

    assert.throws(
        () => planner.build({
            sourceEntities: [{
                sourceEntityKey: "sheet:0:row:2",
                valuesBySourceFieldKey: {
                    a: "CERT-A",
                    b: "CERT-B"
                }
            }],
            fieldMappings: [
                {
                    sourceFieldKey: "a",
                    standardEntityName: "recipient_certificate",
                    standardFieldName: "certificate_number"
                },
                {
                    sourceFieldKey: "b",
                    standardEntityName: "recipient_certificate",
                    standardFieldName: "certificate_number"
                }
            ]
        }),
        error =>
            error &&
            error.code ===
                "recipient_certificate_semantic_ambiguity"
    );
});
