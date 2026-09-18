"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Transport =
    require("./SourceResidentLinkQueryTransport");

function createTransport({
    onHandle = () => {},
    adapterResult = {
        statusCode: 200,
        body: {
            status: "found",
            links: []
        }
    }
} = {}) {
    return new Transport({
        httpAdapter: {
            async handle(input) {
                onHandle(input);
                return adapterResult;
            }
        },
        credentialTransport: {
            extract(value) {
                return value ===
                    "Bearer secret"
                    ? "secret"
                    : null;
            }
        }
    });
}

function createValidRequest() {
    return {
        method: "GET",
        headers: {
            authorization:
                "Bearer secret",
            "x-risen-connector-id":
                "connector-1"
        },
        query: {
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                "9520"
        }
    };
}

test("transport accepts exact snapshot query and connector trust headers", async () => {
    let adapterInput = null;

    const transport =
        createTransport({
            onHandle(input) {
                adapterInput =
                    input;
            }
        });

    const response =
        await transport.handle(
            createValidRequest()
        );

    assert.strictEqual(
        response.httpStatus,
        200
    );

    assert.deepStrictEqual(
        adapterInput,
        {
            requestId:
                adapterInput.requestId,
            connectorId:
                "connector-1",
            credential:
                "secret",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        }
    );

    assert.strictEqual(
        typeof adapterInput.requestId,
        "string"
    );
});

test("transport rejects extra client-controlled scope query keys", async () => {
    for (
        const forbiddenKey
        of [
            "facilityId",
            "connectorId"
        ]
    ) {
        let called = false;

        const transport =
            createTransport({
                onHandle() {
                    called = true;
                }
            });

        const request =
            createValidRequest();

        request.query[
            forbiddenKey
        ] = "must-not-pass";

        const response =
            await transport.handle(
                request
            );

        assert.strictEqual(
            response.httpStatus,
            422
        );

        assert.strictEqual(
            called,
            false
        );
    }
});

test("transport rejects invalid or incomplete source snapshot", async () => {
    const invalidQueries = [
        {
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "not-a-date",
            sourceSize:
                "9520"
        },
        {
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                "-1"
        },
        {
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z"
        }
    ];

    for (
        const query
        of invalidQueries
    ) {
        let called = false;

        const transport =
            createTransport({
                onHandle() {
                    called = true;
                }
            });

        const request =
            createValidRequest();

        request.query =
            query;

        const response =
            await transport.handle(
                request
            );

        assert.strictEqual(
            response.httpStatus,
            422
        );

        assert.strictEqual(
            called,
            false
        );
    }
});
