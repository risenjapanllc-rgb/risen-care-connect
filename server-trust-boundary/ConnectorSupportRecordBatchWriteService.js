"use strict";

class ConnectorSupportRecordBatchWriteService {
    constructor({
        connectorTrustService,
        persistenceService,
        semanticRecordPersistenceRepository = null,
        maxBatchSize = 100
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error("ConnectorSupportRecordBatchWriteService requires connectorTrustService");
        }

        if (
            !persistenceService ||
            typeof persistenceService.persist !== "function"
        ) {
            throw new Error("ConnectorSupportRecordBatchWriteService requires persistenceService");
        }

        if (
            !Number.isInteger(maxBatchSize) ||
            maxBatchSize < 1 ||
            maxBatchSize > 500
        ) {
            throw new Error("ConnectorSupportRecordBatchWriteService requires valid maxBatchSize");
        }

        if (
            semanticRecordPersistenceRepository !== null &&
            (
                typeof semanticRecordPersistenceRepository !== "object" ||
                typeof semanticRecordPersistenceRepository.persistBatch !== "function"
            )
        ) {
            throw new Error("ConnectorSupportRecordBatchWriteService requires valid semanticRecordPersistenceRepository");
        }

        this.connectorTrustService = connectorTrustService;
        this.persistenceService = persistenceService;
        this.semanticRecordPersistenceRepository =
            semanticRecordPersistenceRepository;
        this.maxBatchSize = maxBatchSize;
    }

    async write({ connectorId, credential, operations } = {}) {
        if (
            !Array.isArray(operations) ||
            operations.length < 1 ||
            operations.length > this.maxBatchSize ||
            operations.some(operation => !this.isPlainObject(operation))
        ) {
            return {
                status: "invalid",
                errorCode: "support_record_batch_write_invalid"
            };
        }

        let trustResult;

        try {
            trustResult = await this.connectorTrustService.authenticate({
                connectorId,
                credential
            });
        } catch {
            return {
                status: "error",
                errorCode: "connector_trust_unavailable"
            };
        }

        if (!this.isPlainObject(trustResult)) {
            return {
                status: "error",
                errorCode: "connector_trust_invalid_result"
            };
        }

        if (trustResult.status === "denied") {
            return {
                status: "denied",
                errorCode: "connector_trust_denied"
            };
        }

        if (trustResult.status === "error") {
            return {
                status: "error",
                errorCode:
                    typeof trustResult.errorCode === "string" &&
                    trustResult.errorCode.trim()
                        ? trustResult.errorCode.trim()
                        : "connector_trust_unavailable"
            };
        }

        if (
            trustResult.status !== "verified" ||
            !this.isPlainObject(trustResult.verifiedContext) ||
            !this.isNonEmptyString(trustResult.verifiedContext.facilityId) ||
            !this.isNonEmptyString(trustResult.verifiedContext.connectorId)
        ) {
            return {
                status: "error",
                errorCode: "connector_trust_invalid_result"
            };
        }

        const verifiedContext = {
            facilityId: trustResult.verifiedContext.facilityId.trim(),
            connectorId: trustResult.verifiedContext.connectorId.trim()
        };

        const counts = {
            processed: 0,
            created: 0,
            updated: 0,
            unchanged: 0
        };

        const canUseCreateBatch =
            this.semanticRecordPersistenceRepository !== null &&
            typeof this.persistenceService.validate === "function" &&
            operations.every(
                operation =>
                    operation.action === "create"
            );

        if (canUseCreateBatch) {
            for (
                let index = 0;
                index < operations.length;
                index += 1
            ) {
                let validation;

                try {
                    validation =
                        this.persistenceService.validate(
                            operations[index]
                        );
                } catch {
                    return {
                        status: "error",
                        failedIndex: index,
                        ...counts,
                        errorCode:
                            "support_record_batch_write_invalid_result"
                    };
                }

                if (
                    !this.isPlainObject(validation) ||
                    validation.status !== "valid"
                ) {
                    return {
                        status: "invalid",
                        failedIndex: index,
                        ...counts,
                        errorCode:
                            "support_record_batch_write_invalid"
                    };
                }
            }

            let batchResult;

            try {
                batchResult =
                    await this.semanticRecordPersistenceRepository.persistBatch({
                        verifiedFacilityId:
                            verifiedContext.facilityId,
                        verifiedConnectorId:
                            verifiedContext.connectorId,
                        operations
                    });
            } catch {
                return {
                    status: "error",
                    failedIndex: 0,
                    ...counts,
                    errorCode:
                        "support_record_batch_write_unavailable"
                };
            }

            if (
                !this.isPlainObject(batchResult) ||
                !this.isNonEmptyString(
                    batchResult.status
                )
            ) {
                return {
                    status: "error",
                    failedIndex: 0,
                    ...counts,
                    errorCode:
                        "support_record_batch_write_invalid_result"
                };
            }

            if (
                batchResult.status ===
                    "completed"
            ) {
                return {
                    status: "completed",
                    processed:
                        batchResult.processed,
                    created:
                        batchResult.created,
                    updated:
                        batchResult.updated,
                    unchanged:
                        batchResult.unchanged
                };
            }

            if (
                batchResult.status ===
                    "stopped"
            ) {
                const prefix = {
                    failedIndex:
                        batchResult.failedIndex,
                    processed:
                        batchResult.processed,
                    created:
                        batchResult.created,
                    updated:
                        batchResult.updated,
                    unchanged:
                        batchResult.unchanged
                };

                if (
                    batchResult.failureStatus ===
                        "conflict" ||
                    batchResult.failureStatus ===
                        "resident_mismatch"
                ) {
                    return {
                        status:
                            batchResult.failureStatus,
                        ...prefix
                    };
                }

                return {
                    status: "error",
                    ...prefix,
                    errorCode:
                        "support_record_batch_write_unavailable"
                };
            }

            return {
                status: "error",
                failedIndex: 0,
                ...counts,
                errorCode:
                    "support_record_batch_write_invalid_result"
            };
        }

        for (let index = 0; index < operations.length; index += 1) {
            let result;

            try {
                result = await this.persistenceService.persist({
                    verifiedContext,
                    operation: operations[index]
                });
            } catch {
                return {
                    status: "error",
                    failedIndex: index,
                    ...counts,
                    errorCode: "support_record_batch_write_unavailable"
                };
            }

            if (!this.isPlainObject(result) || !this.isNonEmptyString(result.status)) {
                return {
                    status: "error",
                    failedIndex: index,
                    ...counts,
                    errorCode: "support_record_batch_write_invalid_result"
                };
            }

            if (
                result.status === "created" ||
                result.status === "updated" ||
                result.status === "unchanged"
            ) {
                counts.processed += 1;
                counts[result.status] += 1;
                continue;
            }

            if (
                result.status === "conflict" ||
                result.status === "resident_mismatch"
            ) {
                return {
                    status: result.status,
                    failedIndex: index,
                    ...counts
                };
            }

            if (result.status === "rejected") {
                return {
                    status: "invalid",
                    failedIndex: index,
                    ...counts,
                    errorCode: "support_record_batch_write_invalid"
                };
            }

            return {
                status: "error",
                failedIndex: index,
                ...counts,
                errorCode: "support_record_batch_write_invalid_result"
            };
        }

        return {
            status: "completed",
            ...counts
        };
    }

    isNonEmptyString(value) {
        return typeof value === "string" && value.trim() !== "";
    }

    isPlainObject(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }
}

module.exports = ConnectorSupportRecordBatchWriteService;
