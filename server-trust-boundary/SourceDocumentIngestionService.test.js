"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceDocumentIngestionService =
    require("./SourceDocumentIngestionService");

function validSourceDocument() {
    return {
        sourceDocumentKey:
            "source-document-key",
        sourceType:
            "csv",
        fileName:
            "source.csv",
        sourceContent: {
            rows: [
                ["A", "B"],
                ["1", "2"]
            ]
        },
        sourceUpdatedAt:
            "2026-09-11T10:00:00.000Z",
        sourceSize:
            123,
        observedAt:
            "2026-09-11T10:01:00.000Z"
    };
}

function createService({
    trustResult = {
        status: "verified",
        verifiedContext: {
            connectorId:
                "verified-connector-id",
            facilityId:
                "verified-facility-id"
        }
    },
    validationResult,
    persistenceResult = {
        status: "created"
    }
} = {}) {
    let persistenceInput;

    const connectorTrustService = {
        async authenticate() {
            return trustResult;
        }
    };

    const sourceDocumentPayloadValidator = {
        validate(sourceDocument) {
            return validationResult || {
                status: "valid",
                validatedSourceDocument:
                    sourceDocument
            };
        }
    };

    const sourceDocumentPersistenceRepository = {
        async upsert(input) {
            persistenceInput = input;

            return persistenceResult;
        }
    };

    return {
        service:
            new SourceDocumentIngestionService({
                connectorTrustService,
                sourceDocumentPayloadValidator,
                sourceDocumentPersistenceRepository
            }),

        getPersistenceInput:
            () => persistenceInput
    };
}

test("requires dependencies", () => {
    assert.throws(
        () =>
            new SourceDocumentIngestionService(),
        /requires connectorTrustService/
    );
});

test("denies persistence when connector trust is denied", async () => {
    const { service } =
        createService({
            trustResult: {
                status: "denied",
                verifiedContext: null
            }
        });

    const result =
        await service.ingest({
            connectorId:
                "connector-id",
            credential:
                "credential",
            sourceDocument:
                validSourceDocument()
        });

    assert.deepStrictEqual(
        result,
        {
            status: "denied",
            errorCode:
                "connector_trust_denied"
        }
    );
});

test("rejects invalid source document before persistence", async () => {
    const { service } =
        createService({
            validationResult: {
                status: "invalid",
                errorCode:
                    "source_document_invalid"
            }
        });

    const result =
        await service.ingest({
            connectorId:
                "connector-id",
            credential:
                "credential",
            sourceDocument:
                validSourceDocument()
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "source_document_invalid"
        }
    );
});

test("persists only verified connector and facility identity", async () => {
    const {
        service,
        getPersistenceInput
    } = createService();

    const sourceDocument = {
        ...validSourceDocument(),

        // Untrusted values must never control persistence identity.
        facilityId:
            "client-supplied-facility",
        connectorId:
            "client-supplied-connector"
    };

    const result =
        await service.ingest({
            connectorId:
                "transport-connector-id",
            credential:
                "credential",
            sourceDocument
        });

    assert.deepStrictEqual(
        result,
        {
            status:
                "created"
        }
    );

    const persisted =
        getPersistenceInput();

    assert.strictEqual(
        persisted.verifiedFacilityId,
        "verified-facility-id"
    );

    assert.strictEqual(
        persisted.verifiedConnectorId,
        "verified-connector-id"
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            persisted,
            "facilityId"
        ),
        false
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            persisted,
            "connectorId"
        ),
        false
    );

    assert.deepStrictEqual(
        {
            sourceDocumentKey:
                persisted.sourceDocumentKey,
            sourceType:
                persisted.sourceType,
            fileName:
                persisted.fileName,
            sourceContent:
                persisted.sourceContent,
            sourceUpdatedAt:
                persisted.sourceUpdatedAt,
            sourceSize:
                persisted.sourceSize,
            observedAt:
                persisted.observedAt
        },
        validSourceDocument()
    );
});

test("returns repository updated and unchanged statuses", async () => {
    for (
        const status
        of [
            "updated",
            "unchanged"
        ]
    ) {
        const { service } =
            createService({
                persistenceResult: {
                    status
                }
            });

        const result =
            await service.ingest({
                connectorId:
                    "connector-id",
                credential:
                    "credential",
                sourceDocument:
                    validSourceDocument()
            });

        assert.deepStrictEqual(
            result,
            {
                status
            }
        );
    }
});

test("does not require resident or semantic data", async () => {
    const { service } =
        createService();

    const result =
        await service.ingest({
            connectorId:
                "connector-id",
            credential:
                "credential",
            sourceDocument:
                validSourceDocument()
        });

    assert.strictEqual(
        result.status,
        "created"
    );
});
