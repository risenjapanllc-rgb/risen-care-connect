"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceTemplateExactTransport =
    require("./SourceTemplateExactTransport");

function createTransport() {
    return new SourceTemplateExactTransport({
        credentialTransport: {
            extract(value) {
                return value ===
                    "RISEN-Connector secret"
                    ? "secret"
                    : null;
            }
        },

        httpAdapter: {
            async handle(input) {
                return {
                    statusCode: 200,
                    body: {
                        status: "created",
                        templateId:
                            "template-1",
                        connectorId:
                            input.connectorId
                    }
                };
            }
        }
    });
}

test(
    "accepts exact template envelope",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "RISEN-Connector secret",
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    sourceTemplateExact: {
                        displayName:
                            "利用者台帳"
                    }
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            result.body.status,
            "created"
        );
    }
);

test(
    "rejects unexpected envelope",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "RISEN-Connector secret",
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    wrong:
                        {}
                }
            });

        assert.equal(
            result.httpStatus,
            400
        );

        assert.equal(
            result.body.errorCode,
            "malformed_json"
        );
    }
);
