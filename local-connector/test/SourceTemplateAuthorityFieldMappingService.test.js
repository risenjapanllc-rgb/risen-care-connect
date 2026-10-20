"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceTemplateAuthorityFieldMappingService =
    require(
        "../SourceTemplateAuthorityFieldMappingService"
    );

test(
    "applies confirmed template Semantic Authority to current source field mappings",
    async () => {
        const ingested = [];
        const interpreted = [];

        const service =
            new SourceTemplateAuthorityFieldMappingService({
                semanticRegistrationClient: {
                    async listAuthority(templateId) {
                        assert.equal(
                            templateId,
                            "template-1"
                        );

                        return {
                            status: "found",
                            mappings: [
                                {
                                    templateFieldKey:
                                        "sheet:0:column:0",
                                    interpretationStatus:
                                        "confirmed",
                                    mappingStatus:
                                        "mapped",
                                    standardEntityName:
                                        "source_record",
                                    standardFieldName:
                                        "record_id"
                                },
                                {
                                    templateFieldKey:
                                        "sheet:0:column:2",
                                    interpretationStatus:
                                        "confirmed",
                                    mappingStatus:
                                        "mapped",
                                    standardEntityName:
                                        "user",
                                    standardFieldName:
                                        "name"
                                },
                                {
                                    templateFieldKey:
                                        "sheet:0:column:7",
                                    interpretationStatus:
                                        "unresolved",
                                    mappingStatus:
                                        "unmapped"
                                }
                            ]
                        };
                    }
                },

                sourceFieldMappingClient: {
                    async ingest(mapping) {
                        ingested.push(mapping);

                        return {
                            status:
                                ingested.length === 1
                                    ? "created"
                                    : "unchanged"
                        };
                    }
                },

                sourceFieldInterpretationClient: {
                    async ingest(interpretation) {
                        interpreted.push(
                            interpretation
                        );

                        return {
                            status:
                                interpreted.length === 1
                                    ? "created"
                                    : "unchanged"
                        };
                    }
                }
            });

        const result =
            await service.apply({
                templateId:
                    "template-1",
                sourceDocumentKey:
                    "document-1",
                sourceUpdatedAt:
                    "2026-10-14T07:00:00.000Z",
                sourceSize:
                    1234,
                fieldDefinitions: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        sheetName:
                            "",
                        headerLabel:
                            "ID"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",
                        sheetName:
                            "",
                        headerLabel:
                            "氏名"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:7",
                        sheetName:
                            "",
                        headerLabel:
                            "データ1"
                    }
                ]
            });

        assert.equal(
            result.status,
            "applied"
        );
        assert.equal(
            result.authorityCount,
            2
        );
        assert.equal(
            result.appliedCount,
            2
        );
        assert.equal(
            result.createdCount,
            1
        );
        assert.equal(
            result.unchangedCount,
            1
        );

        assert.deepEqual(
            ingested[0],
            {
                sourceDocumentKey:
                    "document-1",
                sourceFieldKey:
                    "sheet:0:column:0",
                standardEntityName:
                    "source_record",
                standardFieldName:
                    "record_id",
                sheetName:
                    "",
                headerLabel:
                    "ID",
                sourceUpdatedAt:
                    "2026-10-14T07:00:00.000Z",
                sourceSize:
                    1234
            }
        );

        assert.equal(
            ingested[1].sourceFieldKey,
            "sheet:0:column:2"
        );
        assert.equal(
            ingested[1].standardEntityName,
            "user"
        );
        assert.equal(
            ingested[1].standardFieldName,
            "name"
        );

        assert.equal(
            result.interpretationAppliedCount,
            2
        );

        assert.equal(
            result.interpretationCreatedCount,
            1
        );

        assert.equal(
            result.interpretationUnchangedCount,
            1
        );

        assert.deepEqual(
            interpreted[0],
            {
                sourceDocumentKey:
                    "document-1",
                sourceUpdatedAt:
                    "2026-10-14T07:00:00.000Z",
                sourceSize:
                    1234,
                sourceFieldKey:
                    "sheet:0:column:0",
                interpretationStatus:
                    "confirmed",
                mappingStatus:
                    "mapped",
                confirmedMeaning:
                    "source_record.record_id"
            }
        );

        assert.deepEqual(
            interpreted[1],
            {
                sourceDocumentKey:
                    "document-1",
                sourceUpdatedAt:
                    "2026-10-14T07:00:00.000Z",
                sourceSize:
                    1234,
                sourceFieldKey:
                    "sheet:0:column:2",
                interpretationStatus:
                    "confirmed",
                mappingStatus:
                    "mapped",
                confirmedMeaning:
                    "user.name"
            }
        );
    }
);

test(
    "fails closed when confirmed Authority points to a field missing from the current source",
    async () => {
        const service =
            new SourceTemplateAuthorityFieldMappingService({
                semanticRegistrationClient: {
                    async listAuthority() {
                        return {
                            status: "found",
                            mappings: [
                                {
                                    templateFieldKey:
                                        "sheet:0:column:99",
                                    interpretationStatus:
                                        "confirmed",
                                    mappingStatus:
                                        "mapped",
                                    standardEntityName:
                                        "user",
                                    standardFieldName:
                                        "name"
                                }
                            ]
                        };
                    }
                },

                sourceFieldMappingClient: {
                    async ingest() {
                        throw new Error(
                            "must not ingest mapping"
                        );
                    }
                },

                sourceFieldInterpretationClient: {
                    async ingest() {
                        throw new Error(
                            "must not ingest interpretation"
                        );
                    }
                }
            });

        await assert.rejects(
            () =>
                service.apply({
                    templateId:
                        "template-1",
                    sourceDocumentKey:
                        "document-1",
                    sourceUpdatedAt:
                        "2026-10-14T07:00:00.000Z",
                    sourceSize:
                        1234,
                    fieldDefinitions: []
                }),
            /Template field is missing/
        );
    }
);
