"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createOutboundCall
} = require("./vonageVoiceService");


function createFetchMock({
    ok = true,
    status = 200,
    body = {
        uuid: "test-call-id"
    }
} = {}) {
    const calls = [];

    const originalFetch =
        global.fetch;

    global.fetch =
        async function (
            url,
            options
        ) {
            calls.push({
                url,
                options
            });

            return {
                ok,
                status,

                async text() {
                    return JSON.stringify(body);
                }
            };
        };

    return {
        calls,

        restore() {
            global.fetch =
                originalFetch;
        }
    };
}


function setRequiredEnv() {
    process.env.VONAGE_APPLICATION_ID =
        "test-application-id";
}


test(
    "Vonageへ正しい発信要求を送る",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        const originalJwt =
            require("./vonageVoiceAuth")
                .createVonageVoiceJwt;

        require("./vonageVoiceAuth")
            .createVonageVoiceJwt =
            () => "test-jwt";

        try {
            const result =
                await createOutboundCall({
                    from:
                        "05012345678",

                    to:
                        "09012345678",

                    answerUrl:
                        "https://example.com/answer",

                    eventUrl:
                        "https://example.com/event",

                    createJwt:
                        () => "test-jwt"
                });

            assert.deepEqual(
                result,
                {
                    uuid:
                        "test-call-id"
                }
            );

            assert.equal(
                calls.length,
                1
            );

            assert.equal(
                calls[0].url,
                "https://api.nexmo.com/v1/calls"
            );

            assert.equal(
                calls[0].options.method,
                "POST"
            );

            assert.equal(
                calls[0].options.headers.Authorization,
                "Bearer test-jwt"
            );

            assert.equal(
                calls[0].options.headers[
                    "Content-Type"
                ],
                "application/json"
            );

            assert.deepEqual(
                JSON.parse(
                    calls[0].options.body
                ),
                {
                    to: [
                        {
                            type: "phone",
                            number:
                                "819012345678"
                        }
                    ],

                    from: {
                        type: "phone",
                        number:
                            "815012345678"
                    },

                    answer_url: [
                        "https://example.com/answer"
                    ],

                    event_url: [
                        "https://example.com/event"
                    ]
                }
            );

        } finally {
            require("./vonageVoiceAuth")
                .createVonageVoiceJwt =
                originalJwt;

            restore();
        }
    }
);


test(
    "fromが空ならVonageを呼ばない",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await assert.rejects(
                () =>
                    createOutboundCall({
                        from: "",

                        to:
                            "819012345678",

                        answerUrl:
                            "https://example.com/answer",

                        eventUrl:
                            "https://example.com/event"
                    }),
                /発信元電話番号/
            );

            assert.equal(
                calls.length,
                0
            );
        } finally {
            restore();
        }
    }
);


test(
    "toが空ならVonageを呼ばない",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await assert.rejects(
                () =>
                    createOutboundCall({
                        from:
                            "815012345678",

                        to: "",

                        answerUrl:
                            "https://example.com/answer",

                        eventUrl:
                            "https://example.com/event"
                    }),
                /発信先電話番号/
            );

            assert.equal(
                calls.length,
                0
            );
        } finally {
            restore();
        }
    }
);


test(
    "answerUrlがなければVonageを呼ばない",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await assert.rejects(
                () =>
                    createOutboundCall({
                        from:
                            "815012345678",

                        to:
                            "819012345678",

                        eventUrl:
                            "https://example.com/event"
                    }),
                /answerUrl/
            );

            assert.equal(
                calls.length,
                0
            );
        } finally {
            restore();
        }
    }
);


test(
    "eventUrlがなければVonageを呼ばない",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await assert.rejects(
                () =>
                    createOutboundCall({
                        from:
                            "815012345678",

                        to:
                            "819012345678",

                        answerUrl:
                            "https://example.com/answer"
                    }),
                /eventUrl/
            );

            assert.equal(
                calls.length,
                0
            );
        } finally {
            restore();
        }
    }
);


test(
    "Vonage APIがエラーなら例外にする",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock({
            ok: false,
            status: 401,
            body: {
                error:
                    "unauthorized"
            }
        });

        try {
            await assert.rejects(
                () =>
                    createOutboundCall({
                        from:
                            "815012345678",

                        to:
                            "819012345678",

                        answerUrl:
                            "https://example.com/answer",

                        eventUrl:
                            "https://example.com/event",

                    createJwt:
                        () => "test-jwt"
                    }),
                /Vonage発信APIエラー: HTTP 401/
            );

            assert.equal(
                calls.length,
                1
            );
        } finally {
            restore();
        }
    }
);


