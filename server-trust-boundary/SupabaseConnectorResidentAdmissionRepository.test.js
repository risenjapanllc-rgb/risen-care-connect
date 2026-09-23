"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Repository = require("./SupabaseConnectorResidentAdmissionRepository");

const digest = "a".repeat(64);

function createRepository(fetchImpl) {
    return new Repository({
        supabaseUrl: "https://example.supabase.co/",
        apiKey: "test-api-key",
        accessTokenProvider: {
            async getAccessToken() { return "test-access-token"; }
        },
        fetchImpl
    });
}

function validInput() {
    return {
        verifiedFacilityId: " facility-1 ",
        verifiedConnectorId: " connector-1 ",
        sourceDocumentKey: " source.xlsx ",
        identifierType: "name",
        identifierDigest: digest,
        name: " Test Resident ",
        sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
        sourceSize: 1234
    };
}

test("calls atomic admission RPC with verified scope and exact snapshot", async () => {
    let request;
    const repository = createRepository(async (url, options) => {
        request = { url, options };
        return {
            ok: true,
            async json() {
                return [{
                    status: "created",
                    resident_id: "resident-1",
                    resident_created: true
                }];
            }
        };
    });

    const result = await repository.admit(validInput());

    assert.strictEqual(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/admit_connector_resident"
    );
    assert.deepStrictEqual(JSON.parse(request.options.body), {
        p_facility_id: "facility-1",
        p_connector_id: "connector-1",
        p_source_document_key: "source.xlsx",
        p_identifier_type: "name",
        p_identifier_digest: digest,
        p_name: "Test Resident",
        p_source_updated_at: "2026-09-22T01:02:03.000Z",
        p_source_size: 1234
    });
    assert.deepStrictEqual(result, {
        status: "created",
        residentId: "resident-1",
        residentCreated: true
    });
});

test("preserves all atomic admission statuses", async () => {
    for (const status of [
        "existing", "stale", "not_approved", "conflict", "name_conflict"
    ]) {
        const repository = createRepository(async () => ({
            ok: true,
            async json() {
                return [{
                    status,
                    resident_id: status === "existing" ? "resident-1" : null,
                    resident_created: false
                }];
            }
        }));

        const result = await repository.admit(validInput());
        assert.strictEqual(result.status, status);
        assert.strictEqual(
            result.residentId,
            status === "existing" ? "resident-1" : null
        );
        assert.strictEqual(result.residentCreated, false);
    }
});

test("rejects inconsistent resident and creation results", async () => {
    for (const row of [
        { status: "created", resident_id: null, resident_created: true },
        { status: "created", resident_id: "resident-1", resident_created: false },
        { status: "existing", resident_id: null, resident_created: false },
        { status: "stale", resident_id: null, resident_created: true },
        { status: "unknown", resident_id: null, resident_created: false }
    ]) {
        const repository = createRepository(async () => ({
            ok: true,
            async json() { return [row]; }
        }));

        await assert.rejects(
            repository.admit(validInput()),
            Error
        );
    }
});

test("rejects invalid request before fetch", async () => {
    let fetchCount = 0;
    const repository = createRepository(async () => {
        fetchCount += 1;
        throw new Error("fetch must not be called");
    });

    for (const patch of [
        { verifiedFacilityId: "" },
        { verifiedConnectorId: "" },
        { identifierType: "other" },
        { identifierDigest: "bad" },
        { sourceUpdatedAt: "bad-date" },
        { sourceSize: -1 }
    ]) {
        await assert.rejects(
            repository.admit({ ...validInput(), ...patch }),
            TypeError
        );
    }

    assert.strictEqual(fetchCount, 0);
});
