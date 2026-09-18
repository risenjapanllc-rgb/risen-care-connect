"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const PersistenceAdapter =
    require("./SourceRecordIdentityMappingHttpAdapter");
const QueryAdapter =
    require("./SourceRecordIdentityMappingQueryHttpAdapter");
const PersistenceTransport =
    require("./SourceRecordIdentityMappingTransport");
const QueryTransport =
    require("./SourceRecordIdentityMappingQueryTransport");

function credentialTransport() {
    return {
        extract(value) {
            return value ===
                "RISEN-Connector credential"
                ? "credential"
                : null;
        }
    };
}

const headers = {
    "x-risen-connector-id":
        "connector-request",
    authorization:
        "RISEN-Connector credential"
};

const mapping = {
    sourceDocumentKey: "document-1",
    sourceFieldKey: "sheet:0:column:0",
    sheetName: "csv",
    headerLabel: "ID",
    confirmedAt:
        "2026-09-17T02:00:00.000Z",
    sourceUpdatedAt:
        "2026-09-17T00:00:00.000Z",
    sourceSize: 100
};

test("persistence adapter exposes successful status only", async () => {
    const adapter =
        new PersistenceAdapter({
            persistenceService: {
                async save(input) {
                    assert.equal(
                        input.connectorId,
                        "connector-request"
                    );
                    assert.deepStrictEqual(
                        input.sourceRecordIdentityMapping,
                        mapping
                    );
                    return {
                        status: "created"
                    };
                }
            }
        });

    assert.deepStrictEqual(
        await adapter.handle({
            requestId: "request-1",
            connectorId:
                "connector-request",
            credential: "credential",
            sourceRecordIdentityMapping:
                mapping
        }),
        {
            statusCode: 200,
            body: {
                status: "created"
            }
        }
    );
});

test("query adapter returns not_found as normal 200 result", async () => {
    const adapter =
        new QueryAdapter({
            queryService: {
                async get() {
                    return {
                        status: "not_found",
                        mapping: null
                    };
                }
            }
        });

    assert.deepStrictEqual(
        await adapter.handle({
            requestId: "request-2",
            connectorId:
                "connector-request",
            credential: "credential",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-17T00:00:00.000Z",
            sourceSize: 100
        }),
        {
            statusCode: 200,
            body: {
                status: "not_found",
                mapping: null
            }
        }
    );
});

test("query adapter returns confirmed mapping", async () => {
    const stored = {
        sourceFieldKey:
            "sheet:0:column:0",
        sheetName: "csv",
        headerLabel: "ID",
        confirmedAt:
            "2026-09-17T02:00:00.000Z"
    };

    const adapter =
        new QueryAdapter({
            queryService: {
                async get() {
                    return {
                        status: "found",
                        mapping: stored
                    };
                }
            }
        });

    const result =
        await adapter.handle({
            requestId: "request-3",
            connectorId:
                "connector-request",
            credential: "credential",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-17T00:00:00.000Z",
            sourceSize: 100
        });

    assert.equal(
        result.statusCode,
        200
    );
    assert.deepStrictEqual(
        result.body,
        {
            status: "found",
            mapping: stored
        }
    );
});

test("POST transport accepts only exact seven-key identity contract", async () => {
    const calls = [];

    const transport =
        new PersistenceTransport({
            httpAdapter: {
                async handle(input) {
                    calls.push(input);
                    return {
                        statusCode: 200,
                        body: {
                            status: "created"
                        }
                    };
                }
            },
            credentialTransport:
                credentialTransport()
        });

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers,
            body: {
                sourceRecordIdentityMapping:
                    mapping
            }
        });

    assert.equal(
        result.httpStatus,
        200
    );
    assert.equal(
        calls.length,
        1
    );
    assert.deepStrictEqual(
        calls[0].sourceRecordIdentityMapping,
        mapping
    );

    const rejected =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers,
            body: {
                sourceRecordIdentityMapping: {
                    ...mapping,
                    unexpected: true
                }
            }
        });

    assert.equal(
        rejected.httpStatus,
        422
    );
    assert.equal(
        calls.length,
        1
    );
});

test("POST transport rejects missing trust before adapter", async () => {
    let calls = 0;

    const transport =
        new PersistenceTransport({
            httpAdapter: {
                async handle() {
                    calls += 1;
                }
            },
            credentialTransport:
                credentialTransport()
        });

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {},
            body: {
                sourceRecordIdentityMapping:
                    mapping
            }
        });

    assert.equal(
        result.httpStatus,
        401
    );
    assert.equal(calls, 0);
});

test("GET transport accepts only exact snapshot query", async () => {
    const calls = [];

    const transport =
        new QueryTransport({
            httpAdapter: {
                async handle(input) {
                    calls.push(input);
                    return {
                        statusCode: 200,
                        body: {
                            status:
                                "not_found",
                            mapping: null
                        }
                    };
                }
            },
            credentialTransport:
                credentialTransport()
        });

    const result =
        await transport.handle({
            method: "GET",
            headers,
            query: {
                sourceDocumentKey:
                    "document-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize: "100"
            }
        });

    assert.equal(
        result.httpStatus,
        200
    );
    assert.equal(
        calls.length,
        1
    );
    assert.equal(
        calls[0].sourceSize,
        100
    );

    const rejected =
        await transport.handle({
            method: "GET",
            headers,
            query: {
                sourceDocumentKey:
                    "document-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize: "100",
                unexpected: "x"
            }
        });

    assert.equal(
        rejected.httpStatus,
        422
    );
    assert.equal(
        calls.length,
        1
    );
});

test("GET transport rejects missing trust before adapter", async () => {
    let calls = 0;

    const transport =
        new QueryTransport({
            httpAdapter: {
                async handle() {
                    calls += 1;
                }
            },
            credentialTransport:
                credentialTransport()
        });

    const result =
        await transport.handle({
            method: "GET",
            headers: {},
            query: {
                sourceDocumentKey:
                    "document-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize: "100"
            }
        });

    assert.equal(
        result.httpStatus,
        401
    );
    assert.equal(calls, 0);
});
