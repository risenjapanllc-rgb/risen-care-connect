"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    resolveHumanConfirmedFieldMappings
} = require("../HumanConfirmedFieldMappingResolver");

test("keeps only mappings explicitly confirmed by a human with matching meaning", () => {
    const result =
        resolveHumanConfirmedFieldMappings(
            [
                {
                    sourceFieldKey: "name",
                    standardEntityName: "user",
                    standardFieldName: "name"
                },
                {
                    sourceFieldKey: "certificate",
                    standardEntityName: "recipient_certificate",
                    standardFieldName: "certificate_number"
                },
                {
                    sourceFieldKey: "dob",
                    standardEntityName: "user",
                    standardFieldName: "birth_date"
                }
            ],
            [
                {
                    sourceFieldKey: "name",
                    confirmedMeaning: "user.name",
                    confirmedByHuman: true
                },
                {
                    sourceFieldKey: "certificate",
                    confirmedMeaning: "recipient_certificate.certificate_number",
                    confirmedByHuman: false
                },
                {
                    sourceFieldKey: "dob",
                    confirmedMeaning: "user.sex",
                    confirmedByHuman: true
                }
            ]
        );

    assert.deepStrictEqual(
        result.humanConfirmedMappings,
        [{
            sourceFieldKey: "name",
            standardEntityName: "user",
            standardFieldName: "name"
        }]
    );

    assert.strictEqual(
        result.humanConfirmedMeanings.get("name"),
        "user.name"
    );
});

test("mapping alone never counts as human confirmation", () => {
    const result =
        resolveHumanConfirmedFieldMappings(
            [{
                sourceFieldKey: "certificate",
                standardEntityName: "recipient_certificate",
                standardFieldName: "certificate_number"
            }],
            []
        );

    assert.deepStrictEqual(
        result.humanConfirmedMappings,
        []
    );
});

module.exports = {};
