const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorIngestionService = require("./ConnectorIngestionService");

const trustContext = {
    connectorId: "connector-server",
    facilityId: "facility-server"
};

const rawPayload = {
    facilityId: "facility-client",
    residentId: "resident-client",
    verifiedContext: {
        connectorId: "client-connector",
        facilityId: "facility-client"
    },
    sourceResident: {
        identifier: { value: "raw-identifier" },
        name: { value: "Raw Name" },
        residentId: "resident-client",
        unknownField: "must-not-reappear"
    },
    credential: "client-secret",
    unknownField: "must-not-reappear"
};

const validatedPayload = {
    sourceResident: {
        identifier: { value: "validated-identifier" },
        name: { value: "Validated Name" }
    },
    source: {
        fileName: "document.docx",
        updatedAt: "2026-09-05T10:00:00Z"
    },
    documentType: "support_record",
    sourceType: "word"
};

class MockTrustService {
    constructor(result = { status: "verified", verifiedContext: trustContext }) {
        this.result = result;
        this.calls = [];
    }

    async authenticate(input) {
        this.calls.push(input);
        return this.result;
    }
}

class MockPayloadValidator {
    constructor(result = { status: "valid", validatedPayload }) {
        this.result = result;
        this.calls = [];
    }

    validate(input) {
        this.calls.push(input);
        return this.result;
    }
}

class MockServerTrustBoundaryService {
    constructor(result = { status: "matched", residentId: "resident-123" }) {
        this.result = result;
        this.calls = [];
    }

    async matchResident(input) {
        this.calls.push(input);
        return this.result;
    }
}

function createService({
    trustResult,
    payloadResult,
    matchResult = { status: "matched", residentId: "resident-123" }
} = {}) {
    const trust = new MockTrustService(trustResult);
    const validator = new MockPayloadValidator(payloadResult);
    const boundary = new MockServerTrustBoundaryService(matchResult);
    const service = new ConnectorIngestionService({
        connectorTrustService: trust,
        connectorPayloadValidator: validator,
        serverTrustBoundaryService: boundary
    });

    return { service, trust, validator, boundary };
}

test("constructor requires connectorTrustService", () => {
    assert.throws(() => new ConnectorIngestionService({
        connectorPayloadValidator: {},
        serverTrustBoundaryService: {}
    }), /requires connectorTrustService/);
});

test("constructor requires connectorPayloadValidator", () => {
    assert.throws(() => new ConnectorIngestionService({
        connectorTrustService: {},
        serverTrustBoundaryService: {}
    }), /requires connectorPayloadValidator/);
});

test("constructor requires serverTrustBoundaryService", () => {
    assert.throws(() => new ConnectorIngestionService({
        connectorTrustService: {},
        connectorPayloadValidator: {}
    }), /requires serverTrustBoundaryService/);
});

test("verified and valid calls matchResident exactly once in order", async () => {
    const events = [];
    const trust = {
        async authenticate(input) {
            events.push(["trust", input]);
            return { status: "verified", verifiedContext: trustContext };
        }
    };
    const validator = {
        validate(input) {
            events.push(["validator", input]);
            return { status: "valid", validatedPayload };
        }
    };
    const boundary = {
        async matchResident(input) {
            events.push(["matching", input]);
            return { status: "matched", residentId: "resident-123" };
        }
    };
    const service = new ConnectorIngestionService({
        connectorTrustService: trust,
        connectorPayloadValidator: validator,
        serverTrustBoundaryService: boundary
    });

    const result = await service.ingest({
        connectorId: "connector-input",
        credential: "secret",
        payload: rawPayload
    });

    assert.strictEqual(result.status, "matched");
    assert.deepStrictEqual(events.map(([name]) => name), [
        "trust",
        "validator",
        "matching"
    ]);
    assert.strictEqual(events.filter(([name]) => name === "matching").length, 1);
});

test("verifiedContext passed to matching comes only from trust result", async () => {
    const { service, boundary } = createService();

    await service.ingest({
        connectorId: "connector-input",
        credential: "secret",
        payload: rawPayload
    });

    assert.deepStrictEqual(boundary.calls[0].verifiedContext, trustContext);
    assert.notStrictEqual(
        boundary.calls[0].verifiedContext.facilityId,
        rawPayload.facilityId
    );
});

test("sourceResident passed to matching comes only from validatedPayload", async () => {
    const { service, boundary } = createService();

    await service.ingest({
        connectorId: "connector-input",
        credential: "secret",
        payload: rawPayload
    });

    assert.deepStrictEqual(boundary.calls[0].sourceResident, validatedPayload.sourceResident);
    assert.notStrictEqual(
        boundary.calls[0].sourceResident.identifier.value,
        rawPayload.sourceResident.identifier.value
    );
});

test("client facilityId cannot override verified facilityId", async () => {
    const { service, boundary } = createService();

    await service.ingest({
        connectorId: "connector-input",
        credential: "secret",
        payload: rawPayload
    });

    assert.strictEqual(
        boundary.calls[0].verifiedContext.facilityId,
        "facility-server"
    );
});

test("client residentId never reaches downstream", async () => {
    const { service, boundary } = createService();

    await service.ingest({
        connectorId: "connector-input",
        credential: "secret",
        payload: rawPayload
    });

    assert.strictEqual(boundary.calls[0].sourceResident.residentId, undefined);
    assert.strictEqual(boundary.calls[0].residentId, undefined);
});

test("client verifiedContext never reaches downstream", async () => {
    const { service, boundary } = createService();

    await service.ingest({
        connectorId: "connector-input",
        credential: "secret",
        payload: rawPayload
    });

    assert.notStrictEqual(
        boundary.calls[0].verifiedContext,
        rawPayload.verifiedContext
    );
    assert.strictEqual(
        boundary.calls[0].verifiedContext.connectorId,
        trustContext.connectorId
    );
});

