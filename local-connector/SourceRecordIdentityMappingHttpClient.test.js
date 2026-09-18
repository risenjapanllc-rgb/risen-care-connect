"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Client =
    require("./SourceRecordIdentityMappingHttpClient");

function createClient(responses = []) {
    const requests = [];

    const client =
        new Client({
            endpoint:
                "http://127.0.0.1:8787/connector/source-record-identity-mapping",
            connectorId:
                "connector-A",
            credential:
                "test-credential",
            authorizationScheme:
                "RISEN-Connector",
            fetchImpl:
                async (url, options) => {
                    requests.push({
                        url,
                        options
                    });

                    const response =
                        responses.shift();

                    return {
                        ok:
                            response.status >= 200 &&
                            response.status < 300,
                        status:
                            response.status,
                        async json() {
                            return response.body;
                        }
                    };
                }
        });

    return {
        client,
        requests
    };
}

const snapshot = {
    sourceDocumentKey: "document-1",
    sourceUpdatedAt:
        "2026-09-17T00:00:00.000Z",
    sourceSize: 100
};

test("save sends identity mapping without trust secrets in body", async () => {
    const { client, requests } =
        createClient([{
            status: 200,
            body: {
                status: "created"
            }
        }]);

    assert.deepStrictEqual(
        await client.save({
            ...snapshot,
            sourceFieldKey:
                "sheet:0:column:0",
            sheetName: "csv",
            headerLabel: "ID",
            confirmedAt:
                "2026-09-17T01:00:00.000Z"
        }),
        {
            status: "created"
        }
    );

    const request =
        requests[0];

    assert.equal(
        request.options.method,
        "POST"
    );

    assert.equal(
        request.options.headers[
            "x-risen-connector-id"
        ],
        "connector-A"
    );

    assert.equal(
        request.options.headers.authorization,
        "RISEN-Connector test-credential"
    );

    const body =
        JSON.parse(request.options.body);

    assert.deepStrictEqual(
        body,
        {
            sourceRecordIdentityMapping: {
                sourceDocumentKey:
                    "document-1",
                sourceFieldKey:
                    "sheet:0:column:0",
                sheetName: "csv",
                headerLabel: "ID",
                confirmedAt:
                    "2026-09-17T01:00:00.000Z",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize: 100
            }
        }
    );

    assert.equal(
        request.options.body.includes(
            "test-credential"
        ),
        false
    );
    assert.equal(
        request.options.body.includes(
            "connector-A"
        ),
        false
    );
});

test("get uses exact snapshot query", async () => {
    const { client, requests } =
        createClient([{
            status: 200,
            body: {
                status: "found",
                mapping: {
                    sourceFieldKey:
                        "sheet:0:column:0",
                    sheetName: "csv",
                    headerLabel: "ID",
                    confirmedAt:
                        "2026-09-17T01:00:00.000Z"
                }
            }
        }]);

    const result =
        await client.get(snapshot);

    assert.equal(
        result.status,
        "found"
    );

    const request =
        requests[0];

    const url =
        new URL(request.url);

    assert.equal(
        request.options.method,
        "GET"
    );

    assert.deepStrictEqual(
        Object.fromEntries(
            url.searchParams.entries()
        ),
        {
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-17T00:00:00.000Z",
            sourceSize: "100"
        }
    );
});

test("get preserves not_found without inventing mapping", async () => {
    const { client } =
        createClient([{
            status: 200,
            body: {
                status: "not_found",
                mapping: null
            }
        }]);

    assert.deepStrictEqual(
        await client.get(snapshot),
        {
            status: "not_found",
            mapping: null
        }
    );
});

test("invalid snapshot is rejected before network access", async () => {
    const { client, requests } =
        createClient([]);

    await assert.rejects(
        client.get({
            ...snapshot,
            sourceSize: -1
        }),
        TypeError
    );

    assert.equal(
        requests.length,
        0
    );
});

test("invalid identity field is rejected before network access", async () => {
    const { client, requests } =
        createClient([]);

    await assert.rejects(
        client.save({
            ...snapshot,
            sourceFieldKey: " ",
            confirmedAt:
                "2026-09-17T01:00:00.000Z"
        }),
        TypeError
    );

    assert.equal(
        requests.length,
        0
    );
});

test("unsafe server error metadata is not propagated", async () => {
    const { client } =
        createClient([{
            status: 503,
            body: {
                errorCode:
                    "internal_database_detail",
                internalDetail:
                    "must-not-propagate"
            }
        }]);

    await assert.rejects(
        client.get(snapshot),
        error => {
            assert.equal(
                error.code,
                "server_trust_boundary_request_failed"
            );
            assert.equal(
                error.internalDetail,
                undefined
            );
            return true;
        }
    );
});
