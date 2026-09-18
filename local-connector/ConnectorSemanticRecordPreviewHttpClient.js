"use strict";

class ConnectorSemanticRecordPreviewHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader = "x-risen-connector-id",
        timeoutMs = 60000,
        fetchImpl = fetch
    } = {}) {
        if (
            typeof endpoint !== "string" ||
            !endpoint.trim()
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewHttpClient requires endpoint"
            );
        }

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim()
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewHttpClient requires connectorId"
            );
        }

        if (
            typeof credential !== "string" ||
            !credential.trim()
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewHttpClient requires credential"
            );
        }

        if (
            typeof authorizationScheme !== "string" ||
            !authorizationScheme.trim()
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewHttpClient requires authorizationScheme"
            );
        }

        if (
            typeof connectorIdHeader !== "string" ||
            !connectorIdHeader.trim()
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewHttpClient requires connectorIdHeader"
            );
        }

        if (
            !Number.isFinite(timeoutMs) ||
            timeoutMs <= 0
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewHttpClient requires positive timeoutMs"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "ConnectorSemanticRecordPreviewHttpClient requires fetchImpl"
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
                "ConnectorSemanticRecordPreviewHttpClient requires HTTPS endpoint"
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

    async lookup({
        sourceDocumentKey,
        sourceRecordKeys
    } = {}) {
        const normalizedDocumentKey =
            typeof sourceDocumentKey === "string"
                ? sourceDocumentKey.trim()
                : "";

        if (
            !normalizedDocumentKey ||
            !Array.isArray(sourceRecordKeys) ||
            sourceRecordKeys.length < 1 ||
            sourceRecordKeys.length > 500
        ) {
            throw new TypeError(
                "Semantic record preview requires 1 to 500 source record keys"
            );
        }

        const normalizedKeys =
            sourceRecordKeys.map(value =>
                typeof value === "string"
                    ? value.trim()
                    : ""
            );

        if (
            normalizedKeys.some(value => !value) ||
            new Set(normalizedKeys).size !==
                normalizedKeys.length
        ) {
            throw new TypeError(
                "Semantic record preview requires unique nonblank source record keys"
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
                            method: "POST",
                            headers: {
                                "content-type":
                                    "application/json",
                                [this.connectorIdHeader]:
                                    this.connectorId,
                                authorization:
                                    `${this.authorizationScheme} ${this.credential}`
                            },
                            body:
                                JSON.stringify({
                                    sourceDocumentKey:
                                        normalizedDocumentKey,
                                    sourceRecordKeys:
                                        normalizedKeys
                                }),
                            signal:
                                controller.signal
                        }
                    );
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary semantic record preview is unreachable"
                    );

                error.code =
                    "server_trust_boundary_unreachable";

                throw error;
            }

            if (!response.ok) {
                const allowedErrorCodes =
                    new Set([
                        "connector_trust_denied",
                        "semantic_record_preview_invalid",
                        "connector_processing_unavailable"
                    ]);

                let safeResponse = null;

                try {
                    const parsed =
                        await response.json();

                    if (
                        parsed &&
                        typeof parsed === "object" &&
                        !Array.isArray(parsed)
                    ) {
                        safeResponse = parsed;
                    }
                } catch {
                    safeResponse = null;
                }

                const error =
                    new Error(
                        "Server Trust Boundary semantic record preview request failed"
                    );

                error.code =
                    safeResponse &&
                    typeof safeResponse.errorCode ===
                        "string" &&
                    allowedErrorCodes.has(
                        safeResponse.errorCode
                    )
                        ? safeResponse.errorCode
                        : "server_trust_boundary_request_failed";

                error.httpStatus =
                    Number.isInteger(response.status)
                        ? response.status
                        : null;

                throw error;
            }

            let result;

            try {
                result =
                    await response.json();
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary semantic record preview response is invalid"
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
                !Array.isArray(result.records)
            ) {
                const error =
                    new Error(
                        "Server Trust Boundary semantic record preview response is invalid"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            const requestedKeys =
                new Set(normalizedKeys);

            const returnedKeys =
                new Set();

            for (const record of result.records) {
                const key =
                    typeof record?.sourceRecordKey ===
                        "string"
                        ? record.sourceRecordKey.trim()
                        : "";

                if (
                    !key ||
                    !requestedKeys.has(key) ||
                    returnedKeys.has(key)
                ) {
                    const error =
                        new Error(
                            "Server Trust Boundary semantic record preview response is invalid"
                        );

                    error.code =
                        "server_trust_boundary_invalid_response";

                    throw error;
                }

                returnedKeys.add(key);
            }

            return {
                status: "found",
                records: result.records
            };
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports =
    ConnectorSemanticRecordPreviewHttpClient;
