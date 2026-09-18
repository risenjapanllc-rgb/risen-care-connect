"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordBatchWriteHttpAdapter =
    require("./ConnectorSupportRecordBatchWriteHttpAdapter");
const ConnectorSupportRecordBatchWriteTransport =
    require("./ConnectorSupportRecordBatchWriteTransport");

function operation(index = 1) {
    return {
        action: "create",
        residentId: `resident-${index}`,
        sourceDocumentKey: "document-1",
        sourceRecordKey: `source-${index}`
    };
}

function createTransport(writeImpl) {
    const calls = [];

    const batchWriteService = {
        async write(input) {
            calls.push(input);
            return writeImpl(input);
        }
    };

    const adapter =
        new ConnectorSupportRecordBatchWriteHttpAdapter({
            batchWriteService
        });

    const credentialTransport = {
        extract(value) {
            if (value === "Bearer credential") {
                return "credential";
            }
            return null;
        }
    };

    return {
        transport: new ConnectorSupportRecordBatchWriteTransport({
            httpAdapter: adapter,
            credentialTransport
        }),
        calls
    };
}

function request(body, authorization = "Bearer credential") {
    return {
        method: "POST",
        headers: {
            authorization,
            "x-risen-connector-id": "connector-header"
        },
        contentType: "application/json",
        body
    };
}

test("valid batch reaches service with operations only", async () => {
    const { transport, calls } = createTransport(async () => ({
        status: "completed",
        processed: 2,
        created: 1,
        updated: 1,
        unchanged: 0
    }));

    const operations = [operation(1), operation(2)];
    const result = await transport.handle(
        request({ operations })
    );

    assert.deepEqual(result, {
        httpStatus: 200,
        body: {
            status: "completed",
            processed: 2,
            created: 1,
            updated: 1,
            unchanged: 0
        }
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].connectorId, "connector-header");
    assert.equal(calls[0].credential, "credential");
    assert.deepEqual(calls[0].operations, operations);
});

test("extra body authority is rejected before service", async () => {
    const { transport, calls } = createTransport(async () => ({
        status: "completed"
    }));

    const result = await transport.handle(request({
        operations: [operation(1)],
        facilityId: "facility-body"
    }));

    assert.equal(result.httpStatus, 422);
    assert.equal(
        result.body.errorCode,
        "support_record_batch_write_invalid"
    );
    assert.equal(calls.length, 0);
});

test("101 operations are rejected before service", async () => {
    const { transport, calls } = createTransport(async () => ({
        status: "completed"
    }));

    const operations = Array.from({ length: 101 }, (_, index) =>
        operation(index + 1)
    );

    const result = await transport.handle(
        request({ operations })
    );

    assert.equal(result.httpStatus, 422);
    assert.equal(calls.length, 0);
});

test("missing credential is denied before service", async () => {
    const { transport, calls } = createTransport(async () => ({
        status: "completed"
    }));

    const result = await transport.handle(
        request({ operations: [operation(1)] }, "")
    );

    assert.equal(result.httpStatus, 401);
    assert.equal(result.body.errorCode, "connector_trust_denied");
    assert.equal(calls.length, 0);
});

test("conflict preserves partial counts", async () => {
    const { transport } = createTransport(async () => ({
        status: "conflict",
        failedIndex: 2,
        processed: 2,
        created: 1,
        updated: 1,
        unchanged: 0
    }));

    const result = await transport.handle(request({
        operations: [operation(1), operation(2), operation(3)]
    }));

    assert.deepEqual(result, {
        httpStatus: 409,
        body: {
            status: "conflict",
            failedIndex: 2,
            processed: 2,
            created: 1,
            updated: 1,
            unchanged: 0
        }
    });
});

test("resident mismatch preserves partial counts", async () => {
    const { transport } = createTransport(async () => ({
        status: "resident_mismatch",
        failedIndex: 1,
        processed: 1,
        created: 1,
        updated: 0,
        unchanged: 0
    }));

    const result = await transport.handle(request({
        operations: [operation(1), operation(2)]
    }));

    assert.equal(result.httpStatus, 409);
    assert.equal(result.body.status, "resident_mismatch");
    assert.equal(result.body.failedIndex, 1);
    assert.equal(result.body.processed, 1);
});

test("service exception becomes safe 503", async () => {
    const { transport } = createTransport(async () => {
        throw new Error("private database detail");
    });

    const result = await transport.handle(request({
        operations: [operation(1)]
    }));

    assert.equal(result.httpStatus, 503);
    assert.equal(
        result.body.errorCode,
        "connector_processing_unavailable"
    );
    assert.equal(
        JSON.stringify(result.body).includes("private database detail"),
        false
    );
});

test("denied service result becomes 401", async () => {
    const { transport } = createTransport(async () => ({
        status: "denied",
        errorCode: "connector_trust_denied"
    }));

    const result = await transport.handle(request({
        operations: [operation(1)]
    }));

    assert.equal(result.httpStatus, 401);
    assert.equal(result.body.errorCode, "connector_trust_denied");
});


test("createErrorResponse returns safe transport envelope", () => {
    const transport =
        new ConnectorSupportRecordBatchWriteTransport({
            httpAdapter: {
                async handle() {
                    throw new Error("unexpected");
                }
            },
            credentialTransport: {
                extract() {
                    return null;
                }
            }
        });

    const result =
        transport.createErrorResponse({
            httpStatus: 503,
            errorCode:
                "connector_processing_unavailable"
        });

    assert.equal(result.httpStatus, 503);
    assert.equal(
        result.body.errorCode,
        "connector_processing_unavailable"
    );
    assert.equal(
        typeof result.body.requestId,
        "string"
    );
    assert.ok(result.body.requestId.length > 0);
});
