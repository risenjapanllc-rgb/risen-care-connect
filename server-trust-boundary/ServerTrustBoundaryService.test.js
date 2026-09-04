const test = require("node:test");
const assert = require("node:assert/strict");

const ServerTrustBoundaryService =
    require("./ServerTrustBoundaryService");
const ResidentRepository =
    require("./ResidentRepository");

const ResidentMatcher =
    require("../server-domain/resident/ResidentMatcher");

/**
 * Mock Repository for testing
 */
class MockResidentRepository {
    constructor(candidates = []) {
        this.candidates = candidates;
        this.lastCall = null;
    }

    async getCandidates({ facilityId, sourceResidentIdentifier }) {
        this.lastCall = { facilityId, sourceResidentIdentifier };
        return this.candidates;
    }
}

// Test: Constructor requires dependencies
test("ServerTrustBoundaryService requires residentRepository", () => {
    const matcher = new ResidentMatcher();

    assert.throws(() => {
        new ServerTrustBoundaryService({ residentMatcher: matcher });
    }, /requires residentRepository/);
});

test("ServerTrustBoundaryService requires residentMatcher", () => {
    const repo = new MockResidentRepository();

    assert.throws(() => {
        new ServerTrustBoundaryService({ residentRepository: repo });
    }, /requires residentMatcher/);
});

// Test: Repository is called with verified facilityId
test("matchResident calls Repository with verified facilityId", async () => {
    const repo = new MockResidentRepository();
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: repo,
        residentMatcher: matcher
    });

    await service.matchResident({
        verifiedContext: { facilityId: "facility-123" },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    assert.deepStrictEqual(repo.lastCall, {
        facilityId: "facility-123",
        sourceResidentIdentifier: "00125"
    });
});

// Test: Missing verifiedContext => unmatched (Default Deny)
test("matchResident without verifiedContext returns unmatched", async () => {
    const repo = new MockResidentRepository();
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: repo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: null,
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    assert.strictEqual(result.status, "unmatched");
    assert.strictEqual(result.residentId, null);
    assert.strictEqual(repo.lastCall, null, "Repository should NOT be called");
});

// Test: Missing facilityId in verifiedContext => unmatched (Default Deny)
test("matchResident without verified facilityId returns unmatched", async () => {
    const repo = new MockResidentRepository();
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: repo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: null },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    assert.strictEqual(result.status, "unmatched");
    assert.strictEqual(result.residentId, null);
    assert.strictEqual(repo.lastCall, null, "Repository should NOT be called");
});

// Test: Missing sourceResident => unmatched (Default Deny)
test("matchResident without sourceResident returns unmatched", async () => {
    const repo = new MockResidentRepository();
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: repo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: "facility-123" },
        sourceResident: null
    });

    assert.strictEqual(result.status, "unmatched");
    assert.strictEqual(result.residentId, null);
    assert.strictEqual(repo.lastCall, null, "Repository should NOT be called");
});

// Test: Missing sourceResident identifier => unmatched (Default Deny)
test("matchResident without source identifier returns unmatched", async () => {
    const repo = new MockResidentRepository();
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: repo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: "facility-123" },
        sourceResident: {
            identifier: { value: "" },
            name: { value: "山田太郎" }
        }
    });

    assert.strictEqual(result.status, "unmatched");
    assert.strictEqual(result.residentId, null);
    assert.strictEqual(repo.lastCall, null, "Repository should NOT be called");
});

// Test: Uses only verifiedContext.facilityId, ignores any facilityId in sourceResident
test("matchResident uses only verifiedContext.facilityId, not sourceResident.facilityId", async () => {
    const repo = new MockResidentRepository();
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: repo,
        residentMatcher: matcher
    });

    await service.matchResident({
        verifiedContext: { facilityId: "server-verified-facility" },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" },
            facilityId: "malicious-facility"  // This should be ignored
        }
    });

    // Repository must be called with server-verified facilityId, not malicious one
    assert.strictEqual(repo.lastCall.facilityId, "server-verified-facility");
});

// Test: Repository error => unmatched (fail-safe)
test("matchResident handles Repository error gracefully", async () => {
    const errorRepo = {
        async getCandidates() {
            throw new Error("Database connection failed");
        }
    };
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: errorRepo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: "facility-123" },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    assert.strictEqual(result.status, "error", "Should return error status on Repository failure");
    assert.strictEqual(result.residentId, null);
    assert.strictEqual(result.errorCode, "resident_repository_unavailable");
    // Ensure error message is NOT exposed
    assert(!result.errorMessage, "Should not expose error message");
});

// Test: Repository throws, error message not exposed
test("matchResident does not expose Repository error message", async () => {
    const errorRepo = {
        async getCandidates() {
            throw new Error("Secret DB credentials invalid");
        }
    };
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: errorRepo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: "facility-123" },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    // Verify error message is NOT in result
    assert(!result.message, "Should not expose error message");
    assert(!result.stack, "Should not expose stack trace");
    assert(!result.err, "Should not expose error object");
    assert.strictEqual(result.errorCode, "resident_repository_unavailable");
});

// Test: Repository returns non-array => error
test("matchResident returns error if Repository result is not an array", async () => {
    const badRepo = {
        async getCandidates() {
            return { foo: "not an array" };  // Contract violation
        }
    };
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: badRepo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: "facility-123" },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    assert.strictEqual(result.status, "error", "Should return error on non-array result");
    assert.strictEqual(result.residentId, null);
    assert.strictEqual(result.errorCode, "resident_repository_invalid_result");
});

// Test: Repository returns null => error
test("matchResident returns error if Repository result is null", async () => {
    const badRepo = {
        async getCandidates() {
            return null;  // Contract violation
        }
    };
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: badRepo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: "facility-123" },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "resident_repository_invalid_result");
});

// Test: Repository returns string => error
test("matchResident returns error if Repository result is string", async () => {
    const badRepo = {
        async getCandidates() {
            return "not an array";  // Contract violation
        }
    };
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: badRepo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: "facility-123" },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    assert.strictEqual(result.status, "error");
    assert.strictEqual(result.errorCode, "resident_repository_invalid_result");
});

// Test: Repository returns candidates => ResidentMatcher processes them
test("matchResident delegates to ResidentMatcher with Repository results", async () => {
    const candidate = {
        id: "resident-123",
        facilityId: "facility-456",
        userCode: "00125",
        name: "山田太郎"
    };

    const repo = new MockResidentRepository([candidate]);
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: repo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: "facility-456" },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    // Should match successfully
    assert.strictEqual(result.status, "matched");
    assert.strictEqual(result.residentId, "resident-123");
    assert.strictEqual(result.matchMethod, "facility_user_code");
});

// Test: Repository returns empty array => unmatched
test("matchResident with empty candidate list returns unmatched", async () => {
    const repo = new MockResidentRepository([]);
    const matcher = new ResidentMatcher();
    const service = new ServerTrustBoundaryService({
        residentRepository: repo,
        residentMatcher: matcher
    });

    const result = await service.matchResident({
        verifiedContext: { facilityId: "facility-123" },
        sourceResident: {
            identifier: { value: "00125" },
            name: { value: "山田太郎" }
        }
    });

    assert.strictEqual(result.status, "unmatched");
    assert.strictEqual(result.residentId, null);
});
