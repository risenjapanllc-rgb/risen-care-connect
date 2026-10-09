"use strict";

class LogicalSourceResidentAssociationHttpClient {
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
            !endpoint.trim() ||
            typeof connectorId !== "string" ||
            !connectorId.trim() ||
            typeof credential !== "string" ||
            !credential.trim() ||
            typeof authorizationScheme !==
                "string" ||
            !authorizationScheme.trim() ||
            typeof connectorIdHeader !==
                "string" ||
            !connectorIdHeader.trim() ||
            !Number.isFinite(timeoutMs) ||
            timeoutMs <= 0 ||
            typeof fetchImpl !==
                "function"
        ) {
            throw new Error(
                "LogicalSourceResidentAssociationHttpClient requires valid configuration"
            );
        }

        const parsed =
            new URL(endpoint);

        const local =
            parsed.hostname ===
                "127.0.0.1" ||
            parsed.hostname ===
                "localhost" ||
            parsed.hostname ===
                "::1";

        if (
            parsed.protocol !==
                "https:" &&
            !(
                parsed.protocol ===
                    "http:" &&
                local
            )
        ) {
            throw new Error(
                "LogicalSourceResidentAssociationHttpClient requires HTTPS endpoint"
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

    async save(association) {
        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () =>
                    controller.abort(),
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
                                    logicalSourceResidentAssociation:
                                        association
                                }),
                            signal:
                                controller.signal
                        }
                    );
            } catch {
                const error =
                    new Error(
                        "Server Trust Boundary logical source resident association is unreachable"
                    );

                error.code =
                    "server_trust_boundary_unreachable";

                throw error;
            }

            let result = null;

            try {
                result =
                    await response.json();
            } catch {
                result =
                    null;
            }

            if (!response.ok) {
                const allowed =
                    new Set([
                        "connector_trust_denied",
                        "logical_source_resident_association_invalid",
                        "logical_source_resident_association_persistence_unavailable"
                    ]);

                const error =
                    new Error(
                        "Server Trust Boundary logical source resident association request failed"
                    );

                error.code =
                    result &&
                    typeof result.errorCode ===
                        "string" &&
                    allowed.has(
                        result.errorCode
                    )
                        ? result.errorCode
                        : "server_trust_boundary_request_failed";

                error.httpStatus =
                    Number.isInteger(
                        response.status
                    )
                        ? response.status
                        : null;

                throw error;
            }

            if (
                !result ||
                typeof result !==
                    "object" ||
                Array.isArray(result) ||
                ![
                    "created",
                    "updated",
                    "unchanged",
                    "conflict"
                ].includes(
                    result.status
                )
            ) {
                const error =
                    new Error(
                        "Server Trust Boundary logical source resident association returned invalid response"
                    );

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
    LogicalSourceResidentAssociationHttpClient;
