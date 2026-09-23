"use strict";

class ConnectorResidentProfileHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme = "RISEN-Connector",
        connectorIdHeader = "x-risen-connector-id",
        timeoutMs = 60000,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (typeof endpoint !== "string" || !endpoint.trim()) {
            throw new Error("ConnectorResidentProfileHttpClient requires endpoint");
        }
        if (typeof connectorId !== "string" || !connectorId.trim()) {
            throw new Error("ConnectorResidentProfileHttpClient requires connectorId");
        }
        if (typeof credential !== "string" || !credential.trim()) {
            throw new Error("ConnectorResidentProfileHttpClient requires credential");
        }
        if (typeof fetchImpl !== "function") {
            throw new Error("ConnectorResidentProfileHttpClient requires fetch");
        }

        this.endpoint = endpoint.trim();
        this.connectorId = connectorId.trim();
        this.credential = credential.trim();
        this.authorizationScheme = authorizationScheme.trim();
        this.connectorIdHeader =
            connectorIdHeader.trim().toLowerCase();
        this.timeoutMs = timeoutMs;
        this.fetchImpl = fetchImpl;
    }

    async fill({
        sourceDocumentKey,
        identifierType,
        identifierDigest,
        name,
        residentProfile,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const controller = new AbortController();
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
                            "content-type": "application/json",
                            [this.connectorIdHeader]:
                                this.connectorId,
                            authorization:
                                `${this.authorizationScheme} ${this.credential}`
                        },
                        body: JSON.stringify({
                            sourceDocumentKey,
                            identifierType,
                            identifierDigest,
                            name,
                            residentProfile,
                            sourceUpdatedAt,
                            sourceSize
                        }),
                        signal: controller.signal
                    }
                );

            let result = null;

            try {
                result = await response.json();
            } catch {
                return { status: "error" };
            }

            if (
                response.ok &&
                (
                    result?.status === "filled" ||
                    result?.status === "unchanged"
                )
            ) {
                return result;
            }

            if (
                response.status === 409 &&
                [
                    "stale",
                    "not_confirmed",
                    "conflict",
                    "user_code_conflict"
                ].includes(result?.status)
            ) {
                return result;
            }

            if (response.status === 401) {
                return { status: "denied" };
            }

            if (response.status === 422) {
                return { status: "invalid" };
            }

            return { status: "error" };
        } catch {
            return { status: "error" };
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports = ConnectorResidentProfileHttpClient;
