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

test("semantic contract targetsで標準項目の選択肢を絞る", () => {
    const mapping = loadMapping();

    const fields = [
        {
            entity_name: "user",
            field_name: "name",
            display_name: "利用者名"
        },
        {
            entity_name: "support_record",
            field_name: "staff_name",
            display_name: "記録者名"
        },
        {
            entity_name: "recipient_certificate",
            field_name: "certificate_number",
            display_name: "受給者証番号"
        }
    ];

    const filtered =
        mapping.filterStandardFieldsBySemanticTargets(
            fields,
            [
                "user.name",
                "recipient_certificate.certificate_number"
            ]
        );

    assert.deepEqual(
        JSON.parse(JSON.stringify(filtered)),
        [
            fields[0],
            fields[2]
        ]
    );
});

test("semantic contract filterは未知targetを標準項目へ追加しない", () => {
    const mapping = loadMapping();

    const fields = [
        {
            entity_name: "user",
            field_name: "name",
            display_name: "利用者名"
        }
    ];

    const filtered =
        mapping.filterStandardFieldsBySemanticTargets(
            fields,
            [
                "user.name",
                "recipient_certificate.not_a_real_field"
            ]
        );

    assert.deepEqual(
        JSON.parse(JSON.stringify(filtered)),
        fields
    );
});

test("semantic contract filterは入力配列を変更しない", () => {
    const mapping = loadMapping();

    const fields = [
        {
            entity_name: "support_record",
            field_name: "staff_name",
            display_name: "記録者名"
        },
        {
            entity_name: "user",
            field_name: "name",
            display_name: "利用者名"
        }
    ];

    const before =
        JSON.stringify(fields);

    mapping.filterStandardFieldsBySemanticTargets(
        fields,
        ["user.name"]
    );

    assert.equal(
        JSON.stringify(fields),
        before
    );
});

test("semantic target membershipは許可された意味だけを認める", () => {
    const mapping = loadMapping();

    assert.equal(
        mapping.isSemanticTargetSupported(
            "user.name",
            [
                "user.name",
                "recipient_certificate.certificate_number"
            ]
        ),
        true
    );

    assert.equal(
        mapping.isSemanticTargetSupported(
            "support_record.staff_name",
            [
                "user.name",
                "recipient_certificate.certificate_number"
            ]
        ),
        false
    );
});

test("semantic target membershipはtarget名を正規化して許可しない", () => {
    const mapping = loadMapping();

    assert.equal(
        mapping.isSemanticTargetSupported(
            " user.name ",
            ["user.name"]
        ),
        false
    );
});

test("semantic target membershipは契約を取得できない場合fail closedになる", () => {
    const mapping = loadMapping();

    assert.equal(
        mapping.isSemanticTargetSupported(
            "user.name",
            []
        ),
        false
    );

    assert.equal(
        mapping.isSemanticTargetSupported(
            "user.name",
            null
        ),
        false
    );
});

test("recipient_certificateはsemantic contract内targetだけを許可する", () => {
    const mapping = loadMapping();

    assert.equal(
        mapping.isSemanticTargetAllowedForDocumentType(
            "recipient_certificate",
            "user.name",
            ["user.name"]
        ),
        true
    );

    assert.equal(
        mapping.isSemanticTargetAllowedForDocumentType(
            "recipient_certificate",
            "support_record.staff_name",
            ["user.name"]
        ),
        false
    );
});

test("recipient_certificateはsemantic contract未取得時にfail closedになる", () => {
    const mapping = loadMapping();

    assert.equal(
        mapping.isSemanticTargetAllowedForDocumentType(
            "recipient_certificate",
            "user.name",
            []
        ),
        false
    );

    assert.equal(
        mapping.isSemanticTargetAllowedForDocumentType(
            "recipient_certificate",
            "user.name",
            null
        ),
        false
    );
});

test("recipient_certificate以外には受給者証contractを適用しない", () => {
    const mapping = loadMapping();

    assert.equal(
        mapping.isSemanticTargetAllowedForDocumentType(
            "support_record",
            "support_record.staff_name",
            []
        ),
        true
    );

    assert.equal(
        mapping.isSemanticTargetAllowedForDocumentType(
            null,
            "support_record.staff_name",
            []
        ),
        true
    );
});

test("確認済みでも現在のdocument contract外ならhistorical confirmedとして扱う", () => {
    const mapping = loadMapping();

    assert.equal(
        mapping.getSemanticConfirmationValidity(
            "confirmed",
            "recipient_certificate",
            "support_record.staff_name",
            ["user.name"]
        ),
        "confirmed_outside_current_contract"
    );
});

test("確認済みで現在のdocument contract内ならcurrent confirmedとして扱う", () => {
    const mapping = loadMapping();

    assert.equal(
        mapping.getSemanticConfirmationValidity(
            "confirmed",
            "recipient_certificate",
            "user.name",
            ["user.name"]
        ),
        "confirmed_current"
    );
});

test("未確認状態をhistorical confirmedへ昇格させない", () => {
    const mapping = loadMapping();

    assert.equal(
        mapping.getSemanticConfirmationValidity(
            "pending",
            "recipient_certificate",
            "support_record.staff_name",
            ["user.name"]
        ),
        "not_confirmed"
    );

    assert.equal(
        mapping.getSemanticConfirmationValidity(
            "deferred",
            "recipient_certificate",
            "user.name",
            ["user.name"]
        ),
        "not_confirmed"
    );
});

test(
    "confirmed semantic mapping remains unconfirmed when the semantic contract has not been loaded",
    () => {
        const mapping = loadMapping();

        assert.equal(
            mapping.getSemanticConfirmationValidity(
                "confirmed",
                "recipient_certificate",
                "user.name",
                null
            ),
            "contract_unconfirmed"
        );
    }
);

test(
    "confirmed semantic mapping is outside the current contract only after a loaded contract excludes it",
    () => {
        const mapping = loadMapping();

        assert.equal(
            mapping.getSemanticConfirmationValidity(
                "confirmed",
                "recipient_certificate",
                "user.name",
                []
            ),
            "confirmed_outside_current_contract"
        );
    }
);
