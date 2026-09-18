"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SourceFieldMappingQueryService =
    require("./SourceFieldMappingQueryService");

test(
    "uses only connector trust verified scope for mapping query",
    async () => {
        let trustInput = null;
        let repositoryInput = null;

        const service =
            new SourceFieldMappingQueryService({
                connectorTrustService: {
                    async authenticate(input) {
                        trustInput = input;

                        return {
                            status:
                                "verified",
                            verifiedContext: {
                                facilityId:
                                    "facility-verified",
                                connectorId:
                                    "connector-verified"
                            }
                        };
                    }
                },
                sourceFieldMappingQueryRepository: {
                    async list(input) {
                        repositoryInput = input;

                        return {
                            status:
                                "found",
                            mappings: []
                        };
                    }
                }
            });

        const result =
            await service.list({
                connectorId:
                    "connector-presented",
                credential:
                    "credential-presented",
                sourceDocumentKey:
                    " document-key ",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            });

        assert.deepStrictEqual(
            trustInput,
            {
                connectorId:
                    "connector-presented",
                credential:
                    "credential-presented"
            }
        );

        assert.deepStrictEqual(
            repositoryInput,
            {
                verifiedFacilityId:
                    "facility-verified",
                verifiedConnectorId:
                    "connector-verified",
                sourceDocumentKey:
                    "document-key",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            }
        );

        assert.deepStrictEqual(
            result,
            {
                status:
                    "found",
                mappings: []
            }
        );
    }
);


test(
    "rejects invalid source snapshot after verified trust",
    async () => {
        for (const snapshot of [
            {
                sourceUpdatedAt:
                    "not-a-timestamp",
                sourceSize:
                    9520
            },
            {
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    -1
            },
            {
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    1.5
            }
        ]) {
            let repositoryCalled = false;

            const service =
                new SourceFieldMappingQueryService({
                    connectorTrustService: {
                        async authenticate() {
                            return {
                                status:
                                    "verified",
                                verifiedContext: {
                                    facilityId:
                                        "facility-verified",
                                    connectorId:
                                        "connector-verified"
                                }
                            };
                        }
                    },
                    sourceFieldMappingQueryRepository: {
                        async list() {
                            repositoryCalled = true;

                            return {
                                status:
                                    "found",
                                mappings: []
                            };
                        }
                    }
                });

            const result =
                await service.list({
                    connectorId:
                        "connector-presented",
                    credential:
                        "credential-presented",
                    sourceDocumentKey:
                        "document-key",
                    ...snapshot
                });

            assert.deepStrictEqual(
                result,
                {
                    status:
                        "invalid",
                    errorCode:
                        "source_field_mapping_query_invalid"
                }
            );

            assert.strictEqual(
                repositoryCalled,
                false
            );
        }
    }
);

test(
    "does not query mappings when connector trust is denied",
    async () => {
        let repositoryCalled = false;

        const service =
            new SourceFieldMappingQueryService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "denied"
                        };
                    }
                },
                sourceFieldMappingQueryRepository: {
                    async list() {
                        repositoryCalled = true;

                        return {
                            status:
                                "found",
                            mappings: []
                        };
                    }
                }
            });

        const result =
            await service.list({
                connectorId:
                    "connector-presented",
                credential:
                    "credential-presented",
                sourceDocumentKey:
                    "document-key"
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "denied",
                errorCode:
                    "connector_trust_denied"
            }
        );

        assert.strictEqual(
            repositoryCalled,
            false
        );
    }
);

test(
    "rejects blank sourceDocumentKey after verified trust",
    async () => {
        let repositoryCalled = false;

        const service =
            new SourceFieldMappingQueryService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "verified",
                            verifiedContext: {
                                facilityId:
                                    "facility-verified",
                                connectorId:
                                    "connector-verified"
                            }
                        };
                    }
                },
                sourceFieldMappingQueryRepository: {
                    async list() {
                        repositoryCalled = true;

                        return {
                            status:
                                "found",
                            mappings: []
                        };
                    }
                }
            });

        const result =
            await service.list({
                connectorId:
                    "connector-presented",
                credential:
                    "credential-presented",
                sourceDocumentKey:
                    " "
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "invalid",
                errorCode:
                    "source_field_mapping_query_invalid"
            }
        );

        assert.strictEqual(
            repositoryCalled,
            false
        );
    }
);
