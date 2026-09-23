"use strict";

const VALID_DECISIONS =
    new Set(["approved_new", "rejected", "deferred"]);

class ResidentAdmissionDecisionHttpClient {
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
            throw new Error(
                "ResidentAdmissionDecisionHttpClient requires configuration"
            );
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
            throw new Error(
                "ResidentAdmissionDecisionHttpClient requires HTTPS endpoint"
            );
        }

        this.endpoint = endpoint.trim();
        this.connectorId = connectorId.trim();
        this.credential = credential;
        this.authorizationScheme = authorizationScheme.trim();
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
                "resident admission snapshot is invalid"
            );
        }
    }

    async request(url, options) {
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
                    await this.fetchImpl(url, {
                        ...options,
                        headers: {
                            ...(options.headers || {}),
                            [this.connectorIdHeader]:
                                this.connectorId,
                            authorization:
                                `${this.authorizationScheme} ${this.credential}`
                        },
                        signal: controller.signal
                    });
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary resident admission is unreachable"
                    );
                error.code =
                    "server_trust_boundary_unreachable";
                throw error;
            }

            let result;

            try {
                result = await response.json();
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary resident admission returned invalid response"
                    );
                error.code =
                    "server_trust_boundary_invalid_response";
                throw error;
            }

            if (!response.ok) {
                const error =
                    new Error(
                        "Server Trust Boundary resident admission request failed"
                    );
                error.code =
                    result &&
                    typeof result.errorCode === "string"
                        ? result.errorCode
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
        sourceEntityKey,
        decision,
        reviewedAt,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        this.validateSnapshot({
            sourceDocumentKey,
            sourceUpdatedAt,
            sourceSize
        });

        if (
            typeof sourceEntityKey !== "string" ||
            !sourceEntityKey.trim() ||
            !VALID_DECISIONS.has(decision) ||
            typeof reviewedAt !== "string" ||
            !reviewedAt.trim() ||
            Number.isNaN(Date.parse(reviewedAt))
        ) {
            throw new TypeError(
                "resident admission decision is invalid"
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
                    body: JSON.stringify({
                        decision: {
                            sourceDocumentKey:
                                sourceDocumentKey.trim(),
                            sourceEntityKey:
                                sourceEntityKey.trim(),
                            decision,
                            reviewedAt:
                                new Date(reviewedAt)
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
                    "Server Trust Boundary resident admission returned invalid response"
                );
            error.code =
                "server_trust_boundary_invalid_response";
            throw error;
        }

        return { status: result.status };
    }

    async list({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        this.validateSnapshot({
            sourceDocumentKey,
            sourceUpdatedAt,
            sourceSize
        });

        const url = new URL(this.endpoint);

        url.searchParams.set(
            "sourceDocumentKey",
            sourceDocumentKey.trim()
        );
        url.searchParams.set(
            "sourceUpdatedAt",
            new Date(sourceUpdatedAt).toISOString()
        );
        url.searchParams.set(
            "sourceSize",
            String(sourceSize)
        );

        const result =
            await this.request(
                url.toString(),
                { method: "GET" }
            );

        if (
            result.status !== "found" ||
            !Array.isArray(result.decisions)
        ) {
            const error =
                new Error(
                    "Server Trust Boundary resident admission returned invalid response"
                );
            error.code =
                "server_trust_boundary_invalid_response";
            throw error;
        }

        return {
            status: "found",
            decisions: result.decisions
        };
    }
}

module.exports =
    ResidentAdmissionDecisionHttpClient;
