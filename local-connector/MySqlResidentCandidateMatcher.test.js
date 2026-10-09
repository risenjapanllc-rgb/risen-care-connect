"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const MySqlResidentCandidateMatcher =
    require(
        "./MySqlResidentCandidateMatcher"
    );

function record({
    key = "a".repeat(64),
    code = "R001",
    name = "山田 太郎"
} = {}) {
    return {
        sourceRecordKey:
            key,
        fields: {
            resident_code:
                code,
            name
        }
    };
}

test(
    "matches one resident by user code and verifies name",
    async () => {
        const calls = [];

        const matcher =
            new MySqlResidentCandidateMatcher({
                residentCandidateClient: {
                    async findCandidates(
                        input
                    ) {
                        calls.push(
                            input
                        );

                        return [
                            {
                                id:
                                    "resident-1",
                                userCode:
                                    "R001",
                                name:
                                    "山田太郎"
                            }
                        ];
                    }
                }
            });

        const result =
            await matcher.matchRecords({
                records: [
                    record()
                ],
                residentCodeField:
                    "resident_code",
                residentNameField:
                    "name"
            });

        assert.deepEqual(
            calls,
            [
                {
                    userCode:
                        "R001"
                }
            ]
        );

        assert.equal(
            result[0].status,
            "matched"
        );

        assert.equal(
            result[0].residentId,
            "resident-1"
        );
    }
);

test(
    "returns not_found when no resident uses the code",
    async () => {
        const matcher =
            new MySqlResidentCandidateMatcher({
                residentCandidateClient: {
                    async findCandidates() {
                        return [];
                    }
                }
            });

        const [result] =
            await matcher.matchRecords({
                records: [
                    record()
                ],
                residentCodeField:
                    "resident_code",
                residentNameField:
                    "name"
            });

        assert.equal(
            result.status,
            "not_found"
        );

        assert.equal(
            result.residentId,
            null
        );
    }
);

test(
    "fails closed when one user code returns multiple residents",
    async () => {
        const matcher =
            new MySqlResidentCandidateMatcher({
                residentCandidateClient: {
                    async findCandidates() {
                        return [
                            {
                                id:
                                    "resident-1",
                                name:
                                    "山田太郎"
                            },
                            {
                                id:
                                    "resident-2",
                                name:
                                    "山田太郎"
                            }
                        ];
                    }
                }
            });

        const [result] =
            await matcher.matchRecords({
                records: [
                    record()
                ],
                residentCodeField:
                    "resident_code",
                residentNameField:
                    "name"
            });

        assert.equal(
            result.status,
            "ambiguous"
        );

        assert.equal(
            result.residentId,
            null
        );
    }
);

test(
    "does not link when user code matches but resident name conflicts",
    async () => {
        const matcher =
            new MySqlResidentCandidateMatcher({
                residentCandidateClient: {
                    async findCandidates() {
                        return [
                            {
                                id:
                                    "resident-1",
                                userCode:
                                    "R001",
                                name:
                                    "別人 花子"
                            }
                        ];
                    }
                }
            });

        const [result] =
            await matcher.matchRecords({
                records: [
                    record()
                ],
                residentCodeField:
                    "resident_code",
                residentNameField:
                    "name"
            });

        assert.equal(
            result.status,
            "name_conflict"
        );

        assert.equal(
            result.residentId,
            null
        );
    }
);

test(
    "normalizes Japanese spacing before name comparison",
    async () => {
        const matcher =
            new MySqlResidentCandidateMatcher({
                residentCandidateClient: {
                    async findCandidates() {
                        return [
                            {
                                id:
                                    "resident-1",
                                name:
                                    "山田　太郎"
                            }
                        ];
                    }
                }
            });

        const [result] =
            await matcher.matchRecords({
                records: [
                    record({
                        name:
                            "山田 太郎"
                    })
                ],
                residentCodeField:
                    "resident_code",
                residentNameField:
                    "name"
            });

        assert.equal(
            result.status,
            "matched"
        );
    }
);
