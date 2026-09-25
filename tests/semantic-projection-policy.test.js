"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadPolicy() {
    const source = fs.readFileSync(
        path.join(
            __dirname,
            "..",
            "js",
            "semantic-projection-policy.js"
        ),
        "utf8"
    );

    const context = {
        window: {}
    };

    vm.runInNewContext(
        source,
        context,
        {
            filename:
                "semantic-projection-policy.js"
        }
    );

    return context.window
        .RisenSemanticProjectionPolicy;
}

test("explicit recipient certificate projection is independent of resident master source classification", () => {
    const policy = loadPolicy();

    assert.strictEqual(
        policy.resolveSemanticProjectionType(
            "resident_master",
            "recipient_certificate"
        ),
        "recipient_certificate"
    );
});

test("resident master source classification does not imply a semantic projection", () => {
    const policy = loadPolicy();

    assert.strictEqual(
        policy.resolveSemanticProjectionType(
            "resident_master",
            null
        ),
        null
    );
});

test("existing recipient certificate source keeps backward-compatible projection", () => {
    const policy = loadPolicy();

    assert.strictEqual(
        policy.resolveSemanticProjectionType(
            "recipient_certificate",
            null
        ),
        "recipient_certificate"
    );
});

test("existing support record source keeps backward-compatible projection", () => {
    const policy = loadPolicy();

    assert.strictEqual(
        policy.resolveSemanticProjectionType(
            "support_record",
            null
        ),
        "support_record"
    );
});

test("unsupported explicit semantic projection fails closed", () => {
    const policy = loadPolicy();

    assert.strictEqual(
        policy.resolveSemanticProjectionType(
            "resident_master",
            "unknown_semantic_type"
        ),
        null
    );
});

test("recipient certificate projection requires user name and certificate number mappings", () => {
    const policy = loadPolicy();

    const state =
        policy.getSemanticProjectionRequirementState(
            "recipient_certificate",
            []
        );

    assert.strictEqual(
        state.status,
        "required_mapping_missing"
    );

    assert.deepStrictEqual(
        Array.from(
            state.missingRequiredMeanings,
            required => ({
                entityName: required.entityName,
                fieldName: required.fieldName,
                label: required.label
            })
        ),
        [
            {
                entityName: "user",
                fieldName: "name",
                label: "利用者名"
            },
            {
                entityName: "recipient_certificate",
                fieldName: "certificate_number",
                label: "受給者証番号"
            }
        ]
    );
});

test("recipient certificate projection is ready when required mappings are confirmed", () => {
    const policy = loadPolicy();

    const state =
        policy.getSemanticProjectionRequirementState(
            "recipient_certificate",
            [
                {
                    standardEntityName: "user",
                    standardFieldName: "name"
                },
                {
                    standardEntityName:
                        "recipient_certificate",
                    standardFieldName:
                        "certificate_number"
                }
            ]
        );

    assert.strictEqual(
        state.status,
        "ready"
    );

    assert.deepStrictEqual(
        Array.from(state.missingRequiredMeanings),
        []
    );
});

test("unknown semantic projection fails closed for STEP3 readiness", () => {
    const policy = loadPolicy();

    const state =
        policy.getSemanticProjectionRequirementState(
            "unknown_semantic_type",
            []
        );

    assert.strictEqual(
        state.status,
        "semantic_projection_not_supported"
    );

    assert.deepStrictEqual(
        Array.from(state.missingRequiredMeanings),
        []
    );
});

test("explicit recipient certificate selection is recognized as an explicit projection", () => {
    const policy = loadPolicy();

    assert.strictEqual(
        policy.resolveExplicitSemanticProjectionType(
            "recipient_certificate"
        ),
        "recipient_certificate"
    );
});

test("absence of explicit projection remains distinct from legacy document fallback", () => {
    const policy = loadPolicy();

    assert.strictEqual(
        policy.resolveExplicitSemanticProjectionType(
            null
        ),
        null
    );

    assert.strictEqual(
        policy.resolveSemanticProjectionType(
            "recipient_certificate",
            null
        ),
        "recipient_certificate"
    );
});

test("unsupported explicit projection fails closed without becoming legacy fallback", () => {
    const policy = loadPolicy();

    assert.strictEqual(
        policy.resolveExplicitSemanticProjectionType(
            "unknown_semantic_type"
        ),
        null
    );
});

test(
    "recipient certificate projection does not require source record identity",
    () => {
        const policy =
            loadPolicy();

        const result =
            policy.getSemanticProjectionRequirementState(
                "recipient_certificate",
                [
                    {
                        standardEntityName: "user",
                        standardFieldName: "name"
                    },
                    {
                        standardEntityName:
                            "recipient_certificate",
                        standardFieldName:
                            "certificate_number"
                    }
                ]
            );

        assert.strictEqual(
            result.status,
            "ready"
        );
        assert.strictEqual(
            result.sourceRecordIdentityRequired,
            false
        );
    }
);

test("confirmed explicit recipient projection resolves execution semantic type from matching preview", () => {
    const policy = loadPolicy();

    const result =
        policy.resolveConfirmedExecutionSemanticType({
            confirmedDocumentType:
                "resident_master",
            explicitSemanticType:
                "recipient_certificate",
            previewSemanticType:
                "recipient_certificate"
        });

    assert.strictEqual(
        result,
        "recipient_certificate"
    );
});

test("explicit recipient projection fails closed when preview semantic type mismatches", () => {
    const policy = loadPolicy();

    const result =
        policy.resolveConfirmedExecutionSemanticType({
            confirmedDocumentType:
                "resident_master",
            explicitSemanticType:
                "recipient_certificate",
            previewSemanticType:
                "support_record"
        });

    assert.strictEqual(
        result,
        null
    );
});

test("explicit recipient projection fails closed when preview semantic type is missing", () => {
    const policy = loadPolicy();

    const result =
        policy.resolveConfirmedExecutionSemanticType({
            confirmedDocumentType:
                "resident_master",
            explicitSemanticType:
                "recipient_certificate",
            previewSemanticType:
                null
        });

    assert.strictEqual(
        result,
        null
    );
});

test("legacy recipient certificate keeps execution semantic type without explicit projection", () => {
    const policy = loadPolicy();

    const result =
        policy.resolveConfirmedExecutionSemanticType({
            confirmedDocumentType:
                "recipient_certificate",
            explicitSemanticType:
                null,
            previewSemanticType:
                "recipient_certificate"
        });

    assert.strictEqual(
        result,
        "recipient_certificate"
    );
});

test("legacy support record keeps execution semantic type without explicit projection", () => {
    const policy = loadPolicy();

    const result =
        policy.resolveConfirmedExecutionSemanticType({
            confirmedDocumentType:
                "support_record",
            explicitSemanticType:
                null,
            previewSemanticType:
                "support_record"
        });

    assert.strictEqual(
        result,
        "support_record"
    );
});

test("resident master alone does not become an execution semantic type", () => {
    const policy = loadPolicy();

    const result =
        policy.resolveConfirmedExecutionSemanticType({
            confirmedDocumentType:
                "resident_master",
            explicitSemanticType:
                null,
            previewSemanticType:
                null
        });

    assert.strictEqual(
        result,
        null
    );
});

test("legacy execution semantic type fails closed when preview semantic type mismatches source classification", () => {
    const policy = loadPolicy();

    const result =
        policy.resolveConfirmedExecutionSemanticType({
            confirmedDocumentType:
                "support_record",
            explicitSemanticType:
                null,
            previewSemanticType:
                "recipient_certificate"
        });

    assert.strictEqual(
        result,
        null
    );
});
