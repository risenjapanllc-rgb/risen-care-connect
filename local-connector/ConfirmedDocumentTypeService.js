"use strict";

class ConfirmedDocumentTypeService {
    constructor({
        localConnectorService,
        persistenceClient,
        allowedDocumentTypes = []
    } = {}) {
        if (
            !localConnectorService ||
            typeof localConnectorService.resolveSourceSnapshot !== "function"
        ) {
            throw new Error(
                "ConfirmedDocumentTypeService requires localConnectorService"
            );
        }

        if (
            !persistenceClient ||
            typeof persistenceClient.save !== "function"
        ) {
            throw new Error(
                "ConfirmedDocumentTypeService requires persistenceClient"
            );
        }

        this.localConnectorService = localConnectorService;
        this.persistenceClient = persistenceClient;
        this.allowedDocumentTypes = new Set(allowedDocumentTypes);
    }

    async confirm({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        documentType
    } = {}) {
        const normalizedDocumentType =
            typeof documentType === "string"
                ? documentType.trim()
                : "";

        if (
            !normalizedDocumentType ||
            !this.allowedDocumentTypes.has(normalizedDocumentType)
        ) {
            return {
                status: "invalid_document_type"
            };
        }

        const snapshot =
            await this.localConnectorService.resolveSourceSnapshot({
                sourceDocumentKey,
                sourceUpdatedAt,
                sourceSize
            });

        const persistence =
            await this.persistenceClient.save({
                sourceDocumentKey: snapshot.sourceDocumentKey,
                sourceUpdatedAt: snapshot.sourceUpdatedAt,
                sourceSize: snapshot.sourceSize,
                documentType: normalizedDocumentType,
                confirmedAt: new Date().toISOString()
            });

        return {
            status: "confirmed",
            documentType: normalizedDocumentType,
            persistenceStatus: persistence.status
        };
    }
}

module.exports = ConfirmedDocumentTypeService;
