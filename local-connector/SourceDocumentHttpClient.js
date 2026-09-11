"use strict";

class SourceDocumentHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader =
            "x-risen-connector-id",
        timeoutMs = 10000,
        fetchImpl = fetch
    } = {}) {
        if (
            typeof endpoint !== "string" ||
            endpoint.trim() === ""
        ) {
            throw new Error(
                "SourceDocumentHttpClient requires endpoint"
            );
        }

        if (
            typeof connectorId !== "string" ||
            connectorId.trim() === ""
        ) {
            throw new Error(
                "SourceDocumentHttpClient requires connectorId"
            );
        }

        if (
            typeof credential !== "string" ||
            credential.trim() === ""
        ) {
            throw new Error(
                "SourceDocumentHttpClient requires credential"
            );
        }

        if (
            typeof authorizationScheme !== "string" ||
            authorizationScheme.trim() === ""
        ) {
            throw new Error(
                "SourceDocumentHttpClient requires authorizationScheme"
            );
        }

        if (
            typeof connectorIdHeader !== "string" ||
            connectorIdHeader.trim() === ""
        ) {
            throw new Error(
                "SourceDocumentHttpClient requires connectorIdHeader"
            );
        }

        if (
            !Number.isFinite(timeoutMs) ||
            timeoutMs <= 0
        ) {
            throw new Error(
                "SourceDocumentHttpClient requires positive timeoutMs"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "SourceDocumentHttpClient requires fetchImpl"
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
                "SourceDocumentHttpClient requires HTTPS endpoint"
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

    async ingest(sourceDocument) {
        if (
            !sourceDocument ||
            typeof sourceDocument !== "object" ||
            Array.isArray(sourceDocument)
        ) {
            throw new TypeError(
                "sourceDocument is required"
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
                                    sourceDocument
                                }),
                            signal:
                                controller.signal
                        }
                    );
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary source document is unreachable"
                    );

                error.code =
                    "server_trust_boundary_unreachable";

                throw error;
            }

            if (!response.ok) {
                const allowedErrorCodes =
                    new Set([
                        "connector_trust_denied",
                        "connector_payload_invalid",
                        "connector_processing_unavailable"
                    ]);

                let safeResponse = null;

                try {
                    const parsed =
                        await response.json();

                    if (
                        parsed !== null &&
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
                        "Server Trust Boundary source document request failed"
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
                    Number.isInteger(
                        response.status
                    )
                        ? response.status
                        : null;

                error.requestId =
                    safeResponse &&
                    typeof safeResponse.requestId ===
                        "string" &&
                    safeResponse.requestId.trim() !==
                        ""
                        ? safeResponse
                            .requestId
                            .trim()
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
                        "Server Trust Boundary source document returned invalid response"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            const allowedStatuses =
                new Set([
                    "created",
                    "updated",
                    "unchanged"
                ]);

            if (
                !result ||
                typeof result !== "object" ||
                Array.isArray(result) ||
                typeof result.status !== "string" ||
                !allowedStatuses.has(
                    result.status
                )
            ) {
                const error =
                    new Error(
                        "Server Trust Boundary source document returned invalid response"
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
}

module.exports =
    SourceDocumentHttpClient;
