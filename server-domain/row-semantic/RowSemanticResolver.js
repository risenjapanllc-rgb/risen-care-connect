"use strict";

const {
    findStandardMeaning
} =
    require(
        "../standard-fields/RisenStandardMeaningCatalog"
    );

const ROW_RULES = Object.freeze([
    Object.freeze({
        rowType: "health_temperature",
        action: "健康管理",
        kind: "体温",
        fields: Object.freeze([
            Object.freeze({
                sourceFieldName: "データ1",
                semanticFieldName:
                    "body_temperature",
                reason:
                    "health_temperature_row"
            }),
            Object.freeze({
                sourceFieldName: "データ2",
                semanticFieldName:
                    "record_location",
                reason:
                    "health_temperature_location"
            })
        ])
    }),

    Object.freeze({
        rowType:
            "health_systolic_blood_pressure",
        action: "健康管理",
        kind: "血圧上",
        fields: Object.freeze([
            Object.freeze({
                sourceFieldName: "データ1",
                semanticFieldName:
                    "systolic_blood_pressure",
                reason:
                    "health_systolic_blood_pressure_row"
            }),
            Object.freeze({
                sourceFieldName: "データ2",
                semanticFieldName:
                    "record_location",
                reason:
                    "health_blood_pressure_location"
            })
        ])
    }),

    Object.freeze({
        rowType:
            "health_diastolic_blood_pressure",
        action: "健康管理",
        kind: "血圧下",
        fields: Object.freeze([
            Object.freeze({
                sourceFieldName: "データ1",
                semanticFieldName:
                    "diastolic_blood_pressure",
                reason:
                    "health_diastolic_blood_pressure_row"
            }),
            Object.freeze({
                sourceFieldName: "データ2",
                semanticFieldName:
                    "record_location",
                reason:
                    "health_blood_pressure_location"
            })
        ])
    }),

    Object.freeze({
        rowType: "health_pulse",
        action: "健康管理",
        kind: "脈拍",
        fields: Object.freeze([
            Object.freeze({
                sourceFieldName: "データ1",
                semanticFieldName:
                    "pulse_rate",
                reason:
                    "health_pulse_row"
            }),
            Object.freeze({
                sourceFieldName: "データ2",
                semanticFieldName:
                    "record_location",
                reason:
                    "health_pulse_location"
            })
        ])
    }),

    Object.freeze({
        rowType: "meal_intake",
        action: "食事",
        kind: "食事量",
        fields: Object.freeze([
            Object.freeze({
                sourceFieldName: "データ1",
                semanticFieldName:
                    "meal_intake_ratio",
                reason:
                    "meal_intake_row"
            }),
            Object.freeze({
                sourceFieldName: "データ2",
                semanticFieldName:
                    "record_location",
                reason:
                    "meal_intake_location"
            })
        ])
    }),

    Object.freeze({
        rowType: "toilet_urine",
        action: "トイレ確認",
        kind: "尿",
        fields: Object.freeze([
            Object.freeze({
                sourceFieldName: "データ1",
                semanticFieldName:
                    "urine_amount_category",
                reason:
                    "toilet_urine_row"
            }),
            Object.freeze({
                sourceFieldName: "データ2",
                semanticFieldName:
                    "record_location",
                reason:
                    "toilet_urine_location"
            })
        ])
    }),

    Object.freeze({
        rowType: "incontinence_urine",
        action: "失禁",
        kind: "尿",
        fields: Object.freeze([
            Object.freeze({
                sourceFieldName: "データ1",
                semanticFieldName:
                    "urine_amount_category",
                reason:
                    "incontinence_urine_row"
            }),
            Object.freeze({
                sourceFieldName: "データ2",
                semanticFieldName:
                    "record_location",
                reason:
                    "incontinence_urine_location"
            })
        ])
    }),

    Object.freeze({
        rowType: "toilet_stool",
        action: "トイレ確認",
        kind: "普通便",
        fields: Object.freeze([
            Object.freeze({
                sourceFieldName: "データ1",
                semanticFieldName:
                    "stool_amount_category",
                reason:
                    "toilet_stool_row"
            }),
            Object.freeze({
                sourceFieldName: "データ2",
                semanticFieldName:
                    "record_location",
                reason:
                    "toilet_stool_location"
            })
        ])
    }),

    Object.freeze({
        rowType: "sleep_deep",
        action: "睡眠状況",
        kind: "熟睡",
        fields: Object.freeze([
            Object.freeze({
                sourceFieldName: "データ2",
                semanticFieldName:
                    "record_location",
                reason:
                    "sleep_location"
            }),
            Object.freeze({
                sourceFieldName: "詳細",
                semanticFieldName:
                    "sleep_state",
                reason:
                    "sleep_state_row"
            })
        ])
    })
]);

function normalizeValue(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ");
}

function resolveInterpretation({
    fields,
    rule
}) {
    const sourceValue =
        normalizeValue(
            fields[
                rule.sourceFieldName
            ]
        );

    if (!sourceValue) {
        return null;
    }

    const meaning =
        findStandardMeaning(
            "support_record",
            rule.semanticFieldName
        );

    if (!meaning) {
        return null;
    }

    return {
        sourceFieldName:
            rule.sourceFieldName,

        sourceValue,

        semanticMeaning:
            `support_record.${meaning.fieldName}`,

        displayName:
            meaning.displayName,

        status:
            "automatic",

        reason:
            rule.reason
    };
}

class RowSemanticResolver {
    static resolve({
        sourceFields = []
    } = {}) {
        const results = [];

        for (
            const record
            of (
                Array.isArray(sourceFields)
                    ? sourceFields
                    : []
            )
        ) {
            const fields =
                record &&
                typeof record.fields ===
                    "object" &&
                !Array.isArray(
                    record.fields
                )
                    ? record.fields
                    : {};

            const action =
                normalizeValue(
                    fields.行動
                );

            const kind =
                normalizeValue(
                    fields.種類
                );

            const rule =
                ROW_RULES.find(
                    item =>
                        item.action ===
                            action &&
                        item.kind ===
                            kind
                );

            if (!rule) {
                continue;
            }

            const interpretations =
                rule.fields
                    .map(fieldRule =>
                        resolveInterpretation({
                            fields,
                            rule:
                                fieldRule
                        })
                    )
                    .filter(Boolean);

            if (
                interpretations.length ===
                0
            ) {
                continue;
            }

            results.push({
                sourceEntityKey:
                    typeof record
                        ?.sourceEntityKey ===
                        "string"
                        ? record
                            .sourceEntityKey
                        : null,

                rowIndex:
                    Number.isInteger(
                        record?.rowIndex
                    )
                        ? record.rowIndex
                        : null,

                rowType:
                    rule.rowType,

                action,
                kind,

                interpretations
            });
        }

        return results;
    }
}

module.exports =
    RowSemanticResolver;
