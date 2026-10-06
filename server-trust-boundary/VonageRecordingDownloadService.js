"use strict";

const {
    createVonageVoiceJwt
} = require("../services/vonageVoiceAuth");

const DEFAULT_MAX_BYTES =
    25 * 1024 * 1024;

const ALLOWED_RECORDING_HOSTS =
    new Set([
        "api-us.nexmo.com",
        "api-sg-1.nexmo.com"
    ]);

class VonageRecordingDownloadService {
    constructor({
        createJwt =
            createVonageVoiceJwt,
        fetchImpl =
            globalThis.fetch,
        maxBytes =
            DEFAULT_MAX_BYTES
    } = {}) {
        if (
            typeof createJwt !==
                "function"
        ) {
            throw new Error(
                "VonageRecordingDownloadService requires createJwt"
            );
        }

        if (
            typeof fetchImpl !==
                "function"
        ) {
            throw new Error(
                "VonageRecordingDownloadService requires fetchImpl"
            );
        }

        if (
            !Number.isSafeInteger(
                maxBytes
            ) ||
            maxBytes <= 0
        ) {
            throw new Error(
                "VonageRecordingDownloadService maxBytes is invalid"
            );
        }

        this.createJwt =
            createJwt;

        this.fetchImpl =
            fetchImpl;

        this.maxBytes =
            maxBytes;
    }

    validateRecordingUrl(
        recordingUrl
    ) {
        let parsed;

        try {
            parsed =
                new URL(
                    String(
                        recordingUrl ||
                        ""
                    ).trim()
                );
        } catch (error) {
            throw new Error(
                "voice_recording_url_invalid"
            );
        }

        if (
            parsed.protocol !==
                "https:" ||
            parsed.username ||
            parsed.password ||
            parsed.port ||
            !ALLOWED_RECORDING_HOSTS.has(
                parsed.hostname
            ) ||
            !/^\/v1\/files\/[A-Za-z0-9_-]+$/.test(
                parsed.pathname
            ) ||
            parsed.search ||
            parsed.hash
        ) {
            throw new Error(
                "voice_recording_url_invalid"
            );
        }

        return parsed;
    }

    async download({
        recordingUrl
    } = {}) {
        const parsed =
            this.validateRecordingUrl(
                recordingUrl
            );

        const jwt =
            this.createJwt();

        const response =
            await this.fetchImpl(
                parsed.toString(),
                {
                    method:
                        "GET",

                    redirect:
                        "error",

                    headers: {
                        Authorization:
                            `Bearer ${jwt}`
                    }
                }
            );

        if (
            !response ||
            response.ok !== true
        ) {
            throw new Error(
                "voice_recording_download_failed"
            );
        }

        const contentLengthValue =
            response.headers &&
            typeof response.headers.get ===
                "function"
                ? response.headers.get(
                    "content-length"
                )
                : null;

        if (
            contentLengthValue !==
                null &&
            contentLengthValue !==
                ""
        ) {
            const contentLength =
                Number(
                    contentLengthValue
                );

            if (
                !Number.isSafeInteger(
                    contentLength
                ) ||
                contentLength < 0 ||
                contentLength >
                    this.maxBytes
            ) {
                throw new Error(
                    "voice_recording_too_large"
                );
            }
        }

        if (
            typeof response.arrayBuffer !==
                "function"
        ) {
            throw new Error(
                "voice_recording_download_failed"
            );
        }

        const data =
            Buffer.from(
                await response.arrayBuffer()
            );

        if (
            data.length >
            this.maxBytes
        ) {
            throw new Error(
                "voice_recording_too_large"
            );
        }

        const contentType =
            response.headers &&
            typeof response.headers.get ===
                "function"
                ? response.headers.get(
                    "content-type"
                )
                : null;

        return {
            data,
            size:
                data.length,
            contentType:
                contentType || null
        };
    }
}

module.exports =
    VonageRecordingDownloadService;
