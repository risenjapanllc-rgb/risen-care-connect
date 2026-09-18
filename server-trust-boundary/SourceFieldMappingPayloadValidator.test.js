"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldMappingPayloadValidator =
    require("./SourceFieldMappingPayloadValidator");

function createValidPayload() {
    return {
        sourceDocumentKey:
            "document-1",
        sourceFieldKey:
            "sheet:0:column:3",
        standardEntityName:
            "user",
        standardFieldName:
            "blood_type",
        sheetName:
            "Sheet1",
        headerLabel:
            "血液型",
        sourceUpdatedAt:
            "2026-09-15T02:30:00.000Z",
        sourceSize:
            9520
    };
}

test(
    "accepts a structurally valid confirmed mapping",
    () => {
        const validator =
            new SourceFieldMappingPayloadValidator();

        assert.deepEqual(
            validator.validate(
                createValidPayload()
            ),
            {
                status: "valid",
                validatedSourceFieldMapping:
                    createValidPayload()
            }
        );
    }
);

test(
    "rejects missing source document identity",
    () => {
        const validator =
            new SourceFieldMappingPayloadValidator();

        const result =
            validator.validate({
                ...createValidPayload(),
                sourceDocumentKey: ""
            });

        assert.equal(
            result.status,
            "invalid"
        );

        assert.equal(
            result.errorCode,
            "source_document_key_invalid"
        );
    }
);

test(
    "rejects missing source field identity",
    () => {
        const validator =
            new SourceFieldMappingPayloadValidator();

        const result =
            validator.validate({
                ...createValidPayload(),
                sourceFieldKey: ""
            });

        assert.equal(
            result.status,
            "invalid"
        );
    }
);

test(
    "rejects missing canonical standard identity",
    () => {
        const validator =
            new SourceFieldMappingPayloadValidator();

        assert.equal(
            validator.validate({
                ...createValidPayload(),
                standardEntityName: ""
            }).status,
            "invalid"
        );

        assert.equal(
            validator.validate({
                ...createValidPayload(),
                standardFieldName: ""
            }).status,
            "invalid"
        );
    }
);

test(
    "allows nullable display metadata",
    () => {
        const validator =
            new SourceFieldMappingPayloadValidator();

        const result =
            validator.validate({
                ...createValidPayload(),
                sheetName: null,
                headerLabel: null
            });

        assert.equal(
            result.status,
            "valid"
        );
    }
);

test(
    "projects only allowlisted mapping fields",
    () => {
        const validator =
            new SourceFieldMappingPayloadValidator();

        const result =
            validator.validate({
                ...createValidPayload(),

                facilityId:
                    "client-facility",

                connectorId:
                    "client-connector",

                standardFieldId:
                    15,

                confirmedAt:
                    "2000-01-01T00:00:00.000Z",

                residentId:
                    "client-resident"
            });

        assert.equal(
            result.status,
            "valid"
        );

        assert.deepEqual(
            Object.keys(
                result.validatedSourceFieldMapping
            ).sort(),
            [
                "headerLabel",
                "sheetName",
                "sourceDocumentKey",
                "sourceFieldKey",
                "sourceSize",
                "sourceUpdatedAt",
                "standardEntityName",
                "standardFieldName"
            ].sort()
        );
    }
);


test(
    "requires explicit valid source snapshot",
    () => {
        const validator =
            new SourceFieldMappingPayloadValidator();

        for (const input of [
            {
                ...createValidPayload(),
                sourceUpdatedAt: undefined
            },
            {
                ...createValidPayload(),
                sourceSize: undefined
            },
            {
                ...createValidPayload(),
                sourceUpdatedAt: "not-a-timestamp"
            },
            {
                ...createValidPayload(),
                sourceSize: -1
            },
            {
                ...createValidPayload(),
                sourceSize: 1.5
            }
        ]) {
            assert.equal(
                validator.validate(input).status,
                "invalid"
            );
        }

        assert.equal(
            validator.validate({
                ...createValidPayload(),
                sourceUpdatedAt: null,
                sourceSize: null
            }).status,
            "invalid"
        );

        assert.equal(
            validator.validate({
                ...createValidPayload(),
                sourceSize: 0
            }).status,
            "valid"
        );
    }
);

test(
    "rejects arrays null and primitive payloads",
    () => {
        const validator =
            new SourceFieldMappingPayloadValidator();

        for (const input of [
            null,
            [],
            "mapping",
            123
        ]) {
            assert.equal(
                validator.validate(input).status,
                "invalid"
            );
        }
    }
);
