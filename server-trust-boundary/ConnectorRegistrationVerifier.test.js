const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorRegistrationVerifier = require("./ConnectorRegistrationVerifier");

class MockRegistrationRepository {
    constructor(result) {
        this.result = result;
        this.lastCall = null;
    }

    async getRegistration({ connectorId }) {
        this.lastCall = { connectorId };
        return this.result;
    }
}

test("valid active registration => registered", async () => {
    const repo = new MockRegistrationRepository({
        connectorId: "connector-123",
        facilityId: "facility-abc",
        active: true
    });
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({
        connectorId: "connector-123",
        facilityId: "malicious-facility"
    });

    assert.deepStrictEqual(result, {
        status: "registered",
        registrationContext: {
            connectorId: "connector-123",
            facilityId: "facility-abc"
        }
    });
    assert.deepStrictEqual(repo.lastCall, { connectorId: "connector-123" });
    assert.strictEqual(result.verifiedContext, undefined);
});

test("registrationContext.facilityId comes from repository, not client input", async () => {
    const repo = new MockRegistrationRepository({
        connectorId: "connector-123",
        facilityId: "facility-from-server",
        active: true
    });
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({
        connectorId: "connector-123",
        facilityId: "malicious-facility"
    });

    assert.strictEqual(result.registrationContext.facilityId, "facility-from-server");
    assert.notStrictEqual(result.registrationContext.facilityId, "malicious-facility");
    assert.strictEqual(result.verifiedContext, undefined);
});

test("missing connectorId => denied", async () => {
    const repo = new MockRegistrationRepository({
        connectorId: "connector-123",
        facilityId: "facility-abc",
        active: true
    });
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({
        connectorId: "",
        facilityId: "facility-abc"
    });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.verifiedContext, null);
    assert.strictEqual(result.errorCode, "connector_missing_id");
    assert.strictEqual(repo.lastCall, null);
});

test("registration not found => denied", async () => {
    const repo = new MockRegistrationRepository(null);
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({ connectorId: "connector-404" });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.verifiedContext, null);
    assert.strictEqual(result.errorCode, "connector_not_registered");
});

test("inactive registration => denied", async () => {
    const repo = new MockRegistrationRepository({
        connectorId: "connector-123",
        facilityId: "facility-abc",
        active: false
    });
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({ connectorId: "connector-123" });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.verifiedContext, null);
    assert.strictEqual(result.errorCode, "connector_inactive");
});

test("registration facilityId missing => denied", async () => {
    const repo = new MockRegistrationRepository({
        connectorId: "connector-123",
        active: true
    });
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({ connectorId: "connector-123" });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.verifiedContext, null);
    assert.strictEqual(result.errorCode, "connector_registration_missing_facility");
});

test("repository throw => error", async () => {
    const repo = {
        async getRegistration() {
            throw new Error("DB unavailable");
        }
    };
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({ connectorId: "connector-123" });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.verifiedContext, null);
    assert.strictEqual(result.errorCode, "connector_repository_unavailable");
});

test("repository invalid result => error", async () => {
    const repo = new MockRegistrationRepository("not-an-object");
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({ connectorId: "connector-123" });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.verifiedContext, null);
    assert.strictEqual(result.errorCode, "connector_repository_invalid_result");
});

test("repository invalid result object missing required fields => error", async () => {
    const repo = new MockRegistrationRepository({ active: true });
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({ connectorId: "connector-123" });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(result.errorCode, "connector_registration_missing_facility");
});

test("repository error message and stack are not exposed", async () => {
    const repo = {
        async getRegistration() {
            throw new Error("secret token failed");
        }
    };
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({ connectorId: "connector-123" });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "connector_repository_unavailable");
    assert.strictEqual(result.message, undefined);
    assert.strictEqual(result.stack, undefined);
    assert.strictEqual(result.err, undefined);
});

test("connectorId alone is not treated as credential verification", async () => {
    const repo = new MockRegistrationRepository({
        connectorId: "connector-123",
        facilityId: "facility-abc",
        active: true
    });
    const verifier = new ConnectorRegistrationVerifier({ connectorRegistrationRepository: repo });

    const result = await verifier.verify({ connectorId: "connector-123" });

    assert.strictEqual(result.status, "registered");
    assert.deepStrictEqual(result.registrationContext, {
        connectorId: "connector-123",
        facilityId: "facility-abc"
    });
    assert.strictEqual(result.verifiedContext, undefined);
    assert.notStrictEqual(result.status, "verified");
    assert.notStrictEqual(result.status, "authenticated");
});

// Guard test: missing repository dependency must fail closed
assert.throws(() => {
    new ConnectorRegistrationVerifier();
}, /requires connectorRegistrationRepository/);
