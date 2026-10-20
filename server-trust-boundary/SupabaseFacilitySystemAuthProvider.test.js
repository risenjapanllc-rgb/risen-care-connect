"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SupabaseFacilitySystemAuthProvider =
    require(
        "./SupabaseFacilitySystemAuthProvider"
    );

function createProvider(
    overrides = {}
) {
    return new SupabaseFacilitySystemAuthProvider({
        supabaseUrl:
            "https://example.supabase.co/",

        apiKey:
            "test-key",

        email:
            "risencare-system@risencare.local",

        password:
            "secret-password",

        ...overrides
    });
}

test(
    "authenticates facility system account and returns access token",
    async () => {
        const originalFetch =
            global.fetch;

        global.fetch =
            async (
                url,
                options
            ) => {
                assert.equal(
                    url,
                    "https://example.supabase.co/auth/v1/token?grant_type=password"
                );

                assert.equal(
                    options.method,
                    "POST"
                );

                assert.equal(
                    options.headers.apikey,
                    "test-key"
                );

                assert.deepStrictEqual(
                    JSON.parse(
                        options.body
                    ),
                    {
                        email:
                            "risencare-system@risencare.local",

                        password:
                            "secret-password"
                    }
                );

                return {
                    ok:
                        true,

                    status:
                        200,

                    async json() {
                        return {
                            access_token:
                                "facility-system-token",

                            expires_in:
                                3600
                        };
                    }
                };
            };

        try {
            const provider =
                createProvider();

            const token =
                await provider
                    .getAccessToken();

            assert.equal(
                token,
                "facility-system-token"
            );
        } finally {
            global.fetch =
                originalFetch;
        }
    }
);

test(
    "caches facility system access token",
    async () => {
        const originalFetch =
            global.fetch;

        let fetchCalls = 0;

        global.fetch =
            async () => {
                fetchCalls += 1;

                return {
                    ok:
                        true,

                    status:
                        200,

                    async json() {
                        return {
                            access_token:
                                "cached-token",

                            expires_in:
                                3600
                        };
                    }
                };
            };

        try {
            const provider =
                createProvider();

            const first =
                await provider
                    .getAccessToken();

            const second =
                await provider
                    .getAccessToken();

            assert.equal(
                first,
                "cached-token"
            );

            assert.equal(
                second,
                "cached-token"
            );

            assert.equal(
                fetchCalls,
                1
            );
        } finally {
            global.fetch =
                originalFetch;
        }
    }
);
