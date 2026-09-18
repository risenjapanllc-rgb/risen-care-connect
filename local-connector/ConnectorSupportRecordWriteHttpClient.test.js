"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordWriteHttpClient =
    require("./ConnectorSupportRecordWriteHttpClient");

function response(status, body) {
    return {
        status,
        async json() {
            return body;
        }
    };
}

function createClient(fetchImpl) {
    return new ConnectorSupportRecordWriteHttpClient({
        endpoint: "http://127.0.0.1:8787/connector/support-record-write",
        connectorId: "connector-1",
        credential: "credential-1",
        authorizationScheme: "Bearer",
        fetchImpl
    });
}

test("successful write sends only operation body", async () => {
    let request = null;

    const client = createClient(async (url, options) => {
        request = { url, options };
        return response(200, { status: "created" });
    });

    const operation = {
        action: "create",
        residentId: "resident-1"
    };

    assert.deepEqual(
        await client.write(operation),
        { status: "created" }
    );

    assert.deepEqual(
        JSON.parse(request.options.body),
        { operation }
    );

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

test("updated and unchanged are accepted", async () => {
    for (const status of ["updated", "unchanged"]) {
        const client = createClient(
            async () => response(200, { status })
        );

        assert.deepEqual(
            await client.write({ action: "update" }),
            { status }
        );
    }
});

test("conflict response remains conflict", async () => {
    const client = createClient(
        async () => response(409, { status: "conflict" })
    );

    assert.deepEqual(
        await client.write({ action: "update" }),
        { status: "conflict" }
    );
});

test("resident mismatch remains resident mismatch", async () => {
    const client = createClient(
        async () => response(409, { status: "resident_mismatch" })
    );

    assert.deepEqual(
        await client.write({ action: "create" }),
        { status: "resident_mismatch" }
    );
});

test("safe boundary error code is preserved", async () => {
    const client = createClient(
        async () => response(422, {
            errorCode: "support_record_write_invalid"
        })
    );

    await assert.rejects(
        () => client.write({ action: "create" }),
        error =>
            error.code === "support_record_write_invalid" &&
            error.httpStatus === 422
    );
});

test("unexpected response is rejected safely", async () => {
    const client = createClient(
        async () => response(200, { status: "unexpected" })
    );

    await assert.rejects(
        () => client.write({ action: "create" }),
        error =>
            error.code ===
                "server_trust_boundary_request_failed"
    );
});

test("invalid operation is rejected before request", async () => {
    let called = false;

    const client = createClient(async () => {
        called = true;
        return response(200, { status: "created" });
    });

    await assert.rejects(
        () => client.write(null),
        TypeError
    );

    assert.equal(called, false);
});
