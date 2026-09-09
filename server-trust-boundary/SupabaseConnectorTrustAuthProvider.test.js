"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseConnectorTrustAuthProvider =
    require("./SupabaseConnectorTrustAuthProvider");

function createProvider(overrides = {}) {
    return new SupabaseConnectorTrustAuthProvider({
        supabaseUrl: "https://example.supabase.co/",
        apiKey: " test-key ",
        email: "connector@example.local",
        password: "secret-password",
        ...overrides
    });
}

test("constructor requires supabaseUrl", () => {
    assert.throws(
        () => new SupabaseConnectorTrustAuthProvider({
            apiKey: "key",
            email: "a@example.local",
            password: "password"
        }),
        /requires supabaseUrl/
    );
});

test("constructor requires apiKey", () => {
    assert.throws(
        () => new SupabaseConnectorTrustAuthProvider({
            supabaseUrl: "https://example.supabase.co",
            email: "a@example.local",
            password: "password"
        }),
        /requires apiKey/
    );
});

test("constructor requires email", () => {
    assert.throws(
        () => new SupabaseConnectorTrustAuthProvider({
            supabaseUrl: "https://example.supabase.co",
            apiKey: "key",
            password: "password"
        }),
        /requires email/
    );
});

test("constructor requires password", () => {
    assert.throws(
        () => new SupabaseConnectorTrustAuthProvider({
            supabaseUrl: "https://example.supabase.co",
            apiKey: "key",
            email: "a@example.local"
        }),
        /requires password/
    );
});

test("authenticates and returns access token", async () => {
    const originalFetch = global.fetch;

    global.fetch = async (url, options) => {
        assert.equal(
            url,
            "https://example.supabase.co/auth/v1/token?grant_type=password"
        );

        assert.equal(options.method, "POST");
        assert.equal(options.headers.apikey, "test-key");

        assert.deepStrictEqual(
            JSON.parse(options.body),
            {
                email: "connector@example.local",
                password: "secret-password"
            }
        );

        return {
            ok: true,
            status: 200,
            async json() {
                return {
                    access_token: "access-token-123",
                    expires_in: 3600
                };
            }
        };
    };

    try {
        const provider = createProvider();

        const token =
            await provider.getAccessToken();

        assert.equal(
            token,
            "access-token-123"
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("caches access token in memory", async () => {
    const originalFetch = global.fetch;
    let fetchCalls = 0;

    global.fetch = async () => {
        fetchCalls += 1;

        return {
            ok: true,
            status: 200,
            async json() {
                return {
                    access_token: "cached-token",
                    expires_in: 3600
                };
            }
        };
    };

    try {
        const provider = createProvider();

        const first =
            await provider.getAccessToken();

        const second =
            await provider.getAccessToken();

        assert.equal(first, "cached-token");
        assert.equal(second, "cached-token");
        assert.equal(fetchCalls, 1);
    } finally {
        global.fetch = originalFetch;
    }
});

test("authentication HTTP failure throws", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: false,
        status: 401
    });

    try {
        const provider = createProvider();

        await assert.rejects(
            () => provider.getAccessToken(),
            /authentication failed: 401/
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("missing access_token in response throws", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
            return {
                expires_in: 3600
            };
        }
    });

    try {
        const provider = createProvider();

        await assert.rejects(
            () => provider.getAccessToken(),
            /returned invalid result/
        );
    } finally {
        global.fetch = originalFetch;
    }
});
