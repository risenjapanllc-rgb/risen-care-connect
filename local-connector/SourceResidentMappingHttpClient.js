"use strict";

class SourceResidentMappingHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader = "x-risen-connector-id",
        timeoutMs = 10000,
        fetchImpl = fetch
    } = {}) {
        if (
            typeof endpoint !== "string" ||
            !endpoint.trim()
        ) {
            throw new Error(
                "SourceResidentMappingHttpClient requires endpoint"
            );
        }

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim()
        ) {
            throw new Error(
                "SourceResidentMappingHttpClient requires connectorId"
            );
        }

        if (
            typeof credential !== "string" ||
            !credential.trim()
        ) {
            throw new Error(
                "SourceResidentMappingHttpClient requires credential"
            );
        }

        if (
            typeof authorizationScheme !== "string" ||
            !authorizationScheme.trim()
        ) {
            throw new Error(
                "SourceResidentMappingHttpClient requires authorizationScheme"
            );
        }

        if (
            typeof connectorIdHeader !== "string" ||
            !connectorIdHeader.trim()
        ) {
            throw new Error(
                "SourceResidentMappingHttpClient requires connectorIdHeader"
            );
        }

        if (
            !Number.isFinite(timeoutMs) ||
            timeoutMs <= 0
        ) {
            throw new Error(
                "SourceResidentMappingHttpClient requires positive timeoutMs"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "SourceResidentMappingHttpClient requires fetchImpl"
            );
        }

        const parsedEndpoint =
            new URL(endpoint);

        const isLocalhost =
            parsedEndpoint.hostname === "127.0.0.1" ||
            parsedEndpoint.hostname === "localhost" ||
            parsedEndpoint.hostname === "::1";

        if (
            parsedEndpoint.protocol !== "https:" &&
            !(
                parsedEndpoint.protocol === "http:" &&
                isLocalhost
            )
        ) {
            throw new Error(
                "SourceResidentMappingHttpClient requires HTTPS endpoint"
            );
        }

        this.endpoint =
            endpoint.trim();

        this.connectorId =
            connectorId.trim();

        this.credential =
            credential;

        this.authorizationScheme =
            authorizationScheme.trim();

        this.connectorIdHeader =
            connectorIdHeader
                .trim()
                .toLowerCase();

        this.timeoutMs =
            timeoutMs;

        this.fetchImpl =
            fetchImpl;
    }

    validateSnapshot({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim()
        ) {
            throw new TypeError(
                "sourceDocumentKey is required"
            );
        }

        if (
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            )
        ) {
            throw new TypeError(
                "sourceUpdatedAt is required"
            );
        }

        if (
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            throw new TypeError(
                "sourceSize is required"
            );
        }

        return {
            sourceDocumentKey:
                sourceDocumentKey.trim(),
            sourceUpdatedAt:
                new Date(sourceUpdatedAt)
                    .toISOString(),
            sourceSize
        };
    }

    createHeaders({
        includeContentType = false
    } = {}) {
        return {
            ...(includeContentType
                ? {
                    "content-type":
                        "application/json"
                }
                : {}),
            [this.connectorIdHeader]:
                this.connectorId,
            authorization:
                `${this.authorizationScheme} ${this.credential}`
        };
    }

    async parseErrorResponse(
        response,
        allowedErrorCodes
    ) {
        let safeResponse = null;

        try {
            const parsed =
                await response.json();

            if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
            ) {
                safeResponse =
                    parsed;
            }
        } catch {
            safeResponse =
                null;
        }

        const error =
            new Error(
                "Server Trust Boundary source resident mapping request failed"
            );

        error.code =
            safeResponse &&
            typeof safeResponse.errorCode === "string" &&
            allowedErrorCodes.has(
                safeResponse.errorCode
            )
                ? safeResponse.errorCode
                : "server_trust_boundary_request_failed";

        error.httpStatus =
            Number.isInteger(response.status)
                ? response.status
                : null;

        error.requestId =
            safeResponse &&
            typeof safeResponse.requestId === "string" &&
            safeResponse.requestId.trim()
                ? safeResponse.requestId.trim()
                : null;

        throw error;
    }

    async save({
        sourceDocumentKey,
        identifierType,
        identifierDigest,
        mappingStatus,
        residentId,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const snapshot =
            this.validateSnapshot({
                sourceDocumentKey,
                sourceUpdatedAt,
                sourceSize
            });

        const normalizedIdentifierType =
            typeof identifierType === "string"
                ? identifierType.trim()
                : "";

        const normalizedIdentifierDigest =
            typeof identifierDigest === "string"
                ? identifierDigest.trim()
                : "";

        if (
            !["user_code", "name"].includes(
                normalizedIdentifierType
            )
        ) {
            throw new TypeError(
                "identifierType is invalid"
            );
        }

        if (
            !/^[0-9a-f]{64}$/.test(
                normalizedIdentifierDigest
            )
        ) {
            throw new TypeError(
                "identifierDigest is invalid"
            );
        }

        const validStatuses =
            new Set([
                "confirmed",
                "deferred",
                "no_match"
            ]);

        if (
            typeof mappingStatus !== "string" ||
            !validStatuses.has(mappingStatus)
        ) {
            throw new TypeError(
                "mappingStatus is invalid"
            );
        }

        const normalizedResidentId =
            typeof residentId === "string"
                ? residentId.trim()
                : residentId;

        if (
            mappingStatus === "confirmed" &&
            (
                typeof normalizedResidentId !== "string" ||
                !normalizedResidentId
            )
        ) {
            throw new TypeError(
                "confirmed resident link requires residentId"
            );
        }

        if (
            mappingStatus !== "confirmed" &&
            normalizedResidentId != null
        ) {
            throw new TypeError(
                "unconfirmed resident link must not include residentId"
            );
        }

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                this.timeoutMs
            );

        try {
            let response;

            try {
                response =
                    await this.fetchImpl(
                        this.endpoint,
                        {
                            method:
                                "POST",
                            headers:
                                this.createHeaders({
                                    includeContentType:
                                        true
                                }),
                            body:
                                JSON.stringify({
                                    sourceResidentMapping: {
                                        sourceDocumentKey:
                                            snapshot.sourceDocumentKey,
                                        identifierType:
                                            normalizedIdentifierType,
                                        identifierDigest:
                                            normalizedIdentifierDigest,
                                        mappingStatus,
                                        residentId:
                                            mappingStatus === "confirmed"
                                                ? normalizedResidentId
                                                : null,
                                        sourceUpdatedAt:
                                            snapshot.sourceUpdatedAt,
                                        sourceSize:
                                            snapshot.sourceSize
                                    }
                                }),
                            signal:
                                controller.signal
                        }
                    );
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary source resident mapping is unreachable"
                    );

                error.code =
                    "server_trust_boundary_unreachable";

                throw error;
            }

            if (!response.ok) {
                await this.parseErrorResponse(
                    response,
                    new Set([
                        "connector_trust_denied",
                        "source_resident_mapping_invalid",
                        "connector_processing_unavailable"
                    ])
                );
            }

            let result;

            try {
                result =
                    await response.json();
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary source resident mapping returned invalid response"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            if (
                !result ||
                typeof result !== "object" ||
                Array.isArray(result) ||
                !new Set([
                    "created",
                    "updated",
                    "unchanged"
                ]).has(result.status)
            ) {
                const error =
                    new Error(
                        "Server Trust Boundary source resident mapping returned invalid response"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            return {
                status:
                    result.status
            };
        } finally {
            clearTimeout(timeout);
        }
    }

    async list({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const snapshot =
            this.validateSnapshot({
                sourceDocumentKey,
                sourceUpdatedAt,
                sourceSize
            });

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                this.timeoutMs
            );

        try {
            const url =
                new URL(this.endpoint);

            url.searchParams.set(
                "sourceDocumentKey",
                snapshot.sourceDocumentKey
            );

            url.searchParams.set(
                "sourceUpdatedAt",
                snapshot.sourceUpdatedAt
            );

            url.searchParams.set(
                "sourceSize",
                String(snapshot.sourceSize)
            );

            let response;

            try {
                response =
                    await this.fetchImpl(
                        url.toString(),
                        {
                            method:
                                "GET",
                            headers:
                                this.createHeaders(),
                            signal:
                                controller.signal
                        }
                    );
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary source resident mapping query is unreachable"
                    );

                error.code =
                    "server_trust_boundary_unreachable";

                throw error;
            }

            if (!response.ok) {
                await this.parseErrorResponse(
                    response,
                    new Set([
                        "connector_trust_denied",
                        "source_resident_mapping_query_invalid",
                        "connector_processing_unavailable"
                    ])
                );
            }

            let result;

            try {
                result =
                    await response.json();
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary source resident mapping query returned invalid response"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            if (
                !result ||
                typeof result !== "object" ||
                Array.isArray(result) ||
                result.status !== "found" ||
                !Array.isArray(result.mappings)
            ) {
                const error =
                    new Error(
                        "Server Trust Boundary source resident mapping query returned invalid response"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            const validStatuses =
                new Set([
                    "confirmed",
                    "deferred",
                    "no_match"
                ]);

            const mappings =
                result.mappings.map(mapping => {
                    if (
                        !mapping ||
                        typeof mapping !== "object" ||
                        Array.isArray(mapping) ||
                        !["user_code", "name"].includes(
                            mapping.identifierType
                        ) ||
                        typeof mapping.identifierDigest !== "string" ||
                        !/^[0-9a-f]{64}$/.test(
                            mapping.identifierDigest
                        ) ||
                        !validStatuses.has(
                            mapping.mappingStatus
                        ) ||
                        mapping.reviewedByHuman !== true ||
                        typeof mapping.reviewedAt !== "string" ||
                        !mapping.reviewedAt.trim() ||
                        Number.isNaN(
                            Date.parse(mapping.reviewedAt)
                        ) ||
                        (
                            mapping.mappingStatus === "confirmed" &&
                            (
                                typeof mapping.residentId !== "string" ||
                                !mapping.residentId.trim()
                            )
                        ) ||
                        (
                            mapping.mappingStatus !== "confirmed" &&
                            mapping.residentId != null
                        )
                    ) {
                        const error =
                            new Error(
                                "Server Trust Boundary source resident mapping query returned invalid response"
                            );

                        error.code =
                            "server_trust_boundary_invalid_response";

                        throw error;
                    }

                    return {
                        identifierType:
                            mapping.identifierType,
                        identifierDigest:
                            mapping.identifierDigest,
                        residentId:
                            mapping.mappingStatus === "confirmed"
                                ? mapping.residentId.trim()
                                : null,
                        mappingStatus:
                            mapping.mappingStatus,
                        reviewedByHuman:
                            true,
                        reviewedAt:
                            mapping.reviewedAt.trim()
                    };
                });

            return {
                status:
                    "found",
                mappings
            };
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports =
    SourceResidentMappingHttpClient;
