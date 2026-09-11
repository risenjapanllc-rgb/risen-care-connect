"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceDocumentIngestionService =
    require("./SourceDocumentIngestionService");

const SourceDocumentPayloadValidator =
    require("./SourceDocumentPayloadValidator");

function createService() {
    let persistedInput;

    const connectorTrustService = {
        async authenticate() {
            return {
                status: "verified",
                verifiedContext: {
                    connectorId:
                        "verified-connector-id",
                    facilityId:
                        "verified-facility-id"
                }
            };
        }
    };

    const sourceDocumentPersistenceRepository = {
        async upsert(input) {
            persistedInput = input;

            return {
                status: "created"
            };
        }
    };

    return {
        service:
            new SourceDocumentIngestionService({
                connectorTrustService,
                sourceDocumentPayloadValidator:
                    new SourceDocumentPayloadValidator(),
                sourceDocumentPersistenceRepository
            }),

        getPersistedInput:
            () => persistedInput
    };
}

test("validates raw source and persists with verified trust context", async () => {
    const {
        service,
        getPersistedInput
    } = createService();

    const result =
        await service.ingest({
            connectorId:
                "transport-connector-id",
            credential:
                "credential",
            sourceDocument: {
                sourceDocumentKey:
                    "source-document-key",
                sourceType:
                    "xlsx",
                fileName:
                    "source.xlsx",
                sourceContent: {
                    sheetNames: [
                        "Sheet1"
                    ],
                    sheets: {
                        Sheet1: [
                            ["A", "B"],
                            ["1", "2"]
                        ]
                    }
                },
                sourceUpdatedAt:
                    null,
                sourceSize:
                    456,
                observedAt:
                    "2026-09-11T10:01:00.000Z",

                facilityId:
                    "untrusted-facility",
                connectorId:
                    "untrusted-connector",
                residentId:
                    "untrusted-resident"
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "created"
        }
    );

    assert.deepStrictEqual(
        getPersistedInput(),
        {
            verifiedFacilityId:
                "verified-facility-id",
            verifiedConnectorId:
                "verified-connector-id",
            sourceDocumentKey:
                "source-document-key",
            sourceType:
                "xlsx",
            fileName:
                "source.xlsx",
            sourceContent: {
                sheetNames: [
                    "Sheet1"
                ],
                sheets: {
                    Sheet1: [
                        ["A", "B"],
                        ["1", "2"]
                    ]
                }
            },
            sourceUpdatedAt:
                null,
            sourceSize:
                456,
            observedAt:
                "2026-09-11T10:01:00.000Z"
        }
    );
});

test("rejects structurally invalid source before persistence", async () => {
    const {
        service,
        getPersistedInput
    } = createService();

    const result =
        await service.ingest({
            connectorId:
                "transport-connector-id",
            credential:
                "credential",
            sourceDocument: {
                sourceDocumentKey:
                    "",
                sourceType:
                    "csv",
                fileName:
                    "source.csv",
                sourceContent: {},
                sourceUpdatedAt:
                    null,
                sourceSize:
                    null,
                observedAt:
                    "2026-09-11T10:01:00.000Z"
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "source_document_invalid"
        }
    );

    assert.strictEqual(
        getPersistedInput(),
        undefined
    );
});
