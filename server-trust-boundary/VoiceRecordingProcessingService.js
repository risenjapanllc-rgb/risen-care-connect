"use strict";

class VoiceRecordingProcessingService {
    constructor({
        receiptStore,
        downloadService,
        recordingStore
    } = {}) {
        if (
            !receiptStore ||
            typeof receiptStore.claim !==
                "function" ||
            typeof receiptStore.complete !==
                "function" ||
            typeof receiptStore.release !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingProcessingService requires receiptStore"
            );
        }

        if (
            !downloadService ||
            typeof downloadService.download !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingProcessingService requires downloadService"
            );
        }

        if (
            !recordingStore ||
            typeof recordingStore.save !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingProcessingService requires recordingStore"
            );
        }

        this.receiptStore =
            receiptStore;

        this.downloadService =
            downloadService;

        this.recordingStore =
            recordingStore;
    }

    async process({
        recordingUuid,
        conversationUuid,
        recordingUrl,
        conversationContext
    } = {}) {
        const normalizedRecordingUuid =
            String(
                recordingUuid || ""
            ).trim();

        const normalizedConversationUuid =
            String(
                conversationUuid || ""
            ).trim();

        if (
            !normalizedRecordingUuid ||
            !normalizedConversationUuid ||
            typeof recordingUrl !==
                "string" ||
            !recordingUrl.trim() ||
            !conversationContext ||
            typeof conversationContext !==
                "object" ||
            !String(
                conversationContext.facilityId ||
                ""
            ).trim() ||
            !String(
                conversationContext.caseId ||
                ""
            ).trim() ||
            !String(
                conversationContext.contactId ||
                ""
            ).trim() ||
            !String(
                conversationContext.communicationLogId ||
                ""
            ).trim()
        ) {
            throw new Error(
                "voice_recording_processing_input_invalid"
            );
        }

        const claimed =
            this.receiptStore.claim(
                normalizedRecordingUuid
            );

        if (!claimed) {
            return {
                status:
                    "duplicate",

                recordingUuid:
                    normalizedRecordingUuid
            };
        }

        try {
            const download =
                await this.downloadService.download({
                    recordingUrl:
                        recordingUrl.trim()
                });

            const stored =
                await this.recordingStore.save({
                    recordingUuid:
                        normalizedRecordingUuid,

                    conversationUuid:
                        normalizedConversationUuid,

                    facilityId:
                        String(
                            conversationContext.facilityId
                        ).trim(),

                    caseId:
                        String(
                            conversationContext.caseId
                        ).trim(),

                    contactId:
                        String(
                            conversationContext.contactId
                        ).trim(),

                    communicationLogId:
                        String(
                            conversationContext.communicationLogId
                        ).trim(),

                    data:
                        download.data,

                    size:
                        download.size,

                    contentType:
                        download.contentType
                });

            const completed =
                this.receiptStore.complete(
                    normalizedRecordingUuid
                );

            if (!completed) {
                throw new Error(
                    "voice_recording_receipt_complete_failed"
                );
            }

            return {
                status:
                    "stored",

                recordingUuid:
                    normalizedRecordingUuid,

                size:
                    download.size,

                contentType:
                    download.contentType || null,

                storageReference:
                    stored &&
                    typeof stored.storageReference ===
                        "string"
                        ? stored.storageReference
                        : null
            };
        } catch (error) {
            this.receiptStore.release(
                normalizedRecordingUuid
            );

            throw error;
        }
    }
}

module.exports =
    VoiceRecordingProcessingService;
