"use strict";

class VoiceRecordingPlaybackService {
    constructor({
        connectorTrustService,
        recordingRepository,
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingPlaybackService requires connectorTrustService"
            );
        }

        if (
            !recordingRepository ||
            typeof recordingRepository
                .findByFacilityAndRecording !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingPlaybackService requires recordingRepository"
            );
        }

        if (
            typeof supabaseUrl !== "string" ||
            !supabaseUrl.trim() ||
            typeof apiKey !== "string" ||
            !apiKey.trim() ||
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !==
                "function" ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "VoiceRecordingPlaybackService requires Supabase configuration"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.recordingRepository =
            recordingRepository;

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

    async createSignedUrl({
        storageBucket,
        storagePath
    } = {}) {
        if (
            typeof storageBucket !== "string" ||
            !storageBucket.trim() ||
            typeof storagePath !== "string" ||
            !storagePath.trim()
        ) {
            throw new Error(
                "voice recording storage context is invalid"
            );
        }

        const token =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof token !== "string" ||
            !token.trim()
        ) {
            throw new Error(
                "Supabase access token is unavailable"
            );
        }

        const encodedPath =
            storagePath
                .split("/")
                .map(segment =>
                    encodeURIComponent(segment)
                )
                .join("/");

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(storageBucket)}/${encodedPath}`,
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
                            expiresIn:
                                60
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `voice recording signed URL request failed: ${response.status}`
            );
        }

        const body =
            await response.json();

        const signedUrl =
            body?.signedURL ||
            body?.signedUrl;

        if (
            typeof signedUrl !== "string" ||
            !signedUrl.trim()
        ) {
            throw new Error(
                "voice recording signed URL was not returned"
            );
        }

        if (
            signedUrl.startsWith("https://") ||
            signedUrl.startsWith("http://")
        ) {
            return signedUrl;
        }

        return (
            this.supabaseUrl +
            "/storage/v1" +
            (
                signedUrl.startsWith("/")
                    ? signedUrl
                    : `/${signedUrl}`
            )
        );
    }

    async getPlayback({
        connectorId,
        credential,
        recordingId
    } = {}) {
        const normalizedRecordingId =
            String(
                recordingId || ""
            ).trim();

        if (!normalizedRecordingId) {
            return {
                status:
                    "invalid",

                errorCode:
                    "voice_recording_playback_request_invalid"
            };
        }

        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService
                    .authenticate({
                        connectorId,
                        credential
                    });
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            !trustResult ||
            typeof trustResult !== "object" ||
            Array.isArray(trustResult)
        ) {
            return {
                status:
                    "error",

                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            trustResult.status ===
            "denied"
        ) {
            return {
                status:
                    "denied",

                errorCode:
                    "connector_trust_denied"
            };
        }

        if (
            trustResult.status !==
                "verified" ||
            !trustResult.verifiedContext ||
            !trustResult.verifiedContext
                .facilityId
        ) {
            return {
                status:
                    "error",

                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const facilityId =
            trustResult
                .verifiedContext
                .facilityId;

        let recording;

        try {
            recording =
                await this.recordingRepository
                    .findByFacilityAndRecording({
                        facilityId,
                        recordingId:
                            normalizedRecordingId
                    });
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "voice_recording_playback_lookup_unavailable"
            };
        }

        if (!recording) {
            return {
                status:
                    "not_found",

                errorCode:
                    "voice_recording_not_found"
            };
        }

        let signedUrl;

        try {
            signedUrl =
                await this.createSignedUrl({
                    storageBucket:
                        recording.storageBucket,

                    storagePath:
                        recording.storagePath
                });
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "voice_recording_playback_url_unavailable"
            };
        }

        return {
            status:
                "ready",

            recordingId:
                recording.recordingId,

            communicationLogId:
                recording.communicationLogId,

            signedUrl,

            expiresIn:
                60,

            durationMs:
                recording.durationMs,

            transcriptionStatus:
                recording.transcriptionStatus,

            transcriptionText:
                recording.transcriptionText
        };
    }
}

module.exports =
    VoiceRecordingPlaybackService;
