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

test(
    "generic holding and source record meanings exist in the standard catalog",
    () => {
        const expected = [
            [
                "support_record",
                "extension_value",
                "その他・拡張情報"
            ],
            [
                "source_record",
                "group_state_code",
                "原本記録グループ状態コード"
            ],
            [
                "source_record",
                "record_id",
                "原本レコードID"
            ],
            [
                "source_record",
                "revision_flag",
                "原本修正フラグ"
            ],
            [
                "source_record",
                "detail_key",
                "原本詳細キー"
            ]
        ];

        for (
            const [
                entityName,
                fieldName,
                displayName
            ]
            of expected
        ) {
            const meaning =
                findStandardMeaning(
                    entityName,
                    fieldName
                );

            assert.ok(
                meaning,
                `${entityName}.${fieldName}`
            );

            assert.equal(
                meaning.displayName,
                displayName
            );
        }
    }
);

test(
    "source detail key exposes the original source label as a synonym",
    () => {
        const meaning =
            findStandardMeaning(
                "source_record",
                "detail_key"
            );

        assert.ok(
            meaning
        );

        assert.ok(
            meaning.synonyms.includes(
                "詳細KEY"
            )
        );
    }
);

test(
    "row semantic support record meanings exist in the standard catalog",
    () => {
        const expected = [
            [
                "body_temperature",
                "体温"
            ],
            [
                "systolic_blood_pressure",
                "収縮期血圧"
            ],
            [
                "diastolic_blood_pressure",
                "拡張期血圧"
            ],
            [
                "pulse_rate",
                "脈拍"
            ],
            [
                "meal_intake_ratio",
                "食事摂取割合"
            ],
            [
                "record_location",
                "記録場所"
            ],
            [
                "urine_amount_category",
                "尿量区分"
            ],
            [
                "stool_amount_category",
                "便量区分"
            ],
            [
                "sleep_state",
                "睡眠状態"
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
