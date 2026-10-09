"use strict";

class LogicalSourceResidentAssociationTransport {
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
                "LogicalSourceResidentAssociationTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "LogicalSourceResidentAssociationTransport requires credentialTransport"
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
                httpStatus: 405,
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
                httpStatus: 415,
                errorCode:
                    "unsupported_media_type"
            });
        }

        if (
            !body ||
            typeof body !==
                "object" ||
            Array.isArray(body) ||
            Object.keys(body).length !==
                1 ||
            !body
                .logicalSourceResidentAssociation
        ) {
            return this.createErrorResponse({
                httpStatus: 400,
                errorCode:
                    "malformed_json"
            });
        }

        const association =
            body
                .logicalSourceResidentAssociation;

        const allowedKeys =
            new Set([
                "sourceId",
                "sourceRecordKey",
                "residentId",
                "matchMethod",
                "sourceRevision"
            ]);

        if (
            !association ||
            typeof association !==
                "object" ||
            Array.isArray(association) ||
            Object.keys(association)
                .length !== 5 ||
            Object.keys(association)
                .some(
                    key =>
                        !allowedKeys
                            .has(key)
                )
        ) {
            return this.createErrorResponse({
                httpStatus: 422,
                errorCode:
                    "logical_source_resident_association_invalid"
            });
        }

        const normalizedHeaders = {};

        for (
            const [key, value]
            of Object.entries(
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
                httpStatus: 401,
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
                    association
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
    LogicalSourceResidentAssociationTransport;
