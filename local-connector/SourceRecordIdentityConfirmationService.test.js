"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Service =
    require("./SourceRecordIdentityConfirmationService");

function snapshot(values = ["1001", "1002"]) {
    return {
        sourceDocumentKey: "document-1",
        sourceUpdatedAt:
            "2026-09-17T00:00:00.000Z",
        sourceSize: 100,
        analysis: {
            extracted: {
                fieldDefinitions: [{
                    sourceFieldKey:
                        "sheet:0:column:0",
                    sheetName: "csv",
                    headerLabel: "ID"
                }],
                sourceEntities:
                    values.map((value, index) => ({
                        sourceEntityKey:
                            `sheet:0:row:${index + 2}`,
                        valuesBySourceFieldKey: {
                            "sheet:0:column:0":
                                value
                        }
                    }))
            }
        }
    };
}

function service(currentSnapshot) {
    return new Service({
        localConnectorService: {
            async resolveSourceSnapshot(input) {
                assert.deepStrictEqual(input, {
                    sourceDocumentKey:
                        "document-1",
                    sourceUpdatedAt:
                        "2026-09-17T00:00:00.000Z",
                    sourceSize: 100
                });

                return currentSnapshot;
            }
        }
    });
}

const input = {
    sourceDocumentKey: "document-1",
    sourceUpdatedAt:
        "2026-09-17T00:00:00.000Z",
    sourceSize: 100,
    sourceFieldKey:
        "sheet:0:column:0"
};

test("validates identity against exact resolved snapshot", async () => {
    assert.deepStrictEqual(
        await service(snapshot()).validate(input),
        {
            status: "valid",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-17T00:00:00.000Z",
            sourceSize: 100,
            sourceFieldKey:
                "sheet:0:column:0",
            sheetName: "csv",
            headerLabel: "ID",
            sourceEntityCount: 2,
            uniqueValueCount: 2
        }
    );
});

test("rejects a source field absent from structural definitions", async () => {
    const result =
        await service(snapshot()).validate({
            ...input,
            sourceFieldKey:
                "sheet:0:column:99"
        });

    assert.deepStrictEqual(result, {
        status: "invalid",
        errorCode:
            "source_record_identity_field_unknown"
    });
});

test("rejects duplicate source identity values", async () => {
    const result =
        await service(
            snapshot(["1001", "1001"])
        ).validate(input);

    assert.equal(result.status, "invalid");
    assert.equal(
        result.errorCode,
        "source_record_identity_not_unique"
    );
    assert.equal(
        result.duplicateValueCount,
        1
    );
});

test("rejects blank source identity values", async () => {
    const result =
        await service(
            snapshot(["1001", " "])
        ).validate(input);

    assert.equal(result.status, "invalid");
    assert.equal(
        result.errorCode,
        "source_record_identity_value_missing"
    );
});

test("blank requested field is rejected before snapshot resolution", async () => {
    let called = false;

    const instance =
        new Service({
            localConnectorService: {
                async resolveSourceSnapshot() {
                    called = true;
                    return snapshot();
                }
            }
        });

    assert.deepStrictEqual(
        await instance.validate({
            ...input,
            sourceFieldKey: " "
        }),
        {
            status: "invalid",
            errorCode:
                "source_record_identity_field_invalid"
        }
    );

    assert.equal(called, false);
});

test("missing source entities fail closed", async () => {
    const current =
        snapshot();

    delete current.analysis.extracted
        .sourceEntities;

    assert.deepStrictEqual(
        await service(current).validate(input),
        {
            status: "invalid",
            errorCode:
                "source_entities_unavailable"
        }
    );
});
