"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SupabaseVoiceCommunicationEventRepository =
    require("./SupabaseVoiceCommunicationEventRepository");


function createRepository({
    token = "test-access-token",
    fetchImpl
} = {}) {
    return new SupabaseVoiceCommunicationEventRepository({
        supabaseUrl:
            "https://example.supabase.co",

        apiKey:
            "test-publishable-key",

        accessTokenProvider: {
            async getAccessToken() {
                return token;
            }
        },

        fetchImpl
    });
}


test(
    "applies a voice communication event through the narrow RPC",
    async () => {
        let receivedUrl;
        let receivedOptions;

        const repository =
            createRepository({
                async fetchImpl(
                    url,
                    options
                ) {
                    receivedUrl =
                        url;

                    receivedOptions =
                        options;

                    return {
                        ok: true,

                        status: 200,

                        async json() {
                            return [
                                {
                                    transition_status:
                                        "updated",

                                    communication_log_id:
                                        "communication-log-A",

                                    result_status:
                                        "completed",

                                    connected_at:
                                        "2026-10-02T03:00:05+00:00",

                                    ended_at:
                                        "2026-10-02T03:00:15+00:00"
                                }
                            ];
                        }
                    };
                }
            });

        const result =
            await repository.apply({
                providerCallId:
                    "CON-A",

                eventStatus:
                    "COMPLETED",

                eventTimestamp:
                    "2026-10-02T03:00:15Z",

                startTime:
                    "2026-10-02T03:00:05Z",

                endTime:
                    "2026-10-02T03:00:15Z"
            });

        assert.equal(
            receivedUrl,
            "https://example.supabase.co/rest/v1/rpc/apply_voice_communication_event"
        );

        assert.equal(
            receivedOptions.method,
            "POST"
        );

        assert.equal(
            receivedOptions.headers.apikey,
            "test-publishable-key"
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
                p_provider_call_id:
                    "CON-A",

                p_event_status:
                    "completed",

                p_event_timestamp:
                    "2026-10-02T03:00:15Z",

                p_start_time:
                    "2026-10-02T03:00:05Z",

                p_end_time:
                    "2026-10-02T03:00:15Z"
            }
        );

        assert.deepEqual(
            result,
            {
                transitionStatus:
                    "updated",

                communicationLogId:
                    "communication-log-A",

                resultStatus:
                    "completed",

                connectedAt:
                    "2026-10-02T03:00:05+00:00",

                endedAt:
                    "2026-10-02T03:00:15+00:00"
            }
        );
    }
);


test(
    "accepts an unchanged transition with null timing",
    async () => {
        const repository =
            createRepository({
                async fetchImpl() {
                    return {
                        ok: true,

                        status: 200,

                        async json() {
                            return [
                                {
                                    transition_status:
                                        "unchanged",

                                    communication_log_id:
                                        "communication-log-A",

                                    result_status:
                                        "requested",

                                    connected_at:
                                        null,

                                    ended_at:
                                        null
                                }
                            ];
                        }
                    };
                }
            });

        const result =
            await repository.apply({
                providerCallId:
                    "CON-A",

                eventStatus:
                    "ringing",

                eventTimestamp:
                    "2026-10-02T03:00:02Z"
            });

        assert.equal(
            result.transitionStatus,
            "unchanged"
        );

        assert.equal(
            result.resultStatus,
            "requested"
        );

        assert.equal(
            result.connectedAt,
            null
        );

        assert.equal(
            result.endedAt,
            null
        );
    }
);


test(
    "rejects invalid event input before authentication or fetch",
    async () => {
        let tokenRequested =
            false;

        let fetchCalled =
            false;

        const repository =
            new SupabaseVoiceCommunicationEventRepository({
                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "test-publishable-key",

                accessTokenProvider: {
                    async getAccessToken() {
                        tokenRequested =
                            true;

                        return "token";
                    }
                },

                async fetchImpl() {
                    fetchCalled =
                        true;

                    throw new Error(
                        "must not fetch"
                    );
                }
            });

        await assert.rejects(
            () =>
                repository.apply({
                    providerCallId:
                        "CON-A",

                    eventStatus:
                        "completed",

                    eventTimestamp:
                        "2026-10-02T03:00:15Z"
                }),
            /requires startTime and endTime/
        );

        assert.equal(
            tokenRequested,
            false
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);


test(
    "rejects unsupported status before authentication or fetch",
    async () => {
        let tokenRequested =
            false;

        const repository =
            new SupabaseVoiceCommunicationEventRepository({
                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "test-publishable-key",

                accessTokenProvider: {
                    async getAccessToken() {
                        tokenRequested =
                            true;

                        return "token";
                    }
                },

                async fetchImpl() {
                    throw new Error(
                        "must not fetch"
                    );
                }
            });

        await assert.rejects(
            () =>
                repository.apply({
                    providerCallId:
                        "CON-A",

                    eventStatus:
                        "invented-status",

                    eventTimestamp:
                        "2026-10-02T03:00:00Z"
                }),
            /unsupported/
        );

        assert.equal(
            tokenRequested,
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
                token: "",

                async fetchImpl() {
                    fetchCalled =
                        true;

                    throw new Error(
                        "must not fetch"
                    );
                }
            });

        await assert.rejects(
            () =>
                repository.apply({
                    providerCallId:
                        "CON-A",

                    eventStatus:
                        "answered",

                    eventTimestamp:
                        "2026-10-02T03:00:05Z"
                }),
            /access token is unavailable/
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);


test(
    "preserves HTTP status without reading a private error body",
    async () => {
        let jsonCalled =
            false;

        const repository =
            createRepository({
                async fetchImpl() {
                    return {
                        ok: false,

                        status: 409,

                        async json() {
                            jsonCalled =
                                true;

                            return {
                                private:
                                    "must not read"
                            };
                        }
                    };
                }
            });

        await assert.rejects(
            () =>
                repository.apply({
                    providerCallId:
                        "CON-A",

                    eventStatus:
                        "answered",

                    eventTimestamp:
                        "2026-10-02T03:00:05Z"
                }),
            /failed: 409/
        );

        assert.equal(
            jsonCalled,
            false
        );
    }
);


test(
    "rejects an invalid RPC result",
    async () => {
        const repository =
            createRepository({
                async fetchImpl() {
                    return {
                        ok: true,

                        status: 200,

                        async json() {
                            return [
                                {
                                    transition_status:
                                        "mystery",

                                    communication_log_id:
                                        "communication-log-A",

                                    result_status:
                                        "completed",

                                    connected_at:
                                        null,

                                    ended_at:
                                        null
                                }
                            ];
                        }
                    };
                }
            });

        await assert.rejects(
            () =>
                repository.apply({
                    providerCallId:
                        "CON-A",

                    eventStatus:
                        "answered",

                    eventTimestamp:
                        "2026-10-02T03:00:05Z"
                }),
            /invalid result/
        );
    }
);
