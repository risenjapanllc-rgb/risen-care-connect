"use strict";


class VoiceSourceEvidenceService {
    constructor({
        segmentRepository,
        locatorBuilder
    } = {}) {
        if (
            !segmentRepository ||
            typeof segmentRepository.list !==
                "function"
        ) {
            throw new Error(
                "VoiceSourceEvidenceService requires segmentRepository"
            );
        }

        if (
            !locatorBuilder ||
            typeof locatorBuilder.build !==
                "function"
        ) {
            throw new Error(
                "VoiceSourceEvidenceService requires locatorBuilder"
            );
        }

        this.segmentRepository =
            segmentRepository;

        this.locatorBuilder =
            locatorBuilder;
    }


    async buildForRecording({
        facilityId,
        recordingId
    } = {}) {
        const segments =
            await this.segmentRepository
                .list({
                    facilityId,
                    recordingId
                });

        if (!Array.isArray(segments)) {
            throw new Error(
                "Voice transcription segment repository returned invalid result"
            );
        }

        return segments.map(
            segment =>
                this.locatorBuilder
                    .build(
                        segment
                    )
        );
    }
}


module.exports =
    VoiceSourceEvidenceService;
