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
        entityName: "recipient_certificate",
        fieldName: "certificate_number",
        displayName: "受給者証番号",
        synonyms: Object.freeze(["受給者証NO", "受給者証No", "受給者証番号"])
    }),
    Object.freeze({
        entityName: "recipient_certificate",
        fieldName: "valid_until",
        displayName: "受給者証有効期限",
        synonyms: Object.freeze(["有効期限", "受給者証有効期限"])
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
