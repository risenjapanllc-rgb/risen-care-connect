"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createServerTrustBoundaryApp
} = require(
    "./createServerTrustBoundaryApp"
);


async function withServer(
    app,
    fn
) {
    const server =
        app.listen(
            0,
            "127.0.0.1"
        );

    await new Promise(
        (resolve, reject) => {
            server.once(
                "listening",
                resolve
            );

            server.once(
                "error",
                reject
            );
        }
    );

    try {
        const address =
            server.address();

        await fn(
            `http://127.0.0.1:${address.port}`
        );
    } finally {
        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
}


function createBaseTransport() {
    return {
        async handle() {
            return {
                httpStatus:
                    404,

                body: {
                    errorCode:
                        "not_found"
                }
            };
        },

        createErrorResponse({
            httpStatus,
            errorCode
        } = {}) {
            return {
                httpStatus,

                body: {
                    errorCode
                }
            };
        }
    };
}


test(
    "mounts voice semantic analysis route without facility input",
    async () => {
        let receivedRequest;

        const app =
            createServerTrustBoundaryApp({
                transport:
                    createBaseTransport(),

                voiceSemanticAnalysisTransport: {
                    async handle(input) {
                        receivedRequest =
                            input;

                        return {
                            httpStatus:
                                200,

                            body: {
                                status:
                                    "ready",

                                recordingId:
                                    input.body
                                        .recordingId,

                                analyses:
                                    []
                            }
                        };
                    }
                }
            });

        await withServer(
            app,
            async baseUrl => {
                const response =
                    await fetch(
                        `${baseUrl}/connector/voice-semantic-analysis`,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    "RISEN-Connector credential-A",

                                "x-risen-connector-id":
                                    "connector-A"
                            },

                            body:
                                JSON.stringify({
                                    recordingId:
                                        "recording-A"
                                })
                        }
                    );

                assert.equal(
                    response.status,
                    200
                );

                const body =
                    await response.json();

                assert.equal(
                    body.status,
                    "ready"
                );

                assert.equal(
                    body.recordingId,
                    "recording-A"
                );
            }
        );

        assert.equal(
            receivedRequest.method,
            "POST"
        );

        assert.equal(
            receivedRequest.contentType,
            "application/json"
        );

        assert.equal(
            receivedRequest.headers[
                "x-risen-connector-id"
            ],
            "connector-A"
        );

        assert.deepStrictEqual(
            receivedRequest.body,
            {
                recordingId:
                    "recording-A"
            }
        );
    }
);
