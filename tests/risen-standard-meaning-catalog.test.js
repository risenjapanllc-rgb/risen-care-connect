"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    listStandardMeanings,
    findStandardMeaning
} = require("../server-domain/standard-fields/RisenStandardMeaningCatalog");

test("氏名だけを利用者名 synonym にしない", () => {
    const userName = findStandardMeaning("user", "name");
    assert.ok(userName);
    assert.equal(userName.synonyms.includes("氏名"), false);
    assert.equal(userName.synonyms.includes("name"), false);
});

test("利用者番号と受給者証番号を別の意味として保持する", () => {
    const userCode = findStandardMeaning("user", "user_code");
    const certificateNumber = findStandardMeaning(
        "recipient_certificate",
        "certificate_number"
    );

    assert.ok(userCode);
    assert.ok(certificateNumber);
    assert.notEqual(userCode.entityName, certificateNumber.entityName);
    assert.equal(
        certificateNumber.synonyms.includes("受給者証NO"),
        true
    );
});

test("記録者名と利用者名を別の意味として保持する", () => {
    const userName = findStandardMeaning("user", "name");
    const staffName = findStandardMeaning(
        "support_record",
        "staff_name"
    );

    assert.ok(userName);
    assert.ok(staffName);
    assert.notEqual(userName.entityName, staffName.entityName);
});

test("共通カタログ自体は required を持たない", () => {
    const meanings = listStandardMeanings();

    for (const meaning of meanings) {
        assert.equal(
            Object.prototype.hasOwnProperty.call(
                meaning,
                "required"
            ),
            false
        );
    }
});
