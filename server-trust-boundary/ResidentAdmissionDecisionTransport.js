"use strict";

const crypto = require("crypto");

const VALID_DECISIONS = new Set([
    "approved_new",
    "rejected",
    "deferred"
]);

class ResidentAdmissionDecisionTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader = "x-risen-connector-id"
    } = {}) {
        if (!httpAdapter || typeof httpAdapter.handle !== "function") {
            throw new Error("ResidentAdmissionDecisionTransport requires httpAdapter");
        }
        if (!credentialTransport || typeof credentialTransport.extract !== "function") {
            throw new Error("ResidentAdmissionDecisionTransport requires credentialTransport");
        }

        this.httpAdapter = httpAdapter;
        this.credentialTransport = credentialTransport;
        this.connectorIdHeader =
            String(connectorIdHeader).trim().toLowerCase();
    }

    createRequestId() {
        return crypto.randomUUID();
    }

    createErrorResponse({ httpStatus, errorCode } = {}) {
        return {
            httpStatus,
            body: {
                requestId: this.createRequestId(),
                errorCode
            }
        };
    }

    async handle({ method, contentType, headers, body } = {}) {
        const requestId = this.createRequestId();

        if (method !== "POST") {
            return {
                httpStatus: 405,
                body: { requestId, errorCode: "method_not_allowed" }
            };
        }

        if (
            typeof contentType !== "string" ||
            contentType.toLowerCase() !== "application/json"
        ) {
            return {
                httpStatus: 415,
                body: { requestId, errorCode: "unsupported_media_type" }
            };
        }

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return {
                httpStatus: 400,
                body: { requestId, errorCode: "malformed_json" }
            };
        }

        const envelopeKeys = Object.keys(body);

        if (
            envelopeKeys.length !== 1 ||
            envelopeKeys[0] !== "decision" ||
            !body.decision ||
            typeof body.decision !== "object" ||
            Array.isArray(body.decision)
        ) {
            return {
                httpStatus: 400,
                body: { requestId, errorCode: "malformed_json" }
            };
        }

        const decision = body.decision;
        const allowedKeys = new Set([
            "sourceDocumentKey",
            "sourceEntityKey",
            "decision",
            "reviewedAt",
            "sourceUpdatedAt",
            "sourceSize"
        ]);

        const keys = Object.keys(decision);

        if (
            keys.length !== 6 ||
            keys.some(key => !allowedKeys.has(key))
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode: "resident_admission_decision_invalid"
                }
            };
        }

        const sourceDocumentKey =
            typeof decision.sourceDocumentKey === "string"
                ? decision.sourceDocumentKey.trim()
                : "";

        const sourceEntityKey =
            typeof decision.sourceEntityKey === "string"
                ? decision.sourceEntityKey.trim()
                : "";

        const reviewedAt =
            typeof decision.reviewedAt === "string"
                ? decision.reviewedAt.trim()
                : "";

        const sourceUpdatedAt =
            typeof decision.sourceUpdatedAt === "string"
                ? decision.sourceUpdatedAt.trim()
                : "";

        if (
            !sourceDocumentKey ||
            !sourceEntityKey ||
            !VALID_DECISIONS.has(decision.decision) ||
            !reviewedAt ||
            Number.isNaN(Date.parse(reviewedAt)) ||
            !sourceUpdatedAt ||
            Number.isNaN(Date.parse(sourceUpdatedAt)) ||
            !Number.isSafeInteger(decision.sourceSize) ||
            decision.sourceSize < 0
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode: "resident_admission_decision_invalid"
                }
            };
        }

        const normalizedHeaders = {};

        for (const [key, value] of Object.entries(headers || {})) {
            normalizedHeaders[String(key).toLowerCase()] = value;
        }

        const rawConnectorId =
            normalizedHeaders[this.connectorIdHeader];

        if (
            typeof rawConnectorId !== "string" ||
            !rawConnectorId.trim()
        ) {
            return {
                httpStatus: 401,
                body: {
                    requestId,
                    errorCode: "connector_trust_denied"
                }
            };
        }

        const credential =
            this.credentialTransport.extract(
                normalizedHeaders.authorization
            );

        if (!credential) {
            return {
                httpStatus: 401,
                body: {
                    requestId,
                    errorCode: "connector_trust_denied"
                }
            };
        }

        const result = await this.httpAdapter.handle({
            requestId,
            connectorId: rawConnectorId.trim(),
            credential,
            decision: {
                sourceDocumentKey,
                sourceEntityKey,
                decision: decision.decision,
                reviewedAt: new Date(reviewedAt).toISOString(),
                sourceUpdatedAt:
                    new Date(sourceUpdatedAt).toISOString(),
                sourceSize: decision.sourceSize
            }
        });

        if (
            !result ||
            typeof result !== "object" ||
            !Number.isInteger(result.statusCode) ||
            !result.body ||
            typeof result.body !== "object"
        ) {
            return {
                httpStatus: 503,
                body: {
                    requestId,
                    errorCode: "connector_processing_unavailable"
                }
            };
        }

        return {
            httpStatus: result.statusCode,
            body: result.body
        };
    }
}

module.exports = ResidentAdmissionDecisionTransport;
