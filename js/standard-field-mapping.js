"use strict";

/**
 * RISEN CARE標準項目への「候補」を探す共通ロジック。
 *
 * これは自動確定ではない。
 * standardFields に実在する項目だけを候補として返す。
 *
 * resident_id など識別子系は、この関数では自動提案しない。
 */

function normalizeStandardFieldSourceName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFKC")
        .replace(/[\s\-]+/g, "_");
}

function isAmbiguousIdentifierSourceName(value) {
    const normalized =
        normalizeStandardFieldSourceName(value);

    return (
        normalized === "id" ||
        normalized.endsWith("_id") ||
        normalized.includes("利用者番号") ||
        normalized.includes("利用者id") ||
        normalized.includes("利用者_id") ||
        normalized.includes("利用者コード")
    );
}

function findStandardFieldSuggestion(
    sourceName,
    standardFields = []
) {
    if (
        !Array.isArray(standardFields) ||
        isAmbiguousIdentifierSourceName(sourceName)
    ) {
        return null;
    }

    const normalized =
        normalizeStandardFieldSourceName(sourceName);

    const aliases = {
        record_date: [
            "record_date",
            "record_datetime",
            "記録日時",
            "日時"
        ],

        record_content: [
            "record_content",
            "support_content",
            "支援記録本文",
            "支援内容",
            "処遇内容"
        ],

        staff_name: [
            "staff_name",
            "記録者",
            "記録者名",
            "記入者"
        ],

        record_category: [
            "record_category",
            "記録区分",
            "種類"
        ],

        created_at: [
            "created_at",
            "登録日時",
            "作成日時"
        ],

        name: [
            "name",
            "user_name",
            "client_name",
            "full_name",
            "利用者名",
            "氏名"
        ],

        birthday: [
            "birthday",
            "birth_date",
            "date_of_birth",
            "dob",
            "生年月日"
        ],

        gender: [
            "gender",
            "sex",
            "性別"
        ],

        blood_type: [
            "blood_type",
            "bloodtype",
            "blood type",
            "血液型"
        ],

        postal_code: [
            "postal_code",
            "postcode",
            "zip",
            "zip_code",
            "郵便番号"
        ],

        address: [
            "address",
            "user_address",
            "住所"
        ],

        phone: [
            "phone",
            "telephone",
            "tel",
            "phone_number",
            "固定電話",
            "固定電話番号",
            "電話番号"
        ],

        mobile: [
            "mobile",
            "mobile_phone",
            "cell_phone",
            "mobile_number",
            "携帯",
            "携帯番号",
            "携帯電話",
            "携帯電話番号"
        ],

        email: [
            "email",
            "e_mail",
            "mail",
            "email_address",
            "メール",
            "メールアドレス"
        ]
    };

    const normalizedAliases =
        Object.entries(aliases)
            .find(([, aliasList]) =>
                aliasList.some(alias =>
                    normalizeStandardFieldSourceName(alias) ===
                    normalized
                )
            );

    const targetFieldName =
        normalizedAliases?.[0] || normalized;

    return (
        standardFields.find(field =>
            normalizeStandardFieldSourceName(
                field?.field_name
            ) === targetFieldName
        ) ||
        null
    );
}

window.RisenStandardFieldMapping = {
    normalizeStandardFieldSourceName,
    isAmbiguousIdentifierSourceName,
    findStandardFieldSuggestion
};
