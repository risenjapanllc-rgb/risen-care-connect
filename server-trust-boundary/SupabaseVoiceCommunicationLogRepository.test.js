"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SupabaseVoiceCommunicationLogRepository =
    require("./SupabaseVoiceCommunicationLogRepository");


function createRepository({
    token =
        "test-access-token",
    fetchImpl
} = {}) {
    return new SupabaseVoiceCommunicationLogRepository({
        supabaseUrl:
            "https://example.supabase.co",

        apiKey:
            "test-api-key",

        accessTokenProvider: {
            async getAccessToken() {
                return token;
            }
        },

        fetchImpl:
            fetchImpl ||
            (async () => {
                throw new Error(
                    "unexpected fetch"
                );
            })
    });
}


function validInput() {
    return {
        facilityId:
            "11111111-1111-1111-1111-111111111111",

        caseId:
            "22222222-2222-2222-2222-222222222222",

        contactId:
            "33333333-3333-3333-3333-333333333333",

        providerCallId:
            "CON-A"
    };
}


test(
    "creates a voice communication log through the narrow RPC",
    async () => {
        let receivedUrl =
            null;

        let receivedOptions =
            null;

        const repository =
            createRepository({
                fetchImpl:
                    async (
                        url,
                        options
                    ) => {
                        receivedUrl =
                            url;

                        receivedOptions =
                            options;

                        return {
                            ok:
                                true,

                            status:
                                200,

                            async json() {
                                return [{
                                    communication_log_id:
                                        "44444444-4444-4444-4444-444444444444"
                                }];
                            }
                        };
                    }
            });

        const result =
            await repository.create(
                validInput()
            );

        assert.deepEqual(
            result,
            {
                communicationLogId:
                    "44444444-4444-4444-4444-444444444444"
            }
        );

        assert.equal(
            receivedUrl,
            "https://example.supabase.co/rest/v1/rpc/create_voice_communication_log"
        );

        assert.equal(
            receivedOptions.method,
            "POST"
        );

        assert.equal(
            receivedOptions.headers.apikey,
            "test-api-key"
        );

        assert.equal(
            receivedOptions.headers.Authorization,
            "Bearer test-access-token"
        );

        assert.deepEqual(
            JSON.parse(
                receivedOptions.body
            ),
            {
                p_facility_id:
                    validInput().facilityId,

                p_case_id:
                    validInput().caseId,

                p_contact_id:
                    validInput().contactId,

                p_provider_call_id:
                    "CON-A"
            }
        );
    }
);


