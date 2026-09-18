"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordPreviewComparator =
    require("./ConnectorSupportRecordPreviewComparator");

const comparator =
    new ConnectorSupportRecordPreviewComparator();

const source = {
    resident_id: "resident-1",
    record_date: "2026-09-17T10:00:00+09:00",
    record_content: "支援記録",
    staff_name: "職員A",
    record_category: "日常",
    created_at: "2026-09-17T10:01:00+09:00"
};

function existing(fields = {}) {
    return {
        residentId: "resident-1",
        semanticType: "support_record",
        canonicalizationVersion:
            "risen-semantic-canonicalization-2",
        semanticContent: {
            semanticType: "support_record",
            fields: {
                record_date:
                    source.record_date,
                record_content:
                    source.record_content,
                staff_name:
                    source.staff_name,
                record_category:
                    source.record_category,
                created_at:
                    source.created_at,
                ...fields
            },
            customFields: {}
        }
    };
}

test("new identity is classified as new", () => {
    const result =
        comparator.compare({
            sourceRow: source,
            existingRecord: null
        });

    assert.equal(result.status, "new");
});

test("equal v2 record is unchanged", () => {
    const result =
        comparator.compare({
            sourceRow: source,
            existingRecord: existing()
        });

    assert.equal(
        result.status,
        "unchanged"
    );
});

test("different nonblank source value is update", () => {
    const result =
        comparator.compare({
            sourceRow: {
                ...source,
                record_content:
                    "更新された支援記録"
            },
            existingRecord: existing()
        });

    assert.equal(result.status, "update");
});

test("blank optional source preserves existing value", () => {
    const result =
        comparator.compare({
            sourceRow: {
                ...source,
                staff_name: ""
            },
            existingRecord: existing()
        });

    assert.equal(
        result.status,
        "unchanged"
    );
    assert.equal(
        result.mergedFields.staff_name,
        "職員A"
    );
});

test("resident mismatch requires review", () => {
    const record = existing();
    record.residentId = "resident-2";

    const result =
        comparator.compare({
            sourceRow: source,
            existingRecord: record
        });

    assert.equal(result.status, "review");
    assert.equal(
        result.reason,
        "resident_mismatch"
    );
});

test("v1 record requires review", () => {
    const record = existing();
    record.canonicalizationVersion =
        "risen-semantic-canonicalization-1";
    record.semanticContent = {
        semanticType: "support_record",
        fields: {
            supportContent:
                "旧形式の支援記録"
        },
        customFields: {}
    };

    const result =
        comparator.compare({
            sourceRow: source,
            existingRecord: record
        });

    assert.equal(result.status, "review");
    assert.equal(
        result.reason,
        "canonicalization_incompatible"
    );
});

test("semantic type mismatch requires review", () => {
    const record = existing();
    record.semanticType = "other_record";

    const result =
        comparator.compare({
            sourceRow: source,
            existingRecord: record
        });

    assert.equal(result.status, "review");
});
