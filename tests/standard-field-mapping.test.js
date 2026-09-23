"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");

function loadMapping() {
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(
        fs.readFileSync("js/standard-field-mapping.js", "utf8"),
        context
    );
    return context.window.RisenStandardFieldMapping;
}

const standardFields = [
    {
        entity_name: "user",
        field_name: "name",
        display_name: "利用者名",
        synonyms: [
            "利用者名",
            "利用者氏名",
            "user_name",
            "client_name"
        ]
    },
    {
        entity_name: "support_record",
        field_name: "staff_name",
        display_name: "記録者名",
        synonyms: [
            "記録者",
            "記録者名",
            "記入者",
            "担当職員",
            "職員名",
            "staff_name"
        ]
    },
    {
        entity_name: "other",
        field_name: "name",
        display_name: "別の名前",
        synonyms: []
    }
];

test("氏名だけでは人物の役割を推測しない", () => {
    const mapping = loadMapping();
    assert.equal(
        mapping.findStandardFieldSuggestion("氏名", standardFields),
        null
    );
});

test("利用者氏名は user.name の候補にする", () => {
    const mapping = loadMapping();
    const result = mapping.findStandardFieldSuggestion(
        "利用者氏名",
        standardFields
    );
    assert.equal(result.entity_name, "user");
    assert.equal(result.field_name, "name");
});

test("記入者は support_record.staff_name の候補にする", () => {
    const mapping = loadMapping();
    const result = mapping.findStandardFieldSuggestion(
        "記入者",
        standardFields
    );
    assert.equal(result.entity_name, "support_record");
    assert.equal(result.field_name, "staff_name");
});

test("担当職員は support_record.staff_name の候補にする", () => {
    const mapping = loadMapping();
    const result = mapping.findStandardFieldSuggestion(
        "担当職員",
        standardFields
    );
    assert.equal(result.entity_name, "support_record");
    assert.equal(result.field_name, "staff_name");
});


test("生年月日は user.birth_date の候補にする", () => {
    const mapping = loadMapping();
    const fields = [
        {
            entity_name: "user",
            field_name: "birth_date",
            display_name: "生年月日"
        }
    ];

    const result =
        mapping.findStandardFieldSuggestion(
            "生年月日",
            fields
        );

    assert.ok(result);
    assert.equal(result.entity_name, "user");
    assert.equal(result.field_name, "birth_date");
});


test("共通カタログ synonyms から受給者証番号を候補にする", () => {
    const mapping = loadMapping();
    const fields = [{
        entity_name: "recipient_certificate",
        field_name: "certificate_number",
        display_name: "受給者証番号",
        synonyms: ["受給者証NO", "受給者証No", "受給者証番号"]
    }];

    const result =
        mapping.findStandardFieldSuggestion(
            "受給者証NO",
            fields
        );

    assert.ok(result);
    assert.equal(
        result.field_name,
        "certificate_number"
    );
});

test("共通カタログ synonyms から有効期限を候補にする", () => {
    const mapping = loadMapping();
    const fields = [{
        entity_name: "recipient_certificate",
        field_name: "valid_until",
        display_name: "受給者証有効期限",
        synonyms: ["有効期限", "受給者証有効期限"]
    }];

    const result =
        mapping.findStandardFieldSuggestion(
            "有効期限",
            fields
        );

    assert.ok(result);
    assert.equal(result.field_name, "valid_until");
});

test("括弧付き生年月日を正規化して候補にする", () => {
    const mapping = loadMapping();
    const fields = [{
        entity_name: "user",
        field_name: "birth_date",
        display_name: "生年月日",
        synonyms: ["生年月日", "誕生日", "birth_date"]
    }];

    const result =
        mapping.findStandardFieldSuggestion(
            "(生年月日)",
            fields
        );

    assert.ok(result);
    assert.equal(result.entity_name, "user");
    assert.equal(result.field_name, "birth_date");
});

test("社員番号だけでは利用者番号にも職員番号にも決めない", () => {
    const mapping = loadMapping();
    const fields = [{
        entity_name: "user",
        field_name: "user_code",
        display_name: "利用者番号",
        synonyms: ["利用者番号", "利用者コード", "user_code"]
    }];

    assert.equal(
        mapping.findStandardFieldSuggestion(
            "社員番号",
            fields
        ),
        null
    );
});

test("複数の意味に一致する場合は自動提案しない", () => {
    const mapping = loadMapping();
    const fields = [
        {
            entity_name: "user",
            field_name: "example_a",
            display_name: "A",
            synonyms: ["共通名称"]
        },
        {
            entity_name: "staff",
            field_name: "example_b",
            display_name: "B",
            synonyms: ["共通名称"]
        }
    ];

    assert.equal(
        mapping.findStandardFieldSuggestion(
            "共通名称",
            fields
        ),
        null
    );
});
