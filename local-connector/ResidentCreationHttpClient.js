"use strict";

class ResidentCreationHttpClient {
    constructor({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader =
            "x-risen-connector-id",
        timeoutMs = 10000,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof endpoint !== "string" ||
            !endpoint.trim()
        ) {
            throw new Error(
                "ResidentCreationHttpClient requires endpoint"
            );
        }

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim()
        ) {
            throw new Error(
                "ResidentCreationHttpClient requires connectorId"
            );
        }

        if (
            typeof credential !== "string" ||
            !credential
        ) {
            throw new Error(
                "ResidentCreationHttpClient requires credential"
            );
        }

        if (
            typeof authorizationScheme !== "string" ||
            !authorizationScheme.trim()
        ) {
            throw new Error(
                "ResidentCreationHttpClient requires authorizationScheme"
            );
        }

        if (
            typeof connectorIdHeader !== "string" ||
            !connectorIdHeader.trim()
        ) {
            throw new Error(
                "ResidentCreationHttpClient requires connectorIdHeader"
            );
        }

        if (
            !Number.isFinite(timeoutMs) ||
            timeoutMs <= 0
        ) {
            throw new Error(
                "ResidentCreationHttpClient requires positive timeoutMs"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "ResidentCreationHttpClient requires fetchImpl"
            );
        }

        const parsedEndpoint =
            new URL(endpoint);

        const isLocalhost =
            parsedEndpoint.hostname === "127.0.0.1" ||
            parsedEndpoint.hostname === "localhost" ||
            parsedEndpoint.hostname === "::1";

        if (
            parsedEndpoint.protocol !== "https:" &&
            !(
                parsedEndpoint.protocol === "http:" &&
                isLocalhost
            )
        ) {
            throw new Error(
                "ResidentCreationHttpClient requires HTTPS endpoint"
            );
        }

        this.endpoint =
            endpoint.trim();

        this.connectorId =
            connectorId.trim();

        this.credential =
            credential;

        this.authorizationScheme =
            authorizationScheme.trim();

        this.connectorIdHeader =
            connectorIdHeader
                .trim()
                .toLowerCase();

        this.timeoutMs =
            timeoutMs;

        this.fetchImpl =
            fetchImpl;
    }

    async create({
        name
    } = {}) {
        const normalizedName =
            typeof name === "string"
                ? name.trim()
                : "";

        if (!normalizedName) {
            throw new TypeError(
                "resident name is required"
            );
        }

        const controller =
            new AbortController();

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
                            method:
                                "POST",
                            headers: {
                                "content-type":
                                    "application/json",
                                [this.connectorIdHeader]:
                                    this.connectorId,
                                authorization:
                                    `${this.authorizationScheme} ${this.credential}`
                            },
                            body:
                                JSON.stringify({
                                    resident: {
                                        name:
                                            normalizedName
                                    }
                                }),
                            signal:
                                controller.signal
                        }
                    );
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary resident creation is unreachable"
                    );

                error.code =
                    "server_trust_boundary_unreachable";

                throw error;
            }

            if (!response.ok) {
                let safeResponse = null;

                try {
                    const parsed =
                        await response.json();

                    if (
                        parsed &&
                        typeof parsed === "object" &&
                        !Array.isArray(parsed)
                    ) {
                        safeResponse =
                            parsed;
                    }
                } catch {
                    safeResponse = null;
                }

                const allowedErrorCodes =
                    new Set([
                        "connector_trust_denied",
                        "resident_creation_invalid",
                        "resident_name_ambiguous",
                        "connector_processing_unavailable"
                    ]);

                const error =
                    new Error(
                        "Server Trust Boundary resident creation request failed"
                    );

                error.code =
                    safeResponse &&
                    typeof safeResponse.errorCode === "string" &&
                    allowedErrorCodes.has(
                        safeResponse.errorCode
                    )
                        ? safeResponse.errorCode
                        : "server_trust_boundary_request_failed";

                error.httpStatus =
                    Number.isInteger(response.status)
                        ? response.status
                        : null;

                error.requestId =
                    safeResponse &&
                    typeof safeResponse.requestId === "string" &&
                    safeResponse.requestId.trim()
                        ? safeResponse.requestId.trim()
                        : null;

                throw error;
            }

            let result;

            try {
                result =
                    await response.json();
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary resident creation returned invalid response"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            if (
                !result ||
                typeof result !== "object" ||
                Array.isArray(result) ||
                !["created", "existing"].includes(
                    result.status
                ) ||
                !result.resident ||
                typeof result.resident !== "object" ||
                Array.isArray(result.resident) ||
                typeof result.resident.residentId !== "string" ||
                !result.resident.residentId.trim() ||
                typeof result.resident.name !== "string" ||
                !result.resident.name.trim()
            ) {
                const error =
                    new Error(
                        "Server Trust Boundary resident creation returned invalid response"
                    );

                error.code =
                    "server_trust_boundary_invalid_response";

                throw error;
            }

            return {
                status:
                    result.status,
                resident: {
                    residentId:
                        result.resident.residentId.trim(),
                    userCode:
                        typeof result.resident.userCode === "string"
                            ? result.resident.userCode.trim()
                            : null,
                    name:
                        result.resident.name.trim(),
                    kana:
                        typeof result.resident.kana === "string"
                            ? result.resident.kana.trim()
                            : null,
                    birthDate:
                        typeof result.resident.birthDate === "string"
                            ? result.resident.birthDate.trim()
                            : null
                }
            };
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports =
    ResidentCreationHttpClient;
