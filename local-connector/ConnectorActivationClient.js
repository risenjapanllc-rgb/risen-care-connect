"use strict";

class ConnectorActivationClient {
    constructor({
        endpoint,
        fetchImpl = globalThis.fetch,
        timeoutMs = 15000
    } = {}) {
        if (
            typeof endpoint !== "string" ||
            !endpoint.trim()
        ) {
            throw new Error(
                "ConnectorActivationClient requires endpoint"
            );
        }

        if (
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "ConnectorActivationClient requires fetchImpl"
            );
        }

        this.endpoint =
            endpoint.trim();

        this.fetchImpl =
            fetchImpl;

        this.timeoutMs =
            timeoutMs;
    }

    async activate({
        activationToken,
        connectorId
    } = {}) {
        if (
            typeof activationToken !== "string" ||
            !activationToken.trim()
        ) {
            throw new Error(
                "activation token is required"
            );
        }

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim()
        ) {
            throw new Error(
                "connector id is required"
            );
        }

        const controller =
            new AbortController();

        const timer =
            setTimeout(
                () => controller.abort(),
                this.timeoutMs
            );

        try {
            const response =
                await this.fetchImpl(
                    this.endpoint,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                activationToken:
                                    activationToken.trim(),

                                connectorId:
                                    connectorId.trim()
                            }),

                        signal:
                            controller.signal
                    }
                );

            let body = null;

            try {
                body =
                    await response.json();
            } catch {
                body = null;
            }

            if (
                !response.ok ||
                !body ||
                typeof body !== "object"
            ) {
                const error =
                    new Error(
                        "connector activation request failed"
                    );

                error.code =
                    body?.errorCode ||
                    "connector_activation_failed";

                throw error;
            }

            const credential =
                String(
                    body.credential || ""
                ).trim();

            if (!credential) {
                const error =
                    new Error(
                        "connector activation credential is unavailable"
                    );

                error.code =
                    "connector_activation_invalid_response";

                throw error;
            }

            return {
                credential
            };
        } finally {
            clearTimeout(timer);
        }
    }
}

module.exports =
    ConnectorActivationClient;
