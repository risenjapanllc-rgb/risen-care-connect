"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceTemplateSemanticAuthorityTransport =
    require("./SourceTemplateSemanticAuthorityTransport");

test(
    "GET authority query forwards authenticated template lookup",
    async () => {
        let received = null;

        const transport =
            new SourceTemplateSemanticAuthorityTransport({
                httpAdapter: {
                    async handle() {
                        throw new Error(
                            "POST handler must not run"
                        );
                    },

                    async handleQuery(input) {
                        received = input;

                        return {
                            statusCode: 200,
                            body: {
                                status: "found",
                                mappings: []
                            }
                        };
                    }
                },

                credentialTransport: {
                    extract(value) {
                        assert.equal(
                            value,
                            "RISEN-Connector secret"
                        );

                        return "secret";
                    }
                }
            });

        const result =
            await transport.handle({
                method: "GET",

                headers: {
                    authorization:
                        "RISEN-Connector secret",

                    "x-risen-connector-id":
                        " connector-1 "
                },

                query: {
                    templateId:
                        " template-1 "
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            received.connectorId,
            "connector-1"
        );

        assert.equal(
            received.credential,
            "secret"
        );

        assert.equal(
            received.templateId,
            "template-1"
        );
    }
);

test(
    "GET authority query rejects missing template id",
    async () => {
        const transport =
            new SourceTemplateSemanticAuthorityTransport({
                httpAdapter: {
                    async handle() {
                        return {};
                    },

                    async handleQuery() {
                        throw new Error(
                            "must not run"
                        );
                    }
                },

                credentialTransport: {
                    extract() {
                        return "secret";
                    }
                }
            });

        const result =
            await transport.handle({
                method: "GET",

                headers: {
                    authorization:
                        "RISEN-Connector secret",

                    "x-risen-connector-id":
                        "connector-1"
                },

                query: {}
            });

        assert.equal(
            result.httpStatus,
            422
        );

        assert.equal(
            result.body.errorCode,
            "source_template_semantic_authority_invalid"
        );
    }
);
