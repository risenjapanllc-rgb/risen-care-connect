"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Adapter =
    require("./SourceResidentLinkHttpAdapter");

function createAdapter(result) {
    return new Adapter({
        persistenceService: {
            async save(input) {
                createAdapter.lastInput =
                    input;
                return result;
            }
        }
    });
}

test("adapter maps persisted lifecycle status to 200", async () => {
    const adapter =
        createAdapter({
            status: "created"
        });

    const response =
        await adapter.handle({
            requestId:
                "request-1",
            connectorId:
                "connector",
            credential:
                "secret",
            sourceResidentLink: {
                sourceDocumentKey:
                    "document-1"
            }
        });

    assert.deepStrictEqual(
        createAdapter.lastInput,
        {
            connectorId:
                "connector",
            credential:
                "secret",
            sourceResidentLink: {
                sourceDocumentKey:
                    "document-1"
            }
        }
    );

    assert.deepStrictEqual(
        response,
        {
            statusCode: 200,
            body: {
                status: "created"
            }
        }
    );
});

test("adapter maps denied invalid and error safely", async () => {
    const cases = [
        {
            result: {
                status: "denied"
            },
            expectedStatus:
                401
        },
        {
            result: {
                status: "invalid"
            },
            expectedStatus:
                422
        },
        {
            result: {
                status: "error",
                errorCode:
                    "internal-detail"
            },
            expectedStatus:
                503
        }
    ];

    for (const item of cases) {
        const adapter =
            createAdapter(item.result);

        const response =
            await adapter.handle({
                requestId:
                    "request-1"
            });

        assert.strictEqual(
            response.statusCode,
            item.expectedStatus
        );

        if (item.expectedStatus === 503) {
            assert.strictEqual(
                response.body.errorCode,
                "connector_processing_unavailable"
            );
        }
    }
});
