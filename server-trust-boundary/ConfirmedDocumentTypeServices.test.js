"use strict";

const assert = require("assert");
const test = require("node:test");
const ConfirmedDocumentTypePersistenceService =
    require("./ConfirmedDocumentTypePersistenceService");
const ConfirmedDocumentTypeQueryService =
    require("./ConfirmedDocumentTypeQueryService");

const verifiedContext = {
    facilityId: "11111111-1111-4111-8111-111111111111",
    connectorId: "22222222-2222-4222-8222-222222222222"
};

const snapshot = {
    sourceDocumentKey: "source-document",
    sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
    sourceSize: 1234
};

test("persistence passes only authenticated scope to repository", async () => {
    let repositoryInput = null;

    const service = new ConfirmedDocumentTypePersistenceService({
        connectorTrustService: {
            async authenticate() {
                return { status: "verified", verifiedContext };
            }
        },
        confirmedDocumentTypeRepository: {
            async save(input) {
                repositoryInput = input;
                return { status: "created" };
            }
        }
    });

    const result = await service.save({
        connectorId: "untrusted-connector-input",
        credential: "credential",
        facilityId: "untrusted-facility-input",
        confirmation: {
            ...snapshot,
            documentType: "recipient_certificate",
            confirmedAt: "2026-09-20T02:03:04.000Z"
        }
    });

    assert.deepStrictEqual(result, { status: "created" });
    assert.strictEqual(repositoryInput.verifiedFacilityId, verifiedContext.facilityId);
    assert.strictEqual(repositoryInput.verifiedConnectorId, verifiedContext.connectorId);
    assert.strictEqual(repositoryInput.facilityId, undefined);
    assert.strictEqual(repositoryInput.connectorId, undefined);
});

test("query passes only authenticated scope to repository", async () => {
    let repositoryInput = null;

    const service = new ConfirmedDocumentTypeQueryService({
        connectorTrustService: {
            async authenticate() {
                return { status: "verified", verifiedContext };
            }
        },
        confirmedDocumentTypeRepository: {
            async get(input) {
                repositoryInput = input;
                return {
                    status: "found",
                    confirmation: {
                        documentType: "recipient_certificate",
                        confirmedAt: "2026-09-20T02:03:04.000Z"
                    }
                };
            }
        }
    });

    const result = await service.get({
        connectorId: "untrusted-connector-input",
        credential: "credential",
        facilityId: "untrusted-facility-input",
        ...snapshot
    });

    assert.strictEqual(result.status, "found");
    assert.strictEqual(repositoryInput.verifiedFacilityId, verifiedContext.facilityId);
    assert.strictEqual(repositoryInput.verifiedConnectorId, verifiedContext.connectorId);
    assert.strictEqual(repositoryInput.facilityId, undefined);
    assert.strictEqual(repositoryInput.connectorId, undefined);
});

test("persistence does not call repository when trust is denied", async () => {
    let repositoryCalled = false;

    const service = new ConfirmedDocumentTypePersistenceService({
        connectorTrustService: {
            async authenticate() {
                return { status: "denied" };
            }
        },
        confirmedDocumentTypeRepository: {
            async save() {
                repositoryCalled = true;
                return { status: "created" };
            }
        }
    });

    const result = await service.save({
        connectorId: "connector",
        credential: "credential",
        confirmation: {
            ...snapshot,
            documentType: "recipient_certificate",
            confirmedAt: "2026-09-20T02:03:04.000Z"
        }
    });

    assert.deepStrictEqual(result, {
        status: "denied",
        errorCode: "connector_trust_denied"
    });
    assert.strictEqual(repositoryCalled, false);
});

test("query does not call repository when trust is denied", async () => {
    let repositoryCalled = false;

    const service = new ConfirmedDocumentTypeQueryService({
        connectorTrustService: {
            async authenticate() {
                return { status: "denied" };
            }
        },
        confirmedDocumentTypeRepository: {
            async get() {
                repositoryCalled = true;
                return { status: "not_found", confirmation: null };
            }
        }
    });

    const result = await service.get({
        connectorId: "connector",
        credential: "credential",
        ...snapshot
    });

    assert.deepStrictEqual(result, {
        status: "denied",
        errorCode: "connector_trust_denied"
    });
    assert.strictEqual(repositoryCalled, false);
});

test("invalid verified context fails closed before repository access", async () => {
    let repositoryCalled = false;

    const service = new ConfirmedDocumentTypeQueryService({
        connectorTrustService: {
            async authenticate() {
                return {
                    status: "verified",
                    verifiedContext: {
                        facilityId: "",
                        connectorId: verifiedContext.connectorId
                    }
                };
            }
        },
        confirmedDocumentTypeRepository: {
            async get() {
                repositoryCalled = true;
                return { status: "not_found", confirmation: null };
            }
        }
    });

    const result = await service.get({
        connectorId: "connector",
        credential: "credential",
        ...snapshot
    });

    assert.deepStrictEqual(result, {
        status: "error",
        errorCode: "connector_trust_invalid_result"
    });
    assert.strictEqual(repositoryCalled, false);
});
