"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceRecordingProcessingService =
    require("./VoiceRecordingProcessingService");

const VoiceRecordingReceiptStore =
    require("./VoiceRecordingReceiptStore");


function validInput() {
    return {
        recordingUuid:
            "recording-A",

        conversationUuid:
            "CON-A",

        recordingUrl:
            "https://api-us.nexmo.com/v1/files/recording-A",

        startTime:
            "2026-10-02T00:00:00Z",

        endTime:
            "2026-10-02T00:00:30Z",

        conversationContext: {
            facilityId:
                "facility-A",

            caseId:
                "case-A",

            contactId:
                "contact-A",

            communicationLogId:
                "communication-log-A"
        }
    };
}


test(
    "downloads and stores a claimed recording exactly once",
    async () => {
        const receiptStore =
            new VoiceRecordingReceiptStore();

        let saved =
            null;

        const service =
            new VoiceRecordingProcessingService({
                receiptStore,

                downloadService: {
                    async download() {
                        return {
                            data:
                                Buffer.from(
                                    "RIFF-test"
                                ),

                            size:
                                9,

                            contentType:
                                "audio/wave"
                        };
                    }
                },

                recordingStore: {
                    async save(input) {
                        saved =
                            input;

                        return {
                            storageReference:
                                "recordings/recording-A.wav"
                        };
                    }
                }
            });

        const result =
            await service.process(
                validInput()
            );

        assert.equal(
            result.status,
            "stored"
        );

        assert.equal(
            result.recordingUuid,
            "recording-A"
        );

        assert.equal(
            result.size,
            9
        );

        assert.equal(
            result.storageReference,
            "recordings/recording-A.wav"
        );

        assert.equal(
            saved.conversationUuid,
            "CON-A"
        );

        assert.equal(
            saved.facilityId,
            "facility-A"
        );

        assert.equal(
            saved.caseId,
            "case-A"
        );

        assert.equal(
            saved.contactId,
            "contact-A"
        );

        assert.equal(
            saved.communicationLogId,
            "communication-log-A"
        );

        assert.equal(
            saved.startTime,
            "2026-10-02T00:00:00Z"
        );

        assert.equal(
            saved.endTime,
            "2026-10-02T00:00:30Z"
        );

        assert.deepEqual(
            saved.data,
            Buffer.from(
                "RIFF-test"
            )
        );

        assert.equal(
            receiptStore.getState(
                "recording-A"
            ),
            "completed"
        );
    }
);


test(
    "does not download or store a duplicate recording",
    async () => {
        const receiptStore =
            new VoiceRecordingReceiptStore();

        receiptStore.claim(
            "recording-A"
        );

        receiptStore.complete(
            "recording-A"
        );

        let downloadCalled =
            false;

        let saveCalled =
            false;

        const service =
            new VoiceRecordingProcessingService({
                receiptStore,

                downloadService: {
                    async download() {
                        downloadCalled =
                            true;

                        throw new Error(
                            "must not download"
                        );
                    }
                },

                recordingStore: {
                    async save() {
                        saveCalled =
                            true;

                        throw new Error(
                            "must not save"
                        );
                    }
                }
            });

        const result =
            await service.process(
                validInput()
            );

        assert.equal(
            result.status,
            "duplicate"
        );

        assert.equal(
            downloadCalled,
            false
        );

        assert.equal(
            saveCalled,
            false
        );
    }
);


test(
    "releases receipt when download fails",
    async () => {
        const receiptStore =
            new VoiceRecordingReceiptStore();

        const service =
            new VoiceRecordingProcessingService({
                receiptStore,

                downloadService: {
                    async download() {
                        throw new Error(
                            "voice_recording_download_failed"
                        );
                    }
                },

                recordingStore: {
                    async save() {
                        throw new Error(
                            "must not save"
                        );
                    }
                }
            });

        await assert.rejects(
            () =>
                service.process(
                    validInput()
                ),
            /voice_recording_download_failed/
        );

        assert.equal(
            receiptStore.getState(
                "recording-A"
            ),
            null
        );

        assert.equal(
            receiptStore.claim(
                "recording-A"
            ),
            true
        );
    }
);


test(
    "releases receipt when storage fails",
    async () => {
        const receiptStore =
            new VoiceRecordingReceiptStore();

        const service =
            new VoiceRecordingProcessingService({
                receiptStore,

                downloadService: {
                    async download() {
                        return {
                            data:
                                Buffer.from(
                                    "RIFF-test"
                                ),

                            size:
                                9,

                            contentType:
                                "audio/wave"
                        };
                    }
                },

                recordingStore: {
                    async save() {
                        throw new Error(
                            "voice_recording_storage_failed"
                        );
                    }
                }
            });

        await assert.rejects(
            () =>
                service.process(
                    validInput()
                ),
            /voice_recording_storage_failed/
        );

        assert.equal(
            receiptStore.getState(
                "recording-A"
            ),
            null
        );
    }
);


test(
    "rejects incomplete input before claiming",
    async () => {
        const receiptStore =
            new VoiceRecordingReceiptStore();

        let downloadCalled =
            false;

        const service =
            new VoiceRecordingProcessingService({
                receiptStore,

                downloadService: {
                    async download() {
                        downloadCalled =
                            true;

                        return {};
                    }
                },

                recordingStore: {
                    async save() {
                        return {};
                    }
                }
            });

        await assert.rejects(
            () =>
                service.process({
                    recordingUuid:
                        "recording-A",

                    conversationUuid:
                        "CON-A",

                    recordingUrl:
                        "https://api-us.nexmo.com/v1/files/recording-A",

                    conversationContext: {
                        facilityId:
                            "facility-A",

                        caseId:
                            "case-A",

                        contactId:
                            "contact-A"
                    }
                }),
            /voice_recording_processing_input_invalid/
        );

        assert.equal(
            receiptStore.getState(
                "recording-A"
            ),
            null
        );

        assert.equal(
            downloadCalled,
            false
        );
    }
);
