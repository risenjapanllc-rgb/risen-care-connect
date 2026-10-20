"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceSemanticAnalysisAccessService =
    require(
        "./VoiceSemanticAnalysisAccessService"
    );


test(
    "uses verified connector facility for voice semantic analysis",
    async () => {
        let receivedTrust;
        let receivedAnalysisInput;

        const service =
            new VoiceSemanticAnalysisAccessService({
                connectorTrustService: {
                    async authenticate(input) {
                        receivedTrust =
                            input;

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

                semanticAnalysisService: {
                    async analyzeRecording(input) {
                        receivedAnalysisInput =
                            input;

                        return [
                            {
                                semanticAnalysis:
                                    {
                                        ok:
                                            true
                                    }
                            }
                        ];
                    }
                }
            });

        const result =
            await service.analyzeRecording({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                recordingId:
                    "recording-A"
            });

        assert.deepStrictEqual(
            receivedTrust,
            {
                connectorId:
                    "connector-A",

                credential:
                    "credential-A"
            }
        );

        assert.deepStrictEqual(
            receivedAnalysisInput,
            {
                facilityId:
                    "facility-A",

                recordingId:
                    "recording-A"
            }
        );

        assert.equal(
            result.status,
            "ready"
        );

        assert.equal(
            result.recordingId,
            "recording-A"
        );

        assert.equal(
            result.analyses.length,
            1
        );
    }
);


test(
    "rejects missing recording id before trust lookup",
    async () => {
        let trustCalled =
            false;

        const service =
            new VoiceSemanticAnalysisAccessService({
                connectorTrustService: {
                    async authenticate() {
                        trustCalled =
                            true;

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

                semanticAnalysisService: {
                    async analyzeRecording() {
                        throw new Error(
                            "must not reach analysis"
                        );
                    }
                }
            });

        const result =
            await service.analyzeRecording({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                recordingId:
                    " "
            });

        assert.equal(
            result.status,
            "invalid"
        );

        assert.equal(
            result.errorCode,
            "voice_semantic_analysis_request_invalid"
        );

        assert.equal(
            trustCalled,
            false
        );
    }
);


test(
    "does not analyze when connector trust is denied",
    async () => {
        let analysisCalled =
            false;

        const service =
            new VoiceSemanticAnalysisAccessService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "denied"
                        };
                    }
                },

                semanticAnalysisService: {
                    async analyzeRecording() {
                        analysisCalled =
                            true;

                        return [];
                    }
                }
            });

        const result =
            await service.analyzeRecording({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                recordingId:
                    "recording-A"
            });

        assert.equal(
            result.status,
            "denied"
        );

        assert.equal(
            result.errorCode,
            "connector_trust_denied"
        );

        assert.equal(
            analysisCalled,
            false
        );
    }
);


test(
    "rejects invalid verified context without facility id",
    async () => {
        let analysisCalled =
            false;

        const service =
            new VoiceSemanticAnalysisAccessService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "verified",

                            verifiedContext:
                                {}
                        };
                    }
                },

                semanticAnalysisService: {
                    async analyzeRecording() {
                        analysisCalled =
                            true;

                        return [];
                    }
                }
            });

        const result =
            await service.analyzeRecording({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                recordingId:
                    "recording-A"
            });

        assert.equal(
            result.status,
            "error"
        );

        assert.equal(
            result.errorCode,
            "connector_trust_invalid_result"
        );

        assert.equal(
            analysisCalled,
            false
        );
    }
);


test(
    "converts semantic analysis failure into unavailable result",
    async () => {
        const service =
            new VoiceSemanticAnalysisAccessService({
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

                semanticAnalysisService: {
                    async analyzeRecording({
                        facilityId,
                        recordingId
                    }) {
                        assert.equal(
                            facilityId,
                            "facility-A"
                        );

                        assert.equal(
                            recordingId,
                            "recording-A"
                        );

                        throw new Error(
                            "semantic analysis failed"
                        );
                    }
                }
            });

        const result =
            await service.analyzeRecording({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                recordingId:
                    "recording-A"
            });

        assert.equal(
            result.status,
            "error"
        );

        assert.equal(
            result.errorCode,
            "voice_semantic_analysis_unavailable"
        );
    }
);
