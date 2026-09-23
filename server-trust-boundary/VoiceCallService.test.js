"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const VoiceCallService =
    require("./VoiceCallService");


function createService({
    trustResult = {
        status: "verified",
        verifiedContext: {
            facilityId: "facility-A"
        }
    },
    phoneNumber = {
        id: "phone-A",
        facilityId: "facility-A",
        phoneNumber: "05012345678",
        provider: "vonage",
        status: "active"
    },
    vonageResult = {
        uuid: "test-call-id"
    }
} = {}) {
    const calls = {
        trust: [],
        phone: [],
        vonage: []
    };

    const service =
        new VoiceCallService({
            connectorTrustService: {
                async authenticate(args) {
                    calls.trust.push(args);
                    return trustResult;
                }
            },

            facilityPhoneNumberRepository: {
                async findActiveByFacilityId(
                    facilityId
                ) {
                    calls.phone.push(
                        facilityId
                    );

                    return phoneNumber;
                }
            },

            vonageVoiceService: {
                async createOutboundCall(
                    args
                ) {
                    calls.vonage.push(args);
                    return vonageResult;
                }
            }
        });

    return {
        service,
        calls
    };
}


test(
    "発信先が空なら発信しない",
    async () => {
        const {
            service,
            calls
        } = createService();

        const result =
            await service.call({
                connectorId:
                    "connector-A",
                credential:
                    "credential-A",
                to: ""
            });

        assert.equal(
            result.status,
            "invalid"
        );

        assert.equal(
            calls.trust.length,
            0
        );

        assert.equal(
            calls.phone.length,
            0
        );

        assert.equal(
            calls.vonage.length,
            0
        );
    }
);


test(
    "Trust Boundaryで拒否された場合は発信しない",
    async () => {
        const {
            service,
            calls
        } = createService({
            trustResult: {
                status: "denied"
            }
        });

        const result =
            await service.call({
                connectorId:
                    "connector-A",
                credential:
                    "credential-A",
                to:
                    "09012345678"
            });

        assert.equal(
            result.status,
            "denied"
        );

        assert.equal(
            calls.phone.length,
            0
        );

        assert.equal(
            calls.vonage.length,
            0
        );
    }
);


test(
    "施設の050番号が未設定なら発信しない",
    async () => {
        const {
            service,
            calls
        } = createService({
            phoneNumber: null
        });

        const result =
            await service.call({
                connectorId:
                    "connector-A",
                credential:
                    "credential-A",
                to:
                    "09012345678"
            });

        assert.equal(
            result.status,
            "not_ready"
        );

        assert.equal(
            result.errorCode,
            "facility_phone_number_not_configured"
        );

        assert.deepEqual(
            calls.phone,
            ["facility-A"]
        );

        assert.equal(
            calls.vonage.length,
            0
        );
    }
);


test(
    "verifiedFacilityIdの050番号をfromとしてVonageへ渡す",
    async () => {
        const {
            service,
            calls
        } = createService();

        const result =
            await service.call({
                connectorId:
                    "connector-A",
                credential:
                    "credential-A",
                to:
                    "09012345678",

                answerUrl:
                    "https://example.com/answer",

                eventUrl:
                    "https://example.com/event"
            });

        assert.equal(
            result.status,
            "initiated"
        );

        assert.equal(
            result.facilityId,
            "facility-A"
        );

        assert.deepEqual(
            calls.phone,
            ["facility-A"]
        );

        assert.equal(
            calls.vonage.length,
            1
        );

        assert.deepEqual(
            calls.vonage[0],
            {
                from:
                    "05012345678",

                to:
                    "09012345678",

                answerUrl:
                    "https://example.com/answer",

                eventUrl:
                    "https://example.com/event"
            }
        );
    }
);


test(
    "クライアントが送ったfacilityIdは発信元施設として使われない",
    async () => {
        const {
            service,
            calls
        } = createService();

        const result =
            await service.call({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                to:
                    "09012345678",

                facilityId:
                    "facility-ATTACKER"
            });

        assert.equal(
            result.status,
            "initiated"
        );

        assert.deepEqual(
            calls.phone,
            ["facility-A"]
        );

        assert.equal(
            calls.vonage[0].from,
            "05012345678"
        );
    }
);


test(
    "施設番号のproviderがVonage以外なら発信しない",
    async () => {
        const {
            service,
            calls
        } = createService({
            phoneNumber: {
                id:
                    "phone-A",

                facilityId:
                    "facility-A",

                phoneNumber:
                    "05012345678",

                provider:
                    "other",

                status:
                    "active"
            }
        });

        const result =
            await service.call({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                to:
                    "09012345678"
            });

        assert.equal(
            result.status,
            "error"
        );

        assert.equal(
            result.errorCode,
            "facility_phone_number_invalid"
        );

        assert.equal(
            calls.vonage.length,
            0
        );
    }
);


test(
    "verifiedFacilityIdから取得した050番号をVonage発信へ接続する",
    async () => {
        const vonageCalls = [];

        const service =
            new VoiceCallService({
                connectorTrustService: {
                    async authenticate(args) {
                        assert.equal(
                            args.connectorId,
                            "connector-A"
                        );

                        assert.equal(
                            args.credential,
                            "credential-A"
                        );

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

                facilityPhoneNumberRepository: {
                    async findActiveByFacilityId(
                        facilityId
                    ) {
                        assert.equal(
                            facilityId,
                            "facility-A"
                        );

                        return {
                            id:
                                "phone-A",

                            facilityId:
                                "facility-A",

                            phoneNumber:
                                "05012345678",

                            provider:
                                "vonage",

                            status:
                                "active"
                        };
                    }
                },

                vonageVoiceService: {
                    async createOutboundCall(
                        args
                    ) {
                        vonageCalls.push(args);

                        return {
                            uuid:
                                "test-call-id"
                        };
                    }
                }
            });

        const result =
            await service.call({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                to:
                    "09012345678",

                answerUrl:
                    "https://example.com/answer",

                eventUrl:
                    "https://example.com/event"
            });

        assert.equal(
            result.status,
            "initiated"
        );

        assert.equal(
            result.facilityId,
            "facility-A"
        );

        assert.deepEqual(
            result.result,
            {
                uuid:
                    "test-call-id"
            }
        );

        assert.equal(
            vonageCalls.length,
            1
        );

        assert.deepEqual(
            vonageCalls[0],
            {
                from:
                    "05012345678",

                to:
                    "09012345678",

                answerUrl:
                    "https://example.com/answer",

                eventUrl:
                    "https://example.com/event"
            }
        );
    }
);
