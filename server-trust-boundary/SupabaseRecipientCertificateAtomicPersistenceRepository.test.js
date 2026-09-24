"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Repository = require(
    "./SupabaseRecipientCertificateAtomicPersistenceRepository"
);

function contract() {
    return {
        verifiedFacilityId:
            "11111111-1111-4111-8111-111111111111",
        verifiedConnectorId:
            "22222222-2222-4222-8222-222222222222",
        resolution: "existing",
        identifierType: "name",
        identifierDigest: "a".repeat(64),
        residentId:
            "33333333-3333-4333-8333-333333333333",
        displayName: "Test Resident",
        residentProfile: {
            name: "Test Resident",
            birth_date: "1984-03-27",
            gender: "男性"
        },
        semantic: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                "recipient_certificate.certificate_number":
                    "ABC123"
            },
            contentHash: "b".repeat(64),
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-2",
            expectedContentHash: null
        },
        sourceDocumentKey: "source.xlsx",
        sourceUpdatedAt:
            "2026-09-22T01:00:00.000Z",
        sourceSize: 123
    };
}

test("atomic repository performs exactly one Supabase RPC request", async () => {
    const calls = [];

    const repository = new Repository({
        supabaseUrl: "https://example.supabase.co",
        apiKey: "test-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "test-token";
            }
        },
        async fetchImpl(url, options) {
            calls.push({ url, options });

            return {
                ok: true,
                async json() {
                    return [{
                        status: "updated",
                        resident_id:
                            "33333333-3333-4333-8333-333333333333",
                        record_id:
                            "44444444-4444-4444-8444-444444444444",
                        resident_created: false
                    }];
                }
            };
        }
    });

    const result =
        await repository.persist(contract());

    assert.strictEqual(calls.length, 1);

    assert.strictEqual(
        calls[0].url,
        "https://example.supabase.co/rest/v1/rpc/" +
            "persist_recipient_certificate_import_entry"
    );

    const body =
        JSON.parse(calls[0].options.body);

    assert.strictEqual(
        body.p_facility_id,
        "11111111-1111-4111-8111-111111111111"
    );
    assert.strictEqual(
        body.p_connector_id,
        "22222222-2222-4222-8222-222222222222"
    );
    assert.strictEqual(
        body.p_resident_profile.birth_date,
        "1984-03-27"
    );

    assert.deepStrictEqual(result, {
        status: "updated",
        residentId:
            "33333333-3333-4333-8333-333333333333",
        recordId:
            "44444444-4444-4444-8444-444444444444",
        residentCreated: false
    });
});

test("atomic repository fails closed on Supabase error", async () => {
    const repository = new Repository({
        supabaseUrl: "https://example.supabase.co",
        apiKey: "test-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "test-token";
            }
        },
        async fetchImpl() {
            return {
                ok: false,
                status: 500
            };
        }
    });

    await assert.rejects(
        () => repository.persist(contract()),
        /atomic persistence failed:500/
    );
});
