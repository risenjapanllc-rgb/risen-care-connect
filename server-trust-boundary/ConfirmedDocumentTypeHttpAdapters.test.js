"use strict";

const assert = require("assert");
const test = require("node:test");
const ConfirmedDocumentTypeHttpAdapter =
    require("./ConfirmedDocumentTypeHttpAdapter");
const ConfirmedDocumentTypeQueryHttpAdapter =
    require("./ConfirmedDocumentTypeQueryHttpAdapter");

test("persistence adapter returns 200 for created", async () => {
    const adapter = new ConfirmedDocumentTypeHttpAdapter({
        persistenceService: {
            async save() { return { status: "created" }; }
        }
    });

    const result = await adapter.handle({ requestId: "request-1" });

    assert.deepStrictEqual(result, {
        statusCode: 200,
        body: { status: "created" }
    });
});

test("persistence adapter returns 401 for denied", async () => {
    const adapter = new ConfirmedDocumentTypeHttpAdapter({
        persistenceService: {
            async save() { return { status: "denied" }; }
        }
    });

    const result = await adapter.handle({ requestId: "request-2" });

    assert.deepStrictEqual(result, {
        statusCode: 401,
        body: {
            requestId: "request-2",
            status: "denied",
            errorCode: "connector_trust_denied"
        }
    });
});

test("persistence adapter returns 422 for invalid", async () => {
    const adapter = new ConfirmedDocumentTypeHttpAdapter({
        persistenceService: {
            async save() { return { status: "invalid" }; }
        }
    });

    const result = await adapter.handle({ requestId: "request-3" });

    assert.strictEqual(result.statusCode, 422);
    assert.strictEqual(result.body.errorCode, "confirmed_document_type_invalid");
});

test("persistence adapter hides internal errors behind safe 503", async () => {
    const diagnostics = [];
    const adapter = new ConfirmedDocumentTypeHttpAdapter({
        persistenceService: {
            async save() {
                return {
                    status: "error",
                    errorCode: "sensitive_internal_failure"
                };
            }
        },
        diagnosticLogger: {
            error(value) { diagnostics.push(value); }
        }
    });

    const result = await adapter.handle({ requestId: "request-4" });

    assert.deepStrictEqual(result, {
        statusCode: 503,
        body: {
            requestId: "request-4",
            status: "error",
            errorCode: "connector_processing_unavailable"
        }
    });
    assert.strictEqual(JSON.stringify(result).includes("sensitive_internal_failure"), false);
    assert.strictEqual(diagnostics[0].internalErrorCode, "sensitive_internal_failure");
});

test("query adapter returns confirmed document type when found", async () => {
    const confirmation = {
        documentType: "recipient_certificate",
        confirmedAt: "2026-09-20T02:03:04.000Z"
    };

    const adapter = new ConfirmedDocumentTypeQueryHttpAdapter({
        queryService: {
            async get() {
                return { status: "found", confirmation };
            }
        }
    });

    const result = await adapter.handle({ requestId: "request-5" });

    assert.deepStrictEqual(result, {
        statusCode: 200,
        body: { status: "found", confirmation }
    });
});

test("query adapter returns 200 not_found without confirmation", async () => {
    const adapter = new ConfirmedDocumentTypeQueryHttpAdapter({
        queryService: {
            async get() {
                return { status: "not_found", confirmation: null };
            }
        }
    });

    const result = await adapter.handle({ requestId: "request-6" });

    assert.deepStrictEqual(result, {
        statusCode: 200,
        body: { status: "not_found", confirmation: null }
    });
});

test("query adapter returns 401 for denied", async () => {
    const adapter = new ConfirmedDocumentTypeQueryHttpAdapter({
        queryService: {
            async get() { return { status: "denied" }; }
        }
    });

    const result = await adapter.handle({ requestId: "request-7" });

    assert.strictEqual(result.statusCode, 401);
    assert.strictEqual(result.body.errorCode, "connector_trust_denied");
});

test("query adapter returns 422 for invalid scope", async () => {
    const adapter = new ConfirmedDocumentTypeQueryHttpAdapter({
        queryService: {
            async get() { return { status: "invalid" }; }
        }
    });

    const result = await adapter.handle({ requestId: "request-8" });

    assert.strictEqual(result.statusCode, 422);
    assert.strictEqual(result.body.errorCode, "confirmed_document_type_query_invalid");
});

test("query adapter hides thrown application errors behind safe 503", async () => {
    const diagnostics = [];
    const adapter = new ConfirmedDocumentTypeQueryHttpAdapter({
        queryService: {
            async get() { throw new Error("sensitive failure"); }
        },
        diagnosticLogger: {
            error(value) { diagnostics.push(value); }
        }
    });

    const result = await adapter.handle({ requestId: "request-9" });

    assert.deepStrictEqual(result, {
        statusCode: 503,
        body: {
            requestId: "request-9",
            status: "error",
            errorCode: "connector_processing_unavailable"
        }
    });
    assert.strictEqual(JSON.stringify(result).includes("sensitive failure"), false);
    assert.strictEqual(
        diagnostics[0].internalErrorCode,
        "confirmed_document_type_query_application_exception"
    );
});
