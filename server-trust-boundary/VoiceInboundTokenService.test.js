"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceInboundTokenService =
    require("./VoiceInboundTokenService");

test(
    "issues inbound client token after connector trust verification",
    async () => {
        const service =
            new VoiceInboundTokenService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "verified",
                            verifiedContext: {
                                facilityId:
                                    "facility-A"
                            }
                        };
                    }
                },
                clientTokenFactory({
                    subject
                }) {
                    assert.equal(
                        subject,
                        "risencare-emergency"
                    );

                    return "jwt-token";
                }
            });

        const result =
            await service.issue({
                connectorId:
                    "connector-A",
                credential:
                    "credential-A"
            });

        assert.deepEqual(
            result,
            {
                status:
                    "issued",
                token:
                    "jwt-token",
                expiresIn:
                    15 * 60
            }
        );
    }
);

test(
    "does not issue token when connector trust is denied",
    async () => {
        const service =
            new VoiceInboundTokenService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "denied"
                        };
                    }
                },
                clientTokenFactory() {
                    throw new Error(
                        "must not be called"
                    );
                }
            });

        const result =
            await service.issue({
                connectorId:
                    "connector-A",
                credential:
                    "credential-A"
            });

        assert.equal(
            result.status,
            "denied"
        );
    }
);
