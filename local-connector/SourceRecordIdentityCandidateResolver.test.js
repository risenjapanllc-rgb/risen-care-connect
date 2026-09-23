"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Resolver = require("./SourceRecordIdentityCandidateResolver");

const resolver = new Resolver();

function field(key, label) {
    return { sourceFieldKey: key, headerLabel: label };
}

function row(values) {
    return { valuesBySourceFieldKey: values };
}

test("returns only complete unique fields as candidates", () => {
    const result = resolver.resolve({
        fieldDefinitions: [
            field("f1", "社員番号"),
            field("f2", "氏名"),
            field("f3", "受給者証NO")
        ],
        sourceEntities: [
            row({ f1: "001", f2: "A", f3: "" }),
            row({ f1: "002", f2: "B", f3: "X" }),
            row({ f1: "003", f2: "B", f3: "Y" })
        ]
    });

    assert.equal(result.status, "candidates_available");
    assert.deepStrictEqual(
        result.candidates.map(candidate => candidate.headerLabel),
        ["社員番号"]
    );
    assert.equal(result.candidates[0].humanConfirmationRequired, true);
});

test("does not infer semantic meaning from the header label", () => {
    const result = resolver.resolve({
        fieldDefinitions: [field("f1", "社員番号")],
        sourceEntities: [
            row({ f1: "001" }),
            row({ f1: "002" })
        ]
    });

    assert.equal(result.candidates.length, 1);
    assert.equal(Object.hasOwn(result.candidates[0], "entityName"), false);
    assert.equal(Object.hasOwn(result.candidates[0], "fieldName"), false);
});

test("fails closed when no single field is complete and unique", () => {
    const result = resolver.resolve({
        fieldDefinitions: [field("f1", "生年月日")],
        sourceEntities: [
            row({ f1: "2000-01-01" }),
            row({ f1: "2000-01-01" })
        ]
    });

    assert.deepStrictEqual(result, {
        status: "no_safe_single_field_candidate",
        candidates: []
    });
});

test("does not accept empty source data", () => {
    const result = resolver.resolve({
        fieldDefinitions: [field("f1", "ID")],
        sourceEntities: []
    });

    assert.deepStrictEqual(result, {
        status: "insufficient_source",
        candidates: []
    });
});
