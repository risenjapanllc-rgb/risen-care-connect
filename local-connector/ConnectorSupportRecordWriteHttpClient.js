"use strict";

class ConnectorSupportRecordWriteHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader = "x-risen-connector-id",
        timeoutMs = 60000,
        fetchImpl = fetch
    } = {}) {
        if (typeof endpoint !== "string" || !endpoint.trim()) {
            throw new Error("ConnectorSupportRecordWriteHttpClient requires endpoint");
        }

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim() ||
            typeof credential !== "string" ||
            !credential.trim() ||
            typeof authorizationScheme !== "string" ||
            !authorizationScheme.trim()
        ) {
            throw new Error("ConnectorSupportRecordWriteHttpClient requires trust credentials");
        }

        if (
            typeof connectorIdHeader !== "string" ||
            !connectorIdHeader.trim()
        ) {
            throw new Error("ConnectorSupportRecordWriteHttpClient requires connectorIdHeader");
        }

        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
            throw new Error("ConnectorSupportRecordWriteHttpClient requires positive timeoutMs");
        }

        if (typeof fetchImpl !== "function") {
            throw new Error("ConnectorSupportRecordWriteHttpClient requires fetchImpl");
        }

        const parsedEndpoint = new URL(endpoint);
        const isLocalhost =
            parsedEndpoint.hostname === "127.0.0.1" ||
            parsedEndpoint.hostname === "localhost" ||
            parsedEndpoint.hostname === "::1";

        if (
            parsedEndpoint.protocol !== "https:" &&
            !(parsedEndpoint.protocol === "http:" && isLocalhost)
        ) {
            throw new Error("ConnectorSupportRecordWriteHttpClient requires HTTPS endpoint");
        }

        this.endpoint = endpoint.trim();
        this.connectorId = connectorId.trim();
        this.credential = credential;
        this.authorizationScheme = authorizationScheme.trim();
        this.connectorIdHeader = connectorIdHeader.trim().toLowerCase();
        this.timeoutMs = timeoutMs;
        this.fetchImpl = fetchImpl;
    }

    async write(operation) {
        if (
            !operation ||
            typeof operation !== "object" ||
            Array.isArray(operation)
        ) {
            throw new TypeError("Support record write requires operation");
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            let response;

            try {
                response = await this.fetchImpl(this.endpoint, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        [this.connectorIdHeader]: this.connectorId,
                        authorization: `${this.authorizationScheme} ${this.credential}`
                    },
                    body: JSON.stringify({ operation }),
                    signal: controller.signal
                });
            } catch {
                const error = new Error("Server Trust Boundary support record write is unreachable");
                error.code = "server_trust_boundary_unreachable";
                throw error;
            }

            let result = null;

            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (
                response.status === 200 &&
                result &&
                (
                    result.status === "created" ||
                    result.status === "updated" ||
                    result.status === "unchanged"
                )
            ) {
                return { status: result.status };
            }

            if (
                response.status === 409 &&
                result &&
                (
                    result.status === "conflict" ||
                    result.status === "resident_mismatch"
                )
            ) {
                return { status: result.status };
            }

            const allowedErrorCodes = new Set([
                "connector_trust_denied",
                "support_record_write_invalid",
                "connector_processing_unavailable"
            ]);

            const error = new Error("Server Trust Boundary support record write request failed");
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
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports = ConnectorSupportRecordWriteHttpClient;
