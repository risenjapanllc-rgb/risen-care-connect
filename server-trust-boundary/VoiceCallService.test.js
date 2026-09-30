"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const VoiceCallService =
    require("./VoiceCallService");


const CASE_ID =
    "11111111-1111-4111-8111-111111111111";

const CONTACT_ID =
    "22222222-2222-4222-8222-222222222222";

const RECORDING_SESSION_ID =
    "33333333-3333-4333-8333-333333333333";


function createService({
    trustResult = {
        status: "verified",

        verifiedContext: {
            facilityId:
                "facility-A"
        }
    },

    phoneNumber = {
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
    },

    contact = {
        contactId:
            CONTACT_ID,

        phoneNumber:
            "09012345678",

        contactName:
            "Emergency Contact",

        contactType:
            "family",

        caseId:
            CASE_ID,

        residentId:
            "resident-A"
    },

    vonageResult = {
        uuid:
            "test-call-id"
    }
} = {}) {
    const calls = {
        trust: [],
        phone: [],
        contact: [],
        callStarted: [],
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

            emergencyContactRepository: {
                async findActiveByCaseAndContact(
                    args
                ) {
                    calls.contact.push(args);
                    return contact;
                }
            },

            emergencyContactCallRepository: {
                async recordCallStarted(
                    args
                ) {
                    calls.callStarted.push(args);

                    return {
                        id:
                            "event-A"
                    };
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
    "caseId/contactId/recordingSessionIdがなければ発信しない",
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
                    "credential-A"
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
            calls.contact.length,
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
                status:
                    "denied"
            }
        });

        const result =
            await service.call({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
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
            calls.contact.length,
            0
        );

        assert.equal(
            calls.callStarted.length,
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
            phoneNumber:
                null
        });

        const result =
            await service.call({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
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
            calls.contact.length,
            0
        );

        assert.equal(
            calls.vonage.length,
            0
        );
    }
);


test(
    "verifiedFacilityIdで連絡先を解決してVonageへ渡す",
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

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
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

        assert.deepEqual(
            calls.contact,
            [{
                facilityId:
                    "facility-A",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID
            }]
        );

        assert.deepEqual(
            calls.vonage,
            [{
                from:
                    "05012345678",

                to:
                    "09012345678"
            }]
        );
    }
);


test(
    "発信開始イベントにはcase/contact/recordingSessionを渡す",
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

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
            });

        assert.equal(
            result.status,
            "initiated"
        );

        assert.deepEqual(
            calls.callStarted,
            [{
                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
            }]
        );
    }
);


test(
    "クライアントのfacilityIdやphoneNumberを発信元/発信先に使わない",
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

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID,

                facilityId:
                    "facility-ATTACKER",

                phoneNumber:
                    "09999999999",

                to:
                    "09999999999"
            });

        assert.equal(
            result.status,
            "initiated"
        );

        assert.deepEqual(
            calls.vonage,
            [{
                from:
                    "05012345678",

                to:
                    "09012345678"
            }]
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

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
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
            calls.contact.length,
            0
        );

        assert.equal(
            calls.callStarted.length,
            0
        );

        assert.equal(
            calls.vonage.length,
            0
        );
    }
);


test(
    "連絡先解決に失敗したらVonageを呼ばない",
    async () => {
        const {
            service,
            calls
        } = createService({
            contact:
                undefined
        });

        const originalRepository =
            service.emergencyContactRepository;

        service.emergencyContactRepository = {
            async findActiveByCaseAndContact() {
                throw new Error(
                    "Supabase unavailable"
                );
            }
        };

        const result =
            await service.call({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
            });

        assert.equal(
            result.status,
            "error"
        );

        assert.equal(
            result.errorCode,
            "emergency_contact_lookup_unavailable"
        );

        assert.equal(
            calls.vonage.length,
            0
        );
    }
);


test(
    "発信開始イベントの記録に失敗したらVonageを呼ばない",
    async () => {
        const {
            service,
            calls
        } = createService();

        service.emergencyContactCallRepository = {
            async recordCallStarted(args) {
                calls.callStarted.push(args);

                throw new Error(
                    "Supabase unavailable"
                );
            }
        };

        const result =
            await service.call({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
            });

        assert.equal(
            result.status,
            "error"
        );

        assert.equal(
            result.errorCode,
            "emergency_contact_call_record_failed"
        );

        assert.equal(
            calls.callStarted.length,
            1
        );

        assert.equal(
            calls.vonage.length,
            0
        );
    }
);


test(
    "Vonage発信に失敗したら安全なerrorを返す",
    async () => {
        const {
            service,
            calls
        } = createService();

        service.vonageVoiceService = {
            async createOutboundCall(args) {
                calls.vonage.push(args);

                throw new Error(
                    "Vonage unavailable"
                );
            }
        };

        const result =
            await service.call({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
            });

        assert.equal(
            result.status,
            "error"
        );

        assert.equal(
            result.errorCode,
            "vonage_voice_call_failed"
        );

        assert.equal(
            calls.callStarted.length,
            1
        );

        assert.deepEqual(
            calls.vonage,
            [{
                from:
                    "05012345678",

                to:
                    "09012345678"
            }]
        );
    }
);
