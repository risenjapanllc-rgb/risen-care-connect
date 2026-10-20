"use strict";

class VoiceCommunicationRevisionService {
    constructor({
        connectorTrustService,
        revisionRepository,
        summaryGenerator
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "VoiceCommunicationRevisionService requires connectorTrustService"
            );
        }

        if (
            !revisionRepository ||
            typeof revisionRepository.getCurrent !==
                "function" ||
            typeof revisionRepository.reviseTranscript !==
                "function" ||
            typeof revisionRepository.persistAiSummary !==
                "function" ||
            typeof revisionRepository.confirmSummary !==
                "function"
        ) {
            throw new Error(
                "VoiceCommunicationRevisionService requires revisionRepository"
            );
        }

        if (
            !summaryGenerator ||
            typeof summaryGenerator.generate !==
                "function"
        ) {
            throw new Error(
                "VoiceCommunicationRevisionService requires summaryGenerator"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.revisionRepository =
            revisionRepository;

        this.summaryGenerator =
            summaryGenerator;
    }

    normalizeText(value) {
        return String(
            value || ""
        ).trim();
    }

    async authenticate({
        connectorId,
        credential
    } = {}) {
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

        return {
            status:
                "verified",

            facilityId:
                trustResult
                    .verifiedContext
                    .facilityId
        };
    }

    async reviseTranscript({
        connectorId,
        credential,
        communicationLogId,
        transcript,
        revisedByName,
        revisionReason
    } = {}) {
        const normalizedCommunicationLogId =
            this.normalizeText(
                communicationLogId
            );

        const normalizedTranscript =
            this.normalizeText(
                transcript
            );

        const normalizedRevisionReason =
            this.normalizeText(
                revisionReason
            );

        if (
            !normalizedCommunicationLogId ||
            !normalizedTranscript ||
            !normalizedRevisionReason
        ) {
            return {
                status:
                    "invalid",

                errorCode:
                    "voice_transcript_revision_request_invalid"
            };
        }

        const trust =
            await this.authenticate({
                connectorId,
                credential
            });

        if (
            trust.status !==
            "verified"
        ) {
            return trust;
        }

        try {
            const current =
                await this.revisionRepository
                    .getCurrent({
                        facilityId:
                            trust.facilityId,

                        communicationLogId:
                            normalizedCommunicationLogId
                    });

            if (!current) {
                return {
                    status:
                        "not_found",

                    errorCode:
                        "voice_communication_not_found"
                };
            }

            await this.revisionRepository
                .reviseTranscript({
                    facilityId:
                        trust.facilityId,

                    communicationLogId:
                        normalizedCommunicationLogId,

                    transcript:
                        normalizedTranscript,

                    revisedByName:
                        this.normalizeText(
                            revisedByName
                        ) || null,

                    revisionReason:
                        normalizedRevisionReason
                });

            const updated =
                await this.revisionRepository
                    .getCurrent({
                        facilityId:
                            trust.facilityId,

                        communicationLogId:
                            normalizedCommunicationLogId
                    });

            return {
                status:
                    "updated",

                state:
                    updated
            };
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "voice_transcript_revision_unavailable"
            };
        }
    }

    async regenerateSummary({
        connectorId,
        credential,
        communicationLogId
    } = {}) {
        const normalizedCommunicationLogId =
            this.normalizeText(
                communicationLogId
            );

        if (!normalizedCommunicationLogId) {
            return {
                status:
                    "invalid",

                errorCode:
                    "voice_summary_regeneration_request_invalid"
            };
        }

        const trust =
            await this.authenticate({
                connectorId,
                credential
            });

        if (
            trust.status !==
            "verified"
        ) {
            return trust;
        }

        let current;

        try {
            current =
                await this.revisionRepository
                    .getCurrent({
                        facilityId:
                            trust.facilityId,

                        communicationLogId:
                            normalizedCommunicationLogId
                    });
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "voice_summary_regeneration_lookup_unavailable"
            };
        }

        if (!current) {
            return {
                status:
                    "not_found",

                errorCode:
                    "voice_communication_not_found"
            };
        }

        const sourceTranscript =
            this.normalizeText(
                current.transcript
            );

        if (!sourceTranscript) {
            return {
                status:
                    "invalid",

                errorCode:
                    "voice_transcript_required"
            };
        }

        let aiSummary;

        try {
            aiSummary =
                this.normalizeText(
                    await this.summaryGenerator
                        .generate({
                            transcript:
                                sourceTranscript
                        })
                );
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "voice_summary_generation_unavailable"
            };
        }

        if (!aiSummary) {
            return {
                status:
                    "error",

                errorCode:
                    "voice_summary_generation_empty"
            };
        }

        let persisted;

        try {
            persisted =
                await this.revisionRepository
                    .persistAiSummary({
                        facilityId:
                            trust.facilityId,

                        communicationLogId:
                            normalizedCommunicationLogId,

                        sourceTranscript,

                        aiSummary
                    });
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "voice_summary_persistence_unavailable"
            };
        }

        if (!persisted) {
            return {
                status:
                    "stale",

                errorCode:
                    "voice_transcript_changed_during_summary_generation"
            };
        }

        const updated =
            await this.revisionRepository
                .getCurrent({
                    facilityId:
                        trust.facilityId,

                    communicationLogId:
                        normalizedCommunicationLogId
                });

        return {
            status:
                "updated",

            state:
                updated
        };
    }

    async confirmSummary({
        connectorId,
        credential,
        communicationLogId,
        confirmedSummary,
        revisedByName,
        revisionReason
    } = {}) {
        const normalizedCommunicationLogId =
            this.normalizeText(
                communicationLogId
            );

        const normalizedConfirmedSummary =
            this.normalizeText(
                confirmedSummary
            );

        const normalizedRevisionReason =
            this.normalizeText(
                revisionReason
            );

        if (
            !normalizedCommunicationLogId ||
            !normalizedConfirmedSummary ||
            !normalizedRevisionReason
        ) {
            return {
                status:
                    "invalid",

                errorCode:
                    "voice_summary_confirmation_request_invalid"
            };
        }

        const trust =
            await this.authenticate({
                connectorId,
                credential
            });

        if (
            trust.status !==
            "verified"
        ) {
            return trust;
        }

        try {
            const current =
                await this.revisionRepository
                    .getCurrent({
                        facilityId:
                            trust.facilityId,

                        communicationLogId:
                            normalizedCommunicationLogId
                    });

            if (!current) {
                return {
                    status:
                        "not_found",

                    errorCode:
                        "voice_communication_not_found"
                };
            }

            await this.revisionRepository
                .confirmSummary({
                    facilityId:
                        trust.facilityId,

                    communicationLogId:
                        normalizedCommunicationLogId,

                    confirmedSummary:
                        normalizedConfirmedSummary,

                    revisedByName:
                        this.normalizeText(
                            revisedByName
                        ) || null,

                    revisionReason:
                        normalizedRevisionReason
                });

            const updated =
                await this.revisionRepository
                    .getCurrent({
                        facilityId:
                            trust.facilityId,

                        communicationLogId:
                            normalizedCommunicationLogId
                    });

            return {
                status:
                    "updated",

                state:
                    updated
            };
        } catch {
            return {
                status:
                    "error",

                errorCode:
                    "voice_summary_confirmation_unavailable"
            };
        }
    }
}

module.exports =
    VoiceCommunicationRevisionService;
