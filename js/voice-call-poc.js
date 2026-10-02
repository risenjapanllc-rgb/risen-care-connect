"use strict";

(() => {
    const TEST_CASE_ID =
        "7d30d60c-04ed-43b5-8f51-bb0f367585ad";

    const TEST_CONTACT_ID =
        "761bf00f-b582-4800-ad10-539180fd7dae";

    const statusElement =
        document.getElementById(
            "status"
        );

    const timerElement =
        document.getElementById(
            "timer"
        );

    const callButton =
        document.getElementById(
            "callButton"
        );

    const muteButton =
        document.getElementById(
            "muteButton"
        );

    const hangupButton =
        document.getElementById(
            "hangupButton"
        );

    const audioOutput =
        document.getElementById(
            "audioOutput"
        );

    const refreshDevicesButton =
        document.getElementById(
            "refreshDevicesButton"
        );

    if (
        !window.vonageClientSDK ||
        typeof window
            .vonageClientSDK
            .VonageClient !==
            "function"
    ) {
        statusElement.textContent =
            "Vonage Client SDKを読み込めませんでした";

        callButton.disabled =
            true;

        return;
    }

    const client =
        new window
            .vonageClientSDK
            .VonageClient();

    let sessionReady =
        false;

    let currentCallId =
        null;

    let muted =
        false;

    let timerStartedAt =
        null;

    let timerHandle =
        null;


    function setStatus(message) {
        statusElement.textContent =
            message;
    }


    function formatDuration(
        milliseconds
    ) {
        const seconds =
            Math.max(
                0,
                Math.floor(
                    milliseconds /
                    1000
                )
            );

        const minutes =
            Math.floor(
                seconds / 60
            );

        const remaining =
            seconds % 60;

        return (
            String(minutes)
                .padStart(2, "0") +
            ":" +
            String(remaining)
                .padStart(2, "0")
        );
    }


    function stopTimer() {
        if (timerHandle) {
            clearInterval(
                timerHandle
            );

            timerHandle =
                null;
        }

        timerStartedAt =
            null;
    }


    function startTimer() {
        stopTimer();

        timerStartedAt =
            Date.now();

        timerElement.textContent =
            "00:00";

        timerHandle =
            setInterval(
                () => {
                    timerElement
                        .textContent =
                        formatDuration(
                            Date.now() -
                            timerStartedAt
                        );
                },
                1000
            );
    }


    function resetCallControls({
        status =
            "発信準備完了"
    } = {}) {
        currentCallId =
            null;

        muted =
            false;

        stopTimer();

        muteButton.textContent =
            "ミュート";

        muteButton.disabled =
            true;

        hangupButton.disabled =
            true;

        callButton.disabled =
            false;

        setStatus(status);
    }


    async function ensureMicrophonePermission() {
        if (
            !navigator.mediaDevices ||
            typeof navigator
                .mediaDevices
                .getUserMedia !==
                "function"
        ) {
            throw new Error(
                "このブラウザではマイクを利用できません"
            );
        }

        const stream =
            await navigator
                .mediaDevices
                .getUserMedia({
                    audio: true
                });

        for (
            const track
            of stream.getTracks()
        ) {
            track.stop();
        }
    }


    async function requestVoiceToken() {
        const response =
            await fetch(
                "/api/voice/client-token",
                {
                    method:
                        "POST",

                    headers: {
                        "content-type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            caseId:
                                TEST_CASE_ID,

                            contactId:
                                TEST_CONTACT_ID
                        })
                }
            );

        let body = {};

        try {
            body =
                await response.json();
        } catch (error) {
            body = {};
        }

        if (
            response.status !== 200 ||
            body.status !==
                "issued" ||
            typeof body.token !==
                "string" ||
            !body.token ||
            typeof body.intentId !==
                "string" ||
            !body.intentId
        ) {
            throw new Error(
                body.errorCode ||
                "voice_token_request_failed"
            );
        }

        return {
            token:
                body.token,

            intentId:
                body.intentId
        };
    }


    async function ensureSession(token) {
        if (sessionReady) {
            return;
        }

        setStatus(
            "Vonageへ接続しています…"
        );

        await client.createSession(
            token
        );

        sessionReady =
            true;
    }


    async function refreshAudioOutputs() {
        if (
            !navigator.mediaDevices ||
            typeof navigator
                .mediaDevices
                .enumerateDevices !==
                "function"
        ) {
            audioOutput.innerHTML =
                "<option>出力先選択に未対応</option>";

            audioOutput.disabled =
                true;

            return;
        }

        const devices =
            await navigator
                .mediaDevices
                .enumerateDevices();

        const outputs =
            devices.filter(
                device =>
                    device.kind ===
                    "audiooutput"
            );

        audioOutput.innerHTML =
            "";

        if (
            outputs.length === 0
        ) {
            const option =
                document
                    .createElement(
                        "option"
                    );

            option.textContent =
                "利用可能な出力先がありません";

            audioOutput.appendChild(
                option
            );

            audioOutput.disabled =
                true;

            return;
        }

        outputs.forEach(
            (device, index) => {
                const option =
                    document
                        .createElement(
                            "option"
                        );

                option.value =
                    device.deviceId;

                option.textContent =
                    device.label ||
                    `音声出力 ${index + 1}`;

                audioOutput.appendChild(
                    option
                );
            }
        );

        let audioElement =
            null;

        try {
            audioElement =
                client
                    .getAudioOutputElement();
        } catch (error) {
            audioElement =
                null;
        }

        audioOutput.disabled =
            !audioElement ||
            typeof audioElement
                .setSinkId !==
                "function";
    }


    async function changeAudioOutput() {
        const deviceId =
            audioOutput.value;

        if (!deviceId) {
            return;
        }

        const audioElement =
            client
                .getAudioOutputElement();

        if (
            !audioElement ||
            typeof audioElement
                .setSinkId !==
                "function"
        ) {
            setStatus(
                "このブラウザでは音声出力先を変更できません"
            );

            return;
        }

        await audioElement.setSinkId(
            deviceId
        );

        setStatus(
            currentCallId
                ? "音声出力先を変更しました"
                : "音声出力先を設定しました"
        );
    }


    client.on(
        "legStatusUpdate",
        (
            eventCallId,
            legId,
            status
        ) => {
            const normalizedStatus =
                String(
                    status || ""
                ).toUpperCase();

            if (
                currentCallId &&
                eventCallId &&
                eventCallId !==
                    currentCallId
            ) {
                return;
            }

            if (
                normalizedStatus ===
                "ANSWERED"
            ) {
                setStatus(
                    "通話中"
                );

                startTimer();

                refreshAudioOutputs()
                    .catch(() => {});
            } else if (
                normalizedStatus ===
                "COMPLETED"
            ) {
                resetCallControls({
                    status:
                        "通話が終了しました"
                });
            } else if (
                normalizedStatus
            ) {
                setStatus(
                    `通話状態: ${normalizedStatus}`
                );
            }
        }
    );


    client.on(
        "callHangup",
        (
            eventCallId,
            callQuality,
            reason
        ) => {
            if (
                currentCallId &&
                eventCallId &&
                eventCallId !==
                    currentCallId
            ) {
                return;
            }

            const suffix =
                reason
                    ? ` (${String(reason)})`
                    : "";

            resetCallControls({
                status:
                    `通話が終了しました${suffix}`
            });
        }
    );


    client.on(
        "sessionError",
        error => {
            sessionReady =
                false;

            resetCallControls({
                status:
                    "Vonageセッションでエラーが発生しました"
            });

            console.error(
                "Vonage session error:",
                error
            );
        }
    );


    callButton.addEventListener(
        "click",
        async () => {
            if (currentCallId) {
                return;
            }

            callButton.disabled =
                true;

            setStatus(
                "マイクを確認しています…"
            );

            try {
                await ensureMicrophonePermission();

                await refreshAudioOutputs();

                setStatus(
                    "発信準備をしています…"
                );

                const {
                    token,
                    intentId
                } =
                    await requestVoiceToken();

                await ensureSession(
                    token
                );

                setStatus(
                    "発信しています…"
                );

                /*
                 * 電話番号は渡さない。
                 *
                 * intentIdだけがVonageの
                 * custom_dataとして
                 * /voice/answerへ渡される。
                 */
                currentCallId =
                    await client.serverCall({
                        intentId
                    });

                muteButton.disabled =
                    false;

                hangupButton.disabled =
                    false;

                await refreshAudioOutputs();

            } catch (error) {
                console.error(
                    "Voice call error:",
                    error
                );

                resetCallControls({
                    status:
                        `発信できませんでした: ${
                            error?.message ||
                            "unknown_error"
                        }`
                });
            }
        }
    );


    muteButton.addEventListener(
        "click",
        async () => {
            if (!currentCallId) {
                return;
            }

            muteButton.disabled =
                true;

            try {
                if (muted) {
                    await client.unmute(
                        currentCallId
                    );

                    muted =
                        false;

                    muteButton.textContent =
                        "ミュート";
                } else {
                    await client.mute(
                        currentCallId
                    );

                    muted =
                        true;

                    muteButton.textContent =
                        "ミュート解除";
                }
            } catch (error) {
                console.error(
                    "Mute error:",
                    error
                );

                setStatus(
                    "ミュート操作に失敗しました"
                );
            } finally {
                if (currentCallId) {
                    muteButton.disabled =
                        false;
                }
            }
        }
    );


    hangupButton.addEventListener(
        "click",
        async () => {
            if (!currentCallId) {
                return;
            }

            const callId =
                currentCallId;

            hangupButton.disabled =
                true;

            setStatus(
                "通話を終了しています…"
            );

            try {
                await client.hangup(
                    callId
                );

                resetCallControls({
                    status:
                        "通話を終了しました"
                });
            } catch (error) {
                console.error(
                    "Hangup error:",
                    error
                );

                hangupButton.disabled =
                    false;

                setStatus(
                    "通話終了操作に失敗しました"
                );
            }
        }
    );


    refreshDevicesButton
        .addEventListener(
            "click",
            async () => {
                try {
                    await ensureMicrophonePermission();

                    await refreshAudioOutputs();

                    setStatus(
                        "音声出力先を更新しました"
                    );
                } catch (error) {
                    setStatus(
                        "音声デバイスを確認できませんでした"
                    );
                }
            }
        );


    audioOutput.addEventListener(
        "change",
        () => {
            changeAudioOutput()
                .catch(error => {
                    console.error(
                        "Audio output error:",
                        error
                    );

                    setStatus(
                        "音声出力先を変更できませんでした"
                    );
                });
        }
    );


    refreshAudioOutputs()
        .catch(() => {});
})();
