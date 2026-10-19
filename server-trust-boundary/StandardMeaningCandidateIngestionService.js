"use strict";

class StandardMeaningCandidateIngestionService {
    constructor({
        connectorTrustService,
        payloadValidator,
        persistenceRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function" ||
            !payloadValidator ||
            typeof payloadValidator.validate !==
                "function" ||
            !persistenceRepository ||
            typeof persistenceRepository.submit !==
                "function"
        ) {
            throw new Error(
                "StandardMeaningCandidateIngestionService requires dependencies"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.payloadValidator =
            payloadValidator;

        this.persistenceRepository =
            persistenceRepository;
    }

    async list({
        connectorId,
        credential,
        templateId
    } = {}) {
        let trust;

        try {
            trust =
                await this.connectorTrustService
                    .authenticate({
                        connectorId,
                        credential
                    });
        } catch {
            return {
                status: "error"
            };
        }

        if (trust?.status === "denied") {
            return {
                status: "denied"
            };
        }

        if (
            trust?.status !== "verified" ||
            !trust.verifiedContext
        ) {
            return {
                status: "error"
            };
        }

        if (
            typeof templateId !== "string" ||
            !templateId.trim()
        ) {
            return {
                status: "invalid"
            };
        }

        let result;

        try {
            result =
                await this.persistenceRepository
                    .list({
                        verifiedFacilityId:
                            trust.verifiedContext
                                .facilityId,

                        verifiedConnectorId:
                            trust.verifiedContext
                                .connectorId,

                        templateId:
                            templateId.trim()
                    });
        } catch {
            return {
                status: "error"
            };
        }

        if (
            result?.status === "found" &&
            Array.isArray(
                result.candidates
            )
        ) {
            return result;
        }

        if (
            result?.status === "denied" ||
            result?.status === "invalid"
        ) {
            return {
                status:
                    result.status
            };
        }

        return {
            status: "error"
        };
    }

    async ingest({
        connectorId,
        credential,
        standardMeaningCandidate
    } = {}) {
        let trust;

        try {
            trust =
                await this.connectorTrustService
                    .authenticate({
                        connectorId,
                        credential
                    });
        } catch {
            return {
                status: "error"
            };
        }

        if (trust?.status === "denied") {
            return {
                status: "denied"
            };
        }

        if (
            trust?.status !== "verified" ||
            !trust.verifiedContext
        ) {
            return {
                status: "error"
            };
        }

        const validation =
            this.payloadValidator.validate(
                standardMeaningCandidate
            );

        if (validation?.status !== "valid") {
            return {
                status: "invalid"
            };
        }

        let result;

        try {
            result =
                await this.persistenceRepository
                    .submit({
                        verifiedFacilityId:
                            trust.verifiedContext
                                .facilityId,

                        verifiedConnectorId:
                            trust.verifiedContext
                                .connectorId,

                        ...validation.validated
                    });
        } catch {
            return {
                status: "error"
            };
        }

        if (
            result &&
            [
                "created",
                "unchanged",
                "conflict"
            ].includes(result.status)
        ) {
            return result;
        }

        if (
            result?.status === "denied" ||
            result?.status === "invalid"
        ) {
            return {
                status:
                    result.status
            };
        }

        return {
            status: "error"
        };
    }
    async clarify({
        connectorId,
        credential,
        standardMeaningCandidateClarification
    } = {}) {
        let trust;

        try {
            trust =
                await this.connectorTrustService
                    .authenticate({
                        connectorId,
                        credential
                    });
        } catch {
            return {
                status: "error"
            };
        }

        if (trust?.status === "denied") {
            return {
                status: "denied"
            };
        }

        if (
            trust?.status !== "verified" ||
            !trust.verifiedContext
        ) {
            return {
                status: "error"
            };
        }

        const clarification =
            standardMeaningCandidateClarification;

        if (
            !clarification ||
            typeof clarification !==
                "object" ||
            Array.isArray(clarification) ||
            typeof clarification.templateId !==
                "string" ||
            !clarification.templateId.trim() ||
            typeof clarification.templateFieldKey !==
                "string" ||
            !clarification.templateFieldKey.trim() ||
            typeof clarification.staffClarification !==
                "string" ||
            !clarification.staffClarification.trim() ||
            typeof clarification.clarifiedAt !==
                "string" ||
            Number.isNaN(
                Date.parse(
                    clarification.clarifiedAt
                )
            )
        ) {
            return {
                status: "invalid"
            };
        }

        let result;

        try {
            result =
                await this.persistenceRepository
                    .clarify({
                        verifiedFacilityId:
                            trust.verifiedContext
                                .facilityId,

                        verifiedConnectorId:
                            trust.verifiedContext
                                .connectorId,

                        templateId:
                            clarification
                                .templateId
                                .trim(),

                        templateFieldKey:
                            clarification
                                .templateFieldKey
                                .trim(),

                        staffClarification:
                            clarification
                                .staffClarification
                                .trim(),

                        clarifiedAt:
                            clarification
                                .clarifiedAt
                    });
        } catch (error) {
            console.error(
                "STANDARD MEANING CLARIFICATION ERROR",
                error?.message || error
            );

            return {
                status: "error"
            };
        }

        if (
            result &&
            [
                "updated",
                "unchanged"
            ].includes(result.status)
        ) {
            return result;
        }

        if (
            result?.status === "denied" ||
            result?.status === "invalid"
        ) {
            return {
                status:
                    result.status,
                candidateId:
                    result.candidateId ||
                    null
            };
        }

        return {
            status: "error"
        };
    }

}

module.exports =
    StandardMeaningCandidateIngestionService;
