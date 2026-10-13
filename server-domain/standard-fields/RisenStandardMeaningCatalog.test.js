"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    findStandardMeaning
} =
    require("./RisenStandardMeaningCatalog");

test(
    "support record contextual meanings exist in the standard catalog",
    () => {
        const expected = [
            [
                "temperature",
                "記録時気温"
            ],
            [
                "weather",
                "記録時天候"
            ],
            [
                "presence_status",
                "在園状態"
            ],
            [
                "activity",
                "行動内容"
            ]
        ];

        for (
            const [
                fieldName,
                displayName
            ]
            of expected
        ) {
            const meaning =
                findStandardMeaning(
                    "support_record",
                    fieldName
                );

            assert.ok(
                meaning,
                fieldName
            );

            assert.equal(
                meaning.displayName,
                displayName
            );
        }
    }
);
