"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorIngestionPayloadBuilder =
    require("./ConnectorIngestionPayloadBuilder");

test("builds Server Trust Boundary payload from normalized document", () => {
    const builder =
        new ConnectorIngestionPayloadBuilder();

    const result =
        builder.build({
            documentType:
                "support_record",
            sourceType:
                "word",
            source: {
                fileName:
                    "record.docx",
                updatedAt:
                    "2026-09-09T10:00:00Z"
            },
            extracted: {
                sourceResidentIdentifier: {
                    value:
                        "RES-123",
                    sourceLabel:
                        "利用者ID"
                },
                sourceResidentName: {
                    value:
                        "山田 太郎",
                    sourceLabel:
                        "利用者名"
                }
            }
        });

    assert.deepStrictEqual(
        result,
        {
            sourceResident: {
                identifier: {
                    value:
                        "RES-123"
                },
                name: {
                    value:
                        "山田 太郎"
                }
            },
            source: {
                fileName:
                    "record.docx",
                updatedAt:
                    "2026-09-09T10:00:00Z"
            },
            documentType:
                "support_record",
            sourceType:
                "word"
        }
    );
});

test("omits optional resident name when absent", () => {
    const builder =
        new ConnectorIngestionPayloadBuilder();

    const result =
        builder.build({
            documentType:
                "support_record",
            sourceType:
                "excel",
            source: {
                fileName:
                    "record.xlsx",
                updatedAt:
                    "2026-09-09T10:00:00Z"
            },
            extracted: {
                sourceResidentIdentifier: {
                    value:
                        "RES-456"
                }
            }
        });

    assert.deepStrictEqual(
        result.sourceResident,
        {
            identifier: {
                value:
                    "RES-456"
            }
        }
    );
});

test("does not propagate facility, credential, residentId, or unknown fields", () => {
    const builder =
        new ConnectorIngestionPayloadBuilder();

    const result =
        builder.build({
            facilityId:
                "client-facility",
            residentId:
                "client-resident",
            credential:
                "credential-secret",
            token:
                "token-secret",
            secret:
                "secret-value",
            documentType:
                "support_record",
            sourceType:
                "word",
            source: {
                fileName:
                    "record.docx",
                updatedAt:
                    "2026-09-09T10:00:00Z",
                absolutePath:
                    "/private/record.docx"
            },
            extracted: {
                residentId:
                    "legacy-resident-id",
                sourceResidentIdentifier: {
                    value:
                        "RES-123"
                },
                sourceResidentName: {
                    value:
                        "山田 太郎"
                },
                supportContent: {
                    value:
                        "sensitive document content"
                },
                unknown:
                    "unknown-value"
            }
        });

    const serialized =
        JSON.stringify(result);

    assert.strictEqual(
        serialized.includes(
            "client-facility"
        ),
        false
    );

    assert.strictEqual(
        serialized.includes(
            "client-resident"
        ),
        false
    );

    assert.strictEqual(
        serialized.includes(
            "credential-secret"
        ),
        false
    );

    assert.strictEqual(
        serialized.includes(
            "token-secret"
        ),
        false
    );

    assert.strictEqual(
        serialized.includes(
            "secret-value"
        ),
        false
    );

    assert.strictEqual(
        serialized.includes(
            "legacy-resident-id"
        ),
        false
    );

    assert.strictEqual(
        serialized.includes(
            "sensitive document content"
        ),
        false
    );

    assert.strictEqual(
        serialized.includes(
            "/private/record.docx"
        ),
        false
    );

    assert.deepStrictEqual(
        Object.keys(result).sort(),
        [
            "documentType",
            "source",
            "sourceResident",
            "sourceType"
        ]
    );
});

test("returns null when resident identifier is missing", () => {
    const builder =
        new ConnectorIngestionPayloadBuilder();

    assert.strictEqual(
        builder.build({
            documentType:
                "support_record",
            sourceType:
                "word",
            source: {
                fileName:
                    "record.docx",
                updatedAt:
                    "2026-09-09T10:00:00Z"
            },
            extracted: {}
        }),
        null
    );
});

test("does not mutate normalized document", () => {
    const builder =
        new ConnectorIngestionPayloadBuilder();

    const input = {
        documentType:
            "support_record",
        sourceType:
            "word",
        source: {
            fileName:
                "record.docx",
            updatedAt:
                "2026-09-09T10:00:00Z"
        },
        extracted: {
            sourceResidentIdentifier: {
                value:
                    "RES-123"
            }
        }
    };

    const before =
        structuredClone(input);

    builder.build(input);

    assert.deepStrictEqual(
        input,
        before
    );
});
