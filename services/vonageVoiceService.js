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


function normalizeJapanesePhoneNumber(
    value,
    label
) {
    const normalized =
        String(value || "").trim();

    if (!normalized) {
        throw new Error(
            `発信${label}電話番号が必要です`
        );
    }

    if (normalized.startsWith("+")) {
        if (
            !/^\+\d{1,15}$/.test(
                normalized
            )
        ) {
            throw new Error(
                `発信${label}電話番号の形式が不正です`
            );
        }

        return normalized;
    }

    const digits =
        normalized.replace(
            /[-\s()]/g,
            ""
        );

    if (
        /^0\d{9,10}$/.test(digits)
    ) {
        return (
            "+81" +
            digits.slice(1)
        );
    }

    throw new Error(
        `発信${label}電話番号の形式が不正です`
    );
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
    ncco,
    createJwt =
        createVonageVoiceJwt
}) {
    const applicationId =
        getRequiredEnv(
            "VONAGE_APPLICATION_ID"
        );

    const normalizedFrom =
        normalizeJapanesePhoneNumber(
            from,
            "元"
        );

    const normalizedTo =
        normalizeJapanesePhoneNumber(
            to,
            "先"
        );

    const hasNcco =
        Array.isArray(ncco) &&
        ncco.length > 0;

    if (!hasNcco) {
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
    }

    const jwt =
        createJwt();

    const requestBody = {
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
        }
    };

    if (hasNcco) {
        requestBody.ncco =
            ncco;
    } else {
        requestBody.answer_url = [
            answerUrl
        ];

        requestBody.event_url = [
            eventUrl
        ];
    }

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

                body:
                    JSON.stringify(
                        requestBody
                    )
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
