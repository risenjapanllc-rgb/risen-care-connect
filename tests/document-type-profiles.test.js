"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");

function loadProfiles() {
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(
        fs.readFileSync("js/document-type-profiles.js", "utf8"),
        context
    );
    return context.window.RisenDocumentTypeProfiles;
}

test("unknown は支援記録の必須項目を要求しない", () => {
    const profiles = loadProfiles();
    const result = profiles.getStep3RequirementState("unknown", []);
    assert.equal(result.status, "document_type_unresolved");
    assert.equal(result.missingRequiredMeanings.length, 0);
});

test("support_record は既存3項目を必須にする", () => {
    const profiles = loadProfiles();
    const result = profiles.getStep3RequirementState("support_record", []);
    assert.equal(result.status, "required_mapping_missing");
    assert.deepEqual(
        Array.from(result.missingRequiredMeanings, item => item.label),
        ["利用者名", "記録日時", "支援記録本文"]
    );
});

test("support_record は3項目確認済みなら ready", () => {
    const profiles = loadProfiles();
    const mappings = [
        { standardEntityName: "user", standardFieldName: "name" },
        { standardEntityName: "support_record", standardFieldName: "record_date" },
        { standardEntityName: "support_record", standardFieldName: "record_content" }
    ];
    const result = profiles.getStep3RequirementState(
        "support_record",
        mappings
    );
    assert.equal(result.status, "ready");
});

test("未実装種別を支援記録として通さない", () => {
    const profiles = loadProfiles();
    const result = profiles.getStep3RequirementState(
        "individual_support_plan",
        []
    );
    assert.equal(result.status, "document_type_not_supported");
});


test("自動判定だけでは人間確認済みにならない", () => {
    const profiles = loadProfiles();
    const result = profiles.resolveConfirmedDocumentType(
        "support_record",
        null
    );

    assert.equal(result.status, "confirmation_required");
    assert.equal(result.documentType, null);
    assert.equal(result.detectedProfile.type, "support_record");
});

test("人間が確認したデータ種別を確定値として返す", () => {
    const profiles = loadProfiles();
    const result = profiles.resolveConfirmedDocumentType(
        "unknown",
        "recipient_certificate"
    );

    assert.equal(result.status, "confirmed");
    assert.equal(result.documentType, "recipient_certificate");
    assert.equal(result.profile.label, "受給者証");
});

test("利用者基本情報も共通データ種別候補に含む", () => {
    const profiles = loadProfiles();
    const types = Array.from(
        profiles.listConfirmableDocumentTypes(),
        item => item.type
    );

    assert.equal(types.includes("resident_master"), true);
    assert.equal(types.includes("recipient_certificate"), true);
});

test("未確認値を自動判定値で代用しない", () => {
    const profiles = loadProfiles();
    const result = profiles.resolveConfirmedDocumentType(
        "individual_support_plan",
        ""
    );

    assert.equal(result.status, "confirmation_required");
    assert.equal(result.documentType, null);
});
