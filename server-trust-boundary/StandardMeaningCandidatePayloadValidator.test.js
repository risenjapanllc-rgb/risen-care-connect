"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const StandardMeaningCandidatePayloadValidator =
    require(
        "./StandardMeaningCandidatePayloadValidator"
    );

test(
    "accepts a valid Standard Meaning candidate",
    () => {
        const validator =
            new StandardMeaningCandidatePayloadValidator();

        const result =
            validator.validate({
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
            });

        assert.equal(
            result.status,
            "valid"
        );

        assert.equal(
            result.validated
                .proposedMeaning,
            "受給者証の所持状態"
        );
    }
);

test(
    "rejects blank proposedMeaning",
    () => {
        const validator =
            new StandardMeaningCandidatePayloadValidator();

        const result =
            validator.validate({
                templateId:
                    "template-1",
                templateFieldKey:
                    "field-1",
                proposedMeaning:
                    "   ",
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
    "rejects non-object evidence",
    () => {
        const validator =
            new StandardMeaningCandidatePayloadValidator();

        const result =
            validator.validate({
                templateId:
                    "template-1",
                templateFieldKey:
                    "field-1",
                proposedMeaning:
                    "受給者証の所持状態",
                evidence: [],
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
    "rejects missing template identity",
    () => {
        const validator =
            new StandardMeaningCandidatePayloadValidator();

        const result =
            validator.validate({
                templateId:
                    "",
                templateFieldKey:
                    "",
                proposedMeaning:
                    "受給者証の所持状態",
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
