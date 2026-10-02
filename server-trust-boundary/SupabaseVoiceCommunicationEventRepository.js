"use strict";

const SUPPORTED_EVENT_STATUSES =
    new Set([
        "started",
        "ringing",
        "answered",
        "completed",
        "busy",
        "cancelled",
        "unanswered",
        "rejected",
        "failed",
        "timeout"
    ]);

const RESULT_STATUSES =
    new Set([
        "requested",
        "connected",
        "completed",
        "no_answer",
        "failed",
        "staff_confirmed_contact",
        "staff_confirmed_no_contact",
        "unknown"
    ]);

function normalizeRequiredString(
    value,
    name
) {
    const normalized =
        String(value || "").trim();

    if (!normalized) {
        throw new TypeError(
            `${name} is required`
        );
    }

    return normalized;
}

function normalizeTimestamp(
    value,
    {
        required,
        name
    }
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        if (required) {
            throw new TypeError(
                `${name} is required`
            );
        }

        return null;
    }

    const normalized =
        String(value).trim();

    if (
        !normalized ||
        !Number.isFinite(
            Date.parse(normalized)
        )
    ) {
        throw new TypeError(
            `${name} is invalid`
        );
    }

    return normalized;
}

class SupabaseVoiceCommunicationEventRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof supabaseUrl !==
                "string" ||
            !supabaseUrl.trim() ||
            typeof apiKey !==
                "string" ||
            !apiKey.trim() ||
            !accessTokenProvider ||
            typeof accessTokenProvider
                .getAccessToken !==
                "function" ||
            typeof fetchImpl !==
                "function"
        ) {
            throw new Error(
                "SupabaseVoiceCommunicationEventRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl =
            supabaseUrl
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            apiKey.trim();

        this.accessTokenProvider =
            accessTokenProvider;

        this.fetchImpl =
            fetchImpl;
    }

    async apply({
        providerCallId,
        eventStatus,
        eventTimestamp,
        startTime = null,
        endTime = null
    } = {}) {
        const normalizedProviderCallId =
            normalizeRequiredString(
                providerCallId,
                "providerCallId"
            );

        const normalizedEventStatus =
            normalizeRequiredString(
                eventStatus,
                "eventStatus"
            ).toLowerCase();

        if (
            !SUPPORTED_EVENT_STATUSES.has(
                normalizedEventStatus
            )
        ) {
            throw new TypeError(
                "eventStatus is unsupported"
            );
        }

        const normalizedEventTimestamp =
            normalizeTimestamp(
                eventTimestamp,
                {
                    required: true,
                    name:
                        "eventTimestamp"
                }
            );

        const normalizedStartTime =
            normalizeTimestamp(
                startTime,
                {
                    required: false,
                    name:
                        "startTime"
                }
            );

        const normalizedEndTime =
            normalizeTimestamp(
                endTime,
                {
                    required: false,
                    name:
                        "endTime"
                }
            );

        if (
            normalizedEventStatus ===
                "completed" &&
            (
                !normalizedStartTime ||
                !normalizedEndTime
            )
        ) {
            throw new TypeError(
                "completed event requires startTime and endTime"
            );
        }

        if (
            normalizedStartTime &&
            normalizedEndTime &&
            Date.parse(
                normalizedEndTime
            ) <
                Date.parse(
                    normalizedStartTime
                )
        ) {
            throw new TypeError(
                "endTime precedes startTime"
            );
        }

        const token =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof token !==
                "string" ||
            !token.trim()
        ) {
            throw new Error(
                "Supabase access token is unavailable"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/apply_voice_communication_event`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        apikey:
                            this.apiKey,

                        Authorization:
                            `Bearer ${token.trim()}`
                    },

                    body:
                        JSON.stringify({
                            p_provider_call_id:
                                normalizedProviderCallId,

                            p_event_status:
                                normalizedEventStatus,

                            p_event_timestamp:
                                normalizedEventTimestamp,

                            p_start_time:
                                normalizedStartTime,

                            p_end_time:
                                normalizedEndTime
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase voice communication event request failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1 ||
            !result[0] ||
            typeof result[0] !==
                "object"
        ) {
            throw new Error(
                "Supabase voice communication event returned invalid result"
            );
        }

        const row =
            result[0];

        const transitionStatus =
            typeof row.transition_status ===
                "string"
                ? row.transition_status.trim()
                : "";

        const communicationLogId =
            typeof row.communication_log_id ===
                "string"
                ? row.communication_log_id.trim()
                : "";

        const resultStatus =
            typeof row.result_status ===
                "string"
                ? row.result_status.trim()
                : "";

        if (
            ![
                "updated",
                "unchanged"
            ].includes(
                transitionStatus
            ) ||
            !communicationLogId ||
            !RESULT_STATUSES.has(
                resultStatus
            )
        ) {
            throw new Error(
                "Supabase voice communication event returned invalid result"
            );
        }

        for (
            const value of [
                row.connected_at,
                row.ended_at
            ]
        ) {
            if (
                value !== null &&
                (
                    typeof value !==
                        "string" ||
                    !value.trim() ||
                    !Number.isFinite(
                        Date.parse(value)
                    )
                )
            ) {
                throw new Error(
                    "Supabase voice communication event returned invalid result"
                );
            }
        }

        return {
            transitionStatus,
            communicationLogId,
            resultStatus,

            connectedAt:
                row.connected_at,

            endedAt:
                row.ended_at
        };
    }
}

module.exports =
    SupabaseVoiceCommunicationEventRepository;