test(
    "VONAGE_APPLICATION_IDがなければ発信しない",
    async () => {
        const previous =
            process.env.VONAGE_APPLICATION_ID;

        delete process.env.VONAGE_APPLICATION_ID;

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await assert.rejects(
                () =>
                    createOutboundCall({
                        from:
                            "815012345678",

                        to:
                            "819012345678",

                        answerUrl:
                            "https://example.com/answer",

                        eventUrl:
                            "https://example.com/event"
                    }),
                /VONAGE_APPLICATION_ID が設定されていません/
            );

            assert.equal(
                calls.length,
                0
            );
        } finally {
            if (
                previous === undefined
            ) {
                delete process.env.VONAGE_APPLICATION_ID;
            } else {
                process.env.VONAGE_APPLICATION_ID =
                    previous;
            }

            restore();
        }
    }
);


test(
    "NCCOを指定した場合はanswerUrlとeventUrlなしでVonageへ発信要求を送る",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await createOutboundCall({
                from:
                    "815032021021",

                to:
                    "819049373052",

                ncco: [
                    {
                        action:
                            "talk",

                        text:
                            "RISEN CAREの音声発信テストです。"
                    }
                ],

                createJwt:
                    () => "test-jwt"
            });

            assert.equal(
                calls.length,
                1
            );

            assert.deepEqual(
                JSON.parse(
                    calls[0].options.body
                ),
                {
                    to: [
                        {
                            type: "phone",
                            number:
                                "819049373052"
                        }
                    ],

                    from: {
                        type: "phone",
                        number:
                            "815032021021"
                    },

                    ncco: [
                        {
                            action:
                                "talk",

                            text:
                                "RISEN CAREの音声発信テストです。"
                        }
                    ]
                }
            );
        } finally {
            restore();
        }
    }
);


test(
    "国内050番号をE.164へ正規化する",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await createOutboundCall({
                from:
                    "05032021021",

                to:
                    "09049373052",

                ncco: [
                    {
                        action:
                            "talk",

                        text:
                            "test"
                    }
                ],

                createJwt:
                    () => "test-jwt"
            });

            const body =
                JSON.parse(
                    calls[0].options.body
                );

            assert.equal(
                body.from.number,
                "815032021021"
            );

            assert.equal(
                body.to[0].number,
                "819049373052"
            );
        } finally {
            restore();
        }
    }
);


test(
    "ハイフン付き国内番号をE.164へ正規化する",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await createOutboundCall({
                from:
                    "050-3202-1021",

                to:
                    "090-4937-3052",

                ncco: [
                    {
                        action:
                            "talk",

                        text:
                            "test"
                    }
                ],

                createJwt:
                    () => "test-jwt"
            });

            const body =
                JSON.parse(
                    calls[0].options.body
                );

            assert.equal(
                body.from.number,
                "815032021021"
            );

            assert.equal(
                body.to[0].number,
                "819049373052"
            );
        } finally {
            restore();
        }
    }
);


test(
    "既にE.164形式なら番号を変更しない",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await createOutboundCall({
                from:
                    "815032021021",

                to:
                    "819049373052",

                ncco: [
                    {
                        action:
                            "talk",

                        text:
                            "test"
                    }
                ],

                createJwt:
                    () => "test-jwt"
            });

            const body =
                JSON.parse(
                    calls[0].options.body
                );

            assert.equal(
                body.from.number,
                "815032021021"
            );

            assert.equal(
                body.to[0].number,
                "819049373052"
            );
        } finally {
            restore();
        }
    }
);


test(
    "先頭plus付き国際形式はVonage Voice形式へ変換する",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await createOutboundCall({
                from:
                    "+815032021021",

                to:
                    "+819049373052",

                ncco: [
                    {
                        action:
                            "talk",

                        text:
                            "test"
                    }
                ],

                createJwt:
                    () => "test-jwt"
            });

            const body =
                JSON.parse(
                    calls[0].options.body
                );

            assert.equal(
                body.from.number,
                "815032021021"
            );

            assert.equal(
                body.to[0].number,
                "819049373052"
            );
        } finally {
            restore();
        }
    }
);


test(
    "不正な電話番号ならVonageを呼ばない",
    async () => {
        setRequiredEnv();

        const {
            calls,
            restore
        } = createFetchMock();

        try {
            await assert.rejects(
                () =>
                    createOutboundCall({
                        from:
                            "050123",

                        to:
                            "09049373052",

                        ncco: [
                            {
                                action:
                                    "talk",

                                text:
                                    "test"
                            }
                        ],

                        createJwt:
                            () => "test-jwt"
                    }),
                /電話番号の形式が不正です/
            );

            assert.equal(
                calls.length,
                0
            );
        } finally {
            restore();
        }
    }
);
