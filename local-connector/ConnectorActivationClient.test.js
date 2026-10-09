"use strict";

const assert =
    require("node:assert/strict");

const test =
    require("node:test");

const ConnectorActivationClient =
    require("./ConnectorActivationClient");

test(
    "activates connector and returns credential",
    async () => {
        const calls = [];

        const client =
            new ConnectorActivationClient({
                endpoint:
                    "https://voice.risencare.jp/connector/activate",

                fetchImpl:
                    async (
                        url,
                        options
                    ) => {
                        calls.push({
                            url,
                            options
                        });

                        return {
                            ok:
                                true,

                            async json() {
                                return {
                                    credential:
                                        "generated-secret"
                                };
                            }
                        };
                    }
            });

        const result =
            await client.activate({
                activationToken:
                    "activation-token",

                connectorId:
                    "connector-1"
            });

        assert.deepStrictEqual(
            result,
            {
                credential:
                    "generated-secret"
            }
        );

        const body =
            JSON.parse(
                calls[0]
                    .options
                    .body
            );

        assert.deepStrictEqual(
            body,
            {
                activationToken:
                    "activation-token",

                connectorId:
                    "connector-1"
            }
        );
    }
);

test(
    "fails closed when response has no credential",
    async () => {
        const client =
            new ConnectorActivationClient({
                endpoint:
                    "https://voice.risencare.jp/connector/activate",

                fetchImpl:
                    async () => ({
                        ok:
                            true,

                        async json() {
                            return {
                                success:
                                    true
                            };
                        }
                    })
            });

        await assert.rejects(
            () =>
                client.activate({
                    activationToken:
                        "activation-token",

                    connectorId:
                        "connector-1"
                }),
            error =>
                error.code ===
                "connector_activation_invalid_response"
        );
    }
);
