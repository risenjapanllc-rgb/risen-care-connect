"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const PerspectiveResolutionContract =
    require("./PerspectiveResolutionContract");


function createResolution(
    overrides = {}
) {
    return {
        resolutionMode:
            "resolved",

        perspectiveType:
            "facility_operation",

        subjectScope:
            "multiple_residents",

        temporalScope:
            "as_of_time",

        interpretation:
            "当日時点で施設が把握している入院中利用者の状況",

        confidence:
            "high",

        facilityQuestion:
            "",

        ...overrides
    };
}


test(
    "accepts a facility-level perspective over multiple residents",
    () => {
        const resolution =
            createResolution();

        assert.deepStrictEqual(
            PerspectiveResolutionContract
                .validate(
                    resolution
                ),
            {
                status:
                    "valid",

                perspectiveResolution:
                    resolution
            }
        );
    }
);


test(
    "accepts resident perspective without changing the source meaning",
    () => {
        const resolution =
            createResolution({
                perspectiveType:
                    "resident",

                subjectScope:
                    "single_resident",

                temporalScope:
                    "event",

                interpretation:
                    "特定利用者に紐づく入院事実"
            });

        const result =
            PerspectiveResolutionContract
                .validate(
                    resolution
                );

        assert.equal(
            result.status,
            "valid"
        );

        assert.strictEqual(
            result
                .perspectiveResolution,
            resolution
        );
    }
);


test(
    "accepts review when perspective cannot yet be determined",
    () => {
        const resolution =
            createResolution({
                resolutionMode:
                    "review",

                perspectiveType:
                    "unknown",

                subjectScope:
                    "unknown",

                temporalScope:
                    "unknown",

                interpretation:
                    "",

                confidence:
                    "low",

                facilityQuestion:
                    "この情報は施設全体の状況ですか、それとも特定利用者の記録ですか？"
            });

        assert.equal(
            PerspectiveResolutionContract
                .validate(
                    resolution
                )
                .status,
            "valid"
        );
    }
);


test(
    "review requires a natural-language facility question",
    () => {
        const resolution =
            createResolution({
                resolutionMode:
                    "review",

                perspectiveType:
                    "unknown",

                subjectScope:
                    "unknown",

                temporalScope:
                    "unknown",

                confidence:
                    "low",

                facilityQuestion:
                    ""
            });

        assert.deepStrictEqual(
            PerspectiveResolutionContract
                .validate(
                    resolution
                ),
            {
                status:
                    "invalid"
            }
        );
    }
);


test(
    "rejects Formal Meaning identifiers",
    () => {
        for (const forbidden of [
            {
                entityName:
                    "resident"
            },

            {
                fieldName:
                    "hospitalized_at"
            },

            {
                semanticType:
                    "hospitalization"
            },

            {
                canonicalCode:
                    "resident.hospitalized_at"
            }
        ]) {
            assert.equal(
                PerspectiveResolutionContract
                    .validate(
                        createResolution(
                            forbidden
                        )
                    )
                    .status,
                "invalid"
            );
        }
    }
);


test(
    "rejects unsupported perspective values",
    () => {
        assert.equal(
            PerspectiveResolutionContract
                .validate(
                    createResolution({
                        perspectiveType:
                            "something_else"
                    })
                )
                .status,
            "invalid"
        );

        assert.equal(
            PerspectiveResolutionContract
                .validate(
                    createResolution({
                        subjectScope:
                            "something_else"
                    })
                )
                .status,
            "invalid"
        );

        assert.equal(
            PerspectiveResolutionContract
                .validate(
                    createResolution({
                        temporalScope:
                            "something_else"
                    })
                )
                .status,
            "invalid"
        );
    }
);


test(
    "rejects non-object perspective resolution",
    () => {
        for (const value of [
            null,
            undefined,
            [],
            "resolution",
            123
        ]) {
            assert.deepStrictEqual(
                PerspectiveResolutionContract
                    .validate(
                        value
                    ),
                {
                    status:
                        "invalid"
                }
            );
        }
    }
);
