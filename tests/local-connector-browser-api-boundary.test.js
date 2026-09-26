"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const browserSource = fs.readFileSync(
    path.join(
        __dirname,
        "..",
        "js",
        "local-connector.js"
    ),
    "utf8"
);

test(
    "recipient certificate semantic contract is loaded from the Local Connector API boundary",
    () => {
        assert.match(
            browserSource,
            /fetch\(\s*`\$\{LOCAL_CONNECTOR_BASE\}\/semantic-contracts\/recipient-certificate`\s*\)/,
            [
                "The browser must load the recipient certificate semantic contract",
                "from LOCAL_CONNECTOR_BASE.",
                "A relative URL would incorrectly target the web UI origin",
                "instead of the Local Connector."
            ].join(" ")
        );
    }
);

const browserHtml = fs.readFileSync(
    path.join(
        __dirname,
        "..",
        "local-connector.html"
    ),
    "utf8"
);

test(
    "runtime compatibility policy is loaded before the Local Connector browser controller",
    () => {
        const policyIndex =
            browserHtml.indexOf(
                "/js/local-connector-runtime-compatibility-policy.js"
            );

        const controllerIndex =
            browserHtml.indexOf(
                "/js/local-connector.js"
            );

        assert.notStrictEqual(
            policyIndex,
            -1,
            "Runtime compatibility policy must be loaded by local-connector.html."
        );

        assert.notStrictEqual(
            controllerIndex,
            -1,
            "Local Connector browser controller must be loaded."
        );

        assert.ok(
            policyIndex < controllerIndex,
            "Runtime compatibility policy must load before local-connector.js."
        );
    }
);

test(
    "runtime contract is loaded from the Local Connector API boundary",
    () => {
        assert.match(
            browserSource,
            /fetch\(\s*`\$\{LOCAL_CONNECTOR_BASE\}\/runtime-contract`\s*\)/,
            [
                "The browser must load the runtime contract",
                "from LOCAL_CONNECTOR_BASE before trusting",
                "Local Connector capabilities."
            ].join(" ")
        );
    }
);

test(
    "recipient certificate semantic targets start as unconfirmed rather than an empty contract",
    () => {
        assert.match(
            browserSource,
            /let\s+recipientCertificateSemanticTargets\s*=\s*null\s*;/,
            [
                "Unconfirmed semantic contract state must be null.",
                "An empty array is reserved for a successfully loaded",
                "contract that actually contains no targets."
            ].join(" ")
        );
    }
);

test(
    "semantic contract load failure is not converted into an empty business contract",
    () => {
        assert.doesNotMatch(
            browserSource,
            /catch\s*\(\s*error\s*\)\s*\{\s*recipientCertificateSemanticTargets\s*=\s*\[\s*\]/,
            [
                "Infrastructure or API failure must not be represented",
                "as an empty recipient certificate semantic contract."
            ].join(" ")
        );
    }
);

test(
    "browser retains the Local Connector runtime contract for operation-specific capability checks",
    () => {
        assert.match(
            browserSource,
            /let\s+localConnectorRuntimeContract\s*=\s*null\s*;/,
            [
                "The browser must retain the runtime contract itself.",
                "A compatibility result for one capability cannot be reused",
                "as authority for preview or execution capabilities."
            ].join(" ")
        );
    }
);

test(
    "browser evaluates recipient certificate semantic contract capability before STEP3 progression",
    () => {
        assert.match(
            browserSource,
            /evaluateLocalConnectorOperationCapability\(\s*getSelectedSemanticProjectionType\(\)\s*,\s*"semantic_contract"\s*\)/,
            [
                "Explicit recipient certificate STEP3 progression must",
                "require the semantic_contract runtime capability.",
                "Semantic mapping readiness alone is insufficient."
            ].join(" ")
        );
    }
);

test(
    "runtime contract authority is invalidated before a new runtime contract fetch",
    () => {
        assert.match(
            browserSource,
            /async function loadLocalConnectorRuntimeCompatibility\(\)\s*\{\s*localConnectorRuntimeContract\s*=\s*null\s*;\s*const response\s*=\s*await fetch/,
            [
                "A previous runtime contract must stop being authoritative",
                "before a new runtime contract request begins.",
                "A failed fetch must never leave stale capabilities active."
            ].join(" ")
        );
    }
);

test(
    "browser requires recipient certificate preview capability before import preview request",
    () => {
        assert.match(
            browserSource,
            /async function loadImportPreview\(\)[\s\S]*?evaluateLocalConnectorOperationCapability\(\s*getSelectedSemanticProjectionType\(\)\s*,\s*"preview"\s*\)[\s\S]*?fetch\(\s*`\$\{LOCAL_CONNECTOR_BASE\}\/import-preview`/,
            [
                "Recipient certificate preview must require",
                "the preview runtime capability before the browser",
                "sends the import-preview request."
            ].join(" ")
        );
    }
);

test(
    "browser requires recipient certificate fingerprint execution capability before import execution request",
    () => {
        assert.match(
            browserSource,
            /async function executeConfirmedImport\(\s*executionSemanticType\s*\)[\s\S]*?evaluateLocalConnectorOperationCapability\(\s*executionSemanticType\s*,\s*"fingerprint_execution"\s*\)[\s\S]*?fetch\(\s*`\$\{LOCAL_CONNECTOR_BASE\}\/import-execute`/,
            [
                "Recipient certificate execution must require",
                "the fingerprint execution runtime capability",
                "before the browser sends the import-execute request."
            ].join(" ")
        );
    }
);
