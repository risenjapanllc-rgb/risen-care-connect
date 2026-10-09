"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const MySqlLogicalRecordProjector =
    require(
        "./MySqlLogicalRecordProjector"
    );

test(
    "projects MySQL rows into stable logical records",
    () => {
        const projector =
            new MySqlLogicalRecordProjector();

        const result =
            projector.project({
                sourceId:
                    "residents-source",
                identityField:
                    "resident_code",
                revision:
                    "a".repeat(64),
                observedAt:
                    "2026-10-09T04:00:00.000Z",
                rows: [
                    {
                        resident_code:
                            "R001",
                        name:
                            "山田 太郎"
                    },
                    {
                        resident_code:
                            "R002",
                        name:
                            "佐藤 花子"
                    }
                ]
            });

        assert.equal(
            result.length,
            2
        );

        assert.equal(
            result[0]
                .sourceIdentity
                .value,
            "R001"
        );

        assert.equal(
            result[1]
                .sourceIdentity
                .value,
            "R002"
        );

        assert.match(
            result[0]
                .sourceRecordKey,
            /^[a-f0-9]{64}$/
        );

        assert.notEqual(
            result[0]
                .sourceRecordKey,
            result[1]
                .sourceRecordKey
        );

        assert.equal(
            result[0]
                .fields
                .name,
            "山田 太郎"
        );
    }
);

test(
    "record key is stable when row order changes",
    () => {
        const projector =
            new MySqlLogicalRecordProjector();

        const common = {
            sourceId:
                "residents-source",
            identityField:
                "resident_code",
            revision:
                "b".repeat(64)
        };

        const first =
            projector.project({
                ...common,
                rows: [
                    {
                        resident_code:
                            "R001"
                    },
                    {
                        resident_code:
                            "R002"
                    }
                ]
            });

        const second =
            projector.project({
                ...common,
                rows: [
                    {
                        resident_code:
                            "R002"
                    },
                    {
                        resident_code:
                            "R001"
                    }
                ]
            });

        const firstR001 =
            first.find(
                item =>
                    item.sourceIdentity
                        .value ===
                    "R001"
            );

        const secondR001 =
            second.find(
                item =>
                    item.sourceIdentity
                        .value ===
                    "R001"
            );

        assert.equal(
            firstR001.sourceRecordKey,
            secondR001.sourceRecordKey
        );
    }
);

test(
    "fails closed when identity value is duplicated",
    () => {
        const projector =
            new MySqlLogicalRecordProjector();

        assert.throws(
            () =>
                projector.project({
                    sourceId:
                        "residents-source",
                    identityField:
                        "resident_code",
                    revision:
                        "c".repeat(64),
                    rows: [
                        {
                            resident_code:
                                "R001"
                        },
                        {
                            resident_code:
                                "R001"
                        }
                    ]
                }),
            /duplicated/
        );
    }
);

test(
    "fails closed when identity field is blank",
    () => {
        const projector =
            new MySqlLogicalRecordProjector();

        assert.throws(
            () =>
                projector.project({
                    sourceId:
                        "residents-source",
                    identityField:
                        "resident_code",
                    revision:
                        "d".repeat(64),
                    rows: [
                        {
                            resident_code:
                                ""
                        }
                    ]
                }),
            /blank/
        );
    }
);
