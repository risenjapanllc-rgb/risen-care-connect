"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseResidentRepository =
    require("./SupabaseResidentRepository");

function createAccessTokenProvider(
    token = "test-access-token"
) {
    return {
        async getAccessToken() {
            return token;
        }
    };
}

test("constructor requires supabaseUrl", () => {
    assert.throws(
        () => new SupabaseResidentRepository({
            apiKey: "test-key",
            accessTokenProvider:
                createAccessTokenProvider()
        }),
        /requires supabaseUrl/
    );
});

test("constructor requires apiKey", () => {
    assert.throws(
        () => new SupabaseResidentRepository({
            supabaseUrl:
                "https://example.supabase.co",
            accessTokenProvider:
                createAccessTokenProvider()
        }),
        /requires apiKey/
    );
});

test("constructor requires accessTokenProvider", () => {
    assert.throws(
        () => new SupabaseResidentRepository({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey: "test-key"
        }),
        /requires accessTokenProvider/
    );
});

test("missing facilityId returns empty array without token or fetch", async () => {
    const originalFetch = global.fetch;
    let fetchCalled = false;
    let tokenCalled = false;

    global.fetch = async () => {
        fetchCalled = true;
        throw new Error("must not be called");
    };

    const accessTokenProvider = {
        async getAccessToken() {
            tokenCalled = true;
            throw new Error("must not be called");
        }
    };

    try {
        const repository =
            new SupabaseResidentRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey: "test-key",
                accessTokenProvider
            });

        const result =
            await repository.getCandidates({
                sourceResidentIdentifier:
                    "00125"
            });

        assert.deepStrictEqual(result, []);
        assert.equal(fetchCalled, false);
        assert.equal(tokenCalled, false);
    } finally {
        global.fetch = originalFetch;
    }
});

test("missing sourceResidentIdentifier returns empty array without token or fetch", async () => {
    const originalFetch = global.fetch;
    let fetchCalled = false;
    let tokenCalled = false;

    global.fetch = async () => {
        fetchCalled = true;
        throw new Error("must not be called");
    };

    const accessTokenProvider = {
        async getAccessToken() {
            tokenCalled = true;
            throw new Error("must not be called");
        }
    };

    try {
        const repository =
            new SupabaseResidentRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey: "test-key",
                accessTokenProvider
            });

        const result =
            await repository.getCandidates({
                facilityId: "facility-abc"
            });

        assert.deepStrictEqual(result, []);
        assert.equal(fetchCalled, false);
        assert.equal(tokenCalled, false);
    } finally {
        global.fetch = originalFetch;
    }
});

test("maps Supabase RPC rows and sends authenticated JWT", async () => {
    const originalFetch = global.fetch;
    let tokenCalls = 0;

    const accessTokenProvider = {
        async getAccessToken() {
            tokenCalls += 1;
            return "test-access-token";
        }
    };

    global.fetch = async (url, options) => {
        assert.equal(
            url,
            "https://example.supabase.co/rest/v1/rpc/get_resident_candidates"
        );

        assert.equal(options.method, "POST");
        assert.equal(
            options.headers.apikey,
            "test-key"
        );
        assert.equal(
            options.headers.Authorization,
            "Bearer test-access-token"
        );

        assert.deepStrictEqual(
            JSON.parse(options.body),
            {
                p_facility_id:
                    "facility-abc",
                p_user_code:
                    "00125"
            }
        );

        return {
            ok: true,
            status: 200,
            async json() {
                return [
                    {
                        id: "resident-1",
                        facility_id:
                            "facility-abc",
                        user_code:
                            "00125",
                        name:
                            "山田太郎"
                    }
                ];
            }
        };
    };

    try {
        const repository =
            new SupabaseResidentRepository({
                supabaseUrl:
                    "https://example.supabase.co/",
                apiKey:
                    " test-key ",
                accessTokenProvider
            });

        const result =
            await repository.getCandidates({
                facilityId:
                    " facility-abc ",
                sourceResidentIdentifier:
                    " 00125 "
            });

        assert.equal(tokenCalls, 1);

        assert.deepStrictEqual(result, [
            {
                id: "resident-1",
                facilityId:
                    "facility-abc",
                userCode:
                    "00125",
                name:
                    "山田太郎",
                gender: null
            }
        ]);
    } finally {
        global.fetch = originalFetch;
    }
});

test("missing access token fails closed without fetch", async () => {
    const originalFetch = global.fetch;
    let fetchCalled = false;

    global.fetch = async () => {
        fetchCalled = true;
        throw new Error("must not be called");
    };

    try {
        const repository =
            new SupabaseResidentRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey: "test-key",
                accessTokenProvider:
                    createAccessTokenProvider("")
            });

        await assert.rejects(
            () => repository.getCandidates({
                facilityId:
                    "facility-abc",
                sourceResidentIdentifier:
                    "00125"
            }),
            /requires access token/
        );

        assert.equal(fetchCalled, false);
    } finally {
        global.fetch = originalFetch;
    }
});

test("empty Supabase result returns empty array", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
            return [];
        }
    });

    try {
        const repository =
            new SupabaseResidentRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey: "test-key",
                accessTokenProvider:
                    createAccessTokenProvider()
            });

        const result =
            await repository.getCandidates({
                facilityId:
                    "facility-abc",
                sourceResidentIdentifier:
                    "00125"
            });

        assert.deepStrictEqual(result, []);
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
        const repository =
            new SupabaseResidentRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey: "test-key",
                accessTokenProvider:
                    createAccessTokenProvider()
            });

        await assert.rejects(
            () => repository.getCandidates({
                facilityId:
                    "facility-abc",
                sourceResidentIdentifier:
                    "00125"
            }),
            /resident lookup failed: 500/
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("non-array Supabase result throws", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
            return {};
        }
    });

    try {
        const repository =
            new SupabaseResidentRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey: "test-key",
                accessTokenProvider:
                    createAccessTokenProvider()
            });

        await assert.rejects(
            () => repository.getCandidates({
                facilityId:
                    "facility-abc",
                sourceResidentIdentifier:
                    "00125"
            }),
            /invalid result/
        );
    } finally {
        global.fetch = originalFetch;
    }
});
