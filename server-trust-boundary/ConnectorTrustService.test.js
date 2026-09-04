const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorTrustService = require("./ConnectorTrustService");

class MockRegistrationVerifier {
    constructor(result) {
        this.result = result;
        this.lastCall = null;
    }

    async verify({ connectorId, facilityId } = {}) {
        this.lastCall = { connectorId };
        if (facilityId !== undefined) {
            this.lastCall.facilityId = facilityId;
        }
        return this.result;
    }
}

class MockCredentialVerifier {
    constructor(result) {
        this.result = result;
        this.lastCall = null;
    }

    async verify({ connectorId, credential } = {}) {
        this.lastCall = { connectorId, credential };
        return this.result;
    }
}

test("constructor requires registration verifier", () => {
    assert.throws(() => {
        new ConnectorTrustService({
            connectorCredentialVerifier: new MockCredentialVerifier({ status: "authenticated" })
        });
    }, /requires connectorRegistrationVerifier/);
});

test("constructor requires credential verifier", () => {
    assert.throws(() => {
        new ConnectorTrustService({
            connectorRegistrationVerifier: new MockRegistrationVerifier({
                status: "registered",
                registrationContext: {
                    connectorId: "connector-123",
                    facilityId: "facility-abc"
                }
            })
        });
    }, /requires connectorCredentialVerifier/);
});

test("missing connectorId => denied", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.verifiedContext, null);
    assert.strictEqual(result.errorCode, "connector_missing_id");
    assert.strictEqual(registrationVerifier.lastCall, null);
    assert.strictEqual(credentialVerifier.lastCall, null);
});

test("missing credential => denied", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: ""
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.errorCode, "connector_missing_credential");
    assert.strictEqual(registrationVerifier.lastCall, null);
    assert.strictEqual(credentialVerifier.lastCall, null);
});

test("registration denied => denied", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "denied",
        verifiedContext: null,
        errorCode: "connector_not_registered"
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.errorCode, "connector_registration_denied");
    assert.strictEqual(credentialVerifier.lastCall, null);
});

test("registration error => error", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "error",
        verifiedContext: null,
        errorCode: "connector_repository_unavailable"
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_registration_unavailable");
    assert.strictEqual(credentialVerifier.lastCall, null);
});

test("registration invalid result => error", async () => {
    const registrationVerifier = new MockRegistrationVerifier("bad-registration");
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_registration_invalid_result");
    assert.strictEqual(credentialVerifier.lastCall, null);
});

test("credential denied => denied", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "denied",
        errorCode: "connector_credential_invalid"
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "wrong-secret"
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.errorCode, "connector_credential_denied");
    assert.strictEqual(result.verifiedContext, null);
});

test("credential error => error", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "error",
        errorCode: "connector_credential_backend_unavailable"
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_credential_unavailable");
    assert.strictEqual(result.verifiedContext, null);
});

test("credential invalid result => error", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier("unexpected");
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_credential_invalid_result");
});

test("both success + same connectorId => verified", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "verified");
    assert.deepStrictEqual(result.verifiedContext, {
        connectorId: "connector-123",
        facilityId: "facility-abc"
    });
});

test("verifiedContext contains only connectorId + facilityId", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.deepStrictEqual(Object.keys(result.verifiedContext).sort(), ["connectorId", "facilityId"]);
    assert.strictEqual(result.verifiedContext.credential, undefined);
    assert.strictEqual(result.verifiedContext.verifiedContext, undefined);
});

test("facilityId comes only from registrationContext", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-from-registration"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value",
        facilityId: "client-facility"
    });

    assert.strictEqual(result.verifiedContext.facilityId, "facility-from-registration");
    assert.notStrictEqual(result.verifiedContext.facilityId, "client-facility");
});

test("connectorId mismatch => denied", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-456" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.errorCode, "connector_identity_mismatch");
    assert.strictEqual(result.verifiedContext, null);
});

test("missing registrationContext => error", async () => {
    const registrationVerifier = new MockRegistrationVerifier({ status: "registered" });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_registration_invalid_result");
});

test("missing authenticatedConnector => error", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated"
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_credential_invalid_result");
});

test("missing registration connectorId => error", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_registration_invalid_result");
});

test("missing authenticated connectorId => error", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_credential_invalid_result");
});

test("missing registration facilityId => error", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_registration_invalid_result");
});

test("credential never appears in output", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.credential, undefined);
    assert.strictEqual(result.secret, undefined);
    assert.strictEqual(result.password, undefined);
    assert.strictEqual(result.token, undefined);
});

test("dependency error message and stack never appears", async () => {
    const registrationVerifier = {
        async verify() {
            throw new Error("secret registration failure");
        }
    };
    const credentialVerifier = {
        async verify() {
            throw new Error("secret credential failure");
        }
    };
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_registration_unavailable");
    assert.strictEqual(result.message, undefined);
    assert.strictEqual(result.stack, undefined);
    assert.strictEqual(result.err, undefined);
});

test("client-supplied facilityId cannot override verified facilityId", async () => {
    const registrationVerifier = new MockRegistrationVerifier({
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-from-server"
        }
    });
    const credentialVerifier = new MockCredentialVerifier({
        status: "authenticated",
        authenticatedConnector: { connectorId: "connector-123" }
    });
    const service = new ConnectorTrustService({
        connectorRegistrationVerifier: registrationVerifier,
        connectorCredentialVerifier: credentialVerifier
    });

    const result = await service.authenticate({
        connectorId: "connector-123",
        credential: "secret-value",
        facilityId: "facility-from-client"
    });

    assert.strictEqual(result.verifiedContext.facilityId, "facility-from-server");
    assert.notStrictEqual(result.verifiedContext.facilityId, "facility-from-client");
    assert.deepStrictEqual(registrationVerifier.lastCall, { connectorId: "connector-123" });
    assert.strictEqual(registrationVerifier.lastCall.facilityId, undefined);
});
