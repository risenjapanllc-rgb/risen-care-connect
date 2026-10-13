"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceTemplateExactHttpAdapter =
    require("./SourceTemplateExactHttpAdapter");

test(
    "returns exact template lifecycle result",
    async () => {
        const adapter =
            new SourceTemplateExactHttpAdapter({
                ingestionService: {
                    async ingest() {
                        return {
                            status: "created",
                            templateId:
                                "template-1"
                        };
                    }
                }
            });

        assert.deepEqual(
            await adapter.handle({
                requestId: "request-1"
            }),
            {
                statusCode: 200,
                body: {
                    status: "created",
                    templateId:
                        "template-1"
                }
            }
        );
    }
);

test(
    "preserves conflict lifecycle result",
    async () => {
        const adapter =
            new SourceTemplateExactHttpAdapter({
                ingestionService: {
                    async ingest() {
                        return {
                            status: "conflict",
                            templateId:
                                "template-1"
                        };
                    }
                }
            });

        const result =
            await adapter.handle({
                requestId: "request-1"
            });

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
