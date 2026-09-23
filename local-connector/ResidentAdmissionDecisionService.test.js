"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const ResidentAdmissionDecisionHttpClient =
    require("./ResidentAdmissionDecisionHttpClient");
const ResidentAdmissionDecisionService =
    require("./ResidentAdmissionDecisionService");

test("HTTP client sends only trusted admission fields and never facilityId", async () => {
    let request = null;

    const client =
        new ResidentAdmissionDecisionHttpClient({
            endpoint:
                "http://127.0.0.1:8787/connector/resident-admission-decisions",
            connectorId: "connector-test",
            credential: "credential-test",
            authorizationScheme: "Bearer",
            fetchImpl: async (url, options) => {
                request = { url, options };

                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { status: "created" };
                    }
                };
            }
        });

    await client.save({
        sourceDocumentKey: "document-test",
        sourceEntityKey:
            "resident:name:" + "a".repeat(64),
        decision: "approved_new",
        reviewedAt:
            "2026-09-21T03:00:00.000Z",
        sourceUpdatedAt:
            "2026-09-21T02:00:00.000Z",
        sourceSize: 123
    });

    const body =
        JSON.parse(request.options.body);

    assert.deepStrictEqual(
        Object.keys(body),
        ["decision"]
    );

    assert.deepStrictEqual(
        Object.keys(body.decision).sort(),
        [
            "decision",
            "reviewedAt",
            "sourceDocumentKey",
            "sourceEntityKey",
            "sourceSize",
            "sourceUpdatedAt"
        ].sort()
    );

    assert.strictEqual(
        body.decision.facilityId,
        undefined
    );

    assert.strictEqual(
        request.options.headers.facilityId,
        undefined
    );
});

test("service revalidates exact snapshot immediately before persistence", async () => {
    const calls = [];
    const digest =
        crypto
            .createHash("sha256")
            .update("synthetic-resident", "utf8")
            .digest("hex");

    const service =
        new ResidentAdmissionDecisionService({
            localConnectorService: {
                async resolveSourceSnapshot(input) {
                    calls.push({
                        type: "snapshot",
                        input
                    });

                    return {
                        sourceDocumentKey:
                            input.sourceDocumentKey,
                        sourceUpdatedAt:
                            input.sourceUpdatedAt,
                        sourceSize:
                            input.sourceSize
                    };
                }
            },
            persistenceClient: {
                async save(input) {
                    calls.push({
                        type: "save",
                        input
                    });

                    return {
                        status: "created"
                    };
                },
                async list() {
                    return {
                        status: "found",
                        decisions: []
                    };
                }
            }
        });

    const result =
        await service.decide({
            sourceDocumentKey:
                "document-test",
            sourceUpdatedAt:
                "2026-09-21T02:00:00.000Z",
            sourceSize:
                123,
            identifierType:
                "name",
            identifierDigest:
                digest,
            decision:
                "approved_new"
        });

    assert.strictEqual(
        result.status,
        "decided"
    );

    assert.strictEqual(
        calls[0].type,
        "snapshot"
    );

    assert.strictEqual(
        calls[1].type,
        "save"
    );

    assert.strictEqual(
        calls[1].input.sourceEntityKey,
        "resident:name:" + digest
    );

    assert.strictEqual(
        calls[1].input.facilityId,
        undefined
    );

    assert.strictEqual(
        calls[1].input.sourceDocumentKey,
        "document-test"
    );

    assert.strictEqual(
        calls[1].input.sourceUpdatedAt,
        "2026-09-21T02:00:00.000Z"
    );

    assert.strictEqual(
        calls[1].input.sourceSize,
        123
    );
});

test("invalid decision never reaches snapshot or persistence", async () => {
    let snapshotCalls = 0;
    let saveCalls = 0;

    const service =
        new ResidentAdmissionDecisionService({
            localConnectorService: {
                async resolveSourceSnapshot() {
                    snapshotCalls += 1;
                    return {};
                }
            },
            persistenceClient: {
                async save() {
                    saveCalls += 1;
                    return {
                        status: "created"
                    };
                },
                async list() {
                    return {
                        status: "found",
                        decisions: []
                    };
                }
            }
        });

    const result =
        await service.decide({
            decision:
                "automatic_create"
        });

    assert.deepStrictEqual(
        result,
        {
            status:
                "invalid_decision"
        }
    );

    assert.strictEqual(
        snapshotCalls,
        0
    );

    assert.strictEqual(
        saveCalls,
        0
    );
});

console.log(
    "Resident admission Local Connector contract tests: PASS"
);
