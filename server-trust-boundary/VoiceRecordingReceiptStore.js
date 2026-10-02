"use strict";

class VoiceRecordingReceiptStore {
    constructor({
        ttlMs =
            24 * 60 * 60 * 1000,
        now =
            Date.now
    } = {}) {
        if (
            !Number.isSafeInteger(ttlMs) ||
            ttlMs <= 0
        ) {
            throw new Error(
                "VoiceRecordingReceiptStore ttlMs is invalid"
            );
        }

        if (
            typeof now !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingReceiptStore requires now"
            );
        }

        this.ttlMs =
            ttlMs;

        this.now =
            now;

        this.entries =
            new Map();
    }

    claim(recordingUuid) {
        const normalized =
            String(
                recordingUuid || ""
            ).trim();

        if (!normalized) {
            throw new Error(
                "voice_recording_uuid_invalid"
            );
        }

        this.purgeExpired();

        if (
            this.entries.has(
                normalized
            )
        ) {
            return false;
        }

        this.entries.set(
            normalized,
            {
                state:
                    "processing",

                expiresAt:
                    this.now() +
                    this.ttlMs
            }
        );

        return true;
    }

    complete(recordingUuid) {
        const normalized =
            String(
                recordingUuid || ""
            ).trim();

        const entry =
            this.entries.get(
                normalized
            );

        if (!entry) {
            return false;
        }

        entry.state =
            "completed";

        entry.expiresAt =
            this.now() +
            this.ttlMs;

        return true;
    }

    release(recordingUuid) {
        const normalized =
            String(
                recordingUuid || ""
            ).trim();

        if (!normalized) {
            return false;
        }

        return this.entries.delete(
            normalized
        );
    }

    getState(recordingUuid) {
        const normalized =
            String(
                recordingUuid || ""
            ).trim();

        if (!normalized) {
            return null;
        }

        this.purgeExpired();

        const entry =
            this.entries.get(
                normalized
            );

        return entry
            ? entry.state
            : null;
    }

    purgeExpired() {
        const currentTime =
            this.now();

        for (
            const [
                recordingUuid,
                entry
            ]
            of this.entries
        ) {
            if (
                entry.expiresAt <=
                currentTime
            ) {
                this.entries.delete(
                    recordingUuid
                );
            }
        }
    }
}

module.exports =
    VoiceRecordingReceiptStore;
