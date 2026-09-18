"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordCanonicalizer =
    require("../server-domain/semantic/ConnectorSupportRecordCanonicalizer");

test("produces deterministic v2 semantic content and hash", () => {
    const canonicalizer =
        new ConnectorSupportRecordCanonicalizer();

    const input = {
        record_date: " 2026-09-17 10:00 ",
        record_content: " 食事介助 ",
        staff_name: " 山田 ",
        record_category: " 生活 ",
        created_at: " 2026-09-17 10:05 "
    };

    const first =
        canonicalizer.process(input);

    const second =
        canonicalizer.process(input);

    assert.deepEqual(
        first.semanticContent,
        {
            semanticType: "support_record",
            fields: {
                record_date:
                    "2026-09-17 10:00",
                record_content:
                    "食事介助",
                staff_name:
                    "山田",
                record_category:
                    "生活",
                created_at:
                    "2026-09-17 10:05"
            },
            customFields: {}
        }
    );

    assert.equal(
        first.canonicalizationVersion,
        "risen-semantic-canonicalization-2"
    );

    assert.match(
        first.contentHash,
        /^[0-9a-f]{64}$/
    );

    assert.equal(
        first.contentHash,
        second.contentHash
    );

    assert.equal(
        first.canonicalString,
        second.canonicalString
    );
});

test("keeps optional blank values as null", () => {
    const canonicalizer =
        new ConnectorSupportRecordCanonicalizer();

    const result =
        canonicalizer.process({
            record_date:
                "2026-09-17 10:00",
            record_content:
                "食事介助",
            staff_name: null,
            record_category: null,
            created_at: null
        });

    assert.equal(
        result.semanticContent.fields.staff_name,
        null
    );

    assert.equal(
        result.semanticContent.fields.record_category,
        null
    );

    assert.equal(
        result.semanticContent.fields.created_at,
        null
    );
});

test("rejects blank required values", () => {
    const canonicalizer =
        new ConnectorSupportRecordCanonicalizer();

    assert.throws(
        () =>
            canonicalizer.process({
                record_date: " ",
                record_content: "食事介助",
                staff_name: null,
                record_category: null,
                created_at: null
            }),
        /record_date/
    );

    assert.throws(
        () =>
            canonicalizer.process({
                record_date:
                    "2026-09-17 10:00",
                record_content: " ",
                staff_name: null,
                record_category: null,
                created_at: null
            }),
        /record_content/
    );
});

test("rejects unsupported fields", () => {
    const canonicalizer =
        new ConnectorSupportRecordCanonicalizer();

    assert.throws(
        () =>
            canonicalizer.process({
                record_date:
                    "2026-09-17 10:00",
                record_content:
                    "食事介助",
                staff_name: null,
                record_category: null,
                created_at: null,
                resident_id:
                    "must-not-be-here"
            }),
        /unsupported fields/
    );
});
