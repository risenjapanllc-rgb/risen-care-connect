"use strict";

const assert = require("assert");
const Persistence = require(
    "./ResidentAdmissionDecisionPersistenceService"
);
const Query = require(
    "./ResidentAdmissionDecisionQueryService"
);

const calls = { save: null, list: null };

const connectorTrustService = {
    async authenticate() {
        return {
            status: "verified",
            verifiedContext: {
                facilityId: "trusted-facility",
                connectorId: "trusted-connector"
            }
        };
    }
};

const repository = {
    async save(input) {
        calls.save = input;
        return { status: "created" };
    },
    async list(input) {
        calls.list = input;
        return [];
    }
};

(async () => {
    const persistence = new Persistence({
        connectorTrustService,
        residentAdmissionDecisionRepository: repository
    });

    const saved = await persistence.save({
        connectorId: "caller-connector",
        credential: "credential",
        facilityId: "attacker-facility",
        decision: {
            sourceDocumentKey: "document",
            sourceEntityKey: "subject",
            decision: "approved_new",
            reviewedAt: "2026-09-21T02:00:00.000Z",
            sourceUpdatedAt: "2026-09-21T01:00:00.000Z",
            sourceSize: 100
        }
    });

    assert.strictEqual(saved.status, "created");
    assert.strictEqual(
        calls.save.verifiedFacilityId,
        "trusted-facility"
    );
    assert.strictEqual(
        calls.save.verifiedConnectorId,
        "trusted-connector"
    );
    assert.strictEqual(calls.save.facilityId, undefined);

    const query = new Query({
        connectorTrustService,
        residentAdmissionDecisionRepository: repository
    });

    const listed = await query.list({
        connectorId: "caller-connector",
        credential: "credential",
        facilityId: "attacker-facility",
        sourceDocumentKey: "document",
        sourceUpdatedAt: "2026-09-21T01:00:00.000Z",
        sourceSize: 100
    });

    assert.strictEqual(listed.status, "found");
    assert.strictEqual(
        calls.list.verifiedFacilityId,
        "trusted-facility"
    );
    assert.strictEqual(
        calls.list.verifiedConnectorId,
        "trusted-connector"
    );

    console.log(
        "Resident admission STB service tests: PASS"
    );
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
