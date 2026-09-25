"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    resolveHumanConfirmedFieldMappings
} = require("../HumanConfirmedFieldMappingResolver");

const RecipientCertificateSemanticPlanner =
    require("../RecipientCertificateSemanticPlanner");

test("human-confirmed physical source fields produce recipient certificate semantic values", () => {
    const mappings = [
        {
            sourceFieldKey: "sheet:0:column:0",
            standardEntityName: "user",
            standardFieldName: "user_code"
        },
        {
            sourceFieldKey: "sheet:0:column:1",
            standardEntityName: "user",
            standardFieldName: "name"
        },
        {
            sourceFieldKey: "sheet:0:column:3",
            standardEntityName: "user",
            standardFieldName: "birth_date"
        },
        {
            sourceFieldKey: "sheet:0:column:4",
            standardEntityName: "user",
            standardFieldName: "gender"
        },
        {
            sourceFieldKey: "sheet:0:column:19",
            standardEntityName: "recipient_certificate",
            standardFieldName: "certificate_number"
        }
    ];

    const interpretations = mappings.map(mapping => ({
        sourceFieldKey: mapping.sourceFieldKey,
        confirmedByHuman: true,
        confirmedMeaning:
            `${mapping.standardEntityName}.${mapping.standardFieldName}`
    }));

    const {
        humanConfirmedMappings
    } = resolveHumanConfirmedFieldMappings(
        mappings,
        interpretations
    );

    const planner =
        new RecipientCertificateSemanticPlanner();

    const result = planner.build({
        sourceEntities: [{
            sourceEntityKey: "sheet:0:row:2",
            valuesBySourceFieldKey: {
                "sheet:0:column:0": "U001",
                "sheet:0:column:1": "テスト 利用者",
                "sheet:0:column:3": "3/27/84",
                "sheet:0:column:4": "男性",
                "sheet:0:column:19": "CERT-001",
                "sheet:0:column:42": "semantic-targetではない値"
            }
        }],
        fieldMappings:
            humanConfirmedMappings
    });

    assert.deepStrictEqual(
        humanConfirmedMappings,
        mappings
    );

    assert.deepStrictEqual(result, [{
        sourceEntityKey: "sheet:0:row:2",
        semanticValues: {
            "user.user_code": "U001",
            "user.name": "テスト 利用者",
            "user.birth_date": "1984-03-27",
            "user.gender": "男性",
            "recipient_certificate.certificate_number":
                "CERT-001"
        }
    }]);
});
