"use strict";

const assert =
    require("node:assert/strict");

const {
    createHash
} = require("node:crypto");

const test =
    require("node:test");

const SupabaseConnectorActivationTokenVerifier =
    require("./SupabaseConnectorActivationTokenVerifier");

const connectorId =
    "11111111-1111-1111-1111-111111111111";

const facilityId =
    "22222222-2222-2222-2222-222222222222";

test(
    "consumes token bound to connector",
    async () => {
        const calls = [];

        const verifier =
            new SupabaseConnectorActivationTokenVerifier({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey:
                    "publishable-key",
                authProvider: {
                    async getAccessToken() {
                        return "trust-token";
                    }
                },
                fetchImpl:
                    async (url, options) => {
                        calls.push({
                            url,
                            options
                        });

                        return {
                            ok: true,
                            async json() {
                                return {
                                    connectorId,
                                    facilityId
                                };
                            }
                        };
                    }
            });

        const result =
            await verifier.verify({
                activationToken:
                    "one-time-token",
                connectorId
            });

        assert.deepStrictEqual(
            result,
            {
                valid: true,
                facilityId
            }
        );

        const body =
            JSON.parse(
                calls[0].options.body
            );

        assert.strictEqual(
            body.p_connector_id,
            connectorId
        );

        assert.strictEqual(
            body.p_token_hash,
            createHash("sha256")
                .update(
                    "one-time-token",
                    "utf8"
                )
                .digest("hex")
        );
    }
);

test(
    "rejects unavailable token",
    async () => {
        const verifier =
            new SupabaseConnectorActivationTokenVerifier({
                supabaseUrl:
                    "https://example.supabase.co",
                authProvider: {
                    async getAccessToken() {
                        return "trust-token";
                    }
                },
                fetchImpl:
                    async () => ({
                        ok: true,
                        async json() {
                            return null;
                        }
                    })
            });

        assert.deepStrictEqual(
            await verifier.verify({
                activationToken:
                    "invalid-token",
                connectorId
            }),
            {
                valid: false
            }
        );
    }
);

test(
    "rejects connector mismatch",
    async () => {
        const verifier =
            new SupabaseConnectorActivationTokenVerifier({
                supabaseUrl:
                    "https://example.supabase.co",
                authProvider: {
                    async getAccessToken() {
                        return "trust-token";
                    }
                },
                fetchImpl:
                    async () => ({
                        ok: true,
                        async json() {
                            return {
                                connectorId:
                                    "33333333-3333-3333-3333-333333333333",
                                facilityId
                            };
                        }
                    })
            });

        assert.deepStrictEqual(
            await verifier.verify({
                activationToken:
                    "token",
                connectorId
            }),
            {
                valid: false
            }
        );
    }
);
