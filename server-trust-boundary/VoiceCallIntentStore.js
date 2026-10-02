"use strict";

const crypto = require("crypto");

class VoiceCallIntentStore {
    constructor({
        ttlMs =
            5 * 60 * 1000
    } = {}) {
        this.ttlMs =
            ttlMs;

        this.entries =
            new Map();
    }

    create({
        facilityId,
        caseId,
        contactId,
        phoneNumber,
        fromNumber
    } = {}) {
        const id =
            crypto.randomBytes(32)
                .toString("base64url");

        this.entries.set(
            id,
            {
                facilityId,
                caseId,
                contactId,
                phoneNumber,
                fromNumber,
                expiresAt:
                    Date.now() +
                    this.ttlMs
            }
        );

        return id;
    }

    consume(id) {
        const normalizedId =
            String(id || "").trim();

        const entry =
            this.entries.get(
                normalizedId
            );

        if (!entry) {
            return null;
        }

        this.entries.delete(
            normalizedId
        );

        if (
            entry.expiresAt <=
            Date.now()
        ) {
            return null;
        }

        return entry;
    }

    purgeExpired() {
        const now =
            Date.now();

        for (
            const [id, entry]
            of this.entries
        ) {
            if (
                entry.expiresAt <= now
            ) {
                this.entries.delete(id);
            }
        }
    }
}

module.exports =
    VoiceCallIntentStore;
