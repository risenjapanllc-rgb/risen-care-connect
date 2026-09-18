"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordRowBuilder =
    require("./ConnectorSupportRecordRowBuilder");

const mappings = [
    {
        sourceFieldKey: "sheet:0:column:1",
        standardEntityName: "support_record",
        standardFieldName: "record_date"
    },
    {
        sourceFieldKey: "sheet:0:column:2",
        standardEntityName: "user",
        standardFieldName: "name"
    },
    {
        sourceFieldKey: "sheet:0:column:3",
        standardEntityName: "support_record",
        standardFieldName: "record_content"
    },
    {
        sourceFieldKey: "sheet:0:column:4",
        standardEntityName: "support_record",
        standardFieldName: "staff_name"
    },
    {
        sourceFieldKey: "sheet:0:column:5",
        standardEntityName: "support_record",
        standardFieldName: "record_category"
    },
    {
        sourceFieldKey: "sheet:0:column:25",
        standardEntityName: "support_record",
        standardFieldName: "created_at"
    }
];

function entity(overrides = {}) {
    return {
        sourceEntityKey: "sheet:0:row:2",
        valuesBySourceFieldKey: {
            "sheet:0:column:0": "source-id-1001",
            "sheet:0:column:1": "2026-09-17 09:00",
            "sheet:0:column:2": "テスト利用者",
            "sheet:0:column:3": "支援記録本文",
            "sheet:0:column:4": "テスト記録者",
            "sheet:0:column:5": "生活",
            "sheet:0:column:25": "2026-09-17 09:05"
        },
        ...overrides
    };
}

test("builds one physical source row without losing sourceRecordKey", () => {
    const builder =
        new ConnectorSupportRecordRowBuilder();

    const result =
        builder.build({
            sourceEntity: entity(),
            fieldMappings: mappings,
            residentId: "resident-1",
            sourceRecordIdentityFieldKey: "sheet:0:column:0"
        });

    assert.deepStrictEqual(result, {
        status: "ready",
        sourceRecordKey: "source-id-1001",
        residentName: "テスト利用者",
        fields: {
            resident_id: "resident-1",
            record_date: "2026-09-17 09:00",
            record_content: "支援記録本文",
            staff_name: "テスト記録者",
            record_category: "生活",
            created_at: "2026-09-17 09:05"
        }
    });
});

test("keeps blank optional source values as null", () => {
    const builder =
        new ConnectorSupportRecordRowBuilder();

    const source =
        entity();

    source.valuesBySourceFieldKey["sheet:0:column:4"] = "";
    source.valuesBySourceFieldKey["sheet:0:column:5"] = "   ";
    source.valuesBySourceFieldKey["sheet:0:column:25"] = null;

    const result =
        builder.build({
            sourceEntity: source,
            fieldMappings: mappings,
            residentId: "resident-1",
            sourceRecordIdentityFieldKey: "sheet:0:column:0"
        });

    assert.equal(result.status, "ready");
    assert.equal(result.fields.staff_name, null);
    assert.equal(result.fields.record_category, null);
    assert.equal(result.fields.created_at, null);
});

test("blocks a row when record_date is blank", () => {
    const builder =
        new ConnectorSupportRecordRowBuilder();

    const source =
        entity();

    source.valuesBySourceFieldKey["sheet:0:column:1"] = "";

    assert.deepStrictEqual(
        builder.build({
            sourceEntity: source,
            fieldMappings: mappings,
            residentId: "resident-1",
            sourceRecordIdentityFieldKey: "sheet:0:column:0"
        }),
        {
            status: "invalid",
            errorCode: "record_date_missing"
        }
    );
});

test("blocks a row when record_content is blank", () => {
    const builder =
        new ConnectorSupportRecordRowBuilder();

    const source =
        entity();

    source.valuesBySourceFieldKey["sheet:0:column:3"] = "";

    assert.deepStrictEqual(
        builder.build({
            sourceEntity: source,
            fieldMappings: mappings,
            residentId: "resident-1",
            sourceRecordIdentityFieldKey: "sheet:0:column:0"
        }),
        {
            status: "invalid",
            errorCode: "record_content_missing"
        }
    );
});

test("backend rejects missing required mappings", () => {
    const builder =
        new ConnectorSupportRecordRowBuilder();

    const result =
        builder.build({
            sourceEntity: entity(),
            fieldMappings:
                mappings.filter(
                    mapping =>
                        mapping.standardFieldName !==
                        "record_content"
                ),
            residentId: "resident-1",
            sourceRecordIdentityFieldKey:
                "sheet:0:column:0"
        });

    assert.deepStrictEqual(result, {
        status: "invalid",
        errorCode:
            "required_mapping_support_record_record_content_invalid"
    });
});

test("sourceRecordKey comes from confirmed source identity field, not row position", () => {
    const builder =
        new ConnectorSupportRecordRowBuilder();

    const first =
        builder.build({
            sourceEntity: entity({
                sourceEntityKey: "sheet:0:row:2"
            }),
            fieldMappings: mappings,
            residentId: "resident-1",
            sourceRecordIdentityFieldKey: "sheet:0:column:0"
        });

    const secondSource =
        entity({
            sourceEntityKey: "sheet:0:row:999"
        });

    secondSource.valuesBySourceFieldKey[
        "sheet:0:column:0"
    ] = "source-id-1001";

    const second =
        builder.build({
            sourceEntity: secondSource,
            fieldMappings: mappings,
            residentId: "resident-1",
            sourceRecordIdentityFieldKey: "sheet:0:column:0"
        });

    assert.equal(first.status, "ready");
    assert.equal(second.status, "ready");
    assert.equal(
        first.sourceRecordKey,
        second.sourceRecordKey
    );
});

test("missing source record identity mapping blocks the row", () => {
    const builder =
        new ConnectorSupportRecordRowBuilder();

    assert.deepStrictEqual(
        builder.build({
            sourceEntity: entity(),
            fieldMappings: mappings,
            residentId: "resident-1"
        }),
        {
            status: "invalid",
            errorCode:
                "source_record_identity_mapping_unavailable"
        }
    );
});

test("blank source record identity blocks the row", () => {
    const builder =
        new ConnectorSupportRecordRowBuilder();

    const source = entity();
    source.valuesBySourceFieldKey[
        "sheet:0:column:0"
    ] = " ";

    assert.deepStrictEqual(
        builder.build({
            sourceEntity: source,
            fieldMappings: mappings,
            residentId: "resident-1",
            sourceRecordIdentityFieldKey: "sheet:0:column:0"
        }),
        {
            status: "invalid",
            errorCode:
                "source_record_identity_missing"
        }
    );
});

test("residentId is required from confirmed STEP4 mapping", () => {
    const builder =
        new ConnectorSupportRecordRowBuilder();

    assert.deepStrictEqual(
        builder.build({
            sourceEntity: entity(),
            fieldMappings: mappings,
            residentId: null,
            sourceRecordIdentityFieldKey:
                "sheet:0:column:0"
        }),
        {
            status: "invalid",
            errorCode: "resident_id_unresolved"
        }
    );
});
