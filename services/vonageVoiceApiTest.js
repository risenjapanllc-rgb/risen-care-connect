"use strict";

const {
    createVonageVoiceJwt
} = require("./vonageVoiceAuth");

async function testVonageVoiceApi() {
    const applicationId =
        String(
            process.env.VONAGE_APPLICATION_ID || ""
        ).trim();

    if (!applicationId) {
        throw new Error(
            "VONAGE_APPLICATION_ID が設定されていません"
        );
    }

    const jwt =
        createVonageVoiceJwt();

    const response =
        await fetch(
            `https://api.nexmo.com/v1/applications/${encodeURIComponent(applicationId)}`,
            {
                method: "GET",
                headers: {
                    Authorization:
                        `Bearer ${jwt}`
                }
            }
        );

    if (!response.ok) {
        const body =
            await response.text();

        throw new Error(
            `Vonage Voice API認証失敗: HTTP ${response.status} ${body}`
        );
    }

    const data =
        await response.json();

    return {
        success: true,
        applicationId:
            data.id || applicationId
    };
}

module.exports = {
    testVonageVoiceApi
};
