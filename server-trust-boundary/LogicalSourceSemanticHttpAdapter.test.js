"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const LogicalSourceSemanticHttpAdapter =
    require(
        "./LogicalSourceSemanticHttpAdapter"
    );

test(
    "connector trust denial is returned as HTTP 401",
    async () => {
        const adapter =
            new LogicalSourceSemanticHttpAdapter({
                persistenceService: {
                    async persist() {
                        return {
                            status:
                                "denied",
                            errorCode:
                                "connector_trust_denied"
                        };
                    }
                }
            });

        const result =
            await adapter.handle({});

        assert.deepStrictEqual(
            result,
            {
                statusCode:
                    401,
                body: {
                    errorCode:
                        "connector_trust_denied"
                }
            }
        );
    }
);

test(
    "semantic conflict remains a successful HTTP exchange with conflict status",
    async () => {
        const adapter =
            new LogicalSourceSemanticHttpAdapter({
                persistenceService: {
                    async persist() {
                        return {
                            status:
                                "conflict",
                            recordId:
                                "11111111-1111-4111-8111-111111111111"
                        };
                    }
                }
            });

        const result =
            await adapter.handle({});

        assert.equal(
            result.statusCode,
            200
        );

        assert.equal(
            result.body.status,
            "conflict"
        );
    }
);
