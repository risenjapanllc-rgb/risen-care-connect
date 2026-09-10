"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticRecordPersistenceRepository =
    require("./SemanticRecordPersistenceRepository");

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function createSemanticContent() {
    return {
        semanticType: "support_record",
        fields: {
            supportContent: "支援内容"
        },
        customFields: {}
    };
}

test("incomplete create scope is invalid", async () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    const result =
        await repository.createConfirmedRecord({
            verifiedFacilityId: "facility-1"
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid"
        }
    );
});

test("create requires server-confirmed residentId", async () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    for (const residentId of [
        undefined,
        null,
        "",
        "   ",
        123,
        {},
        []
    ]) {
        const result =
            await repository.createConfirmedRecord({
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                ...(residentId !== undefined
                    ? { residentId }
                    : {}),
                sourceDocumentKey:
                    "document-1",
                sourceRecordKey:
                    "support_record:primary",
                contentHash:
                    HASH_A,
                canonicalizationVersion:
                    "risen-semantic-canonicalization-1",
                semanticContent:
                    createSemanticContent()
            });

        assert.deepStrictEqual(
            result,
            {
                status: "invalid"
            }
        );
    }
});

test("complete create scope reaches implementation boundary", async () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    await assert.rejects(
        () =>
            repository.createConfirmedRecord({
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                residentId:
                    "resident-1",
                sourceDocumentKey:
                    "document-1",
                sourceRecordKey:
                    "support_record:primary",
                contentHash:
                    HASH_A,
                canonicalizationVersion:
                    "risen-semantic-canonicalization-1",
                semanticContent:
                    createSemanticContent()
            }),
        /not implemented/
    );
});

test("incomplete update scope is invalid", async () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    const result =
        await repository.updateConfirmedRecord({
            verifiedFacilityId:
                "facility-1",
            recordId:
                "record-1"
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid"
        }
    );
});

test("complete update scope reaches implementation boundary", async () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    await assert.rejects(
        () =>
            repository.updateConfirmedRecord({
                verifiedFacilityId:
                    "facility-1",
                recordId:
                    "record-1",
                expectedContentHash:
                    HASH_A,
                contentHash:
                    HASH_B,
                canonicalizationVersion:
                    "risen-semantic-canonicalization-1",
                semanticContent:
                    createSemanticContent()
            }),
        /not implemented/
    );
});

test("create requires exact lowercase SHA-256 hash shape", async () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    for (const contentHash of [
        "",
        "A".repeat(64),
        "a".repeat(63),
        "g".repeat(64)
    ]) {
        const result =
            await repository.createConfirmedRecord({
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                residentId:
                    "resident-1",
                sourceDocumentKey:
                    "document-1",
                sourceRecordKey:
                    "support_record:primary",
                contentHash,
                canonicalizationVersion:
                    "risen-semantic-canonicalization-1",
                semanticContent:
                    createSemanticContent()
            });

        assert.deepStrictEqual(
            result,
            {
                status: "invalid"
            }
        );
    }
});

test("update requires expected previous content hash", async () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    const result =
        await repository.updateConfirmedRecord({
            verifiedFacilityId:
                "facility-1",
            recordId:
                "record-1",
            contentHash:
                HASH_B,
            canonicalizationVersion:
                "risen-semantic-canonicalization-1",
            semanticContent:
                createSemanticContent()
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid"
        }
    );
});

test("create requires semanticType inside semanticContent", async () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    const semanticContent =
        createSemanticContent();

    delete semanticContent.semanticType;

    const result =
        await repository.createConfirmedRecord({
            verifiedFacilityId:
                "facility-1",
            verifiedConnectorId:
                "connector-1",
            residentId:
                "resident-1",
            sourceDocumentKey:
                "document-1",
            sourceRecordKey:
                "support_record:primary",
            contentHash:
                HASH_A,
            canonicalizationVersion:
                "risen-semantic-canonicalization-1",
            semanticContent
        });

    assert.deepStrictEqual(result, {
        status: "invalid"
    });
});

test("update requires semanticType inside semanticContent", async () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    const semanticContent =
        createSemanticContent();

    delete semanticContent.semanticType;

    const result =
        await repository.updateConfirmedRecord({
            verifiedFacilityId:
                "facility-1",
            recordId:
                "record-1",
            expectedContentHash:
                HASH_A,
            contentHash:
                HASH_B,
            canonicalizationVersion:
                "risen-semantic-canonicalization-1",
            semanticContent
        });

    assert.deepStrictEqual(result, {
        status: "invalid"
    });
});

test("repository exposes only create and update persistence operations", () => {
    const repository =
        new SemanticRecordPersistenceRepository();

    assert.strictEqual(
        typeof repository.createConfirmedRecord,
        "function"
    );

    assert.strictEqual(
        typeof repository.updateConfirmedRecord,
        "function"
    );

    for (const operation of [
        "findCandidates",
        "getByRecordId",
        "delete",
        "upsert"
    ]) {
        assert.strictEqual(
            repository[operation],
            undefined
        );
    }
});
