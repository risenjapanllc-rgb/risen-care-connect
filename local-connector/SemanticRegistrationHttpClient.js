"use strict";

class SemanticRegistrationHttpClient {
    constructor({
        serverTrustBoundaryEndpoint,
        connectorId,
        credential,
        authorizationScheme =
            "RISEN-Connector",
        connectorIdHeader =
            "x-risen-connector-id",
        timeoutMs = 60000,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof serverTrustBoundaryEndpoint !==
                "string" ||
            !serverTrustBoundaryEndpoint.trim()
        ) {
            throw new Error(
                "SemanticRegistrationHttpClient requires serverTrustBoundaryEndpoint"
            );
        }

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim()
        ) {
            throw new Error(
                "SemanticRegistrationHttpClient requires connectorId"
            );
        }

        if (
            typeof credential !== "string" ||
            !credential.trim()
        ) {
            throw new Error(
                "SemanticRegistrationHttpClient requires credential"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "SemanticRegistrationHttpClient requires fetch"
            );
        }

        this.serverTrustBoundaryEndpoint =
            serverTrustBoundaryEndpoint.trim();

        this.connectorId =
            connectorId.trim();

        this.credential =
            credential.trim();

        this.authorizationScheme =
            authorizationScheme;

        this.connectorIdHeader =
            connectorIdHeader;

        this.timeoutMs =
            timeoutMs;

        this.fetchImpl =
            fetchImpl;
    }

    buildEndpoint(pathname) {
        const url =
            new URL(
                this.serverTrustBoundaryEndpoint
            );

        url.pathname =
            pathname;

        url.search = "";
        url.hash = "";

        return url.toString();
    }

    async get({
        pathname,
        query = {}
    }) {
        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                this.timeoutMs
            );

        const url =
            new URL(
                this.buildEndpoint(
                    pathname
                )
            );

        for (
            const [key, value]
            of Object.entries(query)
        ) {
            if (
                typeof value === "string" &&
                value.trim()
            ) {
                url.searchParams.set(
                    key,
                    value.trim()
                );
            }
        }

        let response;

        try {
            response =
                await this.fetchImpl(
                    url,
                    {
                        method: "GET",
                        headers: {
                            Authorization:
                                `${this.authorizationScheme} ${this.credential}`,

                            [this.connectorIdHeader]:
                                this.connectorId
                        },
                        signal:
                            controller.signal
                    }
                );
        } finally {
            clearTimeout(timeout);
        }

        let result = null;

        try {
            result =
                await response.json();
        } catch {
            result = null;
        }

        if (!response.ok) {
            const error =
                new Error(
                    result?.errorCode ||
                    `Semantic registration query failed: ${response.status}`
                );

            error.code =
                result?.errorCode ||
                "connector_processing_unavailable";

            error.httpStatus =
                response.status;

            throw error;
        }

        if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result) ||
            typeof result.status !==
                "string"
        ) {
            throw new Error(
                "Semantic registration query returned invalid result"
            );
        }

        return result;
    }

    async post({
        pathname,
        envelopeName,
        payload
    }) {
        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                this.timeoutMs
            );

        let response;

        try {
            response =
                await this.fetchImpl(
                    this.buildEndpoint(
                        pathname
                    ),
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `${this.authorizationScheme} ${this.credential}`,

                            [this.connectorIdHeader]:
                                this.connectorId
                        },

                        body:
                            JSON.stringify({
                                [envelopeName]:
                                    payload
                            }),

                        signal:
                            controller.signal
                    }
                );
        } finally {
            clearTimeout(timeout);
        }

        let result = null;

        try {
            result =
                await response.json();
        } catch {
            result = null;
        }

        if (!response.ok) {
            const error =
                new Error(
                    result?.errorCode ||
                    `Semantic registration request failed: ${response.status}`
                );

            error.code =
                result?.errorCode ||
                "connector_processing_unavailable";

            error.httpStatus =
                response.status;

            throw error;
        }

        if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result) ||
            typeof result.status !== "string"
        ) {
            throw new Error(
                "Semantic registration returned invalid result"
            );
        }

        return result;
    }

    getOrCreateExact(
        sourceTemplateExact
    ) {
        return this.post({
            pathname:
                "/connector/source-templates/exact",

            envelopeName:
                "sourceTemplateExact",

            payload:
                sourceTemplateExact
        });
    }

    registerFields(
        sourceTemplateFields
    ) {
        return this.post({
            pathname:
                "/connector/source-template-fields/exact",

            envelopeName:
                "sourceTemplateFields",

            payload:
                sourceTemplateFields
        });
    }

    listAuthority(templateId) {
        return this.get({
            pathname:
                "/connector/source-template-semantic-authority",
            query: {
                templateId
            }
        });
    }

    confirmAuthority(
        sourceTemplateSemanticAuthority
    ) {
        return this.post({
            pathname:
                "/connector/source-template-semantic-authority",

            envelopeName:
                "sourceTemplateSemanticAuthority",

            payload:
                sourceTemplateSemanticAuthority
        });
    }

    bindDocument(
        sourceDocumentTemplateBinding
    ) {
        return this.post({
            pathname:
                "/connector/source-document-template-bindings",

            envelopeName:
                "sourceDocumentTemplateBinding",

            payload:
                sourceDocumentTemplateBinding
        });
    }
}

module.exports =
    SemanticRegistrationHttpClient;
