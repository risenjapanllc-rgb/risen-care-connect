"use strict";

class ConfirmedDocumentTypeHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader = "x-risen-connector-id",
        timeoutMs = 60000,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof endpoint !== "string" || !endpoint.trim() ||
            typeof connectorId !== "string" || !connectorId.trim() ||
            typeof credential !== "string" || !credential ||
            typeof authorizationScheme !== "string" || !authorizationScheme.trim() ||
            typeof connectorIdHeader !== "string" || !connectorIdHeader.trim() ||
            !Number.isFinite(timeoutMs) || timeoutMs <= 0 ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error("ConfirmedDocumentTypeHttpClient requires configuration");
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
            throw new Error("ConfirmedDocumentTypeHttpClient requires HTTPS endpoint");
        }

        this.endpoint = endpoint.trim();
        this.connectorId = connectorId.trim();
        this.credential = credential;
        this.authorizationScheme = authorizationScheme.trim();
        this.connectorIdHeader = connectorIdHeader.trim().toLowerCase();
        this.timeoutMs = timeoutMs;
        this.fetchImpl = fetchImpl;
    }

    validateSnapshot({ sourceDocumentKey, sourceUpdatedAt, sourceSize } = {}) {
        if (
            typeof sourceDocumentKey !== "string" || !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !== "string" || !sourceUpdatedAt.trim() ||
            Number.isNaN(Date.parse(sourceUpdatedAt)) ||
            !Number.isSafeInteger(sourceSize) || sourceSize < 0
        ) {
            throw new TypeError("confirmed document type snapshot is invalid");
        }
    }

    async request(url, options) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            let response;
            try {
                response = await this.fetchImpl(url, {
                    ...options,
                    headers: {
                        ...(options.headers || {}),
                        [this.connectorIdHeader]: this.connectorId,
                        authorization: `${this.authorizationScheme} ${this.credential}`
                    },
                    signal: controller.signal
                });
            } catch {
                const error = new Error("Server Trust Boundary confirmed document type is unreachable");
                error.code = "server_trust_boundary_unreachable";
                throw error;
            }

            let result;
            try {
                result = await response.json();
            } catch {
                const error = new Error("Server Trust Boundary confirmed document type returned invalid response");
                error.code = "server_trust_boundary_invalid_response";
                throw error;
            }

            if (!response.ok) {
                const error = new Error("Server Trust Boundary confirmed document type request failed");
                error.code =
                    result && typeof result.code === "string"
                        ? result.code
                        : "server_trust_boundary_request_failed";
                error.status = response.status;
                throw error;
            }

            return result;
        } finally {
            clearTimeout(timeout);
        }
    }

    async save({
        sourceDocumentKey,
        documentType,
        confirmedAt,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        this.validateSnapshot({ sourceDocumentKey, sourceUpdatedAt, sourceSize });

        if (
            typeof documentType !== "string" || !documentType.trim() ||
            typeof confirmedAt !== "string" || !confirmedAt.trim() ||
            Number.isNaN(Date.parse(confirmedAt))
        ) {
            throw new TypeError("confirmed document type is invalid");
        }

        const result = await this.request(this.endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                confirmation: {
                    sourceDocumentKey: sourceDocumentKey.trim(),
                    documentType: documentType.trim(),
                    confirmedAt: new Date(confirmedAt).toISOString(),
                    sourceUpdatedAt: new Date(sourceUpdatedAt).toISOString(),
                    sourceSize
                }
            })
        });

        if (!["created", "updated", "unchanged"].includes(result.status)) {
            const error = new Error("Server Trust Boundary confirmed document type returned invalid response");
            error.code = "server_trust_boundary_invalid_response";
            throw error;
        }

        return { status: result.status };
    }

    async get({ sourceDocumentKey, sourceUpdatedAt, sourceSize } = {}) {
        this.validateSnapshot({ sourceDocumentKey, sourceUpdatedAt, sourceSize });

        const url = new URL(this.endpoint);
        url.searchParams.set("sourceDocumentKey", sourceDocumentKey.trim());
        url.searchParams.set("sourceUpdatedAt", new Date(sourceUpdatedAt).toISOString());
        url.searchParams.set("sourceSize", String(sourceSize));

        const result = await this.request(url.toString(), { method: "GET" });

        if (result.status === "not_found" && result.confirmation === null) {
            return { status: "not_found", confirmation: null };
        }

        const confirmation = result.confirmation;
        if (
            result.status !== "found" ||
            !confirmation ||
            typeof confirmation.documentType !== "string" ||
            !confirmation.documentType.trim() ||
            typeof confirmation.confirmedAt !== "string" ||
            Number.isNaN(Date.parse(confirmation.confirmedAt))
        ) {
            const error = new Error("Server Trust Boundary confirmed document type returned invalid response");
            error.code = "server_trust_boundary_invalid_response";
            throw error;
        }

        return {
            status: "found",
            confirmation: {
                documentType: confirmation.documentType.trim(),
                confirmedAt: new Date(confirmation.confirmedAt).toISOString()
            }
        };
    }
}

module.exports = ConfirmedDocumentTypeHttpClient;
