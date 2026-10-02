"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VonageRecordingDownloadService =
    require("./VonageRecordingDownloadService");

function fakeHeaders(
    values = {}
) {
    return {
        get(name) {
            return (
                values[
                    String(name)
                        .toLowerCase()
                ] ??
                null
            );
        }
    };
}

test(
    "downloads a recording with Application JWT",
    async () => {
        let fetchUrl =
            null;

        let fetchOptions =
            null;

        const payload =
            Buffer.from(
                "RIFF-test-audio"
            );

        const service =
            new VonageRecordingDownloadService({
                createJwt() {
                    return "test-jwt";
                },

                async fetchImpl(
                    url,
                    options
                ) {
                    fetchUrl =
                        url;

                    fetchOptions =
                        options;

                    return {
                        ok:
                            true,

                        headers:
                            fakeHeaders({
                                "content-length":
                                    String(
                                        payload.length
                                    ),

                                "content-type":
                                    "audio/wav"
                            }),

                        async arrayBuffer() {
                            return payload;
                        }
                    };
                }
            });

        const result =
            await service.download({
                recordingUrl:
                    "https://api-us.nexmo.com/v1/files/recording-A"
            });

        assert.equal(
            fetchUrl,
            "https://api-us.nexmo.com/v1/files/recording-A"
        );

        assert.equal(
            fetchOptions.method,
            "GET"
        );

        assert.equal(
            fetchOptions.redirect,
            "error"
        );

        assert.equal(
            fetchOptions.headers.Authorization,
            "Bearer test-jwt"
        );

        assert.equal(
            result.size,
            payload.length
        );

        assert.equal(
            result.contentType,
            "audio/wav"
        );

        assert.deepEqual(
            result.data,
            payload
        );
    }
);

test(
    "rejects unsafe recording URLs before authentication or fetch",
    async () => {
        let jwtCalled =
            false;

        let fetchCalled =
            false;

        const service =
            new VonageRecordingDownloadService({
                createJwt() {
                    jwtCalled =
                        true;

                    return "test-jwt";
                },

                async fetchImpl() {
                    fetchCalled =
                        true;

                    throw new Error(
                        "must not fetch"
                    );
                }
            });

        const unsafeUrls = [
            "http://api-us.nexmo.com/v1/files/A",
            "https://example.com/v1/files/A",
            "https://api-us.nexmo.com/not-files/A",
            "https://api-us.nexmo.com/v1/files/A?x=1",
            "https://user:pass@api-us.nexmo.com/v1/files/A"
        ];

        for (
            const recordingUrl
            of unsafeUrls
        ) {
            await assert.rejects(
                () =>
                    service.download({
                        recordingUrl
                    }),
                /voice_recording_url_invalid/
            );
        }

        assert.equal(
            jwtCalled,
            false
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);

test(
    "rejects non-successful download responses",
    async () => {
        const service =
            new VonageRecordingDownloadService({
                createJwt() {
                    return "test-jwt";
                },

                async fetchImpl() {
                    return {
                        ok:
                            false,

                        status:
                            401,

                        headers:
                            fakeHeaders()
                    };
                }
            });

        await assert.rejects(
            () =>
                service.download({
                    recordingUrl:
                        "https://api-us.nexmo.com/v1/files/recording-A"
                }),
            /voice_recording_download_failed/
        );
    }
);

test(
    "enforces maximum recording size",
    async () => {
        const service =
            new VonageRecordingDownloadService({
                maxBytes:
                    4,

                createJwt() {
                    return "test-jwt";
                },

                async fetchImpl() {
                    return {
                        ok:
                            true,

                        headers:
                            fakeHeaders({
                                "content-length":
                                    "5"
                            }),

                        async arrayBuffer() {
                            return Buffer.from(
                                "12345"
                            );
                        }
                    };
                }
            });

        await assert.rejects(
            () =>
                service.download({
                    recordingUrl:
                        "https://api-us.nexmo.com/v1/files/recording-A"
                }),
            /voice_recording_too_large/
        );
    }
);
