"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const Client =
    require(
        "./LogicalSourceResidentAssociationHttpClient"
    );

test(
    "saves logical source resident association",
    async () => {
        let request = null;

        const client =
            new Client({
                endpoint:
                    "http://127.0.0.1:8787/connector/logical-source-resident-associations",
                connectorId:
                    "connector-1",
                credential:
                    "secret",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async (
                        url,
                        options
                    ) => {
                        request = {
                            url,
                            options
                        };

                        return {
                            ok: true,
                            status: 200,
                            async json() {
                                return {
                                    status:
                                        "created"
                                };
                            }
                        };
                    }
            });

        const result =
            await client.save({
                sourceId:
                    "source-1",
                sourceRecordKey:
                    "a".repeat(64),
                residentId:
                    "11111111-1111-4111-8111-111111111111",
                matchMethod:
                    "user_code_name_verified",
                sourceRevision:
                    "b".repeat(64)
            });

        assert.equal(
            result.status,
            "created"
        );

        assert.equal(
            request.options.method,
            "POST"
        );
    }
);
