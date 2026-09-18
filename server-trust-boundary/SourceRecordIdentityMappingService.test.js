"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const PersistenceService =
    require("./SourceRecordIdentityMappingPersistenceService");
const QueryService =
    require("./SourceRecordIdentityMappingQueryService");

function trust(status = "verified") {
    return {
        async authenticate() {
            if (status === "verified") {
                return {
                    status: "verified",
                    verifiedContext: {
                        facilityId: "facility-verified",
                        connectorId: "connector-verified"
                    }
                };
            }

            return {
                status
            };
        }
    };
}

const mapping = {
    sourceDocumentKey: "document-1",
    sourceFieldKey: "sheet:0:column:0",
    sheetName: "csv",
    headerLabel: "ID",
    confirmedAt:
        "2026-09-17T02:00:00.000Z",
    sourceUpdatedAt:
        "2026-09-17T00:00:00.000Z",
    sourceSize: 100
};

test("persistence uses only verified trust scope", async () => {
    const calls = [];

    const service =
        new PersistenceService({
            connectorTrustService: trust(),
            sourceRecordIdentityMappingRepository: {
                async save(input) {
                    calls.push(input);
                    return {
                        status: "created"
                    };
                }
            }
        });

    assert.deepStrictEqual(
        await service.save({
            connectorId: "untrusted-request-id",
            credential: "credential",
            sourceRecordIdentityMapping:
                mapping
        }),
        {
            status: "created"
        }
    );

    assert.equal(calls.length, 1);
    assert.equal(
        calls[0].verifiedFacilityId,
        "facility-verified"
    );
    assert.equal(
        calls[0].verifiedConnectorId,
        "connector-verified"
    );
});

test("persistence denied trust never reaches repository", async () => {
    let calls = 0;

    const service =
        new PersistenceService({
            connectorTrustService:
                trust("denied"),
            sourceRecordIdentityMappingRepository: {
                async save() {
                    calls += 1;
                }
            }
        });

    const result =
        await service.save({
            connectorId: "connector-A",
            credential: "credential",
            sourceRecordIdentityMapping:
                mapping
        });

    assert.equal(
        result.status,
        "denied"
    );
    assert.equal(calls, 0);
});

test("invalid persistence mapping never reaches repository", async () => {
    let calls = 0;

    const service =
        new PersistenceService({
            connectorTrustService: trust(),
            sourceRecordIdentityMappingRepository: {
                async save() {
                    calls += 1;
                }
            }
        });

    const result =
        await service.save({
            connectorId: "connector-A",
            credential: "credential",
            sourceRecordIdentityMapping: {
                ...mapping,
                sourceFieldKey: " "
            }
        });

    assert.equal(
        result.status,
        "invalid"
    );
    assert.equal(calls, 0);
});

test("query uses only verified trust scope and exact snapshot", async () => {
    const calls = [];

    const service =
        new QueryService({
            connectorTrustService: trust(),
            sourceRecordIdentityMappingRepository: {
                async get(input) {
                    calls.push(input);

                    return {
                        status: "not_found",
                        mapping: null
                    };
                }
            }
        });

    const result =
        await service.get({
            connectorId: "untrusted-request-id",
            credential: "credential",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-17T00:00:00.000Z",
            sourceSize: 100
        });

    assert.deepStrictEqual(
        result,
        {
            status: "not_found",
            mapping: null
        }
    );

    assert.deepStrictEqual(
        calls[0],
        {
            verifiedFacilityId:
                "facility-verified",
            verifiedConnectorId:
                "connector-verified",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-17T00:00:00.000Z",
            sourceSize: 100
        }
    );
});

test("query denied trust never reaches repository", async () => {
    let calls = 0;

    const service =
        new QueryService({
            connectorTrustService:
                trust("denied"),
            sourceRecordIdentityMappingRepository: {
                async get() {
                    calls += 1;
                }
            }
        });

    const result =
        await service.get({
            connectorId: "connector-A",
            credential: "credential",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-17T00:00:00.000Z",
            sourceSize: 100
        });

    assert.equal(
        result.status,
        "denied"
    );
    assert.equal(calls, 0);
});
