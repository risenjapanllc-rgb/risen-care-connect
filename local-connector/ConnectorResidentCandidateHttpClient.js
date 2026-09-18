"use strict";

class ConnectorResidentCandidateHttpClient {
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
            endpoint.trim() === ""
        ) {
            throw new Error(
                "ConnectorResidentCandidateHttpClient requires endpoint"
            );
        }

        if (
            typeof connectorId !== "string" ||
            connectorId.trim() === ""
        ) {
            throw new Error(
                "ConnectorResidentCandidateHttpClient requires connectorId"
            );
        }

        if (
            typeof credential !== "string" ||
            credential.trim() === ""
        ) {
            throw new Error(
                "ConnectorResidentCandidateHttpClient requires credential"
            );
        }

        if (
            typeof authorizationScheme !== "string" ||
            authorizationScheme.trim() === ""
        ) {
            throw new Error(
                "ConnectorResidentCandidateHttpClient requires authorizationScheme"
            );
        }

        if (
            typeof connectorIdHeader !== "string" ||
            connectorIdHeader.trim() === ""
        ) {
            throw new Error(
                "ConnectorResidentCandidateHttpClient requires connectorIdHeader"
            );
        }

        if (
            !Number.isFinite(timeoutMs) ||
            timeoutMs <= 0
        ) {
            throw new Error(
                "ConnectorResidentCandidateHttpClient requires positive timeoutMs"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "ConnectorResidentCandidateHttpClient requires fetchImpl"
            );
        }

        const parsedEndpoint = new URL(endpoint);
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
                "ConnectorResidentCandidateHttpClient requires HTTPS endpoint"
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

    async findCandidates({
        userCode,
        name
    } = {}) {
        const normalizedUserCode =
            typeof userCode === "string"
                ? userCode.trim()
                : "";

        const normalizedName =
            typeof name === "string"
                ? name.trim()
                : "";

        if (
            (!normalizedUserCode && !normalizedName) ||
            (normalizedUserCode && normalizedName)
        ) {
            throw new TypeError(
                "Exactly one resident identifier is required"
            );
        }

        const query =
            normalizedUserCode
                ? {
                    userCode:
                        normalizedUserCode
                }
                : {
                    name:
                        normalizedName
                };

        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            this.timeoutMs
        );

        try {
            let response;

            try {
                response = await this.fetchImpl(
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
                        body: JSON.stringify(
                            query
                        ),
                        signal:
                            controller.signal
                    }
                );
            } catch {
                const error = new Error(
                    "Server Trust Boundary resident candidate lookup is unreachable"
                );
                error.code =
                    "server_trust_boundary_unreachable";
                throw error;
            }

            if (!response.ok) {
                const allowedErrorCodes = new Set([
                    "connector_trust_denied",
                    "resident_candidate_query_invalid",
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

                const error = new Error(
                    "Server Trust Boundary resident candidate request failed"
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
                result = await response.json();
            } catch {
                const error = new Error(
                    "Server Trust Boundary resident candidate response is invalid"
                );
                error.code =
                    "server_trust_boundary_invalid_response";
                throw error;
            }

            if (
                !result ||
                typeof result !== "object" ||
                Array.isArray(result) ||
                result.status !== "ok" ||
                !Array.isArray(result.candidates)
            ) {
                const error = new Error(
                    "Server Trust Boundary resident candidate response is invalid"
                );
                error.code =
                    "server_trust_boundary_invalid_response";
                throw error;
            }

            return result.candidates;
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports =
    ConnectorResidentCandidateHttpClient;
