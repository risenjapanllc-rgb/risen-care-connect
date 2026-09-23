"use strict";

class ConnectorResidentAdmissionHttpClient {
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
                "ConnectorResidentAdmissionHttpClient requires valid configuration"
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

    async admit(input = {}) {
        const allowedKeys = [
            "sourceDocumentKey",
            "identifierType",
            "identifierDigest",
            "name",
            "residentProfile",
            "sourceUpdatedAt",
            "sourceSize"
        ];

        const allowedProfileKeys = new Set([
            "name",
            "birth_date",
            "gender",
            "user_code"
        ]);

        if (
            !input ||
            typeof input !== "object" ||
            Array.isArray(input) ||
            Object.keys(input).length !== allowedKeys.length ||
            Object.keys(input).some(key => !allowedKeys.includes(key)) ||
            !input.residentProfile ||
            typeof input.residentProfile !== "object" ||
            Array.isArray(input.residentProfile) ||
            Object.keys(input.residentProfile)
                .some(key => !allowedProfileKeys.has(key)) ||
            Object.values(input.residentProfile)
                .some(value =>
                    typeof value !== "string" ||
                    !value.trim()
                )
        ) {
            const error = new Error(
                "Invalid resident admission contract"
            );
            error.code = "resident_admission_invalid";
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
                "Resident admission request failed"
            );
            error.code = "resident_admission_unavailable";
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
                "Resident admission returned invalid JSON"
            );
            error.code = "resident_admission_invalid_response";
            error.cause = cause;
            throw error;
        }

        if (
            response.status === 200 &&
            body &&
            ["created", "existing"].includes(body.status) &&
            typeof body.residentId === "string" &&
            body.residentId.trim() &&
            typeof body.residentCreated === "boolean"
        ) {
            return {
                status: body.status,
                residentId: body.residentId.trim(),
                residentCreated: body.residentCreated
            };
        }

        if (
            response.status === 409 &&
            body &&
            ["stale", "not_approved", "conflict", "name_conflict"]
                .includes(body.status)
        ) {
            return {
                status: body.status,
                residentId:
                    typeof body.residentId === "string" &&
                    body.residentId.trim()
                        ? body.residentId.trim()
                        : null,
                residentCreated: false
            };
        }

        const error = new Error(
            "Resident admission was rejected"
        );

        error.code =
            response.status === 401
                ? "connector_trust_denied"
                : response.status === 422
                    ? "resident_admission_invalid"
                    : "resident_admission_unavailable";

        throw error;
    }
}

module.exports = ConnectorResidentAdmissionHttpClient;