test(
    "rejects incomplete input before authentication or fetch",
    async () => {
        let tokenCalled =
            false;

        let fetchCalled =
            false;

        const repository =
            new SupabaseVoiceCommunicationLogRepository({
                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "test-api-key",

                accessTokenProvider: {
                    async getAccessToken() {
                        tokenCalled =
                            true;

                        return "token";
                    }
                },

                fetchImpl:
                    async () => {
                        fetchCalled =
                            true;

                        return {
                            ok:
                                true
                        };
                    }
            });

        await assert.rejects(
            () =>
                repository.create({
                    ...validInput(),
                    providerCallId:
                        ""
                }),
            /input is invalid/
        );

        assert.equal(
            tokenCalled,
            false
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);


test(
    "fails when the Supabase access token is unavailable",
    async () => {
        let fetchCalled =
            false;

        const repository =
            createRepository({
                token:
                    "",

                fetchImpl:
                    async () => {
                        fetchCalled =
                            true;

                        return {};
                    }
            });

        await assert.rejects(
            () =>
                repository.create(
                    validInput()
                ),
            /access token is unavailable/
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);


test(
    "preserves HTTP status without reading private response body",
    async () => {
        const repository =
            createRepository({
                fetchImpl:
                    async () => ({
                        ok:
                            false,

                        status:
                            403,

                        async json() {
                            throw new Error(
                                "private-body-must-not-be-read"
                            );
                        },

                        async text() {
                            throw new Error(
                                "private-body-must-not-be-read"
                            );
                        }
                    })
            });

        let caught =
            null;

        try {
            await repository.create(
                validInput()
            );
        } catch (error) {
            caught =
                error;
        }

        assert.ok(caught);

        assert.match(
            caught.message,
            /403/
        );

        assert.equal(
            caught.message.includes(
                "private-body-must-not-be-read"
            ),
            false
        );
    }
);


test(
    "rejects an invalid RPC result",
    async () => {
        const repository =
            createRepository({
                fetchImpl:
                    async () => ({
                        ok:
                            true,

                        status:
                            200,

                        async json() {
                            return [];
                        }
                    })
            });

        await assert.rejects(
            () =>
                repository.create(
                    validInput()
                ),
            /returned invalid result/
        );
    }
);


test(
    "creates an inbound voice communication log through the narrow RPC",
    async () => {
        let receivedUrl =
            null;

        let receivedOptions =
            null;

        const repository =
            createRepository({
                fetchImpl:
                    async (
                        url,
                        options
                    ) => {
                        receivedUrl =
                            url;

                        receivedOptions =
                            options;

                        return {
                            ok:
                                true,

                            status:
                                200,

                            async json() {
                                return [{
                                    communication_log_id:
                                        "55555555-5555-5555-5555-555555555555"
                                }];
                            }
                        };
                    }
            });

        const result =
            await repository.createInbound({
                facilityId:
                    "11111111-1111-1111-1111-111111111111",

                fromPhone:
                    "819049373052",

                toPhone:
                    "05032021021",

                providerCallId:
                    "CON-INBOUND-A"
            });

        assert.deepEqual(
            result,
            {
                communicationLogId:
                    "55555555-5555-5555-5555-555555555555"
            }
        );

        assert.equal(
            receivedUrl,
            "https://example.supabase.co/rest/v1/rpc/create_inbound_voice_communication_log"
        );

        assert.deepEqual(
            JSON.parse(
                receivedOptions.body
            ),
            {
                p_facility_id:
                    "11111111-1111-1111-1111-111111111111",

                p_from_phone:
                    "819049373052",

                p_to_phone:
                    "05032021021",

                p_provider_call_id:
                    "CON-INBOUND-A"
            }
        );
    }
);


test(
    "rejects incomplete inbound voice communication log input before authentication or fetch",
    async () => {
        let tokenCalled =
            false;

        let fetchCalled =
            false;

        const repository =
            new SupabaseVoiceCommunicationLogRepository({
                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "test-api-key",

                accessTokenProvider: {
                    async getAccessToken() {
                        tokenCalled =
                            true;

                        return "token";
                    }
                },

                fetchImpl:
                    async () => {
                        fetchCalled =
                            true;

                        return {
                            ok:
                                true
                        };
                    }
            });

        await assert.rejects(
            () =>
                repository.createInbound({
                    facilityId:
                        "11111111-1111-1111-1111-111111111111",

                    fromPhone:
                        "819049373052",

                    toPhone:
                        "",

                    providerCallId:
                        "CON-INBOUND-A"
                }),
            /input is invalid/
        );

        assert.equal(
            tokenCalled,
            false
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);

test(
    "creates and links a browser voice communication log when intent id is supplied",
    async () => {
        let receivedUrl =
            null;

        let receivedOptions =
            null;

        const repository =
            createRepository({
                fetchImpl:
                    async (
                        url,
                        options
                    ) => {
                        receivedUrl =
                            url;

                        receivedOptions =
                            options;

                        return {
                            ok:
                                true,

                            status:
                                200,

                            async json() {
                                return [{
                                    communication_log_id:
                                        "55555555-5555-5555-5555-555555555555"
                                }];
                            }
                        };
                    }
            });

        const result =
            await repository.create({
                ...validInput(),

                voiceCallIntentId:
                    "intent-A"
            });

        assert.deepEqual(
            result,
            {
                communicationLogId:
                    "55555555-5555-5555-5555-555555555555"
            }
        );

        assert.equal(
            receivedUrl,
            "https://example.supabase.co/rest/v1/rpc/create_and_link_browser_voice_communication_log"
        );

        assert.deepEqual(
            JSON.parse(
                receivedOptions.body
            ),
            {
                p_facility_id:
                    validInput().facilityId,

                p_case_id:
                    validInput().caseId,

                p_contact_id:
                    validInput().contactId,

                p_provider_call_id:
                    "CON-A",

                p_voice_call_intent_id:
                    "intent-A"
            }
        );
    }
);
