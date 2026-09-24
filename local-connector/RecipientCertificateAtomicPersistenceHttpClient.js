"use strict";

class RecipientCertificateAtomicPersistenceHttpClient {
    constructor({
        endpoint,
        connectorId,
        credentialProvider,
        authorizationScheme = "RISEN-Connector",
        fetchImpl = global.fetch
    } = {}) {
        if (typeof endpoint !== "string" || !endpoint.trim()) {
            throw new Error(
                "RecipientCertificateAtomicPersistenceHttpClient requires endpoint"
            );
        }

        if (typeof connectorId !== "string" || !connectorId.trim()) {
            throw new Error(
                "RecipientCertificateAtomicPersistenceHttpClient requires connectorId"
            );
        }

        if (
            !credentialProvider ||
            typeof credentialProvider.getCredential !== "function"
        ) {
            throw new Error(
                "RecipientCertificateAtomicPersistenceHttpClient requires credentialProvider"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "RecipientCertificateAtomicPersistenceHttpClient requires fetch"
            );
        }

        this.endpoint = endpoint.trim();
        this.connectorId = connectorId.trim();

        if (
            typeof authorizationScheme !== "string" ||
            !authorizationScheme.trim()
        ) {
            throw new Error(
                "RecipientCertificateAtomicPersistenceHttpClient requires authorizationScheme"
            );
        }

        this.credentialProvider = credentialProvider;
        this.authorizationScheme = authorizationScheme.trim();
        this.fetchImpl = fetchImpl;
    }

    async persist(contract = {}) {
        const credential =
            await this.credentialProvider.getCredential();

        if (
            typeof credential !== "string" ||
            !credential.trim()
        ) {
            throw new Error(
                "Recipient certificate atomic persistence credential unavailable"
            );
        }

        const response = await this.fetchImpl(
            this.endpoint,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        this.authorizationScheme + " " + credential.trim(),
                    "x-risen-connector-id":
                        this.connectorId
                },
                body: JSON.stringify(contract)
            }
        );

        let body = null;

        try {
            body = await response.json();
        } catch {
            throw new Error(
                "Recipient certificate atomic persistence returned invalid JSON"
            );
        }

        if (!response.ok) {
            return {
                status:
                    typeof body?.status === "string"
                        ? body.status
                        : "error",
                errorCode:
                    typeof body?.errorCode === "string"
                        ? body.errorCode
                        : "recipient_certificate_atomic_persistence_failed",
                residentId:
                    body?.residentId ?? null,
                recordId:
                    body?.recordId ?? null,
                residentCreated: false
            };
        }

        if (
            !body ||
            typeof body !== "object" ||
            !["created", "updated", "unchanged"].includes(
                body.status
            )
        ) {
            throw new Error(
                "Recipient certificate atomic persistence returned invalid result"
            );
        }

        return {
            status: body.status,
            residentId: body.residentId ?? null,
            recordId: body.recordId ?? null,
            residentCreated:
                body.residentCreated === true
        };
    }
}

module.exports =
    RecipientCertificateAtomicPersistenceHttpClient;
