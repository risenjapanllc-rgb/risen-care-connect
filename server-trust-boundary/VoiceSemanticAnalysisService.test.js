"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceSemanticAnalysisService =
    require(
        "./VoiceSemanticAnalysisService"
    );


test(
    "sends trusted voice evidence to common Semantic Analysis generator",
    async () => {
        const locator = {
            sourceType:
                "voice",

            documentReference:
                "recording-1",

            location: {
                segmentIndex:
                    0,

                startMs:
                    1000,

                endMs:
                    4000
            },

            rawEvidence:
                "利用者Aさんは昼食を半分食べた。"
        };

        let generatorInput;

        const semanticAnalysis = {
            perspectiveResolution: {
                resolutionMode:
                    "resolved",

                perspectiveType:
                    "resident",

                subjectScope:
                    "single_resident",

                temporalScope:
                    "event",

                interpretation:
                    "利用者の食事に関する発話",

                confidence:
                    "high",

                facilityQuestion:
                    ""
            },

            semanticDecomposition: {
                decompositionMode:
                    "decomposed",

                sourceScope:
                    "single_resident",

                facts:
                    [],

                facilityQuestion:
                    ""
            }
        };

        const service =
            new VoiceSemanticAnalysisService({
                sourceEvidenceService: {
                    buildForRecording:
                        async input => {
                            assert.deepStrictEqual(
                                input,
                                {
                                    facilityId:
                                        "facility-1",

                                    recordingId:
                                        "recording-1"
                                }
                            );

                            return [
                                locator
                            ];
                        }
                },

                semanticAnalysisGenerator: {
                    generate:
                        async input => {
                            generatorInput =
                                input;

                            return semanticAnalysis;
                        }
                }
            });

        const result =
            await service.analyzeRecording({
                facilityId:
                    "facility-1",

                recordingId:
                    "recording-1"
            });

        assert.deepStrictEqual(
            generatorInput,
            {
                sourceType:
                    "voice",

                sourceDocumentName:
                    "recording-1",

                sourceLabel:
                    "音声発話",

                sourceValue:
                    locator.rawEvidence,

                sourceEvidenceLocator:
                    locator
            }
        );

        assert.deepStrictEqual(
            result,
            [
                {
                    sourceEvidenceLocator:
                        locator,

                    semanticAnalysis
                }
            ]
        );
    }
);


test(
    "analyzes each trusted segment independently",
    async () => {
        const locators = [
            {
                sourceType:
                    "voice",

                documentReference:
                    "recording-2",

                location: {
                    segmentIndex:
                        0,

                    startMs:
                        0,

                    endMs:
                        2000
                },

                rawEvidence:
                    "一つ目"
            },

            {
                sourceType:
                    "voice",

                documentReference:
                    "recording-2",

                location: {
                    segmentIndex:
                        1,

                    startMs:
                        2000,

                    endMs:
                        5000
                },

                rawEvidence:
                    "二つ目"
            }
        ];

        const received = [];

        const service =
            new VoiceSemanticAnalysisService({
                sourceEvidenceService: {
                    buildForRecording:
                        async () =>
                            locators
                },

                semanticAnalysisGenerator: {
                    generate:
                        async input => {
                            received.push(
                                input
                            );

                            return {
                                segment:
                                    input
                                        .sourceEvidenceLocator
                                        .location
                                        .segmentIndex
                            };
                        }
                }
            });

        const result =
            await service.analyzeRecording({
                facilityId:
                    "facility-2",

                recordingId:
                    "recording-2"
            });

        assert.equal(
            received.length,
            2
        );

        assert.strictEqual(
            received[0]
                .sourceEvidenceLocator,
            locators[0]
        );

        assert.strictEqual(
            received[1]
                .sourceEvidenceLocator,
            locators[1]
        );

        assert.deepStrictEqual(
            result.map(
                item =>
                    item.semanticAnalysis.segment
            ),
            [
                0,
                1
            ]
        );
    }
);


test(
    "does not expose trusted timestamp coordinates as AI evidence",
    async () => {
        const locator = {
            sourceType:
                "voice",

            documentReference:
                "recording-3",

            location: {
                segmentIndex:
                    7,

                startMs:
                    1234,

                endMs:
                    9876
            },

            rawEvidence:
                "原本発話"
        };

        let receivedInput;

        const service =
            new VoiceSemanticAnalysisService({
                sourceEvidenceService: {
                    buildForRecording:
                        async () =>
                            [locator]
                },

                semanticAnalysisGenerator: {
                    generate:
                        async input => {
                            receivedInput =
                                input;

                            return {};
                        }
                }
            });

        await service.analyzeRecording({
            facilityId:
                "facility-3",

            recordingId:
                "recording-3"
        });

        assert.equal(
            Object.prototype
                .hasOwnProperty.call(
                    receivedInput,
                    "evidence"
                ),
            false
        );

        assert.equal(
            receivedInput.sourceValue,
            locator.rawEvidence
        );

        assert.strictEqual(
            receivedInput
                .sourceEvidenceLocator,
            locator
        );
    }
);


test(
    "returns empty array when no trusted segments exist",
    async () => {
        let generatorCalled =
            false;

        const service =
            new VoiceSemanticAnalysisService({
                sourceEvidenceService: {
                    buildForRecording:
                        async () =>
                            []
                },

                semanticAnalysisGenerator: {
                    generate:
                        async () => {
                            generatorCalled =
                                true;

                            return {};
                        }
                }
            });

        assert.deepStrictEqual(
            await service.analyzeRecording({
                facilityId:
                    "facility-4",

                recordingId:
                    "recording-4"
            }),
            []
        );

        assert.equal(
            generatorCalled,
            false
        );
    }
);
