"use strict";


class VoiceSemanticAnalysisService {
    constructor({
        sourceEvidenceService,
        semanticAnalysisGenerator
    } = {}) {
        if (
            !sourceEvidenceService ||
            typeof sourceEvidenceService
                .buildForRecording !==
                "function"
        ) {
            throw new Error(
                "VoiceSemanticAnalysisService requires sourceEvidenceService"
            );
        }

        if (
            !semanticAnalysisGenerator ||
            typeof semanticAnalysisGenerator.generate !==
                "function"
        ) {
            throw new Error(
                "VoiceSemanticAnalysisService requires semanticAnalysisGenerator"
            );
        }

        this.sourceEvidenceService =
            sourceEvidenceService;

        this.semanticAnalysisGenerator =
            semanticAnalysisGenerator;
    }


    async analyzeRecording({
        facilityId,
        recordingId
    } = {}) {
        const locators =
            await this.sourceEvidenceService
                .buildForRecording({
                    facilityId,
                    recordingId
                });

        if (!Array.isArray(locators)) {
            throw new Error(
                "Voice source evidence service returned invalid result"
            );
        }

        const analyses = [];

        for (const locator of locators) {
            const semanticAnalysis =
                await this.semanticAnalysisGenerator
                    .generate({
                        sourceType:
                            "voice",

                        sourceDocumentName:
                            locator.documentReference,

                        sourceLabel:
                            "音声発話",

                        sourceValue:
                            locator.rawEvidence,

                        sourceEvidenceLocator:
                            locator
                    });

            analyses.push({
                sourceEvidenceLocator:
                    locator,

                semanticAnalysis
            });
        }

        return analyses;
    }
}


module.exports =
    VoiceSemanticAnalysisService;
