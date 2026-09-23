"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldInterpretationQueryService =
    require("./SourceFieldInterpretationQueryService");

test("uses verified Connector context for interpretation query", async () => {
    let repositoryInput = null;

    const service =
        new SourceFieldInterpretationQueryService({
            connectorTrustService: {
                async authenticate({
                    connectorId,
                    credential
                }) {
                    assert.equal(
                        connectorId,
                        "connector-request"
                    );

                    assert.equal(
                        credential,
                        "credential-request"
                    );

                    return {
                        status: "verified",
                        verifiedContext: {
                            facilityId:
                                "facility-verified",
                            connectorId:
                                "connector-verified"
                        }
                    };
                }
            },
            sourceFieldInterpretationQueryRepository: {
                async list(input) {
                    repositoryInput =
                        input;

                    return {
                        status: "found",
                        interpretations: []
                    };
                }
            }
        });

    const result =
        await service.list({
            connectorId:
                "connector-request",
            credential:
                "credential-request",
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345,
            facilityId:
                "facility-untrusted",
            verifiedConnectorId:
                "connector-untrusted"
        });

    assert.deepEqual(
        repositoryInput,
        {
            verifiedFacilityId:
                "facility-verified",
            verifiedConnectorId:
                "connector-verified",
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345
        }
    );

    assert.deepEqual(
        result,
        {
            status: "found",
            interpretations: []
        }
    );
});

test("returns denied when Connector trust is denied", async () => {
    const service =
        new SourceFieldInterpretationQueryService({
            connectorTrustService: {
                async authenticate() {
                    return {
                        status: "denied"
                    };
                }
            },
            sourceFieldInterpretationQueryRepository: {
                async list() {
                    throw new Error(
                        "must not be called"
                    );
                }
            }
        });

    const result =
        await service.list({
            connectorId:
                "connector-request",
            credential:
                "credential-request",
            sourceDocumentKey:
                "source-document-1"
        });

    assert.deepEqual(
        result,
        {
            status: "denied",
            errorCode:
                "connector_trust_denied"
        }
    );
});

test("rejects blank source document key before repository access", async () => {
    let called = false;

    const service =
        new SourceFieldInterpretationQueryService({
            connectorTrustService: {
                async authenticate() {
                    return {
                        status: "verified",
                        verifiedContext: {
                            facilityId:
                                "facility-verified",
                            connectorId:
                                "connector-verified"
                        }
                    };
                }
            },
            sourceFieldInterpretationQueryRepository: {
                async list() {
                    called = true;
                    return {
                        status: "found",
                        interpretations: []
                    };
                }
            }
        });

    const result =
        await service.list({
            connectorId:
                "connector-request",
            credential:
                "credential-request",
            sourceDocumentKey:
                "   "
        });

    assert.deepEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "source_field_interpretation_query_invalid"
        }
    );

    assert.equal(
        called,
        false
    );
});
