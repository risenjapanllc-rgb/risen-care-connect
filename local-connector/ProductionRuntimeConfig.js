"use strict";

class ProductionRuntimeConfig {
    constructor({
        env = process.env
    } = {}) {
        this.env = env;
    }

    resolveServerTrustBoundaryEndpoint() {
        const explicitEndpoint =
            this.readOptional(
                "RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT"
            );

        if (explicitEndpoint) {
            return this.validateEndpoint(
                explicitEndpoint
            );
        }

        const host =
            this.readOptional(
                "SERVER_TRUST_BOUNDARY_HOST"
            ) ||
            "127.0.0.1";

        const port =
            this.readOptional(
                "SERVER_TRUST_BOUNDARY_PORT"
            ) ||
            "8787";

        const endpointPath =
            this.readOptional(
                "SERVER_TRUST_BOUNDARY_ENDPOINT"
            ) ||
            "/connector/ingest";

        return this.validateEndpoint(
            `http://${host}:${port}${endpointPath}`
        );
    }

    requireConnectorCredential() {
        return this.requireValue(
            "CONNECTOR_CREDENTIAL"
        );
    }

    resolveAuthorizationScheme() {
        return (
            this.readOptional(
                "RISEN_CONNECTOR_AUTHORIZATION_SCHEME"
            ) ||
            this.readOptional(
                "SERVER_TRUST_BOUNDARY_AUTH_SCHEME"
            ) ||
            "RISEN-Connector"
        );
    }

    resolveMySqlSource() {
        const sourceId =
            this.readOptional(
                "RISEN_MYSQL_SOURCE_ID"
            );

        if (!sourceId) {
            return null;
        }

        return {
            sourceId,
            host:
                this.requireValue(
                    "RISEN_MYSQL_HOST"
                ),
            port:
                this.readPositiveInteger(
                    "RISEN_MYSQL_PORT",
                    3306
                ),
            user:
                this.requireValue(
                    "RISEN_MYSQL_USER"
                ),
            password:
                this.requireValue(
                    "RISEN_MYSQL_PASSWORD"
                ),
            database:
                this.requireValue(
                    "RISEN_MYSQL_DATABASE"
                ),
            query:
                this.requireValue(
                    "RISEN_MYSQL_QUERY"
                )
        };
    }

    readPositiveInteger(
        name,
        fallback
    ) {
        const value =
            this.readOptional(name);

        if (!value) {
            return fallback;
        }

        const parsed =
            Number(value);

        if (
            !Number.isInteger(parsed) ||
            parsed <= 0 ||
            parsed > 65535
        ) {
            throw new Error(
                `Invalid positive integer environment variable: ${name}`
            );
        }

        return parsed;
    }

    resolveConnectorIdHeader() {
        return (
            this.readOptional(
                "RISEN_CONNECTOR_ID_HEADER"
            ) ||
            this.readOptional(
                "SERVER_TRUST_BOUNDARY_CONNECTOR_ID_HEADER"
            ) ||
            "x-risen-connector-id"
        );
    }

    validateEndpoint(value) {
        let url;

        try {
            url =
                new URL(value);
        } catch {
            throw new Error(
                "Server Trust Boundary endpoint is invalid"
            );
        }

        const localhost =
            url.hostname === "127.0.0.1" ||
            url.hostname === "localhost" ||
            url.hostname === "::1";

        if (
            url.protocol !== "https:" &&
            !(
                url.protocol === "http:" &&
                localhost
            )
        ) {
            throw new Error(
                "Server Trust Boundary endpoint must use HTTPS outside localhost"
            );
        }

        return url.toString();
    }

    requireValue(name) {
        const value =
            this.readOptional(name);

        if (!value) {
            throw new Error(
                `Missing required environment variable: ${name}`
            );
        }

        return value;
    }

    readOptional(name) {
        const value =
            this.env[name];

        if (
            typeof value !== "string" ||
            value.trim() === ""
        ) {
            return null;
        }

        return value.trim();
    }
}

module.exports =
    ProductionRuntimeConfig;
