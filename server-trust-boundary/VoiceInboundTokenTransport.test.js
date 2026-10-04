"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceInboundTokenTransport =
    require("./VoiceInboundTokenTransport");

test(
    "returns inbound client token for trusted connector request",
    async () => {
        const transport =
            new VoiceInboundTokenTransport({
                tokenService: {
                    async issue(input) {
                        assert.deepEqual(
                            input,
                            {
                                connectorId:
                                    "connector-A",
                                credential:
                                    "credential-A"
                            }
                        );

                        return {
                            status:
                                "issued",
                            token:
                                "jwt-token",
                            expiresIn:
                                900
                        };
                    }
                },
                credentialTransport: {
                    extract(value) {
                        assert.equal(
                            value,
                            "RISEN-Connector credential-A"
                        );

                        return "credential-A";
                    }
                }
            });

        const response =
            await transport.handle({
                method:
                    "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "RISEN-Connector credential-A",
                    "x-risen-connector-id":
                        "connector-A"
                },
                body: {}
            });

        assert.equal(
            response.httpStatus,
            200
        );

        assert.equal(
            response.body.status,
            "issued"
        );

        assert.equal(
            response.body.token,
            "jwt-token"
        );

        assert.equal(
            response.body.expiresIn,
            900
        );

        assert.equal(
            typeof response.body.requestId,
            "string"
        );
    }
);

test(
    "rejects payload fields on inbound token request",
    async () => {
        const transport =
            new VoiceInboundTokenTransport({
                tokenService: {
                    async issue() {
                        throw new Error(
                            "must not be called"
                        );
                    }
                },
                credentialTransport: {
                    extract() {
                        return "credential-A";
                    }
                }
            });

        const response =
            await transport.handle({
                method:
                    "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "RISEN-Connector credential-A",
                    "x-risen-connector-id":
                        "connector-A"
                },
                body: {
                    contactId:
                        "must-not-be-here"
                }
            });

        assert.equal(
            response.httpStatus,
            400
        );

        assert.equal(
            response.body.errorCode,
            "malformed_json"
        );
    }
);
