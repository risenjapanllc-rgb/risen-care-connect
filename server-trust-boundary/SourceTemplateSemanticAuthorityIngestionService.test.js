"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceTemplateSemanticAuthorityIngestionService =
    require("./SourceTemplateSemanticAuthorityIngestionService");

test(
    "authority list uses verified facility identity",
    async () => {
        let repositoryInput = null;

        const service =
            new SourceTemplateSemanticAuthorityIngestionService({
                connectorTrustService: {
                    async authenticate(input) {
                        assert.equal(
                            input.connectorId,
                            "connector-request"
                        );

                        assert.equal(
                            input.credential,
                            "secret"
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

                payloadValidator: {
                    validate() {
                        return {
                            status: "valid",
                            validated: {}
                        };
                    }
                },

                persistenceRepository: {
                    async confirm() {
                        return {
                            status: "created"
                        };
                    },

                    async list(input) {
                        repositoryInput =
                            input;

                        return {
                            status: "found",
                            mappings: []
                        };
                    }
                }
            });

        const result =
            await service.list({
                connectorId:
                    "connector-request",

                credential:
                    "secret",

                templateId:
                    " template-1 "
            });

        assert.equal(
            result.status,
            "found"
        );

        assert.deepEqual(
            repositoryInput,
            {
                verifiedFacilityId:
                    "facility-verified",

                templateId:
                    "template-1"
            }
        );
    }
);
