"use strict";

class ConnectorSemanticLogicalRecordPersistenceHttpClient {
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
                "ConnectorSemanticLogicalRecordPersistenceHttpClient requires valid configuration"
            );
        }

        this.endpoint = endpoint.trim();
        this.connectorId = connectorId.trim();
        this.credential = credential.trim();
        this.authorizationScheme = authorizationScheme.trim();
        this.connectorIdHeader = connectorIdHeader.trim();
        this.timeoutMs = timeoutMs;
        this.fetchImpl = fetchImpl;
    }

    async persist(input = {}) {
        const allowedKeys = [
            "residentId",
            "semanticType",
            "logicalSlot",
            "sourceDocumentKey",
            "sourceUpdatedAt",
            "sourceSize",
            "expectedContentHash",
            "contentHash",
            "canonicalizationVersion",
            "semanticContent"
        ];

        if (
            !input ||
            typeof input !== "object" ||
            Array.isArray(input) ||
            Object.keys(input).length !== allowedKeys.length ||
            Object.keys(input).some(key => !allowedKeys.includes(key))
        ) {
            const error = new Error(
                "Invalid semantic logical persistence contract"
            );
            error.code =
                "semantic_logical_record_persistence_invalid";
            throw error;
        }

        const controller = new AbortController();
        const timer = setTimeout(
            () => controller.abort(),
            this.timeoutMs
        );

        let response;

        try {
            response = await this.fetchImpl(
                this.endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        [this.connectorIdHeader]: this.connectorId,
                        Authorization:
                            this.authorizationScheme +
                            " " +
                            this.credential
                    },
                    body: JSON.stringify(input),
                    signal: controller.signal
                }
            );
        } catch (cause) {
            const error = new Error(
                "Semantic logical persistence request failed"
            );
            error.code =
                "semantic_logical_record_persistence_unavailable";
            error.cause = cause;
            throw error;
        } finally {
            clearTimeout(timer);
        }

        let body;

        try {
            body = await response.json();
        } catch (cause) {
            const error = new Error(
                "Semantic logical persistence returned invalid JSON"
            );
            error.code =
                "semantic_logical_record_persistence_invalid_response";
            error.cause = cause;
            throw error;
        }

        if (
            response.status === 200 &&
            body &&
            ["created", "updated", "unchanged"].includes(body.status) &&
            typeof body.recordId === "string" &&
            body.recordId.trim()
        ) {
            return {
                status: body.status,
                recordId: body.recordId.trim()
            };
        }

        if (
            response.status === 409 &&
            body &&
            (body.status === "stale" || body.status === "conflict")
        ) {
            return {
                status: body.status,
                recordId:
                    typeof body.recordId === "string" &&
                    body.recordId.trim()
                        ? body.recordId.trim()
                        : null
            };
        }

        const error = new Error(
            "Semantic logical persistence was rejected"
        );

        error.code =
            response.status === 401
                ? "connector_trust_denied"
                : response.status === 422
                    ? "semantic_logical_record_persistence_invalid"
                    : "semantic_logical_record_persistence_unavailable";

        throw error;
    }
}

module.exports =
    ConnectorSemanticLogicalRecordPersistenceHttpClient;
