"use strict";

const SourceEvidenceLocatorContract =
    require(
        "../server-domain/semantic/SourceEvidenceLocatorContract"
    );


class VoiceSourceEvidenceLocatorBuilder {
    build({
        recordingId,
        segmentIndex,
        startMs,
        endMs,
        transcriptText,
        contextEvidence
    } = {}) {
        const normalizedRecordingId =
            typeof recordingId === "string"
                ? recordingId.trim()
                : "";

        if (
            !normalizedRecordingId ||
            !Number.isInteger(segmentIndex) ||
            segmentIndex < 0 ||
            !Number.isInteger(startMs) ||
            startMs < 0 ||
            !Number.isInteger(endMs) ||
            endMs < startMs ||
            typeof transcriptText !== "string" ||
            !transcriptText.trim()
        ) {
            throw new TypeError(
                "Voice source evidence segment is invalid"
            );
        }

        if (
            contextEvidence !== undefined &&
            typeof contextEvidence !== "string"
        ) {
            throw new TypeError(
                "Voice source evidence context is invalid"
            );
        }

        const locator = {
            sourceType:
                "voice",

            documentReference:
                normalizedRecordingId,

            location: {
                segmentIndex,
                startMs,
                endMs
            },

            rawEvidence:
                transcriptText
        };

        if (contextEvidence !== undefined) {
            locator.contextEvidence =
                contextEvidence;
        }

        const result =
            SourceEvidenceLocatorContract
                .validate(
                    locator
                );

        if (result.status !== "valid") {
            throw new TypeError(
                "Voice source evidence locator is invalid"
            );
        }

        return result.sourceEvidenceLocator;
    }
}


module.exports =
    VoiceSourceEvidenceLocatorBuilder;
