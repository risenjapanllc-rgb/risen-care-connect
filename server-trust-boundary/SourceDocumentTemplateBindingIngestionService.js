"use strict";

class SourceDocumentTemplateBindingIngestionService {
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
            typeof persistenceRepository.bind !==
                "function"
        ) {
            throw new Error(
                "SourceDocumentTemplateBindingIngestionService requires dependencies"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.payloadValidator =
            payloadValidator;

        this.persistenceRepository =
            persistenceRepository;
    }

    async ingest({
        connectorId,
        credential,
        sourceDocumentTemplateBinding
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
                sourceDocumentTemplateBinding
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
                    .bind({
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
    SourceDocumentTemplateBindingIngestionService;
