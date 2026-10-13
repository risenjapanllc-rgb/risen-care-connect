"use strict";

const STANDARD_MEANINGS = Object.freeze([
    Object.freeze({
        entityName: "user",
        fieldName: "name",
        displayName: "利用者名",
        synonyms: Object.freeze(["利用者名", "利用者氏名", "user_name", "client_name"])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "birth_date",
        displayName: "生年月日",
        synonyms: Object.freeze(["生年月日", "誕生日", "birth_date", "birthday", "dob"])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "gender",
        displayName: "性別",
        synonyms: Object.freeze(["性別", "gender", "sex"])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "user_code",
        displayName: "利用者番号",
        synonyms: Object.freeze(["利用者番号", "利用者コード", "user_code"])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "blood_type",
        displayName: "血液型",
        synonyms: Object.freeze([
            "血液型",
            "blood_type"
        ])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "postal_code",
        displayName: "郵便番号",
        synonyms: Object.freeze([
            "郵便番号",
            "郵便番号(住所)",
            "郵便番号（住所）",
            "postal_code"
        ])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "address",
        displayName: "住所",
        synonyms: Object.freeze([
            "住所",
            "現住所",
            "address"
        ])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "phone",
        displayName: "電話番号",
        synonyms: Object.freeze([
            "電話番号",
            "TEL",
            "電話",
            "phone"
        ])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "mobile",
        displayName: "携帯番号",
        synonyms: Object.freeze([
            "携帯番号",
            "携帯電話番号",
            "携帯電話",
            "mobile"
        ])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "email",
        displayName: "E-mail",
        synonyms: Object.freeze([
            "E-mail",
            "Email",
            "メールアドレス",
            "email"
        ])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "name_kana",
        displayName: "フリガナ",
        synonyms: Object.freeze(["フリガナ", "ふりがな", "氏名カナ"])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "blood_rh",
        displayName: "RH",
        synonyms: Object.freeze(["RH", "Rh", "RH型"])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "fax",
        displayName: "FAX番号",
        synonyms: Object.freeze(["FAX番号", "FAX", "fax"])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "registered_domicile_postal_code",
        displayName: "郵便番号(本籍地)",
        synonyms: Object.freeze(["郵便番号(本籍地)", "郵便番号（本籍地）"])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "registered_domicile",
        displayName: "本籍地",
        synonyms: Object.freeze(["本籍地"])
    }),
    Object.freeze({
        entityName: "user",
        fieldName: "memo",
        displayName: "メモ",
        synonyms: Object.freeze(["メモ"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "certificate_type",
        displayName: "受給者証種別",
        synonyms: Object.freeze(["受給者証種別"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "facility_type",
        displayName: "施設種別",
        synonyms: Object.freeze(["施設種別"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "issued_date",
        displayName: "交付年月日",
        synonyms: Object.freeze(["交付年月日", "交付日"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "issuing_authority_name",
        displayName: "支給市町村(都道府県)名",
        synonyms: Object.freeze(["支給市町村(都道府県)名", "支給市町村（都道府県）名"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "valid_from",
        displayName: "開始日",
        synonyms: Object.freeze(["開始日"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "disability_support_level",
        displayName: "障害程度区分・区分",
        synonyms: Object.freeze(["障害程度区分・区分", "障害支援区分"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "physical_care_quantity",
        displayName: "身体介護支給量",
        synonyms: Object.freeze(["身体介護支給量"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "housework_assistance_quantity",
        displayName: "家事援助支給量",
        synonyms: Object.freeze(["家事援助支給量"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "outpatient_mobility_assistance_quantity",
        displayName: "通院介助(移動介護)支給量",
        synonyms: Object.freeze(["通院介助(移動介護)支給量", "通院介助（移動介護）支給量"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "outpatient_physical_assistance_quantity",
        displayName: "通院介助(移動)・身体支給量",
        synonyms: Object.freeze(["通院介助(移動)・身体支給量", "通院介助（移動）・身体支給量"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "daily_living_quantity",
        displayName: "日常生活支給量",
        synonyms: Object.freeze(["日常生活支給量"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "day_service_quantity",
        displayName: "支給日数(デイⅠ・デイ支給量)",
        synonyms: Object.freeze(["支給日数(デイⅠ・デイ支給量)", "支給日数（デイⅠ・デイ支給量）"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "day_service_ii_quantity",
        displayName: "デイⅡ支給量",
        synonyms: Object.freeze(["デイⅡ支給量"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "meal_quantity",
        displayName: "給食支給量",
        synonyms: Object.freeze(["給食支給量"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "bathing_quantity",
        displayName: "入浴支給量",
        synonyms: Object.freeze(["入浴支給量"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "self_household_tier",
        displayName: "本人分階層区分",
        synonyms: Object.freeze(["本人分階層区分"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "self_copayment_amount",
        displayName: "本人分利用者負担額",
        synonyms: Object.freeze(["本人分利用者負担額"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "self_monthly_cap",
        displayName: "本人分上限月額",
        synonyms: Object.freeze(["本人分上限月額"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "supporter_household_tier",
        displayName: "扶養義務者分階層区分",
        synonyms: Object.freeze(["扶養義務者分階層区分"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "supporter_copayment_amount",
        displayName: "扶養義務者分利用者負担額",
        synonyms: Object.freeze(["扶養義務者分利用者負担額"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "supporter_monthly_cap",
        displayName: "扶養義務者分上限月額",
        synonyms: Object.freeze(["扶養義務者分上限月額"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "memo",
        displayName: "メモ(受給者証)",
        synonyms: Object.freeze(["メモ(受給者証)", "メモ（受給者証）"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "same_household_multi_user_cap_management",
        displayName: "同一世帯の複数利用者で上限管理",
        synonyms: Object.freeze(["同一世帯の複数利用者で上限管理"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "provider_name",
        displayName: "事業者名",
        synonyms: Object.freeze(["事業者名"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "provider_entry_number",
        displayName: "事業者記入欄番号",
        synonyms: Object.freeze(["事業者記入欄番号"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "contract_date",
        displayName: "契約日",
        synonyms: Object.freeze(["契約日"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "contract_type",
        displayName: "契約区分",
        synonyms: Object.freeze(["契約区分"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "service_content",
        displayName: "サービス内容",
        synonyms: Object.freeze(["サービス内容"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "contracted_quantity_hours",
        displayName: "契約支給量(時間)",
        synonyms: Object.freeze(["契約支給量(時間)", "契約支給量（時間）"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "contracted_quantity_days_or_times",
        displayName: "契約支給量(日)又は(回)",
        synonyms: Object.freeze(["契約支給量(日)又は(回)", "契約支給量（日）又は（回）"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "contracted_meal_quantity",
        displayName: "契約支給量(給食)",
        synonyms: Object.freeze(["契約支給量(給食)", "契約支給量（給食）"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "contracted_bathing_quantity",
        displayName: "契約支給量(入浴)",
        synonyms: Object.freeze(["契約支給量(入浴)", "契約支給量（入浴）"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "service_end_date",
        displayName: "提供終了日",
        synonyms: Object.freeze(["提供終了日"])
    }),
    Object.freeze({
        entityName: "service_contract",
        fieldName: "end_classification",
        displayName: "終了区分",
        synonyms: Object.freeze(["終了区分"])
    }),
    Object.freeze({
        entityName: "service_delivery",
        fieldName: "provided_quantity_hours",
        displayName: "既提供量(時間)",
        synonyms: Object.freeze(["既提供量(時間)", "既提供量（時間）"])
    }),
    Object.freeze({
        entityName: "service_delivery",
        fieldName: "provided_quantity_days_or_times",
        displayName: "既提供量(日)又は(回)",
        synonyms: Object.freeze(["既提供量(日)又は(回)", "既提供量（日）又は（回）"])
    }),
    Object.freeze({
        entityName: "service_delivery",
        fieldName: "provided_meal_quantity",
        displayName: "既提供量(給食)",
        synonyms: Object.freeze(["既提供量(給食)", "既提供量（給食）"])
    }),
    Object.freeze({
        entityName: "service_delivery",
        fieldName: "provided_bathing_quantity",
        displayName: "既提供量(入浴)",
        synonyms: Object.freeze(["既提供量(入浴)", "既提供量（入浴）"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "boarding_assistance_quantity",
        displayName: "乗降介助支給量",
        synonyms: Object.freeze(["乗降介助支給量"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "behavior_support_quantity",
        displayName: "行動援護支給量",
        synonyms: Object.freeze(["行動援護支給量"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "outing_assistance_quantity",
        displayName: "外出介護支給量",
        synonyms: Object.freeze(["外出介護支給量"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "outing_with_physical_care_quantity",
        displayName: "外出・身体支給量",
        synonyms: Object.freeze(["外出・身体支給量"])
    }),
    Object.freeze({
        entityName: "service_addition",
        fieldName: "meal_addition_i",
        displayName: "食事加算(食事加算Ⅰ)",
        synonyms: Object.freeze(["食事加算(食事加算Ⅰ)", "食事加算（食事加算Ⅰ）"])
    }),
    Object.freeze({
        entityName: "cost_sharing",
        fieldName: "copayment_rate_percent",
        displayName: "負担率(%)",
        synonyms: Object.freeze(["負担率(%)", "負担率（%）"])
    }),
    Object.freeze({
        entityName: "cost_sharing",
        fieldName: "income_classification",
        displayName: "所得区分",
        synonyms: Object.freeze(["所得区分"])
    }),
    Object.freeze({
        entityName: "cost_sharing",
        fieldName: "monthly_cap",
        displayName: "利用者負担上限月額",
        synonyms: Object.freeze(["利用者負担上限月額"])
    }),
    Object.freeze({
        entityName: "cost_sharing",
        fieldName: "reduced_monthly_cap",
        displayName: "利用者負担軽減後上限月額",
        synonyms: Object.freeze(["利用者負担軽減後上限月額"])
    }),
    Object.freeze({
        entityName: "cost_sharing",
        fieldName: "social_welfare_corporation_reduction",
        displayName: "社会福祉法人減免",
        synonyms: Object.freeze(["社会福祉法人減免"])
    }),
    Object.freeze({
        entityName: "upper_limit_management",
        fieldName: "expected_cap_reached_classification",
        displayName: "上限額到達見込区分",
        synonyms: Object.freeze(["上限額到達見込区分"])
    }),
    Object.freeze({
        entityName: "cost_sharing",
        fieldName: "relief_program_classification",
        displayName: "利用者負担緩和事業区分",
        synonyms: Object.freeze(["利用者負担緩和事業区分"])
    }),
    Object.freeze({
        entityName: "cost_sharing",
        fieldName: "relief_program_cap",
        displayName: "利用者負担緩和事業上限額",
        synonyms: Object.freeze(["利用者負担緩和事業上限額"])
    }),
    Object.freeze({
        entityName: "upper_limit_management",
        fieldName: "managing_provider",
        displayName: "上限管理事業者",
        synonyms: Object.freeze(["上限管理事業者"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "mutual_use",
        displayName: "相互利用",
        synonyms: Object.freeze(["相互利用"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "severe_home_visit_comprehensive",
        displayName: "重度訪問介護重度包括",
        synonyms: Object.freeze(["重度訪問介護重度包括"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "severe_home_visit_class_6",
        displayName: "重度訪問介護区分６",
        synonyms: Object.freeze(["重度訪問介護区分６", "重度訪問介護区分6"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "severe_home_visit_other",
        displayName: "重度訪問介護その他",
        synonyms: Object.freeze(["重度訪問介護その他"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "extremely_severe_classification",
        displayName: "著しく重度の者区分",
        synonyms: Object.freeze(["著しく重度の者区分"])
    }),
    Object.freeze({
        entityName: "service_addition",
        fieldName: "meal_addition_ii",
        displayName: "食事加算Ⅱ",
        synonyms: Object.freeze(["食事加算Ⅱ"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "legacy_law_recipient",
        displayName: "特定旧法受給者",
        synonyms: Object.freeze(["特定旧法受給者"])
    }),
    Object.freeze({
        entityName: "service_addition",
        fieldName: "nutrition_management_on_service_day",
        displayName: "利用実績のある日に栄養管理体制加算を算定",
        synonyms: Object.freeze(["利用実績のある日に栄養管理体制加算を算定"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "accompanying_support_primary",
        displayName: "同行援護中心",
        synonyms: Object.freeze(["同行援護中心"])
    }),
    Object.freeze({
        entityName: "service_entitlement",
        fieldName: "accompanying_support_with_physical_care",
        displayName: "同行援護（身体あり）",
        synonyms: Object.freeze(["同行援護（身体あり）", "同行援護(身体あり)"])
    }),
    Object.freeze({
        entityName: "source_specific",
        fieldName: "handwritten_contract_quantity",
        displayName: "手書・契約量",
        synonyms: Object.freeze(["手書・契約量"])
    }),
    Object.freeze({
        entityName: "source_specific",
        fieldName: "handwritten_contract_quantity_end",
        displayName: "手書・契約量(終了)",
        synonyms: Object.freeze(["手書・契約量(終了)", "手書・契約量（終了）"])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "record_date",
        displayName: "記録日時",
        synonyms: Object.freeze(["記録日時", "日時", "record_date", "record_datetime"])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "staff_name",
        displayName: "記録者名",
        synonyms: Object.freeze(["記録者", "記録者名", "記入者", "担当職員", "職員名", "staff_name"])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "record_content",
        displayName: "支援記録本文",
        synonyms: Object.freeze(["支援記録本文", "記録内容", "処遇内容", "本文", "record_content"])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "record_category",
        displayName: "記録区分",
        synonyms: Object.freeze(["記録区分", "種類", "record_category"])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "created_at",
        displayName: "登録日時",
        synonyms: Object.freeze(["登録日時", "作成日時", "created_at"])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "temperature",
        displayName: "記録時気温",
        synonyms: Object.freeze([
            "記録時気温",
            "temperature"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "weather",
        displayName: "記録時天候",
        synonyms: Object.freeze([
            "記録時天候",
            "weather"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "presence_status",
        displayName: "在園状態",
        synonyms: Object.freeze([
            "presence_status"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "activity",
        displayName: "行動内容",
        synonyms: Object.freeze([
            "行動内容",
            "activity"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "body_temperature",
        displayName: "体温",
        synonyms: Object.freeze([
            "体温",
            "body_temperature"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "systolic_blood_pressure",
        displayName: "収縮期血圧",
        synonyms: Object.freeze([
            "収縮期血圧",
            "最高血圧",
            "systolic_blood_pressure"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "diastolic_blood_pressure",
        displayName: "拡張期血圧",
        synonyms: Object.freeze([
            "拡張期血圧",
            "最低血圧",
            "diastolic_blood_pressure"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "pulse_rate",
        displayName: "脈拍",
        synonyms: Object.freeze([
            "脈拍",
            "pulse_rate"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "meal_intake_ratio",
        displayName: "食事摂取割合",
        synonyms: Object.freeze([
            "食事摂取割合",
            "食事摂取率",
            "meal_intake_ratio"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "record_location",
        displayName: "記録場所",
        synonyms: Object.freeze([
            "記録場所",
            "record_location"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "urine_amount_category",
        displayName: "尿量区分",
        synonyms: Object.freeze([
            "尿量区分",
            "urine_amount_category"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "stool_amount_category",
        displayName: "便量区分",
        synonyms: Object.freeze([
            "便量区分",
            "stool_amount_category"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "sleep_state",
        displayName: "睡眠状態",
        synonyms: Object.freeze([
            "睡眠状態",
            "sleep_state"
        ])
    }),
    Object.freeze({
        entityName: "support_record",
        fieldName: "extension_value",
        displayName: "その他・拡張情報",
        synonyms: Object.freeze([
            "その他1",
            "その他2",
            "その他3",
            "extension_value"
        ])
    }),
    Object.freeze({
        entityName: "source_record",
        fieldName: "record_id",
        displayName: "原本レコードID",
        synonyms: Object.freeze([
            "source_record_id"
        ])
    }),
    Object.freeze({
        entityName: "source_record",
        fieldName: "revision_flag",
        displayName: "原本修正フラグ",
        synonyms: Object.freeze([
            "source_revision_flag"
        ])
    }),
    Object.freeze({
        entityName: "source_record",
        fieldName: "detail_key",
        displayName: "原本詳細キー",
        synonyms: Object.freeze([
            "詳細KEY",
            "source_detail_key"
        ])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "certificate_number",
        displayName: "受給者証番号",
        synonyms: Object.freeze(["受給者証NO", "受給者証No", "受給者証番号"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "valid_until",
        displayName: "受給者証有効期限",
        synonyms: Object.freeze([
            "有効期限",
            "受給者証有効期限",
            "終了日"
        ])
    })
]);

function listStandardMeanings() {
    return STANDARD_MEANINGS.map(item => ({
        entityName: item.entityName,
        fieldName: item.fieldName,
        displayName: item.displayName,
        synonyms: [...item.synonyms]
    }));
}

function findStandardMeaning(entityName, fieldName) {
    return STANDARD_MEANINGS.find(item =>
        item.entityName === entityName &&
        item.fieldName === fieldName
    ) || null;
}

module.exports = {
    listStandardMeanings,
    findStandardMeaning
};
