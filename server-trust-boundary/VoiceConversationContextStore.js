"use strict";

class VoiceConversationContextStore {
    constructor({
        ttlMs =
            6 * 60 * 60 * 1000,
        now =
            Date.now
    } = {}) {
        if (
            !Number.isSafeInteger(ttlMs) ||
            ttlMs <= 0
        ) {
            throw new Error(
                "VoiceConversationContextStore ttlMs is invalid"
            );
        }

        if (
            typeof now !==
                "function"
        ) {
            throw new Error(
                "VoiceConversationContextStore requires now"
            );
        }

        this.ttlMs =
            ttlMs;

        this.now =
            now;

        this.entries =
            new Map();
    }

    put({
        conversationUuid,
        facilityId,
        caseId,
        contactId,
        communicationLogId =
            null
    } = {}) {
        const normalizedConversationUuid =
            String(
                conversationUuid || ""
            ).trim();

        const normalizedFacilityId =
            String(
                facilityId || ""
            ).trim();

        const normalizedCaseId =
            String(
                caseId || ""
            ).trim();

        const normalizedContactId =
            String(
                contactId || ""
            ).trim();

        const normalizedCommunicationLogId =
            typeof communicationLogId ===
                "string"
                ? communicationLogId.trim()
                : "";

        if (
            !normalizedConversationUuid ||
            !normalizedFacilityId ||
            !normalizedCaseId ||
            !normalizedContactId
        ) {
            throw new Error(
                "voice_conversation_context_invalid"
            );
        }

        const entry = {
            facilityId:
                normalizedFacilityId,

            caseId:
                normalizedCaseId,

            contactId:
                normalizedContactId,

            expiresAt:
                this.now() +
                this.ttlMs
        };

        if (normalizedCommunicationLogId) {
            entry.communicationLogId =
                normalizedCommunicationLogId;
        }

        this.entries.set(
            normalizedConversationUuid,
            entry
        );
    }

    get(conversationUuid) {
        const normalizedConversationUuid =
            String(
                conversationUuid || ""
            ).trim();

        if (!normalizedConversationUuid) {
            return null;
        }

        const entry =
            this.entries.get(
                normalizedConversationUuid
            );

        if (!entry) {
            return null;
        }

        if (
            entry.expiresAt <=
            this.now()
        ) {
            this.entries.delete(
                normalizedConversationUuid
            );

            return null;
        }

        const result = {
            facilityId:
                entry.facilityId,

            caseId:
                entry.caseId,

            contactId:
                entry.contactId
        };

        if (entry.communicationLogId) {
            result.communicationLogId =
                entry.communicationLogId;
        }

        return result;
    }

    delete(conversationUuid) {
        const normalizedConversationUuid =
            String(
                conversationUuid || ""
            ).trim();

        if (!normalizedConversationUuid) {
            return false;
        }

        return this.entries.delete(
            normalizedConversationUuid
        );
    }

    purgeExpired() {
        const currentTime =
            this.now();

        for (
            const [
                conversationUuid,
                entry
            ]
            of this.entries
        ) {
            if (
                entry.expiresAt <=
                currentTime
            ) {
                this.entries.delete(
                    conversationUuid
                );
            }
        }
    }
}

module.exports =
    VoiceConversationContextStore;
