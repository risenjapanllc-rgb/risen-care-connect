"use strict";

const assert =
    require("node:assert/strict");

const test =
    require("node:test");

const SupabaseConnectorActivationRepository =
    require("./SupabaseConnectorActivationRepository");

const connectorId =
    "11111111-1111-1111-1111-111111111111";

const facilityId =
    "22222222-2222-2222-2222-222222222222";

test(
    "activates connector registration through Supabase RPC",
    async () => {
        const calls = [];

        const repository =
            new SupabaseConnectorActivationRepository({
                supabaseUrl:
                    "https://example.supabase.co/",
                apiKey:
                    "publishable-key",
                authProvider: {
                    async getAccessToken() {
                        return "access-token";
                    }
                },
                fetchImpl: async (
                    url,
                    options
                ) => {
                    calls.push({
                        url,
                        options
                    });

                    return {
                        ok: true,
                        status: 200,
                        async json() {
                            return true;
                        }
                    };
                }
            });

        const result =
            await repository.activateRegistration({
                connectorId,
                facilityId,
                credentialHash:
                    "a".repeat(64)
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "activated"
            }
        );

        assert.strictEqual(
            calls.length,
            1
        );

        assert.strictEqual(
            calls[0].url,
            "https://example.supabase.co/rest/v1/rpc/activate_connector_registration"
        );

        assert.strictEqual(
            calls[0].options.method,
            "POST"
        );

        assert.strictEqual(
            calls[0].options.headers.Authorization,
            "Bearer access-token"
        );

        assert.strictEqual(
            calls[0].options.headers.apikey,
            "publishable-key"
        );

        assert.strictEqual(
            calls[0].options.headers["Content-Type"],
            "application/json"
        );

        assert.deepStrictEqual(
            JSON.parse(
                calls[0].options.body
            ),
            {
                p_connector_id:
                    connectorId,
                p_facility_id:
                    facilityId,
                p_credential_hash:
                    "a".repeat(64)
            }
        );
    }
);

test(
    "returns rejected when RPC refuses connector facility binding",
    async () => {
        const repository =
            new SupabaseConnectorActivationRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                authProvider: {
                    async getAccessToken() {
                        return "access-token";
                    }
                },
                fetchImpl: async () => ({
                    ok: true,
                    status: 200,
                    async json() {
                        return false;
                    }
                })
            });

        const result =
            await repository.activateRegistration({
                connectorId,
                facilityId,
                credentialHash:
                    "b".repeat(64)
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "rejected"
            }
        );
    }
);

test(
    "rejects malformed credential hash before network access",
    async () => {
        let fetched = false;

        const repository =
            new SupabaseConnectorActivationRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                authProvider: {
                    async getAccessToken() {
                        throw new Error(
                            "must not authenticate"
                        );
                    }
                },
                fetchImpl: async () => {
                    fetched = true;

                    throw new Error(
                        "must not fetch"
                    );
                }
            });

        await assert.rejects(
            () =>
                repository.activateRegistration({
                    connectorId,
                    facilityId,
                    credentialHash:
                        "not-a-sha256-hash"
                }),
            /input is invalid/
        );

        assert.strictEqual(
            fetched,
            false
        );
    }
);

test(
    "fails closed when trust access token is unavailable",
    async () => {
        let fetched = false;

        const repository =
            new SupabaseConnectorActivationRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                authProvider: {
                    async getAccessToken() {
                        return "";
                    }
                },
                fetchImpl: async () => {
                    fetched = true;

                    throw new Error(
                        "must not fetch"
                    );
                }
            });

        await assert.rejects(
            () =>
                repository.activateRegistration({
                    connectorId,
                    facilityId,
                    credentialHash:
                        "c".repeat(64)
                }),
            /access token is unavailable/
        );

        assert.strictEqual(
            fetched,
            false
        );
    }
);

test(
    "fails closed when Supabase RPC returns HTTP error",
    async () => {
        const repository =
            new SupabaseConnectorActivationRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                authProvider: {
                    async getAccessToken() {
                        return "access-token";
                    }
                },
                fetchImpl: async () => ({
                    ok: false,
                    status: 500,
                    async json() {
                        return {
                            message:
                                "database unavailable"
                        };
                    }
                })
            });

        await assert.rejects(
            () =>
                repository.activateRegistration({
                    connectorId,
                    facilityId,
                    credentialHash:
                        "d".repeat(64)
                }),
            /RPC failed \(500\)/
        );
    }
);

test(
    "fails closed when Supabase RPC response is not boolean",
    async () => {
        const repository =
            new SupabaseConnectorActivationRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                authProvider: {
                    async getAccessToken() {
                        return "access-token";
                    }
                },
                fetchImpl: async () => ({
                    ok: true,
                    status: 200,
                    async json() {
                        return {
                            unexpected:
                                true
                        };
                    }
                })
            });

        await assert.rejects(
            () =>
                repository.activateRegistration({
                    connectorId,
                    facilityId,
                    credentialHash:
                        "e".repeat(64)
                }),
            /invalid response/
        );
    }
);
