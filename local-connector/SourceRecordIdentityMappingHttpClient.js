"use strict";

class SourceRecordIdentityMappingHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader =
            "x-risen-connector-id",
        timeoutMs = 60000,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof endpoint !== "string" ||
            !endpoint.trim() ||
            typeof connectorId !== "string" ||
            !connectorId.trim() ||
            typeof credential !== "string" ||
            !credential ||
            typeof authorizationScheme !== "string" ||
            !authorizationScheme.trim() ||
            typeof connectorIdHeader !== "string" ||
            !connectorIdHeader.trim() ||
            !Number.isFinite(timeoutMs) ||
            timeoutMs <= 0 ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "SourceRecordIdentityMappingHttpClient requires configuration"
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
                "SourceRecordIdentityMappingHttpClient requires HTTPS endpoint"
            );
        }

        this.endpoint = endpoint.trim();
        this.connectorId = connectorId.trim();
        this.credential = credential;
        this.authorizationScheme =
            authorizationScheme.trim();
        this.connectorIdHeader =
            connectorIdHeader.trim().toLowerCase();
        this.timeoutMs = timeoutMs;
        this.fetchImpl = fetchImpl;
    }

    validateSnapshot({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(Date.parse(sourceUpdatedAt)) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            throw new TypeError(
                "source record identity mapping snapshot is invalid"
            );
        }
    }

    async request(url, options) {
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
                        url,
                        {
                            ...options,
                            headers: {
                                ...(options.headers || {}),
                                [this.connectorIdHeader]:
                                    this.connectorId,
                                authorization:
                                    `${this.authorizationScheme} ${this.credential}`
                            },
                            signal:
                                controller.signal
                        }
                    );
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary source record identity mapping is unreachable"
                    );

                error.code =
                    "server_trust_boundary_unreachable";

                throw error;
            }

            let result = null;

            try {
                result =
                    await response.json();
            } catch {
                result = null;
            }

            if (!response.ok) {
                const allowedErrorCodes =
                    new Set([
                        "connector_trust_denied",
                        "source_record_identity_mapping_invalid",
                        "source_record_identity_mapping_query_invalid",
                        "connector_processing_unavailable"
                    ]);

                const error =
                    new Error(
                        "Server Trust Boundary source record identity mapping request failed"
                    );

                error.code =
                    result &&
                    typeof result.errorCode === "string" &&
                    allowedErrorCodes.has(result.errorCode)
                        ? result.errorCode
                        : "server_trust_boundary_request_failed";

                error.httpStatus =
                    Number.isInteger(response.status)
                        ? response.status
                        : null;

                error.requestId =
                    result &&
                    typeof result.requestId === "string" &&
                    result.requestId.trim()
                        ? result.requestId.trim()
                        : null;

                throw error;
            }

            if (
                !result ||
                typeof result !== "object" ||
                Array.isArray(result)
            ) {
                const error =
                    new Error(
                        "Server Trust Boundary source record identity mapping returned invalid response"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            return result;
        } finally {
            clearTimeout(timeout);
        }
    }

    async save({
        sourceDocumentKey,
        sourceFieldKey,
        sheetName = null,
        headerLabel = null,
        confirmedAt,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        this.validateSnapshot({
            sourceDocumentKey,
            sourceUpdatedAt,
            sourceSize
        });

        if (
            typeof sourceFieldKey !== "string" ||
            !sourceFieldKey.trim() ||
            typeof confirmedAt !== "string" ||
            !confirmedAt.trim() ||
            Number.isNaN(Date.parse(confirmedAt))
        ) {
            throw new TypeError(
                "source record identity mapping is invalid"
            );
        }

        const result =
            await this.request(
                this.endpoint,
                {
                    method: "POST",
                    headers: {
                        "content-type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceRecordIdentityMapping: {
                                sourceDocumentKey:
                                    sourceDocumentKey.trim(),
                                sourceFieldKey:
                                    sourceFieldKey.trim(),
                                sheetName:
                                    typeof sheetName === "string"
                                        ? sheetName
                                        : null,
                                headerLabel:
                                    typeof headerLabel === "string"
                                        ? headerLabel
                                        : null,
                                confirmedAt:
                                    new Date(confirmedAt)
                                        .toISOString(),
                                sourceUpdatedAt:
                                    new Date(sourceUpdatedAt)
                                        .toISOString(),
                                sourceSize
                            }
                        })
                }
            );

        if (
            !["created", "updated", "unchanged"]
                .includes(result.status)
        ) {
            const error =
                new Error(
                    "Server Trust Boundary source record identity mapping returned invalid response"
                );

            error.code =
                "server_trust_boundary_invalid_response";

            throw error;
        }

        return {
            status: result.status
        };
    }

    async get({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        this.validateSnapshot({
            sourceDocumentKey,
            sourceUpdatedAt,
            sourceSize
        });

        const url =
            new URL(this.endpoint);

        url.searchParams.set(
            "sourceDocumentKey",
            sourceDocumentKey.trim()
        );
        url.searchParams.set(
            "sourceUpdatedAt",
            new Date(sourceUpdatedAt)
                .toISOString()
        );
        url.searchParams.set(
            "sourceSize",
            String(sourceSize)
        );

        const result =
            await this.request(
                url.toString(),
                {
                    method: "GET"
                }
            );

        if (result.status === "not_found") {
            return {
                status: "not_found",
                mapping: null
            };
        }

        const mapping =
            result.mapping;

        if (
            result.status !== "found" ||
            !mapping ||
            typeof mapping !== "object" ||
            Array.isArray(mapping) ||
            typeof mapping.sourceFieldKey !== "string" ||
            !mapping.sourceFieldKey.trim() ||
            typeof mapping.confirmedAt !== "string" ||
            !mapping.confirmedAt.trim() ||
            Number.isNaN(
                Date.parse(mapping.confirmedAt)
            )
        ) {
            const error =
                new Error(
                    "Server Trust Boundary source record identity mapping returned invalid response"
                );

            error.code =
                "server_trust_boundary_invalid_response";

            throw error;
        }

        return {
            status: "found",
            mapping: {
                sourceFieldKey:
                    mapping.sourceFieldKey.trim(),
                sheetName:
                    typeof mapping.sheetName === "string"
                        ? mapping.sheetName
                        : null,
                headerLabel:
                    typeof mapping.headerLabel === "string"
                        ? mapping.headerLabel
                        : null,
                confirmedAt:
                    mapping.confirmedAt.trim()
            }
        };
    }
}

module.exports =
    SourceRecordIdentityMappingHttpClient;
