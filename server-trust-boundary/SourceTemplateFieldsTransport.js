"use strict";

const crypto =
    require("crypto");

class SourceTemplateFieldsTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader =
            "x-risen-connector-id"
    } = {}) {
        if (
            !httpAdapter ||
            typeof httpAdapter.handle !==
                "function" ||
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateFieldsTransport requires dependencies"
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

    createErrorResponse({
        httpStatus,
        errorCode
    } = {}) {
        return {
            httpStatus,
            body: {
                requestId:
                    this.createRequestId(),
                errorCode
            }
        };
    }

    async handle({
        method,
        contentType,
        headers,
        body
    } = {}) {
        const requestId =
            this.createRequestId();

        if (method !== "POST") {
            return this.createErrorResponse({
                httpStatus: 405,
                errorCode:
                    "method_not_allowed"
            });
        }

        if (
            typeof contentType !== "string" ||
            contentType.toLowerCase() !==
                "application/json"
        ) {
            return this.createErrorResponse({
                httpStatus: 415,
                errorCode:
                    "unsupported_media_type"
            });
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
            return this.createErrorResponse({
                httpStatus: 401,
                errorCode:
                    "connector_trust_denied"
            });
        }

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            Object.keys(body).length !== 1 ||
            !body.sourceTemplateFields ||
            typeof body.sourceTemplateFields !==
                "object" ||
            Array.isArray(
                body.sourceTemplateFields
            )
        ) {
            return this.createErrorResponse({
                httpStatus: 400,
                errorCode:
                    "malformed_json"
            });
        }

        const result =
            await this.httpAdapter.handle({
                requestId,
                connectorId:
                    connectorId.trim(),
                credential,
                sourceTemplateFields:
                    body.sourceTemplateFields
            });

        return {
            httpStatus:
                result.statusCode,
            body:
                result.body
        };
    }
}

module.exports =
    SourceTemplateFieldsTransport;
