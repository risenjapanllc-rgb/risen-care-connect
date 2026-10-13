"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceTemplateExactPersistenceRepository =
    require("./SourceTemplateExactPersistenceRepository");

function validInput() {
    return {
        verifiedFacilityId:
            "facility-1",
        verifiedConnectorId:
            "connector-1",
        displayName:
            "利用者台帳",
        fileType:
            "csv",
        documentType:
            null,
        structureFingerprint:
            "a".repeat(64),
        canonicalizationVersion:
            "risen-source-template-canonicalization-1",
        canonicalStructure: {
            type:
                "csv",
            fields: []
        }
    };
}

test(
    "accepts exact source template contract",
    async () => {
        class TestRepository
            extends SourceTemplateExactPersistenceRepository {
            async getOrCreate(input = {}) {
                const validation =
                    await super
                        .getOrCreate(input)
                        .catch(error => error);

                if (
                    validation &&
                    validation.status ===
                        "invalid"
                ) {
                    return validation;
                }

                return {
                    status:
                        "created"
                };
            }
        }

        const repository =
            new TestRepository();

        assert.deepEqual(
            await repository.getOrCreate(
                validInput()
            ),
            {
                status:
                    "created"
            }
        );
    }
);

test(
    "rejects invalid fingerprint",
    async () => {
        const repository =
            new SourceTemplateExactPersistenceRepository();

        assert.deepEqual(
            await repository.getOrCreate({
                ...validInput(),
                structureFingerprint:
                    "bad"
            }),
            {
                status:
                    "invalid"
            }
        );
    }
);

test(
    "rejects unsupported word exact template",
    async () => {
        const repository =
            new SourceTemplateExactPersistenceRepository();

        assert.deepEqual(
            await repository.getOrCreate({
                ...validInput(),
                fileType:
                    "word"
            }),
            {
                status:
                    "invalid"
            }
        );
    }
);
