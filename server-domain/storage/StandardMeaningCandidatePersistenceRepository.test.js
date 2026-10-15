"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const StandardMeaningCandidatePersistenceRepository =
    require(
        "./StandardMeaningCandidatePersistenceRepository"
    );

test(
    "rejects incomplete Standard Meaning candidate persistence input",
    async () => {
        const repository =
            new StandardMeaningCandidatePersistenceRepository();

        const result =
            await repository.submit({
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                templateId:
                    "template-1",
                templateFieldKey:
                    "field-1",
                proposedMeaning:
                    "",
                evidence: {},
                submittedAt:
                    "2026-10-15T11:30:00.000Z"
            });

        assert.equal(
            result.status,
            "invalid"
        );
    }
);

test(
    "valid persistence input reaches implementation boundary",
    async () => {
        const repository =
            new StandardMeaningCandidatePersistenceRepository();

        await assert.rejects(
            () =>
                repository.submit({
                    verifiedFacilityId:
                        "facility-1",
                    verifiedConnectorId:
                        "connector-1",
                    templateId:
                        "template-1",
                    templateFieldKey:
                        "field-1",
                    proposedMeaning:
                        "受給者証の所持状態",
                    evidence: {
                        sourceLabel:
                            "所持"
                    },
                    submittedAt:
                        "2026-10-15T11:30:00.000Z"
                }),
            /is not implemented/
        );
    }
);

test(
    "rejects incomplete Standard Meaning candidate list input",
    async () => {
        const repository =
            new StandardMeaningCandidatePersistenceRepository();

        const result =
            await repository.list({
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                templateId:
                    ""
            });

        assert.equal(
            result.status,
            "invalid"
        );
    }
);

test(
    "valid Standard Meaning candidate list input reaches implementation boundary",
    async () => {
        const repository =
            new StandardMeaningCandidatePersistenceRepository();

        await assert.rejects(
            () =>
                repository.list({
                    verifiedFacilityId:
                        "facility-1",
                    verifiedConnectorId:
                        "connector-1",
                    templateId:
                        "template-1"
                }),
            /list is not implemented/
        );
    }
);
