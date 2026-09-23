"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Service =
    require("./ConnectorSemanticLogicalRecordPersistenceService");
const Adapter =
    require("./ConnectorSemanticLogicalRecordPersistenceHttpAdapter");
const Transport =
    require("./ConnectorSemanticLogicalRecordPersistenceTransport");
const IntegrityVerifier =
    require("./RecipientCertificateSemanticIntegrityVerifier");

function validPayload() {
    return {
        residentId: "33333333-3333-4333-8333-333333333333",
        semanticType: "recipient_certificate",
        logicalSlot: "primary",
        sourceDocumentKey: "source-document-1",
        sourceUpdatedAt: "2026-09-22T00:00:00.000Z",
        sourceSize: 12345,
        expectedContentHash: null,
        contentHash: "b9000bdc5167b4373a7407a46b60405f733181ee979b8cf73f9af9e066edae9f",
        canonicalizationVersion:
            "risen-recipient-certificate-canonicalization-1",
        semanticContent: {
            "recipient_certificate.certificate_number":
                "CERT-001"
        }
    };
}

function createTransport({
    authenticate,
    persist
} = {}) {
    const service = new Service({
        connectorTrustService: {
            authenticate
        },
        repository: {
            persist
        }
    });

    const adapter = new Adapter({
        service
    });

    return new Transport({
        httpAdapter: adapter,
        credentialTransport: {
            extract(value) {
                return value === "RISEN-Connector secret"
                    ? "secret"
                    : null;
            }
        }
    });
}

function request(body = validPayload()) {
    return {
        method: "POST",
        headers: {
            "x-risen-connector-id": "presented-connector",
            authorization: "RISEN-Connector secret"
        },
        contentType: "application/json",
        body
    };
}

test("verified trust context controls facility and connector scope", async () => {
    let received = null;

    const transport = createTransport({
        authenticate: async input => {
            assert.deepEqual(input, {
                connectorId: "presented-connector",
                credential: "secret"
            });

            return {
                status: "verified",
                verifiedContext: {
                    facilityId:
                        "11111111-1111-1111-1111-111111111111",
                    connectorId:
                        "22222222-2222-2222-2222-222222222222"
                }
            };
        },
        persist: async input => {
            received = input;
            return {
                status: "created",
                recordId:
                    "44444444-4444-4444-8444-444444444444"
            };
        }
    });

    const result = await transport.handle(request());

    assert.equal(result.httpStatus, 200);
    assert.equal(result.body.status, "created");
    assert.equal(
        received.verifiedFacilityId,
        "11111111-1111-1111-1111-111111111111"
    );
    assert.equal(
        received.verifiedConnectorId,
        "22222222-2222-2222-2222-222222222222"
    );
    assert.equal(
        Object.hasOwn(received, "facilityId"),
        false
    );
    assert.equal(
        received.semanticType,
        "recipient_certificate"
    );
    assert.equal(received.logicalSlot, "primary");
});

test("transport rejects extra client-controlled scope fields", async () => {
    let called = false;

    const transport = createTransport({
        authenticate: async () => {
            called = true;
            return {
                status: "verified",
                verifiedContext: {
                    facilityId: "facility",
                    connectorId: "connector"
                }
            };
        },
        persist: async () => {
            called = true;
            return {
                status: "created",
                recordId: "record"
            };
        }
    });

    const body = validPayload();
    body.facilityId = "forged-facility";

    const result =
        await transport.handle(request(body));

    assert.equal(result.httpStatus, 422);
    assert.equal(
        result.body.errorCode,
        "semantic_logical_record_persistence_invalid"
    );
    assert.equal(called, false);
});

test("service rejects unsupported semantic identity", async () => {
    let repositoryCalled = false;

    const transport = createTransport({
        authenticate: async () => ({
            status: "verified",
            verifiedContext: {
                facilityId: "facility-1",
                connectorId: "connector-1"
            }
        }),
        persist: async () => {
            repositoryCalled = true;
            return {
                status: "created",
                recordId: "record"
            };
        }
    });

    const body = validPayload();
    body.semanticType = "support_record";

    const result =
        await transport.handle(request(body));

    assert.equal(result.httpStatus, 422);
    assert.equal(repositoryCalled, false);
});

