"use strict";

const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const MySqlSourceAdapter =
    require("./MySqlSourceAdapter");

function createConnection({
    rows,
    fields,
    calls
}) {
    return {
        async execute(
            query,
            params
        ) {
            calls.push({
                type: "execute",
                query,
                params
            });

            return [
                rows,
                fields
            ];
        },

        async end() {
            calls.push({
                type: "end"
            });
        }
    };
}

test(
    "MySQL acquisition emits the common tabular raw document",
    async () => {
        const calls = [];

        const adapter =
            new MySqlSourceAdapter({
                sourceId:
                    "resident-support",
                query:
                    "SELECT resident_name, room_no FROM support",
                queryParams: [],
                connectionFactory:
                    async () =>
                        createConnection({
                            calls,
                            rows: [
                                {
                                    resident_name:
                                        "山田太郎",
                                    room_no:
                                        101
                                }
                            ],
                            fields: [
                                {
                                    name:
                                        "resident_name"
                                },
                                {
                                    name:
                                        "room_no"
                                }
                            ]
                        }),
                clock:
                    () =>
                        new Date(
                            "2026-09-11T00:00:00.000Z"
                        )
            });

        const observation =
            await adapter.observe(
                "resident-support",
                {
                    sourceDocumentKey:
                        "opaque-resident-support-key"
                }
            );

        const result =
            await adapter.acquireRaw(
                "resident-support"
            );

        assert.strictEqual(
            observation.sourceDocumentKey,
            "opaque-resident-support-key"
        );

        assert.match(
            observation.revision,
            /^[a-f0-9]{64}$/
        );

        assert.deepStrictEqual(
            result,
            {
                sourceType:
                    "mysql",
                source: {
                    fileName:
                        "resident-support.mysql",
                    updatedAt:
                        "2026-09-11T00:00:00.000Z"
                },
                document: {
                    sheetNames: [
                        "resident-support"
                    ],
                    sheets: [
                        {
                            sheetName:
                                "resident-support",
                            rows: [
                                [
                                    "resident_name",
                                    "room_no"
                                ],
                                [
                                    "山田太郎",
                                    "101"
                                ]
                            ]
                        }
                    ]
                }
            }
        );

        assert.strictEqual(
            calls.filter(
                call =>
                    call.type ===
                    "execute"
            ).length,
            1
        );
    }
);

test(
    "same query result produces the same revision",
    async () => {
        const revisions = [];

        for (
            let index = 0;
            index < 2;
            index += 1
        ) {
            const adapter =
                new MySqlSourceAdapter({
                    sourceId:
                        "support",
                    query:
                        "SELECT id, note FROM support ORDER BY id",
                    connectionFactory:
                        async () =>
                            createConnection({
                                calls: [],
                                rows: [
                                    {
                                        id: 1,
                                        note:
                                            "見守り"
                                    }
                                ],
                                fields: [
                                    {
                                        name:
                                            "id"
                                    },
                                    {
                                        name:
                                            "note"
                                    }
                                ]
                            })
                });

            const result =
                await adapter.observe(
                    "support",
                    {
                        sourceDocumentKey:
                            "opaque-support-key"
                    }
                );

            revisions.push(
                result.revision
            );
        }

        assert.strictEqual(
            revisions[0],
            revisions[1]
        );
    }
);

test(
    "connection details never enter adapter output",
    async () => {
        const secret =
            "DO-NOT-LEAK";

        const adapter =
            new MySqlSourceAdapter({
                sourceId:
                    "support",
                query:
                    "SELECT note FROM support",
                connectionFactory:
                    async () => ({
                        host:
                            "private-db",
                        user:
                            "private-user",
                        password:
                            secret,
                        async execute() {
                            return [
                                [
                                    {
                                        note:
                                            "確認"
                                    }
                                ],
                                [
                                    {
                                        name:
                                            "note"
                                    }
                                ]
                            ];
                        },
                        async end() {}
                    })
            });

        const observation =
            await adapter.observe(
                "support",
                {
                    sourceDocumentKey:
                        "opaque-support-key"
                }
            );

        const acquisition =
            await adapter.acquireRaw(
                "support"
            );

        const serialized =
            JSON.stringify({
                observation,
                acquisition
            });

        assert.strictEqual(
            serialized.includes(
                secret
            ),
            false
        );

        assert.strictEqual(
            serialized.includes(
                "private-db"
            ),
            false
        );

        assert.strictEqual(
            serialized.includes(
                "private-user"
            ),
            false
        );
    }
);

test(
    "query failure still closes the connection",
    async () => {
        let ended = false;

        const adapter =
            new MySqlSourceAdapter({
                sourceId:
                    "support",
                query:
                    "SELECT note FROM support",
                connectionFactory:
                    async () => ({
                        async execute() {
                            throw new Error(
                                "database failed"
                            );
                        },
                        async end() {
                            ended = true;
                        }
                    })
            });

        await assert.rejects(
            adapter.observe(
                "support",
                {
                    sourceDocumentKey:
                        "opaque-support-key"
                }
            ),
            /database failed/
        );

        assert.strictEqual(
            ended,
            true
        );
    }
);
