"use strict";

class LogicalSourceSemanticTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader =
            "x-risen-connector-id"
    } = {}) {
        if (
            !httpAdapter ||
            typeof httpAdapter.handle !==
                "function"
        ) {
            throw new Error(
                "LogicalSourceSemanticTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "LogicalSourceSemanticTransport requires credentialTransport"
            );
        }

        this.httpAdapter =
            httpAdapter;

        this.credentialTransport =
            credentialTransport;

        this.connectorIdHeader =
            connectorIdHeader
                .trim()
                .toLowerCase();
    }

    createErrorResponse({
        httpStatus,
        errorCode
    }) {
        return {
            httpStatus,
            body: {
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
        if (
            method !== "POST"
        ) {
            return this.createErrorResponse({
                httpStatus:
                    405,
                errorCode:
                    "method_not_allowed"
            });
        }

        if (
            typeof contentType !==
                "string" ||
            !contentType
                .toLowerCase()
                .startsWith(
                    "application/json"
                )
        ) {
            return this.createErrorResponse({
                httpStatus:
                    415,
                errorCode:
                    "unsupported_media_type"
            });
        }

        if (
            !body ||
            typeof body !==
                "object" ||
            Array.isArray(body) ||
            Object.keys(body)
                .length !== 1 ||
            !body
                .logicalSourceSemanticRecord
        ) {
            return this.createErrorResponse({
                httpStatus:
                    400,
                errorCode:
                    "malformed_json"
            });
        }

        const semanticRecord =
            body
                .logicalSourceSemanticRecord;

        const allowedKeys =
            new Set([
                "sourceId",
                "sourceRecordKey",
                "residentId",
                "semanticType",
                "logicalSlot",
                "sourceRevision",
                "expectedContentHash",
                "contentHash",
                "canonicalizationVersion",
                "semanticContent"
            ]);

        if (
            !semanticRecord ||
            typeof semanticRecord !==
                "object" ||
            Array.isArray(
                semanticRecord
            ) ||
            Object.keys(
                semanticRecord
            ).length !==
                allowedKeys.size ||
            Object.keys(
                semanticRecord
            ).some(
                key =>
                    !allowedKeys
                        .has(key)
            )
        ) {
            return this.createErrorResponse({
                httpStatus:
                    422,
                errorCode:
                    "logical_source_semantic_record_invalid"
            });
        }

        const normalizedHeaders = {};

        for (
            const [
                key,
                value
            ] of Object.entries(
                headers || {}
            )
        ) {
            normalizedHeaders[
                String(key)
                    .toLowerCase()
            ] = value;
        }

        const connectorId =
            normalizedHeaders[
                this.connectorIdHeader
            ];

        const credential =
            this.credentialTransport
                .extract(
                    normalizedHeaders
                        .authorization
                );

        if (
            typeof connectorId !==
                "string" ||
            !connectorId.trim() ||
            !credential
        ) {
            return this.createErrorResponse({
                httpStatus:
                    401,
                errorCode:
                    "connector_trust_denied"
            });
        }

        const result =
            await this.httpAdapter
                .handle({
                    connectorId:
                        connectorId.trim(),
                    credential,
                    semanticRecord
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
    LogicalSourceSemanticTransport;
