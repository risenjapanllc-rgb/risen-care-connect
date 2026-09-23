"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Service = require("./ConfirmedDocumentTypeService");

test("re-verifies the exact source snapshot before persistence", async () => {
    let snapshotInput = null;
    let saved = null;

    const service = new Service({
        localConnectorService: {
            async resolveSourceSnapshot(input) {
                snapshotInput = input;
                return {
                    sourceDocumentKey: "doc-key",
                    sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
                    sourceSize: 456
                };
            }
        },
        persistenceClient: {
            async save(input) {
                saved = input;
                return { status: "created" };
            }
        },
        allowedDocumentTypes: [
            "support_record",
            "recipient_certificate",
            "resident_master"
        ]
    });

    const input = {
        sourceDocumentKey: "doc-key",
        sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
        sourceSize: 456,
        documentType: "recipient_certificate"
    };

    const result = await service.confirm(input);

    assert.deepStrictEqual(snapshotInput, {
        sourceDocumentKey: input.sourceDocumentKey,
        sourceUpdatedAt: input.sourceUpdatedAt,
        sourceSize: input.sourceSize
    });

    assert.strictEqual(
        saved.sourceDocumentKey,
        "doc-key"
    );
    assert.strictEqual(
        saved.sourceUpdatedAt,
        "2026-09-20T01:02:03.000Z"
    );
    assert.strictEqual(
        saved.sourceSize,
        456
    );
    assert.strictEqual(
        saved.documentType,
        "recipient_certificate"
    );
    assert.strictEqual(
        typeof saved.confirmedAt,
        "string"
    );
    assert.strictEqual(
        Number.isNaN(Date.parse(saved.confirmedAt)),
        false
    );

    assert.deepStrictEqual(result, {
        status: "confirmed",
        documentType: "recipient_certificate",
        persistenceStatus: "created"
    });
});

test("rejects an unsupported document type before snapshot resolution", async () => {
    let snapshotCalled = false;
    let saveCalled = false;

    const service = new Service({
        localConnectorService: {
            async resolveSourceSnapshot() {
                snapshotCalled = true;
                return {};
            }
        },
        persistenceClient: {
            async save() {
                saveCalled = true;
                return {};
            }
        },
        allowedDocumentTypes: ["support_record"]
    });

    const result = await service.confirm({
        sourceDocumentKey: "doc-key",
        sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
        sourceSize: 456,
        documentType: "recipient_certificate"
    });

    assert.deepStrictEqual(result, {
        status: "invalid_document_type"
    });
    assert.equal(snapshotCalled, false);
    assert.equal(saveCalled, false);
});
