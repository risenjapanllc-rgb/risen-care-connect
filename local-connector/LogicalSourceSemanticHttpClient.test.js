"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const LogicalSourceSemanticHttpClient =
    require(
        "./LogicalSourceSemanticHttpClient"
    );

function createResponse({
    ok = true,
    status = 200,
    body
} = {}) {
    return {
        ok,
        status,
        async json() {
            return body;
        }
    };
}

test(
    "posts exact logical-source semantic envelope with connector authentication",
    async () => {
        let received = null;

        const client =
            new LogicalSourceSemanticHttpClient({
                endpoint:
                    "http://127.0.0.1:8787/connector/logical-source-semantic-records",
                connectorId:
                    "connector-1",
                credential:
                    "secret",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async (
                        endpoint,
                        options
                    ) => {
                        received = {
                            endpoint,
                            options
                        };

                        return createResponse({
                            body: {
                                status:
                                    "created",
                                recordId:
                                    "11111111-1111-4111-8111-111111111111"
                            }
                        });
                    }
            });

        const semanticRecord = {
            sourceId:
                "source-1",
            sourceRecordKey:
                "a".repeat(64),
            residentId:
                "22222222-2222-4222-8222-222222222222",
            semanticType:
                "resident_profile",
            logicalSlot:
                "primary",
            sourceRevision:
                "b".repeat(64),
            expectedContentHash:
                null,
            contentHash:
                "c".repeat(64),
            canonicalizationVersion:
                "risen-resident-profile-canonicalization-1",
            semanticContent: {
                "user.birth_date":
                    "1980-04-12"
            }
        };

        const result =
            await client.save(
                semanticRecord
            );

        assert.deepStrictEqual(
            result,
            {
                status:
                    "created",
                recordId:
                    "11111111-1111-4111-8111-111111111111"
            }
        );

        assert.strictEqual(
            received.endpoint,
            "http://127.0.0.1:8787/connector/logical-source-semantic-records"
        );

        assert.strictEqual(
            received.options.headers[
                "x-risen-connector-id"
            ],
            "connector-1"
        );

        assert.strictEqual(
            received.options.headers
                .authorization,
            "RISEN-Connector secret"
        );

        assert.deepStrictEqual(
            JSON.parse(
                received.options.body
            ),
            {
                logicalSourceSemanticRecord:
                    semanticRecord
            }
        );
    }
);

test(
    "propagates allowed STB semantic persistence error safely",
    async () => {
        const client =
            new LogicalSourceSemanticHttpClient({
                endpoint:
                    "http://127.0.0.1:8787/connector/logical-source-semantic-records",
                connectorId:
                    "connector-1",
                credential:
                    "secret",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async () =>
                        createResponse({
                            ok: false,
                            status: 422,
                            body: {
                                errorCode:
                                    "logical_source_semantic_record_invalid"
                            }
                        })
            });

        await assert.rejects(
            () =>
                client.save({}),
            error =>
                error &&
                error.code ===
                    "logical_source_semantic_record_invalid" &&
                error.httpStatus ===
                    422
        );
    }
);
