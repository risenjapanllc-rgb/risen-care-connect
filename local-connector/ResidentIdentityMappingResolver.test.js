"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveResidentIdentityMapping } =
    require("./ResidentIdentityMappingResolver");

test("prefers exactly one user.user_code mapping", () => {
    const result =
        resolveResidentIdentityMapping([
            {
                sourceFieldKey: "column:name",
                standardEntityName: "user",
                standardFieldName: "name"
            },
            {
                sourceFieldKey: "column:code",
                standardEntityName: "user",
                standardFieldName: "user_code"
            }
        ]);

    assert.deepStrictEqual(result, {
        identifierType: "user_code",
        candidateIdentifierType: "userCode",
        sourceFieldKey: "column:code"
    });
});

test("falls back to exactly one user.name mapping", () => {
    const result =
        resolveResidentIdentityMapping([
            {
                sourceFieldKey: "column:name",
                standardEntityName: "user",
                standardFieldName: "name"
            }
        ]);

    assert.deepStrictEqual(result, {
        identifierType: "name",
        candidateIdentifierType: "name",
        sourceFieldKey: "column:name"
    });
});

test("fails closed for unavailable or ambiguous mappings", () => {
    const cases = [
        [],
        [
            {
                sourceFieldKey: "column:code-a",
                standardEntityName: "user",
                standardFieldName: "user_code"
            },
            {
                sourceFieldKey: "column:code-b",
                standardEntityName: "user",
                standardFieldName: "user_code"
            }
        ],
        [
            {
                sourceFieldKey: "column:name-a",
                standardEntityName: "user",
                standardFieldName: "name"
            },
            {
                sourceFieldKey: "column:name-b",
                standardEntityName: "user",
                standardFieldName: "name"
            }
        ]
    ];

    for (const mappings of cases) {
        assert.throws(
            () =>
                resolveResidentIdentityMapping(
                    mappings
                ),
            error =>
                error?.code ===
                "resident_identifier_mapping_unavailable"
        );
    }
});
