"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createServerTrustBoundaryApp
} = require("./createServerTrustBoundaryApp");


function createBaseTransport() {
    return {
        async handle() {
            return {
                httpStatus: 200,
                body: {
                    status:
                        "ok"
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


function listen(app) {
    return new Promise(
        (resolve, reject) => {
            const server =
                app.listen(
                    0,
                    "127.0.0.1",
                    () => resolve(server)
                );

            server.once(
                "error",
                reject
            );
        }
    );
}


function close(server) {
    return new Promise(
        (resolve, reject) => {
            server.close(
                error => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                }
            );
        }
    );
}


test(
    "POST /voice/event forwards only headers and JSON body to the voice event transport",
    async () => {
        let received;

        const app =
            createServerTrustBoundaryApp({
                transport:
                    createBaseTransport(),

                voiceEventTransport: {
                    async handle(input) {
                        received =
                            input;

                        return {
                            httpStatus: 200,

                            body: {
                                status:
                                    "accepted",

                                transitionStatus:
                                    "updated",

                                resultStatus:
                                    "connected"
                            }
                        };
                    }
                }
            });

        const server =
            await listen(app);

        try {
            const address =
                server.address();

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/voice/event`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                "Bearer signed-test"
                        },

                        body:
                            JSON.stringify({
                                conversation_uuid:
                                    "CON-A",

                                status:
                                    "answered",

                                timestamp:
                                    "2026-10-02T03:00:05Z"
                            })
                    }
                );

            assert.equal(
                response.status,
                200
            );

            assert.equal(
                received.headers.authorization,
                "Bearer signed-test"
            );

            assert.deepEqual(
                received.body,
                {
                    conversation_uuid:
                        "CON-A",

                    status:
                        "answered",

                    timestamp:
                        "2026-10-02T03:00:05Z"
                }
            );

            const body =
                await response.json();

            assert.deepEqual(
                body,
                {
                    status:
                        "accepted",

                    transitionStatus:
                        "updated",

                    resultStatus:
                        "connected"
                }
            );
        } finally {
            await close(server);
        }
    }
);


test(
    "/voice/event accepts POST only",
    async () => {
        let called =
            false;

        const app =
            createServerTrustBoundaryApp({
                transport:
                    createBaseTransport(),

                voiceEventTransport: {
                    async handle() {
                        called =
                            true;

                        return {
                            httpStatus: 200,
                            body: {
                                status:
                                    "accepted"
                            }
                        };
                    }
                }
            });

        const server =
            await listen(app);

        try {
            const address =
                server.address();

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/voice/event`,
                    {
                        method:
                            "GET"
                    }
                );

            assert.equal(
                response.status,
                404
            );

            assert.equal(
                called,
                false
            );
        } finally {
            await close(server);
        }
    }
);
