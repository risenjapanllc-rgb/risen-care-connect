"use strict";

const {
    createVonageVoiceJwt
} = require("./vonageVoiceAuth");

function getRequiredEnv(name) {
    const value =
        String(process.env[name] || "").trim();

    if (!value) {
        throw new Error(
            `${name} が設定されていません`
        );
    }

    return value;
}

/**
 * Vonage Voice APIへ発信要求を送る。
 *
 * 実発信を行うため、
 * from / to が指定された場合のみ呼び出す。
 */
async function createOutboundCall({
    from,
    to,
    answerUrl,
    eventUrl,
    createJwt =
        createVonageVoiceJwt
}) {
    const applicationId =
        getRequiredEnv(
            "VONAGE_APPLICATION_ID"
        );

    const normalizedFrom =
        String(from || "").trim();

    const normalizedTo =
        String(to || "").trim();

    if (!normalizedFrom) {
        throw new Error(
            "発信元電話番号(from)が必要です"
        );
    }

    if (!normalizedTo) {
        throw new Error(
            "発信先電話番号(to)が必要です"
        );
    }

    if (!answerUrl) {
        throw new Error(
            "answerUrl が必要です"
        );
    }

    if (!eventUrl) {
        throw new Error(
            "eventUrl が必要です"
        );
    }

    const jwt =
        createJwt();

    const response =
        await fetch(
            "https://api.nexmo.com/v1/calls",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${jwt}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    to: [
                        {
                            type: "phone",
                            number:
                                normalizedTo
                        }
                    ],

                    from: {
                        type: "phone",
                        number:
                            normalizedFrom
                    },

                    answer_url: [
                        answerUrl
                    ],

                    event_url: [
                        eventUrl
                    ]
                })
            }
        );

    const body =
        await response.text();

    let data = null;

    try {
        data =
            body
                ? JSON.parse(body)
                : null;
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        throw new Error(
            `Vonage発信APIエラー: HTTP ${response.status}`
        );
    }

    return data;
}

module.exports = {
    createOutboundCall
};
