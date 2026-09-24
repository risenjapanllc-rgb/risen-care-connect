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

test("recipient certificate planner canonicalizes source short dates by semantic meaning", () => {
    const planner =
        new RecipientCertificateSemanticPlanner();

    const result = planner.build({
        sourceEntities: [
            {
                sourceEntityKey: "sheet:0:row:2",
                valuesBySourceFieldKey: {
                    name: "山田 太郎",
                    birthDate: "3/27/84",
                    validUntil: "3/31/27"
                }
            },
            {
                sourceEntityKey: "sheet:0:row:3",
                valuesBySourceFieldKey: {
                    name: "佐藤 健一",
                    birthDate: "8/5/00",
                    validUntil: "8/31/26"
                }
            },
            {
                sourceEntityKey: "sheet:0:row:4",
                valuesBySourceFieldKey: {
                    name: "鈴木 大輔",
                    birthDate: "2/22/77",
                    validUntil: "2/28/27"
                }
            }
        ],
        fieldMappings: [
            {
                sourceFieldKey: "name",
                standardEntityName: "user",
                standardFieldName: "name"
            },
            {
                sourceFieldKey: "birthDate",
                standardEntityName: "user",
                standardFieldName: "birth_date"
            },
            {
                sourceFieldKey: "validUntil",
                standardEntityName: "recipient_certificate",
                standardFieldName: "valid_until"
            }
        ]
    });

    assert.deepStrictEqual(result, [
        {
            sourceEntityKey: "sheet:0:row:2",
            semanticValues: {
                "user.name": "山田 太郎",
                "user.birth_date": "1984-03-27",
                "recipient_certificate.valid_until": "2027-03-31"
            }
        },
        {
            sourceEntityKey: "sheet:0:row:3",
            semanticValues: {
                "user.name": "佐藤 健一",
                "user.birth_date": "2000-08-05",
                "recipient_certificate.valid_until": "2026-08-31"
            }
        },
        {
            sourceEntityKey: "sheet:0:row:4",
            semanticValues: {
                "user.name": "鈴木 大輔",
                "user.birth_date": "1977-02-22",
                "recipient_certificate.valid_until": "2027-02-28"
            }
        }
    ]);
});

test("recipient certificate planner canonicalizes explicit Japanese era dates without guessing ambiguous dates", () => {
    const planner =
        new RecipientCertificateSemanticPlanner();

    const result = planner.build({
        sourceEntities: [
            {
                sourceEntityKey: "sheet:0:row:10",
                valuesBySourceFieldKey: {
                    name: "昭和表記",
                    birthDate: "S41/01/31",
                    validUntil: "R9/03/31"
                }
            },
            {
                sourceEntityKey: "sheet:0:row:11",
                valuesBySourceFieldKey: {
                    name: "昭和漢字表記",
                    birthDate: "昭和41/01/31",
                    validUntil: "令和9/03/31"
                }
            },
            {
                sourceEntityKey: "sheet:0:row:12",
                valuesBySourceFieldKey: {
                    name: "昭和省略表記",
                    birthDate: "昭41/01/31",
                    validUntil: "令9/03/31"
                }
            },
            {
                sourceEntityKey: "sheet:0:row:13",
                valuesBySourceFieldKey: {
                    name: "曖昧表記",
                    birthDate: "41/01/31",
                    validUntil: "27/03/31"
                }
            }
        ],
        fieldMappings: [
            {
                sourceFieldKey: "name",
                standardEntityName: "user",
                standardFieldName: "name"
            },
            {
                sourceFieldKey: "birthDate",
                standardEntityName: "user",
                standardFieldName: "birth_date"
            },
            {
                sourceFieldKey: "validUntil",
                standardEntityName: "recipient_certificate",
                standardFieldName: "valid_until"
            }
        ]
    });

    assert.deepStrictEqual(result, [
        {
            sourceEntityKey: "sheet:0:row:10",
            semanticValues: {
                "user.name": "昭和表記",
                "user.birth_date": "1966-01-31",
                "recipient_certificate.valid_until": "2027-03-31"
            }
        },
        {
            sourceEntityKey: "sheet:0:row:11",
            semanticValues: {
                "user.name": "昭和漢字表記",
                "user.birth_date": "1966-01-31",
                "recipient_certificate.valid_until": "2027-03-31"
            }
        },
        {
            sourceEntityKey: "sheet:0:row:12",
            semanticValues: {
                "user.name": "昭和省略表記",
                "user.birth_date": "1966-01-31",
                "recipient_certificate.valid_until": "2027-03-31"
            }
        },
        {
            sourceEntityKey: "sheet:0:row:13",
            semanticValues: {
                "user.name": "曖昧表記",
                "user.birth_date": "41/01/31",
                "recipient_certificate.valid_until": "27/03/31"
            }
        }
    ]);
});
