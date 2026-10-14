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

        resolutionPolicy:
            "automatic",

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

        resolutionPolicy:
            "automatic",

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

        resolutionPolicy:
            "automatic",

        reason:
            "label_and_presence_source_values_support_presence_status"
    }),

    Object.freeze({
        id:
            "source_record.group_state_code",

        sourceLabels:
            Object.freeze([
                "状態"
            ]),

        semanticTarget:
            Object.freeze({
                entityName:
                    "source_record",
                fieldName:
                    "group_state_code",
                displayName:
                    "原本記録グループ状態コード"
            }),

        evidencePolicy:
            Object.freeze({
                type:
                    "all_of",

                policies:
                    Object.freeze([
                        Object.freeze({
                            type:
                                "all_integer"
                        }),

                        Object.freeze({
                            type:
                                "minimum_sample_count",
                            minimum:
                                3
                        }),

                        Object.freeze({
                            type:
                                "neighboring_fields_include_at_least",

                            values:
                                Object.freeze([
                                    "日時",
                                    "氏名",
                                    "処遇内容",
                                    "記入者",
                                    "種類"
                                ]),

                            minimum:
                                4
                        })
                    ])
            }),

        resolutionPolicy:
            "automatic",

        reason:
            "status_label_integer_values_and_record_context_support_source_group_state_code"
    }),

    Object.freeze({
        id:
            "source_record.record_id",

        sourceLabels:
            Object.freeze([
                "ID"
            ]),

        semanticTarget:
            Object.freeze({
                entityName:
                    "source_record",
                fieldName:
                    "record_id",
                displayName:
                    "原本レコードID"
            }),

        evidencePolicy:
            Object.freeze({
                type:
                    "all_of",

                policies:
                    Object.freeze([
                        Object.freeze({
                            type:
                                "all_integer"
                        }),

                        Object.freeze({
                            type:
                                "minimum_sample_count",
                            minimum:
                                3
                        }),

                        Object.freeze({
                            type:
                                "neighboring_fields_include_at_least",

                            values:
                                Object.freeze([
                                    "日時",
                                    "氏名",
                                    "処遇内容",
                                    "記入者",
                                    "種類"
                                ]),

                            minimum:
                                4
                        })
                    ])
            }),

        resolutionPolicy:
            "automatic",

        reason:
            "id_label_integer_values_and_record_context_support_source_record_id"
    }),

    Object.freeze({
        id:
            "source_record.revision_flag",

        sourceLabels:
            Object.freeze([
                "修正"
            ]),

        semanticTarget:
            Object.freeze({
                entityName:
                    "source_record",
                fieldName:
                    "revision_flag",
                displayName:
                    "原本修正フラグ"
            }),

        evidencePolicy:
            Object.freeze({
                type:
                    "all_in_set",

                values:
                    Object.freeze([
                        "0",
                        "1",
                        "0.0",
                        "1.0"
                    ])
            }),

        resolutionPolicy:
            "automatic",

        reason:
            "label_and_binary_source_values_support_revision_flag"
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

        resolutionPolicy:
            "automatic",

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
