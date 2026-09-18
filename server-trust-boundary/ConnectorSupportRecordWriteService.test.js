"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Service =
    require("./ConnectorSupportRecordWriteService");

function createService({
    trustResult = {
        status: "verified",
        verifiedContext: {
            facilityId: "facility-trusted",
            connectorId: "connector-trusted"
        }
    },
    persistenceResult = {
        status: "created"
    }
} = {}) {
    const calls = [];

    return {
        calls,
        service: new Service({
            connectorTrustService: {
                async authenticate(input) {
                    calls.push({
                        type: "authenticate",
                        input
                    });
                    return trustResult;
                }
            },
            persistenceService: {
                async persist(input) {
                    calls.push({
                        type: "persist",
                        input
                    });
                    return persistenceResult;
                }
            }
        })
    };
}

test(
    "verified context is the only facility and connector authority",
    async () => {
        const { service, calls } =
            createService();

        const operation = {
            action: "create"
        };

        const result =
            await service.write({
                connectorId:
                    "connector-untrusted-input",
                credential:
                    "credential-input",
                operation
            });

        assert.deepEqual(result, {
            status: "created"
        });

        const persist =
            calls.find(
                call =>
                    call.type === "persist"
            );

        assert.deepEqual(
            persist.input.verifiedContext,
            {
                facilityId:
                    "facility-trusted",
                connectorId:
                    "connector-trusted"
            }
        );

        assert.equal(
            persist.input.operation,
            operation
        );
    }
);

test(
    "denied connector never reaches persistence",
    async () => {
        const { service, calls } =
            createService({
                trustResult: {
                    status: "denied"
                }
            });

        const result =
            await service.write({
                connectorId:
                    "connector-input",
                credential:
                    "credential-input",
                operation: {
                    action: "create"
                }
            });

        assert.equal(
            result.status,
            "denied"
        );

        assert.equal(
            calls.some(
                call =>
                    call.type === "persist"
            ),
            false
        );
    }
);

test(
    "invalid verified context never reaches persistence",
    async () => {
        const { service, calls } =
            createService({
                trustResult: {
                    status: "verified",
                    verifiedContext: {
                        facilityId: "",
                        connectorId:
                            "connector-trusted"
                    }
                }
            });

        const result =
            await service.write({
                connectorId:
                    "connector-input",
                credential:
                    "credential-input",
                operation: {
                    action: "create"
                }
            });

        assert.equal(
            result.status,
            "error"
        );

        assert.equal(
            calls.some(
                call =>
                    call.type === "persist"
            ),
            false
        );
    }
);

test(
    "persistence conflict remains conflict",
    async () => {
        const { service } =
            createService({
                persistenceResult: {
                    status: "conflict"
                }
            });

        const result =
            await service.write({
                connectorId:
                    "connector-input",
                credential:
                    "credential-input",
                operation: {
                    action: "update"
                }
            });

        assert.deepEqual(result, {
            status: "conflict"
        });
    }
);

test(
    "resident mismatch remains resident mismatch",
    async () => {
        const { service } =
            createService({
                persistenceResult: {
                    status:
                        "resident_mismatch"
                }
            });

        const result =
            await service.write({
                connectorId:
                    "connector-input",
                credential:
                    "credential-input",
                operation: {
                    action: "create"
                }
            });

        assert.deepEqual(result, {
            status:
                "resident_mismatch"
        });
    }
);

test(
    "rejected persistence input becomes safe invalid result",
    async () => {
        const { service } =
            createService({
                persistenceResult: {
                    status: "rejected"
                }
            });

        const result =
            await service.write({
                connectorId:
                    "connector-input",
                credential:
                    "credential-input",
                operation: {
                    action: "create"
                }
            });

        assert.deepEqual(result, {
            status: "invalid",
            errorCode:
                "support_record_write_invalid"
        });
    }
);