test("invalid resident UUID is rejected before repository", async () => {
    let repositoryCalled = false;

    const transport = createTransport({
        authenticate: async () => ({
            status: "verified",
            verifiedContext: {
                facilityId: "facility-1",
                connectorId: "connector-1"
            }
        }),
        persist: async () => {
            repositoryCalled = true;
            return {
                status: "created",
                recordId: "record"
            };
        }
    });

    const body = validPayload();
    body.residentId = "not-a-uuid";

    const result =
        await transport.handle(request(body));

    assert.equal(result.httpStatus, 422);
    assert.equal(
        result.body.errorCode,
        "semantic_logical_record_persistence_invalid"
    );
    assert.equal(repositoryCalled, false);
});

test("tampered semantic content is rejected before repository", async () => {
    let repositoryCalled = false;

    const transport = createTransport({
        authenticate: async () => ({
            status: "verified",
            verifiedContext: {
                facilityId:
                    "11111111-1111-1111-1111-111111111111",
                connectorId:
                    "22222222-2222-2222-2222-222222222222"
            }
        }),
        persist: async () => {
            repositoryCalled = true;
            return {
                status: "created",
                recordId:
                    "44444444-4444-4444-8444-444444444444"
            };
        }
    });

    const body = validPayload();
    body.semanticContent = {
        "recipient_certificate.certificate_number":
            "TAMPERED"
    };

    const result =
        await transport.handle(request(body));

    assert.equal(result.httpStatus, 422);
    assert.equal(repositoryCalled, false);
});

test("stale and conflict remain HTTP 409", async () => {
    for (const status of ["stale", "conflict"]) {
        const transport = createTransport({
            authenticate: async () => ({
                status: "verified",
                verifiedContext: {
                    facilityId: "facility-1",
                    connectorId: "connector-1"
                }
            }),
            persist: async () => ({
                status,
                recordId: null
            })
        });

        const result =
            await transport.handle(request());

        assert.equal(result.httpStatus, 409);
        assert.equal(result.body.status, status);
    }
});

test("denied connector never reaches repository", async () => {
    let repositoryCalled = false;

    const transport = createTransport({
        authenticate: async () => ({
            status: "denied"
        }),
        persist: async () => {
            repositoryCalled = true;
            return {
                status: "created",
                recordId: "record"
            };
        }
    });

    const result =
        await transport.handle(request());

    assert.equal(result.httpStatus, 401);
    assert.equal(repositoryCalled, false);
});

test("canonicalization version is enforced again at write boundary", async () => {
    let repositoryCalled = false;

    const transport = createTransport({
        authenticate: async () => ({
            status: "verified",
            verifiedContext: {
                facilityId: "facility-1",
                connectorId: "connector-1"
            }
        }),
        persist: async () => {
            repositoryCalled = true;
            return {
                status: "created",
                recordId: "record"
            };
        }
    });

    const body = validPayload();
    body.canonicalizationVersion = "unknown-version";

    const result =
        await transport.handle(request(body));

    assert.equal(result.httpStatus, 422);
    assert.equal(repositoryCalled, false);
});

test("missing exact snapshot is rejected before persistence", async () => {
    let repositoryCalled = false;

    const transport = createTransport({
        authenticate: async () => ({
            status: "verified",
            verifiedContext: {
                facilityId: "facility-1",
                connectorId: "connector-1"
            }
        }),
        persist: async () => {
            repositoryCalled = true;
            return {
                status: "created",
                recordId: "record"
            };
        }
    });

    const body = validPayload();
    body.sourceUpdatedAt = "";

    const result =
        await transport.handle(request(body));

    assert.equal(result.httpStatus, 422);
    assert.equal(repositoryCalled, false);
});

test("unexpected body key is rejected fail closed", async () => {
    let called = false;

    const transport = createTransport({
        authenticate: async () => {
            called = true;
            return {
                status: "verified",
                verifiedContext: {
                    facilityId: "facility",
                    connectorId: "connector"
                }
            };
        },
        persist: async () => {
            called = true;
            return {
                status: "created",
                recordId: "record"
            };
        }
    });

    const body = validPayload();
    body.unexpected = true;

    const result =
        await transport.handle(request(body));

    assert.equal(result.httpStatus, 422);
    assert.equal(called, false);
});
