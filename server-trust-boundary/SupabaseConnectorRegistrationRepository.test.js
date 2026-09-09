"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseConnectorRegistrationRepository =
    require("./SupabaseConnectorRegistrationRepository");

function createRepository() {
    return new SupabaseConnectorRegistrationRepository({
        supabaseUrl: "https://example.supabase.co",
        apiKey: "test-publishable-key"
    });
}

test("constructor requires supabaseUrl", () => {
    assert.throws(
        () =>
            new SupabaseConnectorRegistrationRepository({
                apiKey: "test-key"
            }),
        /requires supabaseUrl/
    );
});

test("constructor requires apiKey", () => {
    assert.throws(
        () =>
            new SupabaseConnectorRegistrationRepository({
                supabaseUrl: "https://example.supabase.co"
            }),
        /requires apiKey/
    );
});

test("missing connectorId returns null without fetch", async () => {
    const originalFetch = global.fetch;
    let called = false;

    global.fetch = async () => {
        called = true;
        throw new Error("must not be called");
    };

    try {
        const repository = createRepository();

        const result =
            await repository.getRegistration({
                connectorId: ""
            });

        assert.strictEqual(result, null);
        assert.strictEqual(called, false);
    } finally {
        global.fetch = originalFetch;
    }
});

test("maps Supabase registration row to repository contract", async () => {
    const originalFetch = global.fetch;

    global.fetch = async (url, options) => {
        assert.strictEqual(
            url,
            "https://example.supabase.co/rest/v1/rpc/get_connector_registration"
        );

        assert.strictEqual(options.method, "POST");
        assert.strictEqual(
            options.headers.apikey,
            "test-publishable-key"
        );

        assert.deepStrictEqual(
            JSON.parse(options.body),
            {
                p_connector_id: "connector-123"
            }
        );

        return {
            ok: true,
            async json() {
                return [
                    {
                        connector_id: "connector-123",
                        facility_id: "facility-abc",
                        active: true
                    }
                ];
            }
        };
    };

    try {
        const repository = createRepository();

        const result =
            await repository.getRegistration({
                connectorId: "connector-123"
            });

        assert.deepStrictEqual(result, {
            connectorId: "connector-123",
            facilityId: "facility-abc",
            active: true
        });
    } finally {
        global.fetch = originalFetch;
    }
});

test("empty Supabase result returns null", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [];
        }
    });

    try {
        const repository = createRepository();

        const result =
            await repository.getRegistration({
                connectorId: "connector-404"
            });

        assert.strictEqual(result, null);
    } finally {
        global.fetch = originalFetch;
    }
});

test("Supabase HTTP failure throws", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: false,
        status: 500
    });

    try {
        const repository = createRepository();

        await assert.rejects(
            repository.getRegistration({
                connectorId: "connector-123"
            }),
            /registration lookup failed: 500/
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("non-array Supabase result throws", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return {};
        }
    });

    try {
        const repository = createRepository();

        await assert.rejects(
            repository.getRegistration({
                connectorId: "connector-123"
            }),
            /invalid result/
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("multiple registrations throw", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    connector_id: "connector-123",
                    facility_id: "facility-a",
                    active: true
                },
                {
                    connector_id: "connector-123",
                    facility_id: "facility-b",
                    active: true
                }
            ];
        }
    });

    try {
        const repository = createRepository();

        await assert.rejects(
            repository.getRegistration({
                connectorId: "connector-123"
            }),
            /multiple registrations/
        );
    } finally {
        global.fetch = originalFetch;
    }
});
