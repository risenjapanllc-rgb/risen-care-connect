"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ResidentProfileProjection,
    WRITABLE_USER_FIELDS
} = require("./ResidentProfileProjection");

test("projects confirmed user fields into empty resident profile fields", () => {
    const projection = new ResidentProfileProjection();

    const result = projection.project({
        semanticContent: {
            "user.name": "鈴木 大輔",
            "user.birth_date": "1977-02-22",
            "user.gender": "男性",
            "recipient_certificate.certificate_number": "1234567893"
        },
        currentResident: {}
    });

    assert.deepStrictEqual(result.fill, {
        name: "鈴木 大輔",
        birth_date: "1977-02-22",
        gender: "男性"
    });
    assert.deepStrictEqual(result.unchanged, {});
    assert.deepStrictEqual(result.conflicts, {});
});

test("classifies equal values as unchanged", () => {
    const projection = new ResidentProfileProjection();

    const result = projection.project({
        semanticContent: {
            "user.name": "鈴木 大輔",
            "user.gender": "男性"
        },
        currentResident: {
            name: "鈴木 大輔",
            gender: "男性"
        }
    });

    assert.deepStrictEqual(result.fill, {});
    assert.deepStrictEqual(result.unchanged, {
        name: "鈴木 大輔",
        gender: "男性"
    });
    assert.deepStrictEqual(result.conflicts, {});
});

test("does not overwrite conflicting resident values", () => {
    const projection = new ResidentProfileProjection();

    const result = projection.project({
        semanticContent: {
            "user.birth_date": "1977-02-22"
        },
        currentResident: {
            birth_date: "1977-02-23"
        }
    });

    assert.deepStrictEqual(result.fill, {});
    assert.deepStrictEqual(result.unchanged, {});
    assert.deepStrictEqual(result.conflicts, {
        birth_date: {
            existing: "1977-02-23",
            incoming: "1977-02-22"
        }
    });
});

test("ignores non-user semantic namespaces and unknown user fields", () => {
    const projection = new ResidentProfileProjection();

    const result = projection.project({
        semanticContent: {
            "staff.name": "職員A",
            "support_record.staff_name": "職員B",
            "recipient_certificate.certificate_number": "1234567893",
            "user.facility_id": "must-not-write",
            "user.active": "false"
        },
        currentResident: {}
    });

    assert.deepStrictEqual(result, {
        fill: {},
        unchanged: {},
        conflicts: {}
    });
});

test("writable fields are explicitly limited", () => {
    assert.deepStrictEqual(
        WRITABLE_USER_FIELDS,
        ["name", "birth_date", "gender", "user_code"]
    );
});

test("does not project ambiguous or impossible birth dates", () => {
    const projection = new ResidentProfileProjection();

    for (const birthDate of [
        "2/22/77",
        "2026-02-30",
        "1977-2-22"
    ]) {
        const result = projection.project({
            semanticContent: {
                "user.name": "鈴木 大輔",
                "user.birth_date": birthDate,
                "user.gender": "男性"
            },
            currentResident: {}
        });

        assert.deepStrictEqual(result.fill, {
            name: "鈴木 大輔",
            gender: "男性"
        });
        assert.deepStrictEqual(result.unchanged, {});
        assert.deepStrictEqual(result.conflicts, {});
    }
});
