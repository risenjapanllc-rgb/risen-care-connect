"use strict";

const assert =
    require("node:assert/strict");

const test =
    require("node:test");

const ConnectorActivationService =
    require("./ConnectorActivationService");

test(
    "generates credential, stores only its hash, and returns credential once",
    async () => {
        const calls = [];

        const service =
            new ConnectorActivationService({
                credentialGenerator: {
                    generate() {
                        calls.push({
                            type:
                                "generate"
                        });

                        return "generated-secret";
                    }
                },

                credentialHasher: {
                    hash(credential) {
                        calls.push({
                            type:
                                "hash",
                            credential
                        });

                        return "credential-hash";
                    }
                },

                registrationRepository: {
                    async activateRegistration(
                        input
                    ) {
                        calls.push({
                            type:
                                "activateRegistration",
                            input
                        });

                        return {
                            status:
                                "activated"
                        };
                    }
                }
            });

        const result =
            await service.activate({
                connectorId:
                    "connector-1",
                facilityId:
                    "facility-1"
            });

        assert.deepStrictEqual(
            calls,
            [
                {
                    type:
                        "generate"
                },
                {
                    type:
                        "hash",
                    credential:
                        "generated-secret"
                },
                {
                    type:
                        "activateRegistration",
                    input: {
                        connectorId:
                            "connector-1",
                        facilityId:
                            "facility-1",
                        credentialHash:
                            "credential-hash"
                    }
                }
            ]
        );

        assert.deepStrictEqual(
            result,
            {
                status:
                    "activated",
                credential:
                    "generated-secret"
            }
        );
    }
);

test(
    "rejects activation without connector or facility identity",
    async () => {
        const service =
            new ConnectorActivationService({
                credentialGenerator: {
                    generate() {
                        throw new Error(
                            "must not generate"
                        );
                    }
                },
                credentialHasher: {
                    hash() {
                        throw new Error(
                            "must not hash"
                        );
                    }
                },
                registrationRepository: {
                    async activateRegistration() {
                        throw new Error(
                            "must not persist"
                        );
                    }
                }
            });

        await assert.rejects(
            () =>
                service.activate({
                    connectorId: "",
                    facilityId:
                        "facility-1"
                }),
            /identity is invalid/
        );

        await assert.rejects(
            () =>
                service.activate({
                    connectorId:
                        "connector-1",
                    facilityId: ""
                }),
            /identity is invalid/
        );
    }
);

test(
    "rejects an invalid generated credential before persistence",
    async () => {
        let persisted = false;

        const service =
            new ConnectorActivationService({
                credentialGenerator: {
                    generate() {
                        return "";
                    }
                },
                credentialHasher: {
                    hash() {
                        throw new Error(
                            "must not hash"
                        );
                    }
                },
                registrationRepository: {
                    async activateRegistration() {
                        persisted = true;
                    }
                }
            });

        await assert.rejects(
            () =>
                service.activate({
                    connectorId:
                        "connector-1",
                    facilityId:
                        "facility-1"
                }),
            /generated connector credential is invalid/
        );

        assert.strictEqual(
            persisted,
            false
        );
    }
);

test(
    "rejects an invalid credential hash before persistence",
    async () => {
        let persisted = false;

        const service =
            new ConnectorActivationService({
                credentialGenerator: {
                    generate() {
                        return "generated-secret";
                    }
                },
                credentialHasher: {
                    hash() {
                        return "";
                    }
                },
                registrationRepository: {
                    async activateRegistration() {
                        persisted = true;
                    }
                }
            });

        await assert.rejects(
            () =>
                service.activate({
                    connectorId:
                        "connector-1",
                    facilityId:
                        "facility-1"
                }),
            /credential hash is invalid/
        );

        assert.strictEqual(
            persisted,
            false
        );
    }
);

test(
    "does not return credential when persistence does not activate registration",
    async () => {
        const service =
            new ConnectorActivationService({
                credentialGenerator: {
                    generate() {
                        return "generated-secret";
                    }
                },
                credentialHasher: {
                    hash() {
                        return "credential-hash";
                    }
                },
                registrationRepository: {
                    async activateRegistration() {
                        return {
                            status:
                                "rejected"
                        };
                    }
                }
            });

        await assert.rejects(
            () =>
                service.activate({
                    connectorId:
                        "connector-1",
                    facilityId:
                        "facility-1"
                }),
            /activation persistence failed/
        );
    }
);
