"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseEmergencyContactRepository =
    require("./SupabaseEmergencyContactRepository");

function createRepository({
    rows = []
} = {}) {
    const calls = [];

    const repository =
        new SupabaseEmergencyContactRepository({
            supabaseUrl:
                "https://example.supabase.co",

            apiKey:
                "test-api-key",

            accessTokenProvider: {
                async getAccessToken() {
                    return "test-token";
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

                if (
                    url.includes(
                        "get_voice_emergency_contact"
                    )
                ) {
                    return {
                        ok: true,

                        async json() {
                            return rows;
                        }
                    };
                }

                throw new Error(
                    "unexpected RPC"
                );
            }
        });

    return {
        repository,
        calls
    };
}


test(
    "active caseとrelevant contactから電話番号を解決する",
    async () => {
        const {
            repository,
            calls
        } = createRepository({
            rows: [
                {
                    contact_id:
                        "22222222-2222-4222-8222-222222222222",

                    facility_id:
                        "facility-A",

                    resident_id:
                        "resident-A",

                    phone_number:
                        "09012345678",

                    contact_name:
                        "家族A",

                    contact_type:
                        "family"
                }
            ]
        });

        const result =
            await repository.findActiveByCaseAndContact({
                facilityId:
                    "facility-A",

                caseId:
                    "11111111-1111-4111-8111-111111111111",

                contactId:
                    "22222222-2222-4222-8222-222222222222"
            });

        assert.equal(
            result.phoneNumber,
            "09012345678"
        );

        assert.equal(
            result.contactId,
            "22222222-2222-4222-8222-222222222222"
        );

        assert.equal(
            result.caseId,
            "11111111-1111-4111-8111-111111111111"
        );

        assert.equal(
            result.residentId,
            "resident-A"
        );

        assert.equal(
            calls.length,
            1
        );

        assert.match(
            calls[0].url,
            /get_voice_emergency_contact/
        );

        assert.deepEqual(
            JSON.parse(
                calls[0].options.body
            ),
            {
                p_facility_id:
                    "facility-A",

                p_case_id:
                    "11111111-1111-4111-8111-111111111111",

                p_contact_id:
                    "22222222-2222-4222-8222-222222222222"
            }
        );
    }
);


test(
    "facility-wide contactも解決できる",
    async () => {
        const {
            repository
        } = createRepository({
            rows: [
                {
                    contact_id:
                        "22222222-2222-4222-8222-222222222222",

                    facility_id:
                        "facility-A",

                    resident_id:
                        null,

                    phone_number:
                        "09012345678",

                    contact_name:
                        "施設共通",

                    contact_type:
                        "facility"
                }
            ]
        });

        const result =
            await repository.findActiveByCaseAndContact({
                facilityId:
                    "facility-A",

                caseId:
                    "11111111-1111-4111-8111-111111111111",

                contactId:
                    "22222222-2222-4222-8222-222222222222"
            });

        assert.equal(
            result.phoneNumber,
            "09012345678"
        );

        assert.equal(
            result.residentId,
            null
        );
    }
);


test(
    "RPC結果のfacilityが一致しなければ拒否する",
    async () => {
        const {
            repository
        } = createRepository({
            rows: [
                {
                    contact_id:
                        "22222222-2222-4222-8222-222222222222",

                    facility_id:
                        "facility-B",

                    resident_id:
                        "resident-A",

                    phone_number:
                        "09012345678",

                    contact_name:
                        null,

                    contact_type:
                        null
                }
            ]
        });

        await assert.rejects(
            repository.findActiveByCaseAndContact({
                facilityId:
                    "facility-A",

                caseId:
                    "11111111-1111-4111-8111-111111111111",

                contactId:
                    "22222222-2222-4222-8222-222222222222"
            }),
            /emergency contact facility mismatch/
        );
    }
);


test(
    "RPCが対象contactを返さなければ拒否する",
    async () => {
        const {
            repository
        } = createRepository({
            rows: []
        });

        await assert.rejects(
            repository.findActiveByCaseAndContact({
                facilityId:
                    "facility-A",

                caseId:
                    "11111111-1111-4111-8111-111111111111",

                contactId:
                    "22222222-2222-4222-8222-222222222222"
            }),
            /emergency contact not found/
        );
    }
);
