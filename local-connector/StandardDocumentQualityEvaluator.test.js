"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const StandardDocumentQualityEvaluator =
    require(
        "./StandardDocumentQualityEvaluator"
    );

test("valid document is acceptable", () => {
    const evaluator =
        new StandardDocumentQualityEvaluator();

    assert.deepStrictEqual(
        evaluator.evaluate({
            standardDocument: {
                documentTypeConfidence:
                    "high"
            },
            validation: {
                valid: true,
                issues: []
            }
        }),
        {
            acceptable: true,
            signals: [
                "structure_valid",
                "document_type_confidence:high"
            ]
        }
    );
});

test("invalid document is not acceptable", () => {
    const evaluator =
        new StandardDocumentQualityEvaluator();

    assert.deepStrictEqual(
        evaluator.evaluate({
            standardDocument: {
                documentTypeConfidence:
                    "medium"
            },
            validation: {
                valid: false,
                issues: [
                    "document_type_unresolved"
                ]
            }
        }),
        {
            acceptable: false,
            signals: [
                "document_type_confidence:medium"
            ]
        }
    );
});

test("missing confidence falls back to low", () => {
    const evaluator =
        new StandardDocumentQualityEvaluator();

    assert.deepStrictEqual(
        evaluator.evaluate({
            standardDocument: {},
            validation: {
                valid: true,
                issues: []
            }
        }),
        {
            acceptable: true,
            signals: [
                "structure_valid",
                "document_type_confidence:low"
            ]
        }
    );
});
