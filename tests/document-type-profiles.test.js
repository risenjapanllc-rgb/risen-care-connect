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

test("unknown は確認可能なデータ種別Profileを持たない", () => {
    const profiles = loadProfiles();

    assert.equal(
        profiles.getDocumentTypeProfile("unknown"),
        null
    );
});


test("support_record はSTEP3対応データ種別として定義される", () => {
    const profiles = loadProfiles();

    const profile =
        profiles.getDocumentTypeProfile(
            "support_record"
        );

    assert.equal(
        profile.type,
        "support_record"
    );

    assert.equal(
        profile.step3Supported,
        true
    );

    assert.equal(
        Object.prototype.hasOwnProperty.call(
            profile,
            "requiredMeanings"
        ),
        false
    );

    assert.equal(
        Object.prototype.hasOwnProperty.call(
            profile,
            "sourceRecordIdentityRequired"
        ),
        false
    );
});


test("recipient_certificate はSTEP3対応データ種別として定義される", () => {
    const profiles = loadProfiles();

    const profile =
        profiles.getDocumentTypeProfile(
            "recipient_certificate"
        );

    assert.equal(
        profile.step3Supported,
        true
    );
});


test("未実装種別はSTEP3非対応として定義される", () => {
    const profiles = loadProfiles();

    const profile =
        profiles.getDocumentTypeProfile(
            "individual_support_plan"
        );

    assert.equal(
        profile.step3Supported,
        false
    );
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
