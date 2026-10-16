"use strict";

class SemanticProjectionContractQueryService {
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
                "SemanticProjectionContractQueryService requires dependencies"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.queryRepository =
            queryRepository;
    }

    async query({
        connectorId,
        credential
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

        let result;

        try {
            result =
                await this.queryRepository
                    .list();
        } catch {
            return {
                status: "error"
            };
        }

        if (
            result?.status === "found" &&
            Array.isArray(result.contracts)
        ) {
            return {
                status: "found",
                contracts:
                    result.contracts
            };
        }

        if (result?.status === "invalid") {
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
    SemanticProjectionContractQueryService;
