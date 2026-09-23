"use strict";

const {
    createResidentAdmissionSubjectKey
} = require("./ResidentAdmissionSubjectKey");

const VALID_DECISIONS =
    new Set(["approved_new", "rejected", "deferred"]);

class ResidentAdmissionDecisionService {
    constructor({
        localConnectorService,
        persistenceClient
    } = {}) {
        if (
            !localConnectorService ||
            typeof localConnectorService
                .resolveSourceSnapshot !== "function"
        ) {
            throw new Error(
                "ResidentAdmissionDecisionService requires localConnectorService"
            );
        }

        if (
            !persistenceClient ||
            typeof persistenceClient.save !== "function" ||
            typeof persistenceClient.list !== "function"
        ) {
            throw new Error(
                "ResidentAdmissionDecisionService requires persistenceClient"
            );
        }

        this.localConnectorService =
            localConnectorService;
        this.persistenceClient =
            persistenceClient;
    }

    async decide({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        identifierType,
        identifierDigest,
        decision
    } = {}) {
        if (!VALID_DECISIONS.has(decision)) {
            return {
                status: "invalid_decision"
            };
        }

        const sourceEntityKey =
            createResidentAdmissionSubjectKey({
                identifierType,
                identifierDigest
            });

        const snapshot =
            await this.localConnectorService
                .resolveSourceSnapshot({
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });

        const persistence =
            await this.persistenceClient.save({
                sourceDocumentKey:
                    snapshot.sourceDocumentKey,
                sourceEntityKey,
                decision,
                reviewedAt:
                    new Date().toISOString(),
                sourceUpdatedAt:
                    snapshot.sourceUpdatedAt,
                sourceSize:
                    snapshot.sourceSize
            });

        return {
            status: "decided",
            decision,
            persistenceStatus:
                persistence.status
        };
    }

    async get({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        identifierType,
        identifierDigest
    } = {}) {
        const sourceEntityKey =
            createResidentAdmissionSubjectKey({
                identifierType,
                identifierDigest
            });

        const snapshot =
            await this.localConnectorService
                .resolveSourceSnapshot({
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });

        const result =
            await this.persistenceClient.list({
                sourceDocumentKey:
                    snapshot.sourceDocumentKey,
                sourceUpdatedAt:
                    snapshot.sourceUpdatedAt,
                sourceSize:
                    snapshot.sourceSize
            });

        if (
            result?.status !== "found" ||
            !Array.isArray(result.decisions)
        ) {
            return {
                status: "invalid_response"
            };
        }

        const matches =
            result.decisions.filter(
                item =>
                    item &&
                    item.sourceEntityKey ===
                        sourceEntityKey
            );

        if (matches.length === 0) {
            return {
                status: "not_found",
                decision: null
            };
        }

        if (
            matches.length !== 1 ||
            !VALID_DECISIONS.has(
                matches[0].decision
            )
        ) {
            return {
                status: "invalid_response"
            };
        }

        return {
            status: "found",
            decision: {
                decision:
                    matches[0].decision,
                reviewedAt:
                    matches[0].reviewedAt
            }
        };
    }

    async list({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const snapshot =
            await this.localConnectorService
                .resolveSourceSnapshot({
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });

        return await this.persistenceClient.list({
            sourceDocumentKey:
                snapshot.sourceDocumentKey,
            sourceUpdatedAt:
                snapshot.sourceUpdatedAt,
            sourceSize:
                snapshot.sourceSize
        });
    }
}

module.exports =
    ResidentAdmissionDecisionService;
