"use strict";

class ConnectorSupportRecordWriteService {
    constructor({
        connectorTrustService,
        persistenceService
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "ConnectorSupportRecordWriteService requires connectorTrustService"
            );
        }

        if (
            !persistenceService ||
            typeof persistenceService.persist !==
                "function"
        ) {
            throw new Error(
                "ConnectorSupportRecordWriteService requires persistenceService"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.persistenceService =
            persistenceService;
    }

    async write({
        connectorId,
        credential,
        operation
    } = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService
                    .authenticate({
                        connectorId,
                        credential
                    });
        } catch {
            return {
                status: "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            !this.isPlainObject(trustResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            trustResult.status === "denied"
        ) {
            return {
                status: "denied",
                errorCode:
                    "connector_trust_denied"
            };
        }

        if (
            trustResult.status !== "verified" ||
            !this.isPlainObject(
                trustResult.verifiedContext
            ) ||
            !this.isNonEmptyString(
                trustResult
                    .verifiedContext
                    .facilityId
            ) ||
            !this.isNonEmptyString(
                trustResult
                    .verifiedContext
                    .connectorId
            )
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (!this.isPlainObject(operation)) {
            return {
                status: "invalid",
                errorCode:
                    "support_record_write_invalid"
            };
        }

        let result;

        try {
            result =
                await this.persistenceService
                    .persist({
                        verifiedContext: {
                            facilityId:
                                trustResult
                                    .verifiedContext
                                    .facilityId
                                    .trim(),
                            connectorId:
                                trustResult
                                    .verifiedContext
                                    .connectorId
                                    .trim()
                        },
                        operation
                    });
        } catch {
            return {
                status: "error",
                errorCode:
                    "support_record_write_unavailable"
            };
        }

        if (
            !this.isPlainObject(result) ||
            !this.isNonEmptyString(
                result.status
            )
        ) {
            return {
                status: "error",
                errorCode:
                    "support_record_write_invalid_result"
            };
        }

        if (
            result.status === "created" ||
            result.status === "updated" ||
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

        if (result.status === "rejected") {
            return {
                status: "invalid",
                errorCode:
                    "support_record_write_invalid"
            };
        }

        return {
            status: "error",
            errorCode:
                "support_record_write_invalid_result"
        };
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
    ConnectorSupportRecordWriteService;
