"use strict";

class SourceTemplateSemanticAuthorityIngestionService {
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
            typeof persistenceRepository.confirm !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateSemanticAuthorityIngestionService requires dependencies"
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
            !templateId.trim() ||
            typeof this.persistenceRepository.list !==
                "function"
        ) {
            return {
                status: "invalid"
            };
        }

        try {
            return await this.persistenceRepository
                .list({
                    verifiedFacilityId:
                        trust.verifiedContext
                            .facilityId,
                    templateId:
                        templateId.trim()
                });
        } catch {
            return {
                status: "error"
            };
        }
    }

    async ingest({
        connectorId,
        credential,
        sourceTemplateSemanticAuthority
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
                sourceTemplateSemanticAuthority
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
                    .confirm({
                        verifiedFacilityId:
                            trust
                                .verifiedContext
                                .facilityId,
                        verifiedConnectorId:
                            trust
                                .verifiedContext
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
}

module.exports =
    SourceTemplateSemanticAuthorityIngestionService;
