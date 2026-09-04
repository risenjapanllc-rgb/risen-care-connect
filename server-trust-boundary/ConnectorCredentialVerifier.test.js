const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorCredentialVerifier = require("./ConnectorCredentialVerifier");

class MockCredentialVerifierBackend {
    constructor(result) {
        this.result = result;
        this.lastCall = null;
    }

    async verifyCredential({ connectorId, credential }) {
        this.lastCall = { connectorId, credential };
        return this.result;
    }
}

test("missing connectorId => denied", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: true });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.errorCode, "connector_missing_id");
    assert.strictEqual(backend.lastCall, null);
});

test("missing credential => denied", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: true });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: ""
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.errorCode, "connector_missing_credential");
    assert.strictEqual(backend.lastCall, null);
});

test("connectorId only => denied", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: true });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123"
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.errorCode, "connector_missing_credential");
    assert.strictEqual(backend.lastCall, null);
});

test("valid dependency result => authenticated", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: true });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "authenticated");
    assert.deepStrictEqual(result.authenticatedConnector, { connectorId: "connector-123" });
    assert.strictEqual(result.verifiedContext, undefined);
    assert.strictEqual(result.registrationContext, undefined);
    assert.strictEqual(result.facilityId, undefined);
    assert.deepStrictEqual(backend.lastCall, {
        connectorId: "connector-123",
        credential: "secret-value"
    });
});

test("authenticated result contains connectorId only", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: true });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "authenticated");
    assert.deepStrictEqual(result.authenticatedConnector, { connectorId: "connector-123" });
    assert.strictEqual(result.authenticatedConnector.facilityId, undefined);
    assert.strictEqual(result.authenticatedConnector.credential, undefined);
});

test("result never contains credential", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: true });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.credential, undefined);
    assert.strictEqual(result.secret, undefined);
    assert.strictEqual(result.token, undefined);
});

test("backend throw => error", async () => {
    const backend = {
        async verifyCredential() {
            throw new Error("credential backend unavailable");
        }
    };
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_credential_backend_unavailable");
    assert.strictEqual(result.message, undefined);
    assert.strictEqual(result.stack, undefined);
});

test("backend invalid result => error", async () => {
    const backend = new MockCredentialVerifierBackend("unexpected");
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_credential_backend_invalid_result");
});

test("backend false => denied", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: false });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: "wrong-secret"
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.errorCode, "connector_credential_invalid");
});

test("facilityId is not produced here", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: true });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.facilityId, undefined);
    assert.strictEqual(result.authenticatedConnector.facilityId, undefined);
});

test("verifiedContext is not produced here", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: true });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.verifiedContext, undefined);
});

test("registrationContext is not produced here", async () => {
    const backend = new MockCredentialVerifierBackend({ authenticated: true });
    const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

    const result = await verifier.verify({
        connectorId: "connector-123",
        credential: "secret-value"
    });

    assert.strictEqual(result.registrationContext, undefined);
});

assert.throws(() => {
    new ConnectorCredentialVerifier();
}, /requires credentialVerifierBackend/);

// Contract violation tests: only exact { authenticated: true/false } is accepted
for (const invalidResult of [
    true,
    false,
    null,
    undefined,
    "true",
    1,
    [],
    {},
    { valid: true },
    { valid: false },
    { authenticated: "true" },
    { authenticated: "false" },
    { authenticated: 1 },
    { authenticated: 0 }
]) {
    test(`backend contract violation => error: ${String(invalidResult)}`, async () => {
        const backend = new MockCredentialVerifierBackend(invalidResult);
        const verifier = new ConnectorCredentialVerifier({ credentialVerifierBackend: backend });

        const result = await verifier.verify({
            connectorId: "connector-123",
            credential: "secret-value"
        });

        assert.strictEqual(result.status, "error");
        assert.strictEqual(result.errorCode, "connector_credential_backend_invalid_result");
    });
}
