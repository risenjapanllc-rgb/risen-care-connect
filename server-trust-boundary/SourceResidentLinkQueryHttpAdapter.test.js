"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Adapter =
    require("./SourceResidentLinkQueryHttpAdapter");

function createAdapter(result) {
    let receivedInput = null;

    const adapter =
        new Adapter({
            queryService: {
                async list(input) {
                    receivedInput =
                        input;
                    return result;
                }
            }
        });

    return {
        adapter,
        getReceivedInput() {
            return receivedInput;
        }
    };
}

test("adapter maps found resident links to 200", async () => {
    const links = [
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
    ];

    const {
        adapter,
        getReceivedInput
    } = createAdapter({
        status: "found",
        links
    });

    const response =
        await adapter.handle({
            requestId:
                "request-1",
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
        });

    assert.deepStrictEqual(
        getReceivedInput(),
        {
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

    assert.deepStrictEqual(
        response,
        {
            statusCode: 200,
            body: {
                status: "found",
                links
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
                    "database-internal-detail"
            },
            expectedStatus:
                503
        }
    ];

    for (const item of cases) {
        const {
            adapter
        } = createAdapter(
            item.result
        );

        const response =
            await adapter.handle({
                requestId:
                    "request-1"
            });

        assert.strictEqual(
            response.statusCode,
            item.expectedStatus
        );

        if (
            item.expectedStatus === 503
        ) {
            assert.strictEqual(
                response.body.errorCode,
                "connector_processing_unavailable"
            );
        }
    }
});
