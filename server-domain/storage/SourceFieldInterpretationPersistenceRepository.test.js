"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldInterpretationPersistenceRepository =
    require("./SourceFieldInterpretationPersistenceRepository");

test("confirm requires implementation for valid deferred input", async () => {
    const repository =
        new SourceFieldInterpretationPersistenceRepository();

    await assert.rejects(
        repository.confirm({
            verifiedFacilityId:
                "11111111-1111-1111-1111-111111111111",
            verifiedConnectorId:
                "22222222-2222-2222-2222-222222222222",
            sourceDocumentKey:
                "source-document-1",
            sourceFieldKey:
                "sheet:0:column:1",
            interpretationStatus:
                "deferred",
            mappingStatus:
                "unmapped",
            confirmedMeaning:
                null
        }),
        /must be implemented/
    );
});

test("confirm requires implementation for valid no-standard-match input", async () => {
    const repository =
        new SourceFieldInterpretationPersistenceRepository();

    await assert.rejects(
        repository.confirm({
            verifiedFacilityId:
                "11111111-1111-1111-1111-111111111111",
            verifiedConnectorId:
                "22222222-2222-2222-2222-222222222222",
            sourceDocumentKey:
                "source-document-1",
            sourceFieldKey:
                "sheet:0:column:2",
            interpretationStatus:
                "confirmed",
            mappingStatus:
                "no_standard_match",
            confirmedMeaning:
                null
        }),
        /must be implemented/
    );
});

test("confirm rejects invalid interpretation status", async () => {
    const repository =
        new SourceFieldInterpretationPersistenceRepository();

    const result =
        await repository.confirm({
            verifiedFacilityId:
                "11111111-1111-1111-1111-111111111111",
            verifiedConnectorId:
                "22222222-2222-2222-2222-222222222222",
            sourceDocumentKey:
                "source-document-1",
            sourceFieldKey:
                "sheet:0:column:1",
            interpretationStatus:
                "ai_suggested",
            mappingStatus:
                "unmapped",
            confirmedMeaning:
                null
        });

    assert.deepEqual(
        result,
        {
            status: "invalid"
        }
    );
});

test("confirm rejects invalid mapping status", async () => {
    const repository =
        new SourceFieldInterpretationPersistenceRepository();

    const result =
        await repository.confirm({
            verifiedFacilityId:
                "11111111-1111-1111-1111-111111111111",
            verifiedConnectorId:
                "22222222-2222-2222-2222-222222222222",
            sourceDocumentKey:
                "source-document-1",
            sourceFieldKey:
                "sheet:0:column:1",
            interpretationStatus:
                "deferred",
            mappingStatus:
                "suggested",
            confirmedMeaning:
                null
        });

    assert.deepEqual(
        result,
        {
            status: "invalid"
        }
    );
});

test("confirm rejects missing source field identity", async () => {
    const repository =
        new SourceFieldInterpretationPersistenceRepository();

    const result =
        await repository.confirm({
            verifiedFacilityId:
                "11111111-1111-1111-1111-111111111111",
            verifiedConnectorId:
                "22222222-2222-2222-2222-222222222222",
            sourceDocumentKey:
                "source-document-1",
            sourceFieldKey:
                "",
            interpretationStatus:
                "deferred",
            mappingStatus:
                "unmapped",
            confirmedMeaning:
                null
        });

    assert.deepEqual(
        result,
        {
            status: "invalid"
        }
    );
});
