"use strict";

class SourceDocumentTemplateBindingQueryService {
    constructor({
        connectorTrustService,
        queryRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "SourceDocumentTemplateBindingQueryService requires connectorTrustService"
            );
        }

        if (
            !queryRepository ||
            typeof queryRepository.get !==
                "function"
        ) {
            throw new Error(
                "SourceDocumentTemplateBindingQueryService requires queryRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.queryRepository =
            queryRepository;
    }

    async get({
        connectorId,
        credential,
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
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
                status: "error",
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
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (trustResult.status === "denied") {
            return {
                status: "denied",
                errorCode:
                    "connector_trust_denied"
            };
        }

        if (trustResult.status === "error") {
            return {
                status: "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            trustResult.status !== "verified" ||
            !trustResult.verifiedContext ||
            typeof trustResult.verifiedContext !==
                "object" ||
            Array.isArray(
                trustResult.verifiedContext
            ) ||
            typeof trustResult
                .verifiedContext.facilityId !==
                "string" ||
            !trustResult
                .verifiedContext.facilityId
                .trim() ||
            typeof trustResult
                .verifiedContext.connectorId !==
                "string" ||
            !trustResult
                .verifiedContext.connectorId
                .trim()
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            typeof sourceDocumentKey !==
                "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !==
                "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_document_template_binding_query_invalid"
            };
        }

        try {
            return await this.queryRepository.get({
                verifiedFacilityId:
                    trustResult
                        .verifiedContext
                        .facilityId
                        .trim(),

                verifiedConnectorId:
                    trustResult
                        .verifiedContext
                        .connectorId
                        .trim(),

                sourceDocumentKey:
                    sourceDocumentKey.trim(),

                sourceUpdatedAt:
                    new Date(
                        sourceUpdatedAt
                    ).toISOString(),

                sourceSize
            });
        } catch {
            return {
                status: "error",
                errorCode:
                    "source_document_template_binding_query_unavailable"
            };
        }
    }
}

module.exports =
    SourceDocumentTemplateBindingQueryService;