test("credential never reaches validator or matching", async () => {
    const { service, validator, boundary } = createService();

    await service.ingest({
        connectorId: "connector-input",
        credential: "secret",
        payload: rawPayload
    });

    assert.deepStrictEqual(validator.calls, [rawPayload]);
    assert.strictEqual(boundary.calls[0].credential, undefined);
    assert.strictEqual(boundary.calls[0].sourceResident.credential, undefined);
});

test("trust denied short-circuits validator and matching", async () => {
    const { service, validator, boundary } = createService({
        trustResult: { status: "denied", errorCode: "denied" }
    });

    const result = await service.ingest({ payload: rawPayload });

    assert.strictEqual(result.status, "denied");
    assert.strictEqual(validator.calls.length, 0);
    assert.strictEqual(boundary.calls.length, 0);
});

test("trust error short-circuits validator and matching", async () => {
    const { service, validator, boundary } = createService({
        trustResult: { status: "error", errorCode: "unavailable" }
    });

    const result = await service.ingest({ payload: rawPayload });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(validator.calls.length, 0);
    assert.strictEqual(boundary.calls.length, 0);
});

test("malformed trust result short-circuits validator and matching", async () => {
    const { service, validator, boundary } = createService({ trustResult: null });

    const result = await service.ingest({ payload: rawPayload });

    assert.deepStrictEqual(result, {
        status: "error",
        errorCode: "connector_trust_invalid_result"
    });
    assert.strictEqual(validator.calls.length, 0);
    assert.strictEqual(boundary.calls.length, 0);
});

test("invalid payload short-circuits matching", async () => {
    const { service, validator, boundary } = createService({
        payloadResult: { status: "invalid", errorCode: "source_missing" }
    });

    const result = await service.ingest({ payload: rawPayload });

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_missing");
    assert.strictEqual(validator.calls.length, 1);
    assert.strictEqual(boundary.calls.length, 0);
});

test("malformed validator result short-circuits matching", async () => {
    const { service, boundary } = createService({
        payloadResult: { status: "valid" }
    });

    const result = await service.ingest({ payload: rawPayload });

    assert.deepStrictEqual(result, {
        status: "error",
        errorCode: "connector_payload_invalid_result"
    });
    assert.strictEqual(boundary.calls.length, 0);
});

test("needs_review remains needs_review", async () => {
    const matchResult = {
        status: "needs_review",
        residentId: null,
        matchMethod: "duplicate_facility_user_code",
        candidates: [{ id: "resident-1" }]
    };
    const { service } = createService({ matchResult });

    const result = await service.ingest({ payload: rawPayload });

    assert.deepStrictEqual(result, matchResult);
});

test("unmatched remains unmatched", async () => {
    const matchResult = {
        status: "unmatched",
        residentId: null,
        matchMethod: null,
        candidates: []
    };
    const { service } = createService({ matchResult });

    const result = await service.ingest({ payload: rawPayload });

    assert.deepStrictEqual(result, matchResult);
});

test("matched remains matched without residentId supplementation", async () => {
    const matchResult = {
        status: "matched",
        residentId: "resident-123",
        matchMethod: "facility_user_code"
    };
    const { service } = createService({ matchResult });

    const result = await service.ingest({ payload: rawPayload });

    assert.deepStrictEqual(result, matchResult);
});

test("trust dependency errors do not expose message or stack", async () => {
    const trust = {
        async authenticate() {
            throw new Error("credential backend secret");
        }
    };
    const { service } = createService();
    service.connectorTrustService = trust;

    const result = await service.ingest({ payload: rawPayload });

    assert.deepStrictEqual(result, {
        status: "error",
        errorCode: "connector_trust_unavailable"
    });
    assert.strictEqual(result.message, undefined);
    assert.strictEqual(result.stack, undefined);
});

test("trust denied and error results omit verifiedContext property", async () => {
    const cases = [
        { status: "denied", errorCode: "denied" },
        { status: "error", errorCode: "unavailable" }
    ];

    for (const trustResult of cases) {
        const { service } = createService({ trustResult });
        const result = await service.ingest({ payload: rawPayload });

        assert.strictEqual(
            Object.prototype.hasOwnProperty.call(result, "verifiedContext"),
            false,
            trustResult.status
        );
    }
});

test("payload dependency errors do not expose message or stack", async () => {
    const validator = {
        validate() {
            throw new Error("payload secret");
        }
    };
    const { service } = createService();
    service.connectorPayloadValidator = validator;

    const result = await service.ingest({ payload: rawPayload });

    assert.deepStrictEqual(result, {
        status: "error",
        errorCode: "connector_payload_validation_unavailable"
    });
    assert.strictEqual(result.message, undefined);
    assert.strictEqual(result.stack, undefined);
});

test("matching dependency errors do not expose message or stack", async () => {
    const boundary = {
        async matchResident() {
            throw new Error("repository credentials");
        }
    };
    const { service } = createService();
    service.serverTrustBoundaryService = boundary;

    const result = await service.ingest({ payload: rawPayload });

    assert.deepStrictEqual(result, {
        status: "error",
        errorCode: "resident_matching_unavailable"
    });
    assert.strictEqual(result.message, undefined);
    assert.strictEqual(result.stack, undefined);
});

test("unknown raw payload fields never re-enter matching", async () => {
    const { service, boundary } = createService();

    await service.ingest({ payload: rawPayload });

    assert.deepStrictEqual(Object.keys(boundary.calls[0]).sort(), [
        "sourceResident",
        "verifiedContext"
    ]);
    assert.strictEqual(
        boundary.calls[0].sourceResident.unknownField,
        undefined
    );
});
