"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const VoiceCallTransport =
    require("./VoiceCallTransport");


function createTransport({
    adapterResult = {
        statusCode: 409,
        body: {
            status: "not_ready",
            errorCode:
                "facility_phone_number_not_configured"
        }
    }
} = {}) {
    const calls = [];

    const transport =
        new VoiceCallTransport({
            httpAdapter: {
                async handle(args) {
                    calls.push(args);

                    return adapterResult;
                }
            },

            credentialTransport: {
                extract(value) {
                    if (
                        value ===
                        "Bearer test-token"
                    ) {
                        return "test-credential";
                    }

                    return null;
                }
            }
        });

    return {
        transport,
        calls
    };
}


test(
    "正常なVoiceリクエストをAdapterへ渡す",
    async () => {
        const {
            transport,
            calls
        } = createTransport();

        const result =
            await transport.handle({
                method: "POST",

                contentType:
                    "application/json",

                headers: {
                    "X-Risen-Connector-Id":
                        "connector-A",

                    Authorization:
                        "Bearer test-token"
                },

                body: {
                    to:
                        "09012345678",

                    answerUrl:
                        "https://example.com/answer",

                    eventUrl:
                        "https://example.com/event"
                }
            });

        assert.equal(
            result.httpStatus,
            409
        );

        assert.equal(
            calls.length,
            1
        );

        assert.equal(
            calls[0].connectorId,
            "connector-A"
        );

        assert.equal(
            calls[0].credential,
            "test-credential"
        );

        assert.equal(
            calls[0].to,
            "09012345678"
        );
    }
);


test(
    "facilityIdをHTTP入力に含めた場合は拒否する",
    async () => {
        const {
            transport,
            calls
        } = createTransport();

        const result =
            await transport.handle({
                method: "POST",

                contentType:
                    "application/json",

                headers: {
                    "x-risen-connector-id":
                        "connector-A",

                    authorization:
                        "Bearer test-token"
                },

                body: {
                    facilityId:
                        "facility-ATTACKER",

                    to:
                        "09012345678"
                }
            });

        assert.equal(
            result.httpStatus,
            400
        );

        assert.equal(
            result.body.errorCode,
            "malformed_json"
        );

        assert.equal(
            calls.length,
            0
        );
    }
);


test(
    "Connector IDがなければ拒否する",
    async () => {
        const {
            transport,
            calls
        } = createTransport();

        const result =
            await transport.handle({
                method: "POST",

                contentType:
                    "application/json",

                headers: {
                    authorization:
                        "Bearer test-token"
                },

                body: {
                    to:
                        "09012345678"
                }
            });

        assert.equal(
            result.httpStatus,
            401
        );

        assert.equal(
            result.body.errorCode,
            "connector_trust_denied"
        );

        assert.equal(
            calls.length,
            0
        );
    }
);


test(
    "Authorizationがなければ拒否する",
    async () => {
        const {
            transport,
            calls
        } = createTransport();

        const result =
            await transport.handle({
                method: "POST",

                contentType:
                    "application/json",

                headers: {
                    "x-risen-connector-id":
                        "connector-A"
                },

                body: {
                    to:
                        "09012345678"
                }
            });

        assert.equal(
            result.httpStatus,
            401
        );

        assert.equal(
            result.body.errorCode,
            "connector_trust_denied"
        );

        assert.equal(
            calls.length,
            0
        );
    }
);


test(
    "POST以外は拒否する",
    async () => {
        const {
            transport,
            calls
        } = createTransport();

        const result =
            await transport.handle({
                method: "GET",

                contentType:
                    "application/json",

                headers: {},

                body: {}
            });

        assert.equal(
            result.httpStatus,
            405
        );

        assert.equal(
            calls.length,
            0
        );
    }
);


test(
    "JSON以外のContent-Typeは拒否する",
    async () => {
        const {
            transport,
            calls
        } = createTransport();

        const result =
            await transport.handle({
                method: "POST",

                contentType:
                    "text/plain",

                headers: {},

                body: {}
            });

        assert.equal(
            result.httpStatus,
            415
        );

        assert.equal(
            calls.length,
            0
        );
    }
);


test(
    "Adapterのnot_readyをそのまま返す",
    async () => {
        const {
            transport
        } = createTransport({
            adapterResult: {
                statusCode: 409,

                body: {
                    status:
                        "not_ready",

                    errorCode:
                        "facility_phone_number_not_configured"
                }
            }
        });

        const result =
            await transport.handle({
                method: "POST",

                contentType:
                    "application/json",

                headers: {
                    "x-risen-connector-id":
                        "connector-A",

                    authorization:
                        "Bearer test-token"
                },

                body: {
                    to:
                        "09012345678"
                }
            });

        assert.equal(
            result.httpStatus,
            409
        );

        assert.equal(
            result.body.status,
            "not_ready"
        );
    }
);
