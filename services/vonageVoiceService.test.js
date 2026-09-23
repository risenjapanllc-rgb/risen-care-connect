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
                                "09012345678"
                        }
                    ],

                    from: {
                        type: "phone",
                        number:
                            "05012345678"
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
                            "09012345678",

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
                            "05012345678",

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
                            "05012345678",

                        to:
                            "09012345678",

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
                            "05012345678",

                        to:
                            "09012345678",

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
                            "05012345678",

                        to:
                            "09012345678",

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
                            "05012345678",

                        to:
                            "09012345678",

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
