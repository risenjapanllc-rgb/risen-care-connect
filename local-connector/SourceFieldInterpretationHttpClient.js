"use strict";

class SourceFieldInterpretationHttpClient {
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
                "SourceFieldInterpretationHttpClient requires endpoint"
            );
        }

        if (
            typeof connectorId !== "string" ||
            connectorId.trim() === ""
        ) {
            throw new Error(
                "SourceFieldInterpretationHttpClient requires connectorId"
            );
        }

        if (
            typeof credential !== "string" ||
            credential.trim() === ""
        ) {
            throw new Error(
                "SourceFieldInterpretationHttpClient requires credential"
            );
        }

        if (
            typeof authorizationScheme !== "string" ||
            authorizationScheme.trim() === ""
        ) {
            throw new Error(
                "SourceFieldInterpretationHttpClient requires authorizationScheme"
            );
        }

        if (
            typeof connectorIdHeader !== "string" ||
            connectorIdHeader.trim() === ""
        ) {
            throw new Error(
                "SourceFieldInterpretationHttpClient requires connectorIdHeader"
            );
        }

        if (
            !Number.isFinite(timeoutMs) ||
            timeoutMs <= 0
        ) {
            throw new Error(
                "SourceFieldInterpretationHttpClient requires positive timeoutMs"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "SourceFieldInterpretationHttpClient requires fetchImpl"
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
                "SourceFieldInterpretationHttpClient requires HTTPS endpoint"
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

    async list(sourceDocumentKey) {
        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim()
        ) {
            throw new TypeError(
                "sourceDocumentKey is required"
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
            const url =
                new URL(this.endpoint);

            url.searchParams.set(
                "sourceDocumentKey",
                sourceDocumentKey.trim()
            );

            let response;

            try {
                response =
                    await this.fetchImpl(
                        url.toString(),
                        {
                            method: "GET",
                            headers: {
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
                        "Server Trust Boundary source field interpretation query is unreachable"
                    );

                error.code =
                    "server_trust_boundary_unreachable";

                throw error;
            }

            if (!response.ok) {
                const allowedErrorCodes =
                    new Set([
                        "connector_trust_denied",
                        "source_field_interpretation_query_invalid",
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
                        "Server Trust Boundary source field interpretation query failed"
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

            let result;

            try {
                result =
                    await response.json();
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary source field interpretation query returned invalid response"
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
                !Array.isArray(result.interpretations)
            ) {
                const error =
                    new Error(
                        "Server Trust Boundary source field interpretation query returned invalid response"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            const interpretations =
                result.interpretations.map(
                    interpretation => {
                        if (
                            !interpretation ||
                            typeof interpretation !== "object" ||
                            Array.isArray(interpretation) ||
                            typeof interpretation.sourceFieldKey !== "string" ||
                            !interpretation.sourceFieldKey.trim() ||
                            typeof interpretation.interpretationStatus !== "string" ||
                            typeof interpretation.mappingStatus !== "string" ||
                            typeof interpretation.confirmedByHuman !== "boolean"
                        ) {
                            const error =
                                new Error(
                                    "Server Trust Boundary source field interpretation query returned invalid response"
                                );

                            error.code =
                                "server_trust_boundary_invalid_response";

                            throw error;
                        }

                        return {
                            sourceFieldKey:
                                interpretation.sourceFieldKey.trim(),
                            interpretationStatus:
                                interpretation.interpretationStatus,
                            mappingStatus:
                                interpretation.mappingStatus,
                            confirmedMeaning:
                                typeof interpretation.confirmedMeaning === "string"
                                    ? interpretation.confirmedMeaning
                                    : null,
                            confirmedByHuman:
                                interpretation.confirmedByHuman
                        };
                    }
                );

            return {
                status: "found",
                interpretations
            };
        } finally {
            clearTimeout(timeout);
        }
    }

    async ingest(sourceFieldInterpretation) {
        if (
            !sourceFieldInterpretation ||
            typeof sourceFieldInterpretation !== "object" ||
            Array.isArray(sourceFieldInterpretation)
        ) {
            throw new TypeError(
                "sourceFieldInterpretation is required"
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
                                    sourceFieldInterpretation
                                }),
                            signal:
                                controller.signal
                        }
                    );
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary source field interpretation is unreachable"
                    );

                error.code =
                    "server_trust_boundary_unreachable";

                throw error;
            }

            if (!response.ok) {
                const allowedErrorCodes =
                    new Set([
                        "connector_trust_denied",
                        "source_field_interpretation_invalid",
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
                        "Server Trust Boundary source field interpretation request failed"
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
                        "Server Trust Boundary source field interpretation returned invalid response"
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
                        "Server Trust Boundary source field interpretation returned invalid response"
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
    SourceFieldInterpretationHttpClient;
