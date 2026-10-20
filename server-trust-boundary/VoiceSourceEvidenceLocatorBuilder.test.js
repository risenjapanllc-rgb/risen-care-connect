"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceSourceEvidenceLocatorBuilder =
    require(
        "./VoiceSourceEvidenceLocatorBuilder"
    );


test(
    "builds trusted voice locator from persisted segment coordinates",
    () => {
        const builder =
            new VoiceSourceEvidenceLocatorBuilder();

        const locator =
            builder.build({
                recordingId:
                    "recording-1",

                segmentIndex:
                    0,

                startMs:
                    1200,

                endMs:
                    4700,

                transcriptText:
                    "昼食は半分でした。"
            });

        assert.deepStrictEqual(
            locator,
            {
                sourceType:
                    "voice",

                documentReference:
                    "recording-1",

                location: {
                    segmentIndex:
                        0,

                    startMs:
                        1200,

                    endMs:
                        4700
                },

                rawEvidence:
                    "昼食は半分でした。"
            }
        );
    }
);


test(
    "preserves transcript and context evidence without rewriting",
    () => {
        const builder =
            new VoiceSourceEvidenceLocatorBuilder();

        const transcriptText =
            "  原本の音声文字列  ";

        const contextEvidence =
            "  前後を含む音声文脈  ";

        const locator =
            builder.build({
                recordingId:
                    "recording-2",

                segmentIndex:
                    3,

                startMs:
                    5000,

                endMs:
                    8000,

                transcriptText,
                contextEvidence
            });

        assert.equal(
            locator.rawEvidence,
            transcriptText
        );

        assert.equal(
            locator.contextEvidence,
            contextEvidence
        );
    }
);


test(
    "rejects missing recording identity",
    () => {
        const builder =
            new VoiceSourceEvidenceLocatorBuilder();

        assert.throws(
            () =>
                builder.build({
                    segmentIndex:
                        0,

                    startMs:
                        0,

                    endMs:
                        1000,

                    transcriptText:
                        "test"
                }),
            TypeError
        );
    }
);


test(
    "rejects invalid trusted timestamp coordinates",
    () => {
        const builder =
            new VoiceSourceEvidenceLocatorBuilder();

        for (const input of [
            {
                segmentIndex: -1,
                startMs: 0,
                endMs: 1000
            },
            {
                segmentIndex: 0.5,
                startMs: 0,
                endMs: 1000
            },
            {
                segmentIndex: 0,
                startMs: -1,
                endMs: 1000
            },
            {
                segmentIndex: 0,
                startMs: 2000,
                endMs: 1000
            }
        ]) {
            assert.throws(
                () =>
                    builder.build({
                        recordingId:
                            "recording-3",

                        transcriptText:
                            "test",

                        ...input
                    }),
                TypeError
            );
        }
    }
);


test(
    "rejects blank transcript evidence",
    () => {
        const builder =
            new VoiceSourceEvidenceLocatorBuilder();

        assert.throws(
            () =>
                builder.build({
                    recordingId:
                        "recording-4",

                    segmentIndex:
                        0,

                    startMs:
                        0,

                    endMs:
                        1000,

                    transcriptText:
                        "   "
                }),
            TypeError
        );
    }
);
