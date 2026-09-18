"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordBatchWriteHttpClient =
    require("./ConnectorSupportRecordBatchWriteHttpClient");

function response(status, body) {
    return {
        status,
        async json() {
            return body;
        }
    };
}

function operation(index = 1) {
    return {
        action: "create",
        residentId: `resident-${index}`,
        sourceDocumentKey: "document-1",
        sourceRecordKey: `source-${index}`
    };
}

function createClient(fetchImpl) {
    return new ConnectorSupportRecordBatchWriteHttpClient({
        endpoint: "http://127.0.0.1:8787/connector/support-record-batch-write",
        connectorId: "connector-1",
        credential: "credential-1",
        authorizationScheme: "Bearer",
        fetchImpl
    });
}

test("completed batch sends only operations body", async () => {
    let request = null;
    const operations = [operation(1), operation(2)];

    const client = createClient(async (url, options) => {
        request = { url, options };
        return response(200, {
            status: "completed",
            processed: 2,
            created: 1,
            updated: 1,
            unchanged: 0
        });
    });

    assert.deepEqual(await client.write(operations), {
        status: "completed",
        processed: 2,
        created: 1,
        updated: 1,
        unchanged: 0
    });

    assert.deepEqual(JSON.parse(request.options.body), { operations });
    assert.equal(request.options.method, "POST");
    assert.equal(
        request.options.headers["x-risen-connector-id"],
        "connector-1"
    );
    assert.equal(
        request.options.headers.authorization,
        "Bearer credential-1"
    );
});

test("100 operations are accepted", async () => {
    const operations = Array.from({ length: 100 }, (_, index) =>
        operation(index + 1)
    );

    const client = createClient(async () => response(200, {
        status: "completed",
        processed: 100,
        created: 100,
        updated: 0,
        unchanged: 0
    }));

    const result = await client.write(operations);
    assert.equal(result.status, "completed");
    assert.equal(result.processed, 100);
});

test("101 operations are rejected before request", async () => {
    let called = false;
    const client = createClient(async () => {
        called = true;
        return response(200, {});
    });

    const operations = Array.from({ length: 101 }, (_, index) =>
        operation(index + 1)
    );

    await assert.rejects(
        () => client.write(operations),
        TypeError
    );
    assert.equal(called, false);
});

test("conflict preserves exact partial counts", async () => {
    const client = createClient(async () => response(409, {
        status: "conflict",
        failedIndex: 2,
        processed: 2,
        created: 1,
        updated: 1,
        unchanged: 0
    }));

    assert.deepEqual(
        await client.write([operation(1), operation(2), operation(3)]),
        {
            status: "conflict",
            failedIndex: 2,
            processed: 2,
            created: 1,
            updated: 1,
            unchanged: 0
        }
    );
});

test("resident mismatch preserves exact partial counts", async () => {
    const client = createClient(async () => response(409, {
        status: "resident_mismatch",
        failedIndex: 1,
        processed: 1,
        created: 1,
        updated: 0,
        unchanged: 0
    }));

    const result = await client.write([operation(1), operation(2)]);
    assert.equal(result.status, "resident_mismatch");
    assert.equal(result.failedIndex, 1);
    assert.equal(result.processed, 1);
});

test("inconsistent completed counts are rejected", async () => {
    const client = createClient(async () => response(200, {
        status: "completed",
        processed: 2,
        created: 1,
        updated: 0,
        unchanged: 0
    }));

    await assert.rejects(
        () => client.write([operation(1), operation(2)]),
        error =>
            error.code === "server_trust_boundary_request_failed"
    );
});

test("inconsistent conflict counts are rejected", async () => {
    const client = createClient(async () => response(409, {
        status: "conflict",
        failedIndex: 2,
        processed: 1,
        created: 1,
        updated: 0,
        unchanged: 0
    }));

    await assert.rejects(
        () => client.write([operation(1), operation(2), operation(3)]),
        error =>
            error.code === "server_trust_boundary_request_failed"
    );
});

test("safe boundary error code is preserved", async () => {
    const client = createClient(async () => response(422, {
        errorCode: "support_record_batch_write_invalid"
    }));

    await assert.rejects(
        () => client.write([operation(1)]),
        error =>
            error.code === "support_record_batch_write_invalid" &&
            error.httpStatus === 422
    );
});

test("network failure does not invent partial success", async () => {
    const client = createClient(async () => {
        throw new Error("network");
    });

    await assert.rejects(
        () => client.write([operation(1), operation(2)]),
        error =>
            error.code === "server_trust_boundary_unreachable" &&
            !Object.prototype.hasOwnProperty.call(error, "processed")
    );
});

test("invalid operations are rejected before request", async () => {
    let called = false;
    const client = createClient(async () => {
        called = true;
        return response(200, {});
    });

    for (const operations of [null, [], [null]]) {
        await assert.rejects(
            () => client.write(operations),
            TypeError
        );
    }

    assert.equal(called, false);
});
