"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Repository = require(
    "./SupabaseConnectorSemanticLogicalRecordPersistenceRepository"
);

function validInput() {
    return {
        verifiedFacilityId: "11111111-1111-1111-1111-111111111111",
        verifiedConnectorId: "22222222-2222-2222-2222-222222222222",
        residentId: "33333333-3333-4333-8333-333333333333",
        semanticType: "recipient_certificate",
        logicalSlot: "primary",
        sourceDocumentKey: "source-document-1",
        sourceUpdatedAt: "2026-09-22T00:00:00.000Z",
        sourceSize: 12345,
        expectedContentHash: null,
        contentHash: "a".repeat(64),
        canonicalizationVersion:
            "risen-recipient-certificate-canonicalization-1",
        semanticContent: {
            "recipient_certificate.certificate_number": "CERT-001"
        }
    };
}

test("persists all atomic logical record arguments", async () => {
    let request;
    const repository = new Repository({
        supabaseUrl: "https://example.supabase.co",
        apiKey: "test-api-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "test-access-token";
            }
        },
        fetchImpl: async (url, options) => {
            request = { url, options };
            return {
                ok: true,
                async json() {
                    return [{
                        status: "created",
                        record_id:
                            "44444444-4444-4444-8444-444444444444"
                    }];
                }
            };
        }
    });

    const result = await repository.persist(validInput());
    const body = JSON.parse(request.options.body);

    assert.equal(result.status, "created");
    assert.equal(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/persist_connector_semantic_logical_record"
    );
    assert.equal(request.options.headers.apikey, "test-api-key");
    assert.equal(
        request.options.headers.Authorization,
        "Bearer test-access-token"
    );
    assert.deepEqual(Object.keys(body).sort(), [
        "p_canonicalization_version",
        "p_connector_id",
        "p_content_hash",
        "p_expected_content_hash",
        "p_facility_id",
        "p_logical_slot",
        "p_resident_id",
        "p_semantic_content",
        "p_semantic_type",
        "p_source_document_key",
        "p_source_size",
        "p_source_updated_at"
    ].sort());
    assert.equal(body.p_expected_content_hash, null);
    assert.equal(
        body.p_canonicalization_version,
        "risen-recipient-certificate-canonicalization-1"
    );
});

test("preserves optimistic expected hash", async () => {
    let body;
    const repository = new Repository({
        supabaseUrl: "https://example.supabase.co",
        apiKey: "test-api-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "token";
            }
        },
        fetchImpl: async (url, options) => {
            body = JSON.parse(options.body);
            return {
                ok: true,
                async json() {
                    return [{
                        status: "updated",
                        record_id:
                            "44444444-4444-4444-8444-444444444444"
                    }];
                }
            };
        }
    });

    const input = validInput();
    input.expectedContentHash = "b".repeat(64);
    const result = await repository.persist(input);

    assert.equal(result.status, "updated");
    assert.equal(
        body.p_expected_content_hash,
        "b".repeat(64)
    );
});

test("preserves stale and conflict statuses", async () => {
    for (const status of ["stale", "conflict"]) {
        const repository = new Repository({
            supabaseUrl: "https://example.supabase.co",
            apiKey: "test-api-key",
            accessTokenProvider: {
                async getAccessToken() {
                    return "token";
                }
            },
            fetchImpl: async () => ({
                ok: true,
                async json() {
                    return [{ status, record_id: null }];
                }
            })
        });

        const result = await repository.persist(validInput());
        assert.equal(result.status, status);
        assert.equal(result.recordId, null);
    }
});

test("invalid input fails before network", async () => {
    let called = false;
    const repository = new Repository({
        supabaseUrl: "https://example.supabase.co",
        apiKey: "test-api-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "token";
            }
        },
        fetchImpl: async () => {
            called = true;
            throw new Error("must not be called");
        }
    });

    const input = validInput();
    input.contentHash = "invalid";

    const result = await repository.persist(input);
    assert.deepEqual(result, {
        status: "invalid",
        recordId: null
    });
    assert.equal(called, false);
});
