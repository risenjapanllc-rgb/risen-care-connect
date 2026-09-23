"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SupabaseFacilityPhoneNumberRepository
} = require(
    "./SupabaseFacilityPhoneNumberRepository"
);


function createRepository({
    responseStatus = 200,
    responseBody = []
} = {}) {
    const originalFetch =
        global.fetch;

    global.fetch =
        async function () {
            return {
                ok:
                    responseStatus >= 200 &&
                    responseStatus < 300,

                status:
                    responseStatus,

                async json() {
                    return responseBody;
                }
            };
        };

    const repository =
        new SupabaseFacilityPhoneNumberRepository({
            supabaseUrl:
                "https://example.supabase.co",

            apiKey:
                "test-key",

            accessTokenProvider: {
                async getAccessToken() {
                    return "test-access-token";
                }
            }
        });

    return {
        repository,
        restore() {
            global.fetch =
                originalFetch;
        }
    };
}


test(
    "facilityIdが空の場合はnullを返す",
    async () => {
        const {
            repository,
            restore
        } = createRepository();

        try {
            const result =
                await repository
                    .findActiveByFacilityId("");

            assert.equal(
                result,
                null
            );
        } finally {
            restore();
        }
    }
);


test(
    "番号が存在しない場合はnullを返す",
    async () => {
        const {
            repository,
            restore
        } = createRepository({
            responseBody: []
        });

        try {
            const result =
                await repository
                    .findActiveByFacilityId(
                        "facility-1"
                    );

            assert.equal(
                result,
                null
            );
        } finally {
            restore();
        }
    }
);


test(
    "施設のactiveなVonage番号を取得できる",
    async () => {
        const row = {
            id:
                "phone-1",

            facility_id:
                "facility-1",

            phone_number:
                "05012345678",

            provider:
                "vonage",

            status:
                "active",

            created_at:
                "2026-09-13T00:00:00Z",

            updated_at:
                "2026-09-13T00:00:00Z"
        };

        const {
            repository,
            restore
        } = createRepository({
            responseBody: [row]
        });

        try {
            const result =
                await repository
                    .findActiveByFacilityId(
                        "facility-1"
                    );

            assert.deepEqual(
                result,
                {
                    id:
                        "phone-1",

                    facilityId:
                        "facility-1",

                    phoneNumber:
                        "05012345678",

                    provider:
                        "vonage",

                    status:
                        "active",

                    createdAt:
                        "2026-09-13T00:00:00Z",

                    updatedAt:
                        "2026-09-13T00:00:00Z"
                }
            );
        } finally {
            restore();
        }
    }
);


test(
    "Supabase APIエラーを検出する",
    async () => {
        const {
            repository,
            restore
        } = createRepository({
            responseStatus:
                500
        });

        try {
            await assert.rejects(
                () =>
                    repository
                        .findActiveByFacilityId(
                            "facility-1"
                        ),
                /Supabase facility phone lookup failed: 500/
            );
        } finally {
            restore();
        }
    }
);


test(
    "複数のactive番号が返された場合はエラーにする",
    async () => {
        const {
            repository,
            restore
        } = createRepository({
            responseBody: [
                {
                    id: "phone-1",
                    facility_id: "facility-1",
                    phone_number: "05011111111",
                    provider: "vonage",
                    status: "active"
                },
                {
                    id: "phone-2",
                    facility_id: "facility-1",
                    phone_number: "05022222222",
                    provider: "vonage",
                    status: "active"
                }
            ]
        });

        try {
            await assert.rejects(
                () =>
                    repository
                        .findActiveByFacilityId(
                            "facility-1"
                        ),
                /multiple active numbers/
            );
        } finally {
            restore();
        }
    }
);
