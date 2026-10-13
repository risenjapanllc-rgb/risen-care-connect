"use strict";

const RULES = Object.freeze([
    Object.freeze({
        id:
            "support_record.temperature",

        sourceLabels:
            Object.freeze([
                "気温"
            ]),

        semanticTarget:
            Object.freeze({
                entityName:
                    "support_record",
                fieldName:
                    "temperature",
                displayName:
                    "記録時気温"
            }),

        evidencePolicy:
            Object.freeze({
                type:
                    "all_numeric"
            }),

        reason:
            "label_and_numeric_source_values_support_temperature"
    }),

    Object.freeze({
        id:
            "support_record.weather",

        sourceLabels:
            Object.freeze([
                "天気"
            ]),

        semanticTarget:
            Object.freeze({
                entityName:
                    "support_record",
                fieldName:
                    "weather",
                displayName:
                    "記録時天候"
            }),

        evidencePolicy:
            Object.freeze({
                type:
                    "any_in_set",

                values:
                    Object.freeze([
                        "晴",
                        "曇",
                        "雨",
                        "雪",
                        "晴れ",
                        "曇り"
                    ])
            }),

        reason:
            "label_and_weather_source_values_support_weather"
    }),

    Object.freeze({
        id:
            "support_record.presence_status",

        sourceLabels:
            Object.freeze([
                "在園状態"
            ]),

        semanticTarget:
            Object.freeze({
                entityName:
                    "support_record",
                fieldName:
                    "presence_status",
                displayName:
                    "在園状態"
            }),

        evidencePolicy:
            Object.freeze({
                type:
                    "any_in_set",

                values:
                    Object.freeze([
                        "在中",
                        "不在"
                    ])
            }),

        reason:
            "label_and_presence_source_values_support_presence_status"
    }),

    Object.freeze({
        id:
            "support_record.activity",

        sourceLabels:
            Object.freeze([
                "行動"
            ]),

        semanticTarget:
            Object.freeze({
                entityName:
                    "support_record",
                fieldName:
                    "activity",
                displayName:
                    "行動内容"
            }),

        evidencePolicy:
            Object.freeze({
                type:
                    "has_samples"
            }),

        reason:
            "label_and_source_values_support_activity"
    })
]);

class SemanticEvidenceRuleCatalog {
    static list() {
        return RULES;
    }
}

module.exports =
    SemanticEvidenceRuleCatalog;
