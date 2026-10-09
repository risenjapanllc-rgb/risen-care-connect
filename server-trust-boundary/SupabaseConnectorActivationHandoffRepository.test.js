"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const Repository =
    require("./SupabaseConnectorActivationHandoffRepository");

const HANDOFF_ID =
    "a".repeat(64);

const CONNECTOR_ID =
    "9712e198-bd1f-4d70-9dee-e4463d519d40";

const ACTIVATION_TOKEN =
    "ract_" + "b".repeat(64);

test(
    "creates activation handoff using facility system token",
    async () => {
        let request = null;

        const repository =
            new Repository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey:
                    "publishable",
                authProvider: {
                    async getAccessToken() {
                        return "trust-token";
                    }
                },
                async fetchImpl(url, options) {
                    request = {
                        url,
                        options
                    };

                    return {
                        ok: true,
                        async json() {
                            return [{
                                expires_at:
                                    "2026-10-09T01:30:00Z"
                            }];
                        }
                    };
                }
            });

        const result =
            await repository.create({
                handoffId:
                    HANDOFF_ID,
                connectorId:
                    CONNECTOR_ID,
                activationToken:
                    ACTIVATION_TOKEN,
                facilitySystemAccessToken:
                    "facility-token"
            });

        assert.equal(
            result.status,
            "created"
        );

        assert.match(
            request.url,
            /create_connector_activation_handoff$/
        );

        assert.equal(
            request.options.headers
                .Authorization,
            "Bearer facility-token"
        );

        const body =
            JSON.parse(
                request.options.body
            );

        assert.match(
            body.p_handoff_hash,
            /^[0-9a-f]{64}$/
        );

        assert.notEqual(
            body.p_handoff_hash,
            HANDOFF_ID
        );

        assert.equal(
            body.p_connector_id,
            CONNECTOR_ID
        );

        assert.equal(
            body.p_activation_token,
            ACTIVATION_TOKEN
        );

        assert.equal(
            body.p_ttl_seconds,
            120
        );
    }
);

test(
    "consumes activation handoff using connector trust token",
    async () => {
        let request = null;

        const repository =
            new Repository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey:
                    "publishable",
                authProvider: {
                    async getAccessToken() {
                        return "trust-token";
                    }
                },
                async fetchImpl(url, options) {
                    request = {
                        url,
                        options
                    };

                    return {
                        ok: true,
                        async json() {
                            return {
                                connectorId:
                                    CONNECTOR_ID,
                                activationToken:
                                    ACTIVATION_TOKEN
                            };
                        }
                    };
                }
            });

        const result =
            await repository.consume({
                handoffId:
                    HANDOFF_ID
            });

        assert.equal(
            result.status,
            "consumed"
        );

        assert.equal(
            result.connectorId,
            CONNECTOR_ID
        );

        assert.equal(
            result.activationToken,
            ACTIVATION_TOKEN
        );

        assert.equal(
            request.options.headers
                .Authorization,
            "Bearer trust-token"
        );

        assert.match(
            request.url,
            /consume_connector_activation_handoff$/
        );
    }
);

test(
    "returns not found for unavailable handoff",
    async () => {
        const repository =
            new Repository({
                supabaseUrl:
                    "https://example.supabase.co",
                authProvider: {
                    async getAccessToken() {
                        return "trust-token";
                    }
                },
                async fetchImpl() {
                    return {
                        ok: true,
                        async json() {
                            return null;
                        }
                    };
                }
            });

        const result =
            await repository.consume({
                handoffId:
                    HANDOFF_ID
            });

        assert.deepEqual(
            result,
            {
                status:
                    "not_found"
            }
        );
    }
);
