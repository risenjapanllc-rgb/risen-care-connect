"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseEmergencyContactRepository =
    require("./SupabaseEmergencyContactRepository");

function createRepository({
    cases = [],
    contacts = []
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
                        "get_active_emergency_cases"
                    )
                ) {
                    return {
                        ok: true,

                        async json() {
                            return cases;
                        }
                    };
                }

                if (
                    url.includes(
                        "list_emergency_case_contacts"
                    )
                ) {
                    return {
                        ok: true,

                        async json() {
                            return contacts;
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
            cases: [
                {
                    id:
                        "11111111-1111-4111-8111-111111111111",

                    facility_id:
                        "facility-A",

                    resident_id:
                        "resident-A",

                    status:
                        "active"
                }
            ],

            contacts: [
                {
                    id:
                        "22222222-2222-4222-8222-222222222222",

                    facility_id:
                        "facility-A",

                    resident_id:
                        "resident-A",

                    phone_number:
                        "09012345678",

                    is_active:
                        true
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
            calls.length,
            2
        );
    }
);


test(
    "facility-wide contactも解決できる",
    async () => {
        const {
            repository
        } = createRepository({
            cases: [
                {
                    id:
                        "11111111-1111-4111-8111-111111111111",

                    facility_id:
                        "facility-A",

                    resident_id:
                        null,

                    status:
                        "active"
                }
            ],

            contacts: [
                {
                    id:
                        "22222222-2222-4222-8222-222222222222",

                    facility_id:
                        "facility-A",

                    resident_id:
                        null,

                    phone_number:
                        "09012345678",

                    is_active:
                        true
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
    }
);


test(
    "facilityが一致しないcaseは拒否する",
    async () => {
        const {
            repository
        } = createRepository({
            cases: [
                {
                    id:
                        "11111111-1111-4111-8111-111111111111",

                    facility_id:
                        "facility-B",

                    resident_id:
                        "resident-A",

                    status:
                        "active"
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
            /emergency case facility mismatch/
        );
    }
);


test(
    "contactがrelevant contactsに存在しなければ拒否する",
    async () => {
        const {
            repository
        } = createRepository({
            cases: [
                {
                    id:
                        "11111111-1111-4111-8111-111111111111",

                    facility_id:
                        "facility-A",

                    resident_id:
                        "resident-A",

                    status:
                        "active"
                }
            ],

            contacts: []
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
