"use strict";

const assert =
    require("node:assert/strict");

const test =
    require("node:test");

const ConnectorActivationTransport =
    require("./ConnectorActivationTransport");

test(
    "activates connector with a verified activation token",
    async () => {
        const calls = [];

        const transport =
            new ConnectorActivationTransport({
                activationTokenVerifier: {
                    async verify(token) {
                        calls.push({
                            type: "verify",
                            token
                        });

                        return {
                            valid: true,
                            facilityId:
                                "facility-1"
                        };
                    }
                },

                activationService: {
                    async activate(input) {
                        calls.push({
                            type: "activate",
                            input
                        });

                        return {
                            status:
                                "activated",
                            credential:
                                "issued-secret"
                        };
                    }
                }
            });

        const result =
            await transport.handle({
                method:
                    "POST",
                body: {
                    activationToken:
                        "activation-token",
                    connectorId:
                        "connector-1"
                }
            });

        assert.deepStrictEqual(
            calls,
            [
                {
                    type:
                        "verify",
                    token:
                        "activation-token"
                },
                {
                    type:
                        "activate",
                    input: {
                        connectorId:
                            "connector-1",
                        facilityId:
                            "facility-1"
                    }
                }
            ]
        );

        assert.deepStrictEqual(
            result,
            {
                httpStatus: 200,
                body: {
                    status:
                        "activated",
                    credential:
                        "issued-secret"
                }
            }
        );
    }
);

test(
    "rejects invalid activation token",
    async () => {
        const transport =
            new ConnectorActivationTransport({
                activationTokenVerifier: {
                    async verify() {
                        return {
                            valid: false
                        };
                    }
                },

                activationService: {
                    async activate() {
                        throw new Error(
                            "must not activate"
                        );
                    }
                }
            });

        const result =
            await transport.handle({
                method:
                    "POST",
                body: {
                    activationToken:
                        "invalid-token",
                    connectorId:
                        "connector-1"
                }
            });

        assert.strictEqual(
            result.httpStatus,
            401
        );

        assert.strictEqual(
            result.body.errorCode,
            "connector_activation_unauthorized"
        );
    }
);

test(
    "rejects missing activation token",
    async () => {
        const transport =
            new ConnectorActivationTransport({
                activationTokenVerifier: {
                    async verify() {
                        throw new Error(
                            "must not verify"
                        );
                    }
                },

                activationService: {
                    async activate() {
                        throw new Error(
                            "must not activate"
                        );
                    }
                }
            });

        const result =
            await transport.handle({
                method:
                    "POST",
                body: {
                    connectorId:
                        "connector-1"
                }
            });

        assert.deepStrictEqual(
            result,
            {
                httpStatus: 401,
                body: {
                    errorCode:
                        "connector_activation_unauthorized"
                }
            }
        );
    }
);

test(
    "rejects missing connector id",
    async () => {
        const transport =
            new ConnectorActivationTransport({
                activationTokenVerifier: {
                    async verify() {
                        return {
                            valid: true,
                            facilityId:
                                "facility-1"
                        };
                    }
                },

                activationService: {
                    async activate() {
                        throw new Error(
                            "must not activate"
                        );
                    }
                }
            });

        const result =
            await transport.handle({
                method:
                    "POST",
                body: {
                    activationToken:
                        "activation-token"
                }
            });

        assert.deepStrictEqual(
            result,
            {
                httpStatus: 422,
                body: {
                    errorCode:
                        "connector_activation_connector_id_required"
                }
            }
        );
    }
);

test(
    "fails closed when activation service is unavailable",
    async () => {
        const transport =
            new ConnectorActivationTransport({
                activationTokenVerifier: {
                    async verify() {
                        return {
                            valid: true,
                            facilityId:
                                "facility-1"
                        };
                    }
                },

                activationService: {
                    async activate() {
                        throw new Error(
                            "backend unavailable"
                        );
                    }
                }
            });

        const result =
            await transport.handle({
                method:
                    "POST",
                body: {
                    activationToken:
                        "activation-token",
                    connectorId:
                        "connector-1"
                }
            });

        assert.deepStrictEqual(
            result,
            {
                httpStatus: 503,
                body: {
                    errorCode:
                        "connector_activation_unavailable"
                }
            }
        );
    }
);
