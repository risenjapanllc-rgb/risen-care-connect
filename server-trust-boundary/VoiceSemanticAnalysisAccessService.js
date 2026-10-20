"use strict";


class VoiceSemanticAnalysisAccessService {
    constructor({
        connectorTrustService,
        semanticAnalysisService
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "VoiceSemanticAnalysisAccessService requires connectorTrustService"
            );
        }

        if (
            !semanticAnalysisService ||
            typeof semanticAnalysisService.analyzeRecording !==
                "function"
        ) {
            throw new Error(
                "VoiceSemanticAnalysisAccessService requires semanticAnalysisService"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.semanticAnalysisService =
            semanticAnalysisService;
    }


    async analyzeRecording({
        connectorId,
        credential,
        recordingId
    } = {}) {
        const normalizedRecordingId =
            String(
                recordingId || ""
            ).trim();

        if (!normalizedRecordingId) {
            return {
                status:
                    "invalid",

                errorCode:
                    "voice_semantic_analysis_request_invalid"
            };
        }

        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService
                    .authenticate({
                        connectorId,
                        credential
                    });
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            !trustResult ||
            typeof trustResult !== "object" ||
            Array.isArray(trustResult)
        ) {
            return {
                status:
                    "error",

                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            trustResult.status ===
            "denied"
        ) {
            return {
                status:
                    "denied",

                errorCode:
                    "connector_trust_denied"
            };
        }

        if (
            trustResult.status !==
                "verified" ||
            !trustResult.verifiedContext ||
            !trustResult.verifiedContext
                .facilityId
        ) {
            return {
                status:
                    "error",

                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const facilityId =
            trustResult
                .verifiedContext
                .facilityId;

        try {
            const analyses =
                await this.semanticAnalysisService
                    .analyzeRecording({
                        facilityId,
                        recordingId:
                            normalizedRecordingId
                    });

            return {
                status:
                    "ready",

                recordingId:
                    normalizedRecordingId,

                analyses
            };
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "voice_semantic_analysis_unavailable"
            };
        }
    }
}


module.exports =
    VoiceSemanticAnalysisAccessService;
