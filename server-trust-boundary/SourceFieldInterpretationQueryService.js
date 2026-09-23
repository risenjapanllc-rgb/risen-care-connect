"use strict";

class SourceFieldInterpretationQueryService {
    constructor({
        connectorTrustService,
        sourceFieldInterpretationQueryRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error(
                "SourceFieldInterpretationQueryService requires connectorTrustService"
            );
        }

        if (
            !sourceFieldInterpretationQueryRepository ||
            typeof sourceFieldInterpretationQueryRepository.list !== "function"
        ) {
            throw new Error(
                "SourceFieldInterpretationQueryService requires sourceFieldInterpretationQueryRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.sourceFieldInterpretationQueryRepository =
            sourceFieldInterpretationQueryRepository;
    }

    async list({
        connectorId,
        credential,
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService.authenticate({
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

        if (
            trustResult.status !== "verified" ||
            !trustResult.verifiedContext ||
            typeof trustResult.verifiedContext.facilityId !== "string" ||
            !trustResult.verifiedContext.facilityId.trim() ||
            typeof trustResult.verifiedContext.connectorId !== "string" ||
            !trustResult.verifiedContext.connectorId.trim()
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_field_interpretation_query_invalid"
            };
        }

        try {
            return await this
                .sourceFieldInterpretationQueryRepository
                .list({
                    verifiedFacilityId:
                        trustResult.verifiedContext.facilityId,
                    verifiedConnectorId:
                        trustResult.verifiedContext.connectorId,
                    sourceDocumentKey:
                        sourceDocumentKey.trim(),
                    sourceUpdatedAt:
                        sourceUpdatedAt.trim(),
                    sourceSize
                });
        } catch {
            return {
                status: "error",
                errorCode:
                    "source_field_interpretation_query_unavailable"
            };
        }
    }
}

module.exports =
    SourceFieldInterpretationQueryService;
