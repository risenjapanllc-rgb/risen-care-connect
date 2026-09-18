"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceRecordIdentityValidator =
    require("./SourceRecordIdentityValidator");

const validator =
    new SourceRecordIdentityValidator();

function entity(value, options = {}) {
    const values =
        options.omitField
            ? {}
            : {
                "sheet:0:column:0": value
            };

    return {
        sourceEntityKey:
            options.sourceEntityKey ||
            "sheet:0:row:2",
        valuesBySourceFieldKey:
            values
    };
}

test("accepts a nonblank unique source-native identity field", () => {
    assert.deepStrictEqual(
        validator.validate({
            sourceEntities: [
                entity("1001"),
                entity("1002"),
                entity("1003")
            ],
            sourceFieldKey:
                "sheet:0:column:0"
        }),
        {
            status: "valid",
            sourceFieldKey:
                "sheet:0:column:0",
            sourceEntityCount: 3,
            uniqueValueCount: 3
        }
    );
});

test("does not depend on source header name", () => {
    const result =
        validator.validate({
            sourceEntities: [
                entity("A"),
                entity("B")
            ],
            sourceFieldKey:
                "sheet:0:column:0"
        });

    assert.equal(result.status, "valid");
});

test("rejects a structural field absent from rows", () => {
    const result =
        validator.validate({
            sourceEntities: [
                entity("1001"),
                entity(null, {
                    omitField: true
                })
            ],
            sourceFieldKey:
                "sheet:0:column:0"
        });

    assert.equal(result.status, "invalid");
    assert.equal(
        result.errorCode,
        "source_record_identity_field_missing"
    );
    assert.equal(result.missingFieldCount, 1);
});

test("rejects blank identity values", () => {
    const result =
        validator.validate({
            sourceEntities: [
                entity("1001"),
                entity("   ")
            ],
            sourceFieldKey:
                "sheet:0:column:0"
        });

    assert.equal(result.status, "invalid");
    assert.equal(
        result.errorCode,
        "source_record_identity_value_missing"
    );
    assert.equal(result.blankValueCount, 1);
});

test("rejects duplicate normalized identity values", () => {
    const result =
        validator.validate({
            sourceEntities: [
                entity("1001"),
                entity(" 1001 ")
            ],
            sourceFieldKey:
                "sheet:0:column:0"
        });

    assert.equal(result.status, "invalid");
    assert.equal(
        result.errorCode,
        "source_record_identity_not_unique"
    );
    assert.equal(result.duplicateValueCount, 1);
    assert.equal(result.uniqueValueCount, 1);
});

test("rejects empty source data", () => {
    assert.deepStrictEqual(
        validator.validate({
            sourceEntities: [],
            sourceFieldKey:
                "sheet:0:column:0"
        }),
        {
            status: "invalid",
            errorCode:
                "source_record_identity_validation_invalid"
        }
    );
});

test("rejects malformed source entities", () => {
    assert.deepStrictEqual(
        validator.validate({
            sourceEntities: [null],
            sourceFieldKey:
                "sheet:0:column:0"
        }),
        {
            status: "invalid",
            errorCode:
                "source_entity_invalid"
        }
    );
});
