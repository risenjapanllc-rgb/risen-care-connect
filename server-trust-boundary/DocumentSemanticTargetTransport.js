"use strict";

const crypto =
    require("crypto");

class DocumentSemanticTargetTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader =
            "x-risen-connector-id"
    } = {}) {
        if (
            !httpAdapter ||
            typeof httpAdapter.handleQuery !==
                "function" ||
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "DocumentSemanticTargetTransport requires dependencies"
            );
        }

        this.httpAdapter =
            httpAdapter;

        this.credentialTransport =
            credentialTransport;

        this.connectorIdHeader =
            String(connectorIdHeader)
                .trim()
                .toLowerCase();
    }

    createRequestId() {
        return crypto.randomUUID();
    }

    async handle({
        method,
        headers,
        query
    } = {}) {
        const requestId =
            this.createRequestId();

        if (method !== "GET") {
            return {
                httpStatus: 405,
                body: {
                    requestId,
                    errorCode:
                        "method_not_allowed"
                }
            };
        }

        const normalizedHeaders = {};

        for (
            const [key, value]
            of Object.entries(headers || {})
        ) {
            normalizedHeaders[
                String(key).toLowerCase()
            ] = value;
        }

        const connectorId =
            normalizedHeaders[
                this.connectorIdHeader
            ];

        const credential =
            this.credentialTransport.extract(
                normalizedHeaders.authorization
            );

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim() ||
            !credential
        ) {
            return {
                httpStatus: 401,
                body: {
                    requestId,
                    errorCode:
                        "connector_trust_denied"
                }
            };
        }

        const semanticType =
            typeof query?.semanticType ===
                "string"
                ? query.semanticType.trim()
                : "";

        if (!semanticType) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "document_semantic_target_invalid"
                }
            };
        }

        const result =
            await this.httpAdapter
                .handleQuery({
                    requestId,

                    connectorId:
                        connectorId.trim(),

                    credential,

                    semanticType
                });

        if (
            !result ||
            typeof result !== "object" ||
            !Number.isInteger(
                result.statusCode
            ) ||
            !result.body ||
            typeof result.body !==
                "object"
        ) {
            return {
                httpStatus: 503,
                body: {
                    requestId,
                    errorCode:
                        "connector_processing_unavailable"
                }
            };
        }

        return {
            httpStatus:
                result.statusCode,

            body:
                result.body
        };
    }
}

module.exports =
    DocumentSemanticTargetTransport;
