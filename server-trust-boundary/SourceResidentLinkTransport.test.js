"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Transport =
    require("./SourceResidentLinkTransport");

function createValidLink() {
    return {
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
    };
}

function createTransport({
    onHandle = () => {},
    adapterResult = {
        statusCode: 200,
        body: {
            status: "created"
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

test("transport accepts only the resident-link contract", async () => {
    let adapterInput = null;

    const transport =
        createTransport({
            onHandle(input) {
                adapterInput =
                    input;
            }
        });

    const response =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                authorization:
                    "Bearer secret",
                "x-risen-connector-id":
                    "connector-1"
            },
            body: {
                sourceResidentLink:
                    createValidLink()
            }
        });

    assert.strictEqual(
        response.httpStatus,
        200
    );

    assert.strictEqual(
        adapterInput.connectorId,
        "connector-1"
    );

    assert.strictEqual(
        adapterInput.credential,
        "secret"
    );

    assert.deepStrictEqual(
        adapterInput.sourceResidentLink,
        createValidLink()
    );
});

test("transport rejects forbidden client-controlled fields", async () => {
    const forbiddenFields = [
        "facilityId",
        "connectorId",
        "reviewedByHuman",
        "reviewedAt"
    ];

    for (const field of forbiddenFields) {
        let called = false;

        const transport =
            createTransport({
                onHandle() {
                    called = true;
                }
            });

        const response =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "Bearer secret",
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    sourceResidentLink: {
                        ...createValidLink(),
                        [field]:
                            "must-not-pass"
                    }
                }
            });

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

test("transport rejects candidate matched state", async () => {
    let called = false;

    const transport =
        createTransport({
            onHandle() {
                called = true;
            }
        });

    const response =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                authorization:
                    "Bearer secret",
                "x-risen-connector-id":
                    "connector-1"
            },
            body: {
                sourceResidentLink: {
                    ...createValidLink(),
                    linkStatus:
                        "matched"
                }
            }
        });

    assert.strictEqual(
        response.httpStatus,
        422
    );

    assert.strictEqual(
        called,
        false
    );
});

test("transport enforces residentId semantics and snapshot", async () => {
    const invalidLinks = [
        {
            ...createValidLink(),
            residentId: null
        },
        {
            ...createValidLink(),
            linkStatus:
                "deferred",
            residentId:
                "33333333-3333-3333-3333-333333333333"
        },
        {
            ...createValidLink(),
            sourceUpdatedAt:
                "not-a-date"
        },
        {
            ...createValidLink(),
            sourceSize:
                -1
        }
    ];

    for (const sourceResidentLink of invalidLinks) {
        let called = false;

        const transport =
            createTransport({
                onHandle() {
                    called = true;
                }
            });

        const response =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "Bearer secret",
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    sourceResidentLink
                }
            });

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
