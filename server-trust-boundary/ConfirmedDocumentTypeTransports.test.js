"use strict";

const assert = require("assert");
const test = require("node:test");
const ConfirmedDocumentTypeTransport =
    require("./ConfirmedDocumentTypeTransport");
const ConfirmedDocumentTypeQueryTransport =
    require("./ConfirmedDocumentTypeQueryTransport");

const headers = {
    "x-risen-connector-id": "connector-1",
    authorization: "Bearer credential-1"
};

const credentialTransport = {
    extract(value) {
        return value === "Bearer credential-1" ? "credential-1" : null;
    }
};

const confirmation = {
    sourceDocumentKey: "source-document",
    documentType: "recipient_certificate",
    confirmedAt: "2026-09-20T02:03:04.000Z",
    sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
    sourceSize: 1234
};

test("POST passes normalized confirmation to adapter", async () => {
    let adapterInput = null;
    const transport = new ConfirmedDocumentTypeTransport({
        credentialTransport,
        httpAdapter: {
            async handle(input) {
                adapterInput = input;
                return { statusCode: 200, body: { status: "created" } };
            }
        }
    });

    const result = await transport.handle({
        method: "POST",
        contentType: "application/json",
        headers,
        body: { confirmation }
    });

    assert.strictEqual(result.httpStatus, 200);
    assert.strictEqual(adapterInput.connectorId, "connector-1");
    assert.strictEqual(adapterInput.credential, "credential-1");
    assert.deepStrictEqual(adapterInput.confirmation, confirmation);
});

test("POST rejects facilityId and does not call adapter", async () => {
    let adapterCalled = false;
    const transport = new ConfirmedDocumentTypeTransport({
        credentialTransport,
        httpAdapter: {
            async handle() {
                adapterCalled = true;
                return { statusCode: 200, body: { status: "created" } };
            }
        }
    });

    const result = await transport.handle({
        method: "POST",
        contentType: "application/json",
        headers,
        body: {
            confirmation: {
                ...confirmation,
                facilityId: "untrusted-facility"
            }
        }
    });

    assert.strictEqual(result.httpStatus, 422);
    assert.strictEqual(result.body.errorCode, "confirmed_document_type_invalid");
    assert.strictEqual(adapterCalled, false);
});

test("POST requires exact JSON envelope", async () => {
    let adapterCalled = false;
    const transport = new ConfirmedDocumentTypeTransport({
        credentialTransport,
        httpAdapter: {
            async handle() {
                adapterCalled = true;
                return { statusCode: 200, body: { status: "created" } };
            }
        }
    });

    const result = await transport.handle({
        method: "POST",
        contentType: "application/json",
        headers,
        body: { confirmation, extra: true }
    });

    assert.strictEqual(result.httpStatus, 400);
    assert.strictEqual(adapterCalled, false);
});

test("POST rejects missing connector trust headers", async () => {
    const transport = new ConfirmedDocumentTypeTransport({
        credentialTransport,
        httpAdapter: {
            async handle() {
                throw new Error("adapter must not be called");
            }
        }
    });

    const result = await transport.handle({
        method: "POST",
        contentType: "application/json",
        headers: {},
        body: { confirmation }
    });

    assert.strictEqual(result.httpStatus, 401);
    assert.strictEqual(result.body.errorCode, "connector_trust_denied");
});

test("GET passes exact snapshot scope to adapter", async () => {
    let adapterInput = null;
    const transport = new ConfirmedDocumentTypeQueryTransport({
        credentialTransport,
        httpAdapter: {
            async handle(input) {
                adapterInput = input;
                return {
                    statusCode: 200,
                    body: {
                        status: "found",
                        confirmation: {
                            documentType: "recipient_certificate",
                            confirmedAt: "2026-09-20T02:03:04.000Z"
                        }
                    }
                };
            }
        }
    });

    const result = await transport.handle({
        method: "GET",
        headers,
        query: {
            sourceDocumentKey: "source-document",
            sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
            sourceSize: "1234"
        }
    });

    assert.strictEqual(result.httpStatus, 200);
    assert.strictEqual(adapterInput.connectorId, "connector-1");
    assert.strictEqual(adapterInput.credential, "credential-1");
    assert.strictEqual(adapterInput.sourceDocumentKey, "source-document");
    assert.strictEqual(adapterInput.sourceUpdatedAt, "2026-09-20T01:02:03.000Z");
    assert.strictEqual(adapterInput.sourceSize, 1234);
});

test("GET rejects extra query parameters", async () => {
    let adapterCalled = false;
    const transport = new ConfirmedDocumentTypeQueryTransport({
        credentialTransport,
        httpAdapter: {
            async handle() {
                adapterCalled = true;
                return { statusCode: 200, body: { status: "not_found" } };
            }
        }
    });

    const result = await transport.handle({
        method: "GET",
        headers,
        query: {
            sourceDocumentKey: "source-document",
            sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
            sourceSize: "1234",
            facilityId: "untrusted-facility"
        }
    });

    assert.strictEqual(result.httpStatus, 422);
    assert.strictEqual(
        result.body.errorCode,
        "confirmed_document_type_query_invalid"
    );
    assert.strictEqual(adapterCalled, false);
});

test("invalid adapter result fails closed with 503", async () => {
    const transport = new ConfirmedDocumentTypeQueryTransport({
        credentialTransport,
        httpAdapter: {
            async handle() {
                return null;
            }
        }
    });

    const result = await transport.handle({
        method: "GET",
        headers,
        query: {
            sourceDocumentKey: "source-document",
            sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
            sourceSize: "1234"
        }
    });

    assert.strictEqual(result.httpStatus, 503);
    assert.strictEqual(result.body.errorCode, "connector_processing_unavailable");
});
