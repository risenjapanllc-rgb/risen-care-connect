"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticRecordPipeline =
    require("./SemanticRecordPipeline");

test("validated and processed record without sourceRecordKey remains pending review", () => {
    const calls = [];

    const semanticRecordValidator = {
        validate(record) {
            calls.push(["validate", record]);

            return {
                status: "valid",
                validatedSemanticRecord: record
            };
        }
    };

    const semanticContentProcessor = {
        process(record) {
            calls.push(["process", record]);

            return {
                status: "processed",
                processedSemanticRecord: {
                    ...record,
                    contentHash: "a".repeat(64),
                    processingMetadata: {
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    }
                }
            };
        }
    };

    const recordIdentityResolver = {
        resolve(identityContext) {
            calls.push([
                "resolve",
                identityContext
            ]);

            assert.deepStrictEqual(
                identityContext,
                {
                    verifiedFacilityId:
                        "facility-1",
                    verifiedConnectorId:
                        "connector-1",
                    sourceDocumentKey:
                        "document-key-1"
                }
            );

            return {
                status: "pending_review"
            };
        }
    };

    const pipeline =
        new SemanticRecordPipeline({
            semanticRecordValidator,
            semanticContentProcessor,
            recordIdentityResolver
        });

    const semanticRecord = {
        sourceRecordContext: {
            sourceResidentIdentifier:
                "RES-123"
        },
        semanticContent: {
            semanticType:
                "support_record",
            fields: {
                supportContent:
                    "支援内容"
            },
            customFields: {}
        },
        provenance: {
            sourceDocumentKey:
                "document-key-1",
            documentType:
                "support_record",
            sourceType:
                "word"
        }
    };

    const result =
        pipeline.process({
            verifiedContext: {
                connectorId:
                    "connector-1",
                facilityId:
                    "facility-1"
            },
            semanticRecord
        });

    assert.deepStrictEqual(
        result.identityResolution,
        {
            status: "pending_review"
        }
    );

    assert.strictEqual(
        result.status,
        "pending_review"
    );

    assert.strictEqual(
        result.processedSemanticRecord
            .contentHash,
        "a".repeat(64)
    );

    assert.deepStrictEqual(
        calls.map(([name]) => name),
        [
            "validate",
            "process",
            "resolve"
        ]
    );
});
