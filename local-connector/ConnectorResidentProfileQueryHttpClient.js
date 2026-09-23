"use strict";

class ConnectorResidentProfileQueryHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme = "RISEN-Connector",
        connectorIdHeader = "x-risen-connector-id",
        timeoutMs = 60000,
        fetchImpl = globalThis.fetch
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
            typeof connectorIdHeader !== "string" ||
            !connectorIdHeader.trim() ||
            !Number.isSafeInteger(timeoutMs) ||
            timeoutMs <= 0 ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "ConnectorResidentProfileQueryHttpClient requires valid configuration"
            );
        }

        this.endpoint = endpoint.trim();
        this.connectorId = connectorId.trim();
        this.credential = credential.trim();
        this.authorizationScheme =
            authorizationScheme.trim();
        this.connectorIdHeader =
            connectorIdHeader.trim();
        this.timeoutMs = timeoutMs;
        this.fetchImpl = fetchImpl;
    }

    async get({
        sourceDocumentKey,
        identifierType,
        identifierDigest,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            !["name", "user_code"].includes(identifierType) ||
            typeof identifierDigest !== "string" ||
            !/^[0-9a-f]{64}$/.test(identifierDigest) ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            return { status: "invalid" };
        }

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
                            "content-type":
                                "application/json",
                            authorization:
                                `${this.authorizationScheme} ${this.credential}`,
                            [this.connectorIdHeader]:
                                this.connectorId
                        },
                        body: JSON.stringify({
                            sourceDocumentKey:
                                sourceDocumentKey.trim(),
                            identifierType,
                            identifierDigest,
                            sourceUpdatedAt:
                                sourceUpdatedAt.trim(),
                            sourceSize
                        }),
                        signal: controller.signal
                    }
                );

            let body;

            try {
                body = await response.json();
            } catch {
                return { status: "error" };
            }

            if (!response.ok) {
                if (body?.status === "denied") {
                    return { status: "denied" };
                }

                if (body?.status === "invalid") {
                    return { status: "invalid" };
                }

                return { status: "error" };
            }

            if (body?.status === "unavailable") {
                return { status: "unavailable" };
            }

            if (
                body?.status !== "found" ||
                !body.profile ||
                typeof body.profile !== "object" ||
                typeof body.profile.residentId !== "string" ||
                !body.profile.residentId.trim() ||
                typeof body.profile.name !== "string" ||
                !body.profile.name.trim()
            ) {
                return { status: "error" };
            }

            return {
                status: "found",
                profile: {
                    residentId:
                        body.profile.residentId.trim(),
                    name:
                        body.profile.name.trim(),
                    birth_date:
                        body.profile.birth_date ?? null,
                    gender:
                        body.profile.gender ?? null,
                    user_code:
                        body.profile.user_code ?? null
                }
            };
        } catch {
            return { status: "error" };
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports =
    ConnectorResidentProfileQueryHttpClient;
