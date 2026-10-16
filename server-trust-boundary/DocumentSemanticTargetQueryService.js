"use strict";

class DocumentSemanticTargetQueryService {
    constructor({
        connectorTrustService,
        queryRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function" ||
            !queryRepository ||
            typeof queryRepository.list !==
                "function"
        ) {
            throw new Error(
                "DocumentSemanticTargetQueryService requires dependencies"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.queryRepository =
            queryRepository;
    }

    async query({
        connectorId,
        credential,
        semanticType
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
            typeof semanticType !== "string" ||
            !semanticType.trim()
        ) {
            return {
                status: "invalid"
            };
        }

        let result;

        try {
            result =
                await this.queryRepository
                    .list({
                        semanticType:
                            semanticType.trim()
                    });
        } catch {
            return {
                status: "error"
            };
        }

        if (
            result?.status === "found" &&
            Array.isArray(result.targets)
        ) {
            return {
                status: "found",
                semanticType:
                    semanticType.trim(),
                targets:
                    result.targets
            };
        }

        if (
            result?.status === "invalid"
        ) {
            return {
                status: "invalid"
            };
        }

        return {
            status: "error"
        };
    }
}

module.exports =
    DocumentSemanticTargetQueryService;
