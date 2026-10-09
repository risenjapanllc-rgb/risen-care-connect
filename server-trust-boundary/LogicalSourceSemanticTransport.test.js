"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const LogicalSourceSemanticTransport =
    require(
        "./LogicalSourceSemanticTransport"
    );

function validSemanticRecord() {
    return {
        sourceId:
            "source-1",
        sourceRecordKey:
            "a".repeat(64),
        residentId:
            "22222222-2222-4222-8222-222222222222",
        semanticType:
            "resident_profile",
        logicalSlot:
            "primary",
        sourceRevision:
            "b".repeat(64),
        expectedContentHash:
            null,
        contentHash:
            "c".repeat(64),
        canonicalizationVersion:
            "risen-resident-profile-canonicalization-1",
        semanticContent: {
            "user.birth_date":
                "2000-01-01"
        }
    };
}

function createTransport({
    handle,
    extract
} = {}) {
    return new LogicalSourceSemanticTransport({
        httpAdapter: {
            async handle(input) {
                if (handle) {
                    return await handle(
                        input
                    );
                }

                return {
                    statusCode:
                        200,
                    body: {
                        status:
                            "created"
                    }
                };
            }
        },

        credentialTransport: {
            extract(value) {
                if (extract) {
                    return extract(
                        value
                    );
                }

                return value ===
                    "RISEN-Connector secret"
                    ? "secret"
                    : null;
            }
        }
    });
}

test(
    "rejects non-POST requests",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method:
                    "GET",
                contentType:
                    "application/json",
                headers: {},
                body: {}
            });

        assert.deepEqual(
            result,
            {
                httpStatus:
                    405,
                body: {
                    errorCode:
                        "method_not_allowed"
                }
            }
        );
    }
);

test(
    "rejects non-json content type",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method:
                    "POST",
                contentType:
                    "text/plain",
                headers: {},
                body: {}
            });

        assert.deepEqual(
            result,
            {
                httpStatus:
                    415,
                body: {
                    errorCode:
                        "unsupported_media_type"
                }
            }
        );
    }
);

test(
    "rejects malformed semantic envelope",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method:
                    "POST",
                contentType:
                    "application/json",
                headers: {},
                body: {}
            });

        assert.deepEqual(
            result,
            {
                httpStatus:
                    400,
                body: {
                    errorCode:
                        "malformed_json"
                }
            }
        );
    }
);

test(
    "rejects semantic record with extra field",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method:
                    "POST",
                contentType:
                    "application/json",
                headers: {},
                body: {
                    logicalSourceSemanticRecord: {
                        ...validSemanticRecord(),
                        unexpected:
                            true
                    }
                }
            });

        assert.deepEqual(
            result,
            {
                httpStatus:
                    422,
                body: {
                    errorCode:
                        "logical_source_semantic_record_invalid"
                }
            }
        );
    }
);

test(
    "denies missing connector authentication",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method:
                    "POST",
                contentType:
                    "application/json",
                headers: {
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    logicalSourceSemanticRecord:
                        validSemanticRecord()
                }
            });

        assert.deepEqual(
            result,
            {
                httpStatus:
                    401,
                body: {
                    errorCode:
                        "connector_trust_denied"
                }
            }
        );
    }
);

test(
    "forwards exact authenticated semantic record to http adapter",
    async () => {
        let received =
            null;

        const semanticRecord =
            validSemanticRecord();

        const transport =
            createTransport({
                async handle(input) {
                    received =
                        input;

                    return {
                        statusCode:
                            200,
                        body: {
                            status:
                                "created",
                            recordId:
                                "33333333-3333-4333-8333-333333333333"
                        }
                    };
                }
            });

        const result =
            await transport.handle({
                method:
                    "POST",
                contentType:
                    "application/json; charset=utf-8",
                headers: {
                    Authorization:
                        "RISEN-Connector secret",
                    "X-RISEN-CONNECTOR-ID":
                        "connector-1"
                },
                body: {
                    logicalSourceSemanticRecord:
                        semanticRecord
                }
            });

        assert.deepEqual(
            received,
            {
                connectorId:
                    "connector-1",
                credential:
                    "secret",
                semanticRecord
            }
        );

        assert.deepEqual(
            result,
            {
                httpStatus:
                    200,
                body: {
                    status:
                        "created",
                    recordId:
                        "33333333-3333-4333-8333-333333333333"
                }
            }
        );
    }
);
