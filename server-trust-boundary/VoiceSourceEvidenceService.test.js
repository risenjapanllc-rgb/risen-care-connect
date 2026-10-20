"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceSourceEvidenceService =
    require(
        "./VoiceSourceEvidenceService"
    );

const VoiceSourceEvidenceLocatorBuilder =
    require(
        "./VoiceSourceEvidenceLocatorBuilder"
    );


test(
    "builds trusted source evidence locators from repository segments",
    async () => {
        let receivedInput;

        const segmentRepository = {
            list:
                async input => {
                    receivedInput =
                        input;

                    return [
                        {
                            recordingId:
                                "recording-1",

                            segmentIndex:
                                0,

                            startMs:
                                0,

                            endMs:
                                3000,

                            transcriptText:
                                "最初の発話"
                        },

                        {
                            recordingId:
                                "recording-1",

                            segmentIndex:
                                1,

                            startMs:
                                3000,

                            endMs:
                                7000,

                            transcriptText:
                                "次の発話"
                        }
                    ];
                }
        };

        const service =
            new VoiceSourceEvidenceService({
                segmentRepository,

                locatorBuilder:
                    new VoiceSourceEvidenceLocatorBuilder()
            });

        const result =
            await service.buildForRecording({
                facilityId:
                    "facility-1",

                recordingId:
                    "recording-1"
            });

        assert.deepStrictEqual(
            receivedInput,
            {
                facilityId:
                    "facility-1",

                recordingId:
                    "recording-1"
            }
        );

        assert.deepStrictEqual(
            result,
            [
                {
                    sourceType:
                        "voice",

                    documentReference:
                        "recording-1",

                    location: {
                        segmentIndex:
                            0,

                        startMs:
                            0,

                        endMs:
                            3000
                    },

                    rawEvidence:
                        "最初の発話"
                },

                {
                    sourceType:
                        "voice",

                    documentReference:
                        "recording-1",

                    location: {
                        segmentIndex:
                            1,

                        startMs:
                            3000,

                        endMs:
                            7000
                    },

                    rawEvidence:
                        "次の発話"
                }
            ]
        );
    }
);


test(
    "returns empty array when repository has no trusted segments",
    async () => {
        const service =
            new VoiceSourceEvidenceService({
                segmentRepository: {
                    list:
                        async () =>
                            []
                },

                locatorBuilder:
                    new VoiceSourceEvidenceLocatorBuilder()
            });

        assert.deepStrictEqual(
            await service.buildForRecording({
                facilityId:
                    "facility-1",

                recordingId:
                    "recording-1"
            }),
            []
        );
    }
);


test(
    "rejects invalid repository result",
    async () => {
        const service =
            new VoiceSourceEvidenceService({
                segmentRepository: {
                    list:
                        async () =>
                            null
                },

                locatorBuilder:
                    new VoiceSourceEvidenceLocatorBuilder()
            });

        await assert.rejects(
            () =>
                service.buildForRecording({
                    facilityId:
                        "facility-1",

                    recordingId:
                        "recording-1"
                }),
            /repository returned invalid result/
        );
    }
);


test(
    "does not invent or rewrite trusted segment coordinates",
    async () => {
        const trustedSegment = {
            recordingId:
                "recording-2",

            segmentIndex:
                4,

            startMs:
                1234,

            endMs:
                5678,

            transcriptText:
                "原本発話"
        };

        const received = [];

        const service =
            new VoiceSourceEvidenceService({
                segmentRepository: {
                    list:
                        async () =>
                            [trustedSegment]
                },

                locatorBuilder: {
                    build:
                        segment => {
                            received.push(
                                segment
                            );

                            return {
                                sourceType:
                                    "voice",

                                documentReference:
                                    segment.recordingId,

                                location: {
                                    segmentIndex:
                                        segment.segmentIndex,

                                    startMs:
                                        segment.startMs,

                                    endMs:
                                        segment.endMs
                                },

                                rawEvidence:
                                    segment.transcriptText
                            };
                        }
                }
            });

        await service.buildForRecording({
            facilityId:
                "facility-2",

            recordingId:
                "recording-2"
        });

        assert.strictEqual(
            received[0],
            trustedSegment
        );
    }
);
