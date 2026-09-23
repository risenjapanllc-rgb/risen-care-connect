"use strict";

const assert = require("assert");
const Repository = require(
    "./SupabaseResidentAdmissionDecisionRepository"
);

let request;

const repository = new Repository({
    supabaseUrl: "https://example.supabase.co",
    apiKey: "test-key",
    accessTokenProvider: {
        async getAccessToken() {
            return "test-token";
        }
    },
    fetchImpl: async (url, options) => {
        request = { url, options };
        return {
            ok: true,
            async json() {
                return [{ status: "created" }];
            }
        };
    }
});

const base = {
    verifiedFacilityId: "facility-A",
    verifiedConnectorId: "connector-A",
    sourceDocumentKey: "document-A",
    sourceUpdatedAt: "2026-09-21T01:00:00.000Z",
    sourceSize: 1234
};

(async () => {
    const result = await repository.save({
        ...base,
        sourceEntityKey: "subject-A",
        decision: "approved_new",
        reviewedAt: "2026-09-21T02:00:00.000Z"
    });

    assert.strictEqual(result.status, "created");

    const body = JSON.parse(request.options.body);

    assert.strictEqual(body.p_facility_id, "facility-A");
    assert.strictEqual(body.p_connector_id, "connector-A");
    assert.strictEqual(body.p_source_entity_key, "subject-A");
    assert.strictEqual(body.p_decision, "approved_new");
    assert.strictEqual(body.facilityId, undefined);

    await assert.rejects(
        repository.save({
            ...base,
            sourceEntityKey: "subject-A",
            decision: "automatic_create",
            reviewedAt: "2026-09-21T02:00:00.000Z"
        }),
        TypeError
    );

    console.log(
        "Supabase resident admission repository tests: PASS"
    );
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
