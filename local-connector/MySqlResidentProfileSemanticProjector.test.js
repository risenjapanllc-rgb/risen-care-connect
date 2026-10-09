"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createHash
} = require("node:crypto");

const MySqlResidentProfileSemanticProjector =
    require(
        "./MySqlResidentProfileSemanticProjector"
    );

test(
    "projects only confirmed resident birth date into resident_profile semantic content",
    () => {
        const projector =
            new MySqlResidentProfileSemanticProjector();

        const result =
            projector.project({
                record: {
                    sourceRecordKey:
                        "a".repeat(64),
                    fields: {
                        resident_code:
                            "R001",
                        name:
                            "Example",
                        birth_date:
                            "1980-04-12",
                        support_level:
                            "ignored"
                    }
                },
                residentId:
                    "11111111-1111-4111-8111-111111111111",
                sourceRevision:
                    "b".repeat(64)
            });

        assert.deepStrictEqual(
            result.semanticContent,
            {
                "user.birth_date":
                    "1980-04-12"
            }
        );

        assert.strictEqual(
            result.semanticType,
            "resident_profile"
        );

        assert.strictEqual(
            result.logicalSlot,
            "primary"
        );

        assert.strictEqual(
            result.canonicalizationVersion,
            "risen-resident-profile-canonicalization-1"
        );

        assert.strictEqual(
            result.contentHash,
            createHash("sha256")
                .update(
                    JSON.stringify({
                        "user.birth_date":
                            "1980-04-12"
                    }),
                    "utf8"
                )
                .digest("hex")
        );

        assert.deepStrictEqual(
            Object.keys(
                result.semanticContent
            ),
            [
                "user.birth_date"
            ]
        );
    }
);

test(
    "fails closed when birth date is absent or malformed",
    () => {
        const projector =
            new MySqlResidentProfileSemanticProjector();

        for (
            const birthDate of [
                undefined,
                "",
                "1980/04/12",
                "12-04-1980",
                "2026-02-31",
                "2025-02-29"
            ]
        ) {
            assert.throws(
                () =>
                    projector.project({
                        record: {
                            sourceRecordKey:
                                "a".repeat(64),
                            fields: {
                                birth_date:
                                    birthDate
                            }
                        },
                        residentId:
                            "11111111-1111-4111-8111-111111111111",
                        sourceRevision:
                            "b".repeat(64)
                    }),
                error =>
                    error &&
                    error.code ===
                        "mysql_resident_profile_birth_date_invalid"
            );
        }
    }
);
