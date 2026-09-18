"use strict";

class ConnectorSupportRecordBatchWriteHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader = "x-risen-connector-id",
        timeoutMs = 60000,
        maxBatchSize = 100,
        fetchImpl = fetch
    } = {}) {
        if (typeof endpoint !== "string" || !endpoint.trim()) {
            throw new Error("ConnectorSupportRecordBatchWriteHttpClient requires endpoint");
        }
        if (typeof connectorId !== "string" || !connectorId.trim()) {
            throw new Error("ConnectorSupportRecordBatchWriteHttpClient requires connectorId");
        }
        if (typeof credential !== "string" || !credential.trim()) {
            throw new Error("ConnectorSupportRecordBatchWriteHttpClient requires credential");
        }
        if (typeof authorizationScheme !== "string" || !authorizationScheme.trim()) {
            throw new Error("ConnectorSupportRecordBatchWriteHttpClient requires authorizationScheme");
        }
        if (typeof connectorIdHeader !== "string" || !connectorIdHeader.trim()) {
            throw new Error("ConnectorSupportRecordBatchWriteHttpClient requires connectorIdHeader");
        }
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
            throw new Error("ConnectorSupportRecordBatchWriteHttpClient requires positive timeoutMs");
        }
        if (!Number.isInteger(maxBatchSize) || maxBatchSize < 1 || maxBatchSize > 500) {
            throw new Error("ConnectorSupportRecordBatchWriteHttpClient requires valid maxBatchSize");
        }
        if (typeof fetchImpl !== "function") {
            throw new Error("ConnectorSupportRecordBatchWriteHttpClient requires fetchImpl");
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
            throw new Error("ConnectorSupportRecordBatchWriteHttpClient requires HTTPS endpoint");
        }

        this.endpoint = endpoint.trim();
        this.connectorId = connectorId.trim();
        this.credential = credential;
        this.authorizationScheme = authorizationScheme.trim();
        this.connectorIdHeader = connectorIdHeader.trim().toLowerCase();
        this.timeoutMs = timeoutMs;
        this.maxBatchSize = maxBatchSize;
        this.fetchImpl = fetchImpl;
    }

    async write(operations) {
        if (
            !Array.isArray(operations) ||
            operations.length < 1 ||
            operations.length > this.maxBatchSize ||
            operations.some(operation =>
                !operation ||
                typeof operation !== "object" ||
                Array.isArray(operation)
            )
        ) {
            throw new TypeError("Support record batch write requires valid operations");
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
                    body: JSON.stringify({ operations }),
                    signal: controller.signal
                });
            } catch {
                const error = new Error("Server Trust Boundary support record batch write is unreachable");
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
                this.isCompletedResult(result, operations.length)
            ) {
                return {
                    status: "completed",
                    processed: result.processed,
                    created: result.created,
                    updated: result.updated,
                    unchanged: result.unchanged
                };
            }

            if (
                response.status === 409 &&
                this.isStoppedResult(result, operations.length)
            ) {
                return {
                    status: result.status,
                    failedIndex: result.failedIndex,
                    processed: result.processed,
                    created: result.created,
                    updated: result.updated,
                    unchanged: result.unchanged
                };
            }

            const allowedErrorCodes = new Set([
                "connector_trust_denied",
                "support_record_batch_write_invalid",
                "connector_processing_unavailable"
            ]);

            const error = new Error("Server Trust Boundary support record batch write request failed");
            error.code =
                result &&
                typeof result.errorCode === "string" &&
                allowedErrorCodes.has(result.errorCode)
                    ? result.errorCode
                    : "server_trust_boundary_request_failed";
            error.httpStatus = Number.isInteger(response.status)
                ? response.status
                : null;
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    isCount(value) {
        return Number.isInteger(value) && value >= 0;
    }

    hasValidCounts(result) {
        return (
            this.isCount(result?.processed) &&
            this.isCount(result?.created) &&
            this.isCount(result?.updated) &&
            this.isCount(result?.unchanged) &&
            result.processed ===
                result.created + result.updated + result.unchanged
        );
    }

    isCompletedResult(result, operationCount) {
        return (
            result &&
            typeof result === "object" &&
            !Array.isArray(result) &&
            result.status === "completed" &&
            this.hasValidCounts(result) &&
            result.processed === operationCount
        );
    }

    isStoppedResult(result, operationCount) {
        return (
            result &&
            typeof result === "object" &&
            !Array.isArray(result) &&
            (
                result.status === "conflict" ||
                result.status === "resident_mismatch"
            ) &&
            Number.isInteger(result.failedIndex) &&
            result.failedIndex >= 0 &&
            result.failedIndex < operationCount &&
            this.hasValidCounts(result) &&
            result.processed === result.failedIndex
        );
    }
}

module.exports = ConnectorSupportRecordBatchWriteHttpClient;
