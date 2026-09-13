"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldMappingPersistenceRepository =
    require("./SourceFieldMappingPersistenceRepository");

function createValidInput() {
    return {
        verifiedFacilityId:
            "facility-1",
        verifiedConnectorId:
            "connector-1",
        sourceDocumentKey:
            "document-1",
        sourceFieldKey:
            "sheet:0:column:3",
        standardEntityName:
            "user",
        standardFieldName:
            "blood_type",
        sheetName:
            "Sheet1",
        headerLabel:
            "血液型",
        confirmedAt:
            "2026-09-12T01:00:00.000Z"
    };
}

test(
    "accepts a verified source field mapping contract",
    async () => {
        class TestRepository
            extends SourceFieldMappingPersistenceRepository {
            async upsert(input = {}) {
                const validation =
                    await super.upsert(input)
                        .catch(error => error);

                if (
                    validation &&
                    validation.status === "invalid"
                ) {
                    return validation;
                }

                return {
                    status: "created"
                };
            }
        }

        const repository =
            new TestRepository();

        assert.deepEqual(
            await repository.upsert(
                createValidInput()
            ),
            {
                status: "created"
            }
        );
    }
);

test(
    "rejects missing verified facility identity",
    async () => {
        const repository =
            new SourceFieldMappingPersistenceRepository();

        const result =
            await repository.upsert({
                ...createValidInput(),
                verifiedFacilityId: ""
            });

        assert.deepEqual(
            result,
            {
                status: "invalid"
            }
        );
    }
);

test(
    "rejects missing source document identity",
    async () => {
        const repository =
            new SourceFieldMappingPersistenceRepository();

        const result =
            await repository.upsert({
                ...createValidInput(),
                sourceDocumentKey: ""
            });

        assert.deepEqual(
            result,
            {
                status: "invalid"
            }
        );
    }
);

test(
    "rejects missing structural source field identity",
    async () => {
        const repository =
            new SourceFieldMappingPersistenceRepository();

        const result =
            await repository.upsert({
                ...createValidInput(),
                sourceFieldKey: ""
            });

        assert.deepEqual(
            result,
            {
                status: "invalid"
            }
        );
    }
);

test(
    "rejects missing canonical standard field identity",
    async () => {
        const repository =
            new SourceFieldMappingPersistenceRepository();

        const result =
            await repository.upsert({
                ...createValidInput(),
                standardFieldName: ""
            });

        assert.deepEqual(
            result,
            {
                status: "invalid"
            }
        );
    }
);

test(
    "allows nullable display metadata",
    async () => {
        class TestRepository
            extends SourceFieldMappingPersistenceRepository {
            async upsert(input = {}) {
                const validation =
                    await super.upsert(input)
                        .catch(error => error);

                if (
                    validation &&
                    validation.status === "invalid"
                ) {
                    return validation;
                }

                return {
                    status: "created"
                };
            }
        }

        const repository =
            new TestRepository();

        assert.deepEqual(
            await repository.upsert({
                ...createValidInput(),
                sheetName: null,
                headerLabel: null
            }),
            {
                status: "created"
            }
        );
    }
);
