"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceSemanticAnalysisTransport =
    require(
        "./VoiceSemanticAnalysisTransport"
    );


function createTransport({
    serviceResult = {
        status:
            "ready",

        recordingId:
            "recording-A",

        analyses:
            []
    },
    onServiceCall
} = {}) {
    return new VoiceSemanticAnalysisTransport({
        analysisAccessService: {
            async analyzeRecording(input) {
                if (onServiceCall) {
                    onServiceCall(input);
                }

                return serviceResult;
            }
        },

        credentialTransport: {
            extract(value) {
                if (
                    value ===
                    "RISEN-Connector credential-A"
                ) {
                    return "credential-A";
                }

                return null;
            }
        }
    });
}


test(
    "passes connector identity and recording id to access service",
    async () => {
        let serviceInput;

        const transport =
            createTransport({
                serviceResult: {
                    status:
                        "ready",

                    recordingId:
                        "recording-A",

                    analyses: [
                        {
                            semanticAnalysis: {
                                ok:
                                    true
                            }
                        }
                    ]
                },

                onServiceCall(input) {
                    serviceInput =
                        input;
                }
            });

        const result =
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
                    recordingId:
                        "recording-A"
                }
            });

        assert.deepStrictEqual(
            serviceInput,
            {
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                recordingId:
                    "recording-A"
            }
        );

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            result.body.status,
            "ready"
        );

        assert.equal(
            result.body.recordingId,
            "recording-A"
        );

        assert.equal(
            result.body.analyses.length,
            1
        );

        assert.equal(
            typeof result.body.requestId,
            "string"
        );
    }
);


test(
    "rejects client supplied facility id before service call",
    async () => {
        let serviceCalled =
            false;

        const transport =
            createTransport({
                onServiceCall() {
                    serviceCalled =
                        true;
                }
            });

        const result =
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
                    recordingId:
                        "recording-A",

                    facilityId:
                        "facility-client-supplied"
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
            serviceCalled,
            false
        );
    }
);


test(
    "rejects semantic and timestamp fields from client",
    async () => {
        const forbiddenKeys = [
            "semanticType",
            "entityName",
            "fieldName",
            "startMs",
            "endMs"
        ];

        for (
            const forbiddenKey of
            forbiddenKeys
        ) {
            let serviceCalled =
                false;

            const transport =
                createTransport({
                    onServiceCall() {
                        serviceCalled =
                            true;
                    }
                });

            const result =
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
                        recordingId:
                            "recording-A",

                        [forbiddenKey]:
                            "client-value"
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
                serviceCalled,
                false
            );
        }
    }
);


test(
    "requires connector id and credential",
    async () => {
        const transport =
            createTransport();

        const missingConnector =
            await transport.handle({
                method:
                    "POST",

                contentType:
                    "application/json",

                headers: {
                    authorization:
                        "RISEN-Connector credential-A"
                },

                body: {
                    recordingId:
                        "recording-A"
                }
            });

        assert.equal(
            missingConnector.httpStatus,
            401
        );

        assert.equal(
            missingConnector.body.errorCode,
            "connector_trust_denied"
        );

        const missingCredential =
            await transport.handle({
                method:
                    "POST",

                contentType:
                    "application/json",

                headers: {
                    "x-risen-connector-id":
                        "connector-A"
                },

                body: {
                    recordingId:
                        "recording-A"
                }
            });

        assert.equal(
            missingCredential.httpStatus,
            401
        );

        assert.equal(
            missingCredential.body.errorCode,
            "connector_trust_denied"
        );
    }
);


test(
    "maps invalid and denied service results",
    async () => {
        const invalid =
            await createTransport({
                serviceResult: {
                    status:
                        "invalid",

                    errorCode:
                        "voice_semantic_analysis_request_invalid"
                }
            }).handle({
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
                    recordingId:
                        "recording-A"
                }
            });

        assert.equal(
            invalid.httpStatus,
            422
        );

        const denied =
            await createTransport({
                serviceResult: {
                    status:
                        "denied"
                }
            }).handle({
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
                    recordingId:
                        "recording-A"
                }
            });

        assert.equal(
            denied.httpStatus,
            401
        );
    }
);


test(
    "maps unavailable result to 503",
    async () => {
        const transport =
            createTransport({
                serviceResult: {
                    status:
                        "error",

                    errorCode:
                        "voice_semantic_analysis_unavailable"
                }
            });

        const result =
            await transport.handle({
                method:
                    "POST",

                contentType:
                    "application/json; charset=utf-8",

                headers: {
                    authorization:
                        "RISEN-Connector credential-A",

                    "x-risen-connector-id":
                        "connector-A"
                },

                body: {
                    recordingId:
                        "recording-A"
                }
            });

        assert.equal(
            result.httpStatus,
            503
        );

        assert.equal(
            result.body.errorCode,
            "voice_semantic_analysis_unavailable"
        );
    }
);
