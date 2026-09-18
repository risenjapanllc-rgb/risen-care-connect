"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordPreviewFingerprint =
    require("./ConnectorSupportRecordPreviewFingerprint");

const fingerprint =
    new ConnectorSupportRecordPreviewFingerprint();

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);

function entries() {
    return [
        {
            sourceRecordKey: "source-2",
            residentId: "resident-2",
            action: "update",
            recordId: "record-2",
            baselineHash: A,
            targetHash: B
        },
        {
            sourceRecordKey: "source-1",
            residentId: "resident-1",
            action: "new",
            recordId: null,
            baselineHash: null,
            targetHash: C
        }
    ];
}

test(
    "same preview plan produces deterministic fingerprint",
    () => {
        const first =
            fingerprint.create(entries());

        const second =
            fingerprint.create(entries());

        assert.match(
            first,
            /^[0-9a-f]{64}$/
        );
        assert.equal(first, second);
    }
);

test(
    "source row processing order does not change fingerprint",
    () => {
        const original =
            entries();

        const reversed =
            [...original].reverse();

        assert.equal(
            fingerprint.create(original),
            fingerprint.create(reversed)
        );
    }
);

test(
    "source record ordering uses deterministic UTF-8 byte order",
    () => {
        const entries = [
            {
                sourceRecordKey: "あ",
                residentId: "resident-1",
                action: "new",
                recordId: null,
                baselineHash: null,
                targetHash: "a".repeat(64)
            },
            {
                sourceRecordKey: "A",
                residentId: "resident-2",
                action: "new",
                recordId: null,
                baselineHash: null,
                targetHash: "b".repeat(64)
            },
            {
                sourceRecordKey: "é",
                residentId: "resident-3",
                action: "new",
                recordId: null,
                baselineHash: null,
                targetHash: "c".repeat(64)
            }
        ];

        assert.equal(
            fingerprint.create(entries),
            fingerprint.create([
                entries[2],
                entries[0],
                entries[1]
            ])
        );
    }
);

test(
    "changing any identity or hash changes fingerprint",
    () => {
        const original =
            entries();

        const expected =
            fingerprint.create(original);

        for (const changed of [
            {
                ...original[0],
                residentId: "resident-3"
            },
            {
                ...original[0],
                recordId: "record-3"
            },
            {
                ...original[0],
                baselineHash: C
            },
            {
                ...original[0],
                targetHash: C
            }
        ]) {
            assert.notEqual(
                expected,
                fingerprint.create([
                    changed,
                    original[1]
                ])
            );
        }
    }
);

test(
    "duplicate source record identity is rejected",
    () => {
        const original =
            entries();

        assert.throws(
            () =>
                fingerprint.create([
                    original[0],
                    {
                        ...original[1],
                        sourceRecordKey:
                            original[0]
                                .sourceRecordKey
                    }
                ]),
            TypeError
        );
    }
);

test(
    "new action cannot carry existing record baseline",
    () => {
        assert.throws(
            () =>
                fingerprint.create([
                    {
                        sourceRecordKey:
                            "source-1",
                        residentId:
                            "resident-1",
                        action: "new",
                        recordId:
                            "record-1",
                        baselineHash: A,
                        targetHash: B
                    }
                ]),
            TypeError
        );
    }
);
