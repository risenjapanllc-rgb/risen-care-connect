"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceResidentLinkHttpClient =
    require("./SourceResidentLinkHttpClient");

function createClient({
    responses = []
} = {}) {
    const requests = [];

    const client =
        new SourceResidentLinkHttpClient({
            endpoint:
                "http://127.0.0.1:8787/connector/source-resident-links",
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
                        responses.shift() || {
                            status: 200,
                            body: {}
                        };

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

test("saves confirmed resident link with exact human-reviewed source snapshot contract", async () => {
    const {
        client,
        requests
    } = createClient({
        responses: [
            {
                status: 200,
                body: {
                    status:
                        "created"
                }
            }
        ]
    });

    const result =
        await client.save({
            sourceDocumentKey:
                "document-1",
            sourceEntityKey:
                "sheet:0:row:2",
            linkStatus:
                "confirmed",
            residentId:
                "33333333-3333-3333-3333-333333333333",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.deepStrictEqual(
        result,
        {
            status:
                "created"
        }
    );

    assert.strictEqual(
        requests.length,
        1
    );

    const request =
        requests[0];

    assert.strictEqual(
        request.url,
        "http://127.0.0.1:8787/connector/source-resident-links"
    );

    assert.strictEqual(
        request.options.method,
        "POST"
    );

    assert.strictEqual(
        request.options.headers[
            "x-risen-connector-id"
        ],
        "connector-A"
    );

    assert.strictEqual(
        request.options.headers.authorization,
        "RISEN-Connector test-credential"
    );

    assert.deepStrictEqual(
        JSON.parse(
            request.options.body
        ),
        {
            sourceResidentLink: {
                sourceDocumentKey:
                    "document-1",
                sourceEntityKey:
                    "sheet:0:row:2",
                linkStatus:
                    "confirmed",
                residentId:
                    "33333333-3333-3333-3333-333333333333",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            }
        }
    );
});

test("saves deferred and no_match only with null residentId", async () => {
    const {
        client,
        requests
    } = createClient({
        responses: [
            {
                status: 200,
                body: {
                    status:
                        "unchanged"
                }
            },
            {
                status: 200,
                body: {
                    status:
                        "updated"
                }
            }
        ]
    });

    await client.save({
        sourceDocumentKey:
            "document-1",
        sourceEntityKey:
            "sheet:0:row:3",
        linkStatus:
            "deferred",
        residentId:
            null,
        sourceUpdatedAt:
            "2026-09-15T02:30:00.000Z",
        sourceSize:
            9520
    });

    await client.save({
        sourceDocumentKey:
            "document-1",
        sourceEntityKey:
            "sheet:0:row:4",
        linkStatus:
            "no_match",
        residentId:
            null,
        sourceUpdatedAt:
            "2026-09-15T02:30:00.000Z",
        sourceSize:
            9520
    });

    assert.deepStrictEqual(
        requests.map(request =>
            JSON.parse(
                request.options.body
            ).sourceResidentLink
        ),
        [
            {
                sourceDocumentKey:
                    "document-1",
                sourceEntityKey:
                    "sheet:0:row:3",
                linkStatus:
                    "deferred",
                residentId:
                    null,
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            },
            {
                sourceDocumentKey:
                    "document-1",
                sourceEntityKey:
                    "sheet:0:row:4",
                linkStatus:
                    "no_match",
                residentId:
                    null,
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            }
        ]
    );
});

test("lists resident links using only exact source snapshot query", async () => {
    const {
        client,
        requests
    } = createClient({
        responses: [
            {
                status: 200,
                body: {
                    status:
                        "found",
                    links: [
                        {
                            sourceEntityKey:
                                "sheet:0:row:2",
                            residentId:
                                "33333333-3333-3333-3333-333333333333",
                            linkStatus:
                                "confirmed",
                            reviewedByHuman:
                                true,
                            reviewedAt:
                                "2026-09-15T03:00:00.000Z"
                        }
                    ]
                }
            }
        ]
    });

    const result =
        await client.list({
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.strictEqual(
        result.status,
        "found"
    );

    assert.strictEqual(
        result.links.length,
        1
    );

    const request =
        requests[0];

    const url =
        new URL(request.url);

    assert.strictEqual(
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
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                "9520"
        }
    );

    assert.strictEqual(
        request.options.headers[
            "x-risen-connector-id"
        ],
        "connector-A"
    );
});

test("rejects matched and invalid resident semantics before network access", async () => {
    const {
        client,
        requests
    } = createClient();

    await assert.rejects(
        client.save({
            sourceDocumentKey:
                "document-1",
            sourceEntityKey:
                "sheet:0:row:2",
            linkStatus:
                "matched",
            residentId:
                "33333333-3333-3333-3333-333333333333",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        })
    );

    await assert.rejects(
        client.save({
            sourceDocumentKey:
                "document-1",
            sourceEntityKey:
                "sheet:0:row:2",
            linkStatus:
                "confirmed",
            residentId:
                null,
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        })
    );

    await assert.rejects(
        client.save({
            sourceDocumentKey:
                "document-1",
            sourceEntityKey:
                "sheet:0:row:2",
            linkStatus:
                "deferred",
            residentId:
                "33333333-3333-3333-3333-333333333333",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        })
    );

    assert.strictEqual(
        requests.length,
        0
    );
});

test("rejects invalid list snapshot before network access", async () => {
    const {
        client,
        requests
    } = createClient();

    await assert.rejects(
        client.list({
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "not-a-date",
            sourceSize:
                9520
        })
    );

    await assert.rejects(
        client.list({
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                -1
        })
    );

    assert.strictEqual(
        requests.length,
        0
    );
});
