"use strict";

class ConnectorSemanticLogicalRecordHttpClient {
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
            !endpoint.trim() ||
            typeof connectorId !== "string" ||
            !connectorId.trim() ||
            typeof credential !== "string" ||
            !credential.trim() ||
            typeof authorizationScheme !== "string" ||
            !authorizationScheme.trim() ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error("ConnectorSemanticLogicalRecordHttpClient requires valid configuration");
        }

        const parsed = new URL(endpoint);
        const local =
            ["127.0.0.1", "localhost", "::1"]
                .includes(parsed.hostname);

        if (
            parsed.protocol !== "https:" &&
            !(parsed.protocol === "http:" && local)
        ) {
            throw new Error("ConnectorSemanticLogicalRecordHttpClient requires HTTPS endpoint");
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
        residentId,
        semanticType,
        logicalSlot
    } = {}) {
        if (
            [residentId, semanticType, logicalSlot].some(
                value =>
                    typeof value !== "string" ||
                    !value.trim()
            )
        ) {
            throw new TypeError("Logical semantic record lookup requires valid identity");
        }

        const controller = new AbortController();
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
                                    this.authorizationScheme +
                                    " " +
                                    this.credential
                            },
                            body: JSON.stringify({
                                residentId: residentId.trim(),
                                semanticType: semanticType.trim(),
                                logicalSlot: logicalSlot.trim()
                            }),
                            signal: controller.signal
                        }
                    );
            } catch {
                const error =
                    new Error("Server Trust Boundary logical semantic lookup is unreachable");
                error.code =
                    "server_trust_boundary_unreachable";
                throw error;
            }

            let result;

            try {
                result = await response.json();
            } catch {
                const error =
                    new Error("Server Trust Boundary logical semantic response is invalid");
                error.code =
                    "server_trust_boundary_invalid_response";
                throw error;
            }

            if (!response.ok) {
                const error =
                    new Error("Server Trust Boundary logical semantic request failed");
                error.code =
                    typeof result?.errorCode === "string"
                        ? result.errorCode
                        : "server_trust_boundary_request_failed";
                error.httpStatus = response.status;
                throw error;
            }

            if (
                !result ||
                !["found", "not_found"].includes(result.status)
            ) {
                const error =
                    new Error("Server Trust Boundary logical semantic response is invalid");
                error.code =
                    "server_trust_boundary_invalid_response";
                throw error;
            }

            return result;
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports =
    ConnectorSemanticLogicalRecordHttpClient;
