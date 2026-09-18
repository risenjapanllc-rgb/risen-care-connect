"use strict";

class SourceRecordIdentityPersistenceService {
    constructor({
        confirmationService,
        sourceRecordIdentityMappingClient,
        now = () => new Date()
    } = {}) {
        if (
            !confirmationService ||
            typeof confirmationService.validate !== "function"
        ) {
            throw new Error(
                "SourceRecordIdentityPersistenceService requires confirmationService"
            );
        }

        if (
            !sourceRecordIdentityMappingClient ||
            typeof sourceRecordIdentityMappingClient.save !== "function"
        ) {
            throw new Error(
                "SourceRecordIdentityPersistenceService requires sourceRecordIdentityMappingClient"
            );
        }

        if (typeof now !== "function") {
            throw new Error(
                "SourceRecordIdentityPersistenceService requires now"
            );
        }

        this.confirmationService =
            confirmationService;
        this.sourceRecordIdentityMappingClient =
            sourceRecordIdentityMappingClient;
        this.now = now;
    }

    async confirm(input = {}) {
        const validation =
            await this.confirmationService.validate(
                input
            );

        if (
            !validation ||
            validation.status !== "valid"
        ) {
            return validation;
        }

        const confirmedAtValue =
            this.now();

        if (
            !(confirmedAtValue instanceof Date) ||
            Number.isNaN(
                confirmedAtValue.getTime()
            )
        ) {
            throw new Error(
                "Source record identity confirmation time is unavailable"
            );
        }

        const confirmedAt =
            confirmedAtValue.toISOString();

        const persistence =
            await this.sourceRecordIdentityMappingClient.save({
                sourceDocumentKey:
                    validation.sourceDocumentKey,
                sourceFieldKey:
                    validation.sourceFieldKey,
                sheetName:
                    validation.sheetName,
                headerLabel:
                    validation.headerLabel,
                confirmedAt,
                sourceUpdatedAt:
                    validation.sourceUpdatedAt,
                sourceSize:
                    validation.sourceSize
            });

        return {
            status: "confirmed",
            persistenceStatus:
                persistence.status,
            mapping: {
                sourceFieldKey:
                    validation.sourceFieldKey,
                sheetName:
                    validation.sheetName,
                headerLabel:
                    validation.headerLabel,
                confirmedAt
            },
            validation: {
                sourceEntityCount:
                    validation.sourceEntityCount,
                uniqueValueCount:
                    validation.uniqueValueCount
            }
        };
    }
}

module.exports =
    SourceRecordIdentityPersistenceService;
