"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SemanticProjectionResolver
} = require("./SemanticProjectionResolver");

test("確認済みSemantic MeaningからreadyなProjection群を内部解決する", () => {
    const projectionPolicy = {
        getSupportedExplicitSemanticProjectionTypes() {
            return [
                "recipient_certificate"
            ];
        },

        getSemanticProjectionRequirementState(
            semanticType,
            confirmedMappings
        ) {
            assert.strictEqual(
                semanticType,
                "recipient_certificate"
            );

            const hasUserName =
                confirmedMappings.some(
                    mapping =>
                        mapping.standardEntityName ===
                            "user" &&
                        mapping.standardFieldName ===
                            "name"
                );

            const hasCertificateNumber =
                confirmedMappings.some(
                    mapping =>
                        mapping.standardEntityName ===
                            "recipient_certificate" &&
                        mapping.standardFieldName ===
                            "certificate_number"
                );

            return {
                status:
                    hasUserName &&
                    hasCertificateNumber
                        ? "ready"
                        : "required_mapping_missing"
            };
        }
    };

    const result =
        SemanticProjectionResolver.resolve({
            projectionPolicy,
            confirmedMappings: [
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
        });

    assert.deepStrictEqual(
        result,
        {
            status: "resolved",
            semanticProjectionTypes: [
                "recipient_certificate"
            ]
        }
    );
});

test("同一Projection Resolver実装をBrowser境界にも公開できる", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const vm = require("node:vm");

    const source = fs.readFileSync(
        path.join(
            __dirname,
            "SemanticProjectionResolver.js"
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
                "SemanticProjectionResolver.js"
        }
    );

    assert.strictEqual(
        typeof context.window
            .RisenSemanticProjectionResolver,
        "function"
    );
});

test("複数のProjectionがreadyでも一方を勝手に捨てない", () => {
    const projectionPolicy = {
        getSupportedExplicitSemanticProjectionTypes() {
            return [
                "recipient_certificate",
                "future_projection"
            ];
        },

        getSemanticProjectionRequirementState() {
            return {
                status: "ready"
            };
        }
    };

    const result =
        SemanticProjectionResolver.resolve({
            projectionPolicy,
            confirmedMappings: []
        });

    assert.strictEqual(
        result.status,
        "resolved"
    );

    assert.deepStrictEqual(
        result.semanticProjectionTypes,
        [
            "recipient_certificate",
            "future_projection"
        ]
    );
});
