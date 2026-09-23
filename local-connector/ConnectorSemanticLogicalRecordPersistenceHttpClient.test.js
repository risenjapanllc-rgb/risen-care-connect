"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Client = require("./ConnectorSemanticLogicalRecordPersistenceHttpClient");

function contract() {
    return {
        residentId: "33333333-3333-4333-8333-333333333333",
        semanticType: "recipient_certificate",
        logicalSlot: "primary",
        sourceDocumentKey: "source-document-1",
        sourceUpdatedAt: "2026-09-22T00:00:00.000Z",
        sourceSize: 12345,
        expectedContentHash: null,
        contentHash: "a".repeat(64),
        canonicalizationVersion: "risen-recipient-certificate-canonicalization-1",
        semanticContent: {
            "recipient_certificate.certificate_number": "CERT-001"
        }
    };
}

function response(status, body) {
    return {
        status,
        async json() {
            return body;
        }
    };
}

test("sends only contract plus trusted headers", async () => {
    let captured = null;
    const client = new Client({
        endpoint: "http://example.test/persist",
        connectorId: "connector-1",
        credential: "secret",
        fetchImpl: async (url, options) => {
            captured = { url, options };
            return response(200, {
                status: "created",
                recordId: "44444444-4444-4444-8444-444444444444"
            });
        }
    });
    const input = contract();
    const result = await client.persist(input);
    const sent = JSON.parse(captured.options.body);
    assert.equal(result.status, "created");
    assert.deepEqual(sent, input);
    assert.equal(Object.hasOwn(sent, "facilityId"), false);
    assert.equal(Object.hasOwn(sent, "connectorId"), false);
    assert.equal(captured.options.headers["x-risen-connector-id"], "connector-1");
    assert.equal(captured.options.headers.Authorization, "RISEN-Connector secret");
});

test("preserves successful statuses", async () => {
    for (const status of ["created", "updated", "unchanged"]) {
        const client = new Client({
            endpoint: "http://example.test/persist",
            connectorId: "connector-1",
            credential: "secret",
            fetchImpl: async () => response(200, {
                status,
                recordId: "44444444-4444-4444-8444-444444444444"
            })
        });
        const result = await client.persist(contract());
        assert.equal(result.status, status);
    }
});

test("preserves stale and conflict", async () => {
    for (const status of ["stale", "conflict"]) {
        const client = new Client({
            endpoint: "http://example.test/persist",
            connectorId: "connector-1",
            credential: "secret",
            fetchImpl: async () => response(409, { status, recordId: null })
        });
        assert.deepEqual(
            await client.persist(contract()),
            { status, recordId: null }
        );
    }
});

test("rejects client-controlled scope before network", async () => {
    let called = false;
    const client = new Client({
        endpoint: "http://example.test/persist",
        connectorId: "connector-1",
        credential: "secret",
        fetchImpl: async () => {
            called = true;
            return response(200, {});
        }
    });
    const input = contract();
    input.facilityId = "must-not-pass";
    await assert.rejects(
        () => client.persist(input),
        error => error.code === "semantic_logical_record_persistence_invalid"
    );
    assert.equal(called, false);
});

test("maps rejected responses safely", async () => {
    for (const [status, code] of [
        [401, "connector_trust_denied"],
        [422, "semantic_logical_record_persistence_invalid"],
        [503, "semantic_logical_record_persistence_unavailable"]
    ]) {
        const client = new Client({
            endpoint: "http://example.test/persist",
            connectorId: "connector-1",
            credential: "secret",
            fetchImpl: async () => response(status, {})
        });
        await assert.rejects(
            () => client.persist(contract()),
            error => error.code === code
        );
    }
});
