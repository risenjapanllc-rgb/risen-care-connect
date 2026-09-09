"use strict";

/**
 * HTTP client used by the facility-side Local Connector to call
 * the remote Server Trust Boundary.
 *
 * Authentication material belongs only to transport headers.
 * It must never be added to the business JSON payload.
 */
class ServerTrustBoundaryHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader = "x-risen-connector-id",
        timeoutMs = 10000,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof endpoint !== "string" ||
            !endpoint.trim()
        ) {
            throw new Error(
                "ServerTrustBoundaryHttpClient requires endpoint"
            );
        }

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim()
        ) {
            throw new Error(
                "ServerTrustBoundaryHttpClient requires connectorId"
            );
        }

        if (
            typeof credential !== "string" ||
            !credential.trim()
        ) {
            throw new Error(
                "ServerTrustBoundaryHttpClient requires credential"
            );
        }

        if (
            typeof authorizationScheme !== "string" ||
            !authorizationScheme.trim()
        ) {
            throw new Error(
                "ServerTrustBoundaryHttpClient requires authorizationScheme"
            );
        }

        if (
            typeof connectorIdHeader !== "string" ||
            !connectorIdHeader.trim()
        ) {
            throw new Error(
                "ServerTrustBoundaryHttpClient requires connectorIdHeader"
            );
        }

        if (
            !Number.isFinite(timeoutMs) ||
            timeoutMs <= 0
        ) {
            throw new Error(
                "ServerTrustBoundaryHttpClient requires positive timeoutMs"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "ServerTrustBoundaryHttpClient requires fetch"
            );
        }

        const normalizedEndpoint =
            endpoint.trim();

        let endpointUrl;

        try {
            endpointUrl =
                new URL(
                    normalizedEndpoint
                );
        } catch (error) {
            throw new Error(
                "ServerTrustBoundaryHttpClient requires valid endpoint"
            );
        }

        const isHttps =
            endpointUrl.protocol ===
            "https:";

        const isLocalHttp =
            endpointUrl.protocol ===
                "http:" &&
            (
                endpointUrl.hostname ===
                    "127.0.0.1" ||
                endpointUrl.hostname ===
                    "localhost"
            );

        if (
            !isHttps &&
            !isLocalHttp
        ) {
            throw new Error(
                "ServerTrustBoundaryHttpClient requires HTTPS endpoint"
            );
        }

        this.endpoint =
            normalizedEndpoint;
        this.connectorId = connectorId.trim();
        this.credential = credential.trim();
        this.authorizationScheme =
            authorizationScheme.trim();
        this.connectorIdHeader =
            connectorIdHeader.trim().toLowerCase();
        this.timeoutMs = timeoutMs;
        this.fetchImpl = fetchImpl;
    }

    async ingest(payload) {
        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                this.timeoutMs
            );

        try {
            const response =
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
                            JSON.stringify(payload),
                        signal:
                            controller.signal
                    }
                );

            if (!response.ok) {
                throw new Error(
                    "Server Trust Boundary request failed"
                );
            }

            let result;

            try {
                result =
                    await response.json();
            } catch (error) {
                throw new Error(
                    "Server Trust Boundary returned invalid JSON"
                );
            }

            const allowedStatuses =
                new Set([
                    "matched",
                    "needs_review",
                    "unmatched"
                ]);

            const isValidResponse =
                result !== null &&
                typeof result === "object" &&
                !Array.isArray(result) &&
                typeof result.requestId === "string" &&
                result.requestId.trim() !== "" &&
                typeof result.status === "string" &&
                allowedStatuses.has(
                    result.status
                );

            if (!isValidResponse) {
                throw new Error(
                    "Server Trust Boundary returned invalid response"
                );
            }

            return result;
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports =
    ServerTrustBoundaryHttpClient;
