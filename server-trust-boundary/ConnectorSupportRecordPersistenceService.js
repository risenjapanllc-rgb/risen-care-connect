"use strict";

const ConnectorSupportRecordCanonicalizer =
    require("../server-domain/semantic/ConnectorSupportRecordCanonicalizer");

class ConnectorSupportRecordPersistenceService {
    constructor({
        semanticRecordPersistenceRepository,
        canonicalizer =
            new ConnectorSupportRecordCanonicalizer()
    } = {}) {
        if (
            !semanticRecordPersistenceRepository ||
            typeof semanticRecordPersistenceRepository
                .createConfirmedRecord !== "function" ||
            typeof semanticRecordPersistenceRepository
                .updateConfirmedRecord !== "function"
        ) {
            throw new Error(
                "ConnectorSupportRecordPersistenceService requires semanticRecordPersistenceRepository"
            );
        }

        if (
            !canonicalizer ||
            typeof canonicalizer.process !== "function"
        ) {
            throw new Error(
                "ConnectorSupportRecordPersistenceService requires canonicalizer"
            );
        }

        this.semanticRecordPersistenceRepository =
            semanticRecordPersistenceRepository;

        this.canonicalizer =
            canonicalizer;
    }

    validate(operation) {
        if (!this.isPlainObject(operation)) {
            return this.rejected();
        }

        if (operation.action === "create") {
            if (
                !this.isUuid(
                    operation.residentId
                ) ||
                !this.isNonEmptyString(
                    operation.sourceDocumentKey
                ) ||
                !this.isNonEmptyString(
                    operation.sourceRecordKey
                ) ||
                !this.isCanonical(operation)
            ) {
                return this.rejected();
            }

            return {
                status: "valid"
            };
        }

        if (operation.action === "update") {
            if (
                !this.isUuid(
                    operation.recordId
                ) ||
                !this.isContentHash(
                    operation.expectedContentHash
                ) ||
                !this.isCanonical(operation)
            ) {
                return this.rejected();
            }

            return {
                status: "valid"
            };
        }

        return this.rejected();
    }

    async persist({
        verifiedContext,
        operation
    } = {}) {
        if (
            !this.isPlainObject(verifiedContext) ||
            !this.isNonEmptyString(
                verifiedContext.facilityId
            ) ||
            !this.isNonEmptyString(
                verifiedContext.connectorId
            ) ||
            this.validate(operation).status !==
                "valid"
        ) {
            return this.rejected();
        }

        if (operation.action === "create") {
            return this.create({
                verifiedContext,
                operation
            });
        }

        return this.update({
            verifiedContext,
            operation
        });
    }

    async create({
        verifiedContext,
        operation
    }) {
        let result;

        try {
            result =
                await this
                    .semanticRecordPersistenceRepository
                    .createConfirmedRecord({
                        verifiedFacilityId:
                            verifiedContext.facilityId,
                        verifiedConnectorId:
                            verifiedContext.connectorId,
                        residentId:
                            operation.residentId,
                        sourceDocumentKey:
                            operation.sourceDocumentKey,
                        sourceRecordKey:
                            operation.sourceRecordKey,
                        contentHash:
                            operation.contentHash,
                        canonicalizationVersion:
                            operation
                                .canonicalizationVersion,
                        semanticContent:
                            operation.semanticContent
                    });
        } catch {
            return this.rejected();
        }

        if (
            !this.isPlainObject(result) ||
            !this.isNonEmptyString(result.status)
        ) {
            return this.rejected();
        }

        if (
            result.status === "created" ||
            result.status === "unchanged"
        ) {
            return {
                status: result.status
            };
        }

        if (
            result.status === "conflict" ||
            result.status ===
                "resident_mismatch"
        ) {
            return {
                status: result.status
            };
        }

        return this.rejected();
    }

    async update({
        verifiedContext,
        operation
    }) {
        let result;

        try {
            result =
                await this
                    .semanticRecordPersistenceRepository
                    .updateConfirmedRecord({
                        verifiedFacilityId:
                            verifiedContext.facilityId,
                        verifiedConnectorId:
                            verifiedContext.connectorId,
                        recordId:
                            operation.recordId,
                        expectedContentHash:
                            operation
                                .expectedContentHash,
                        contentHash:
                            operation.contentHash,
                        canonicalizationVersion:
                            operation
                                .canonicalizationVersion,
                        semanticContent:
                            operation.semanticContent
                    });
        } catch {
            return this.rejected();
        }

        if (
            !this.isPlainObject(result) ||
            !this.isNonEmptyString(result.status)
        ) {
            return this.rejected();
        }

        if (
            result.status === "updated" ||
            result.status === "unchanged" ||
            result.status === "conflict"
        ) {
            return {
                status: result.status
            };
        }

        return this.rejected();
    }

    isCanonical(operation) {
        if (
            !this.isContentHash(
                operation.contentHash
            ) ||
            operation.canonicalizationVersion !==
                "risen-semantic-canonicalization-2" ||
            !this.isPlainObject(
                operation.semanticContent
            ) ||
            operation.semanticContent.semanticType !==
                "support_record" ||
            !this.isPlainObject(
                operation.semanticContent.fields
            ) ||
            !this.isPlainObject(
                operation.semanticContent.customFields
            ) ||
            Object.keys(
                operation.semanticContent.customFields
            ).length !== 0
        ) {
            return false;
        }

        let canonical;

        try {
            canonical =
                this.canonicalizer.process(
                    operation.semanticContent.fields
                );
        } catch {
            return false;
        }

        return (
            canonical.contentHash ===
                operation.contentHash &&
            canonical.canonicalizationVersion ===
                operation.canonicalizationVersion &&
            JSON.stringify(
                canonical.semanticContent
            ) ===
                JSON.stringify(
                    operation.semanticContent
                )
        );
    }

    rejected() {
        return {
            status: "rejected"
        };
    }

    isUuid(value) {
        return (
            typeof value === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                value
            )
        );
    }

    isContentHash(value) {
        return (
            typeof value === "string" &&
            /^[0-9a-f]{64}$/.test(value)
        );
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    isPlainObject(value) {
        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            return false;
        }

        const prototype =
            Object.getPrototypeOf(value);

        return (
            prototype === Object.prototype ||
            prototype === null
        );
    }
}

module.exports =
    ConnectorSupportRecordPersistenceService;
