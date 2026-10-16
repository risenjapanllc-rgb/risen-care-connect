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

const browserHtml = fs.readFileSync(
    path.join(
        __dirname,
        "..",
        "local-connector.html"
    ),
    "utf8"
);

test(
    "semantic targets are loaded generically from the Local Connector API boundary",
    () => {
        assert.match(
            browserSource,
            /async function loadSemanticTargets\(\s*semanticType\s*\)/
        );

        assert.match(
            browserSource,
            /`\$\{LOCAL_CONNECTOR_BASE\}\/semantic-contracts\/\$\{encodeURIComponent\(normalizedSemanticType\)\}`/,
            [
                "Semantic target Authority must be loaded generically",
                "from LOCAL_CONNECTOR_BASE for the selected semantic type."
            ].join(" ")
        );

        assert.doesNotMatch(
            browserSource,
            /semantic-contracts\/recipient_certificate/,
            "The browser must not hard-code recipient_certificate as the Semantic Contract endpoint."
        );
    }
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
    "semantic target cache distinguishes unconfirmed authority from a confirmed empty contract",
    () => {
        assert.match(
            browserSource,
            /const\s+semanticTargetsByType\s*=\s*new Map\(\)\s*;/,
            "Semantic target Authority must start without a loaded contract."
        );

        assert.match(
            browserSource,
            /const targets\s*=\s*semanticTargetsByType\.get\(\s*normalizedSemanticType\s*\)\s*;/,
            "Semantic targets must be read from the per-type Authority cache."
        );

        assert.match(
            browserSource,
            /return Array\.isArray\(targets\)\s*\?\s*\[\.\.\.targets\]\s*:\s*null\s*;/,
            [
                "An unloaded Semantic Contract must remain null.",
                "A successfully loaded empty contract may remain an empty array."
            ].join(" ")
        );
    }
);

test(
    "semantic contract failure preserves an unconfirmed authority state",
    () => {
        assert.doesNotMatch(
            browserSource,
            /semanticTargetsByType\.set\([^)]*,\s*\[\s*\]\s*\)/,
            [
                "Infrastructure or API failure must not be represented",
                "as a successfully loaded empty Semantic Contract."
            ].join(" ")
        );

        assert.match(
            browserSource,
            /if\s*\(\s*!compatibility\.supported\s*\)\s*\{[\s\S]*?semanticTargetsByType\.delete\(\s*semanticType\s*\)/,
            [
                "When Semantic Contract capability is unavailable,",
                "the per-type Authority cache must be invalidated."
            ].join(" ")
        );

        assert.match(
            browserSource,
            /return Array\.isArray\(targets\)\s*\?\s*\[\.\.\.targets\]\s*:\s*null\s*;/,
            [
                "An unconfirmed Semantic Contract must remain null",
                "instead of being converted into an empty contract."
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
    "browser evaluates semantic contract capability for governed STEP3 projections",
    () => {
        assert.match(
            browserSource,
            /if\s*\(\s*usesSemanticProjectionRequirement\s*\)\s*\{[\s\S]*?evaluateLocalConnectorOperationCapability\(\s*selectedSemanticProjectionType\s*,\s*"semantic_contract"\s*\)/,
            [
                "Every governed STEP3 Semantic Projection must require",
                "the semantic_contract runtime capability.",
                "The check must not be recipient-certificate specific."
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

test(
    "semantic candidate resolver is loaded through a stable browser boundary before the controller",
    () => {
        const resolverIndex =
            browserHtml.indexOf(
                "/js/semantic-candidate-resolver.js"
            );

        const controllerIndex =
            browserHtml.indexOf(
                "/js/local-connector.js"
            );

        assert.notStrictEqual(
            resolverIndex,
            -1,
            "Semantic Candidate Resolver must be exposed through the browser js boundary."
        );

        assert.ok(
            resolverIndex < controllerIndex,
            "Semantic Candidate Resolver must load before local-connector.js."
        );

        assert.doesNotMatch(
            browserHtml,
            /<script[^>]+src=["']\/server-domain\//,
            "Browser HTML must not depend on the physical server-domain path."
        );
    }
);

test(
    "semantic candidate signal adapter is loaded through a stable browser boundary before the controller",
    () => {
        const adapterIndex =
            browserHtml.indexOf(
                "/js/semantic-candidate-signal-adapter.js"
            );

        const resolverIndex =
            browserHtml.indexOf(
                "/js/semantic-candidate-resolver.js"
            );

        const controllerIndex =
            browserHtml.indexOf(
                "/js/local-connector.js"
            );

        assert.notStrictEqual(
            adapterIndex,
            -1,
            "Semantic Candidate Signal Adapter must be exposed through the browser js boundary."
        );

        assert.ok(
            adapterIndex < resolverIndex,
            "Semantic Candidate Signal Adapter must load before Semantic Candidate Resolver."
        );

        assert.ok(
            adapterIndex < controllerIndex,
            "Semantic Candidate Signal Adapter must load before local-connector.js."
        );

        assert.doesNotMatch(
            browserHtml,
            /<script[^>]+src=["']\/server-domain\//,
            "Browser HTML must not depend on the physical server-domain path."
        );
    }
);

test(
    "browser resolves source-field semantic candidates through the governed adapter and resolver",
    () => {
        assert.match(
            browserSource,
            /RisenSemanticCandidateSignalAdapter[\s\S]*fromSourceFieldCandidates/
        );

        assert.match(
            browserSource,
            /RisenSemanticCandidateResolver/
        );

        assert.match(
            browserSource,
            /\.resolve\([\s\S]*semanticCandidateSignals[\s\S]*\)/
        );

        assert.match(
            browserSource,
            /semanticCandidateResolution\.status/
        );
    }
);

test(
    "browser does not present an exact suggestion as resolved when semantic candidates conflict",
    () => {
        assert.match(
            browserSource,
            /suggestedField\s*&&\s*semanticCandidateResolutionStatus\s*===\s*["']candidate["']\s*&&\s*reviewState\s*!==\s*["']confirmed["']/
        );

        assert.match(
            browserSource,
            /semanticCandidateResolutionStatus\s*===\s*["']conflict["'][\s\S]*候補が競合しています/
        );
    }
);

test(
    "semantic projection resolver is loaded through a stable browser boundary before the controller",
    () => {
        const resolverIndex =
            browserHtml.indexOf(
                "/js/semantic-projection-resolver.js"
            );

        const controllerIndex =
            browserHtml.indexOf(
                "/js/local-connector.js"
            );

        assert.notStrictEqual(
            resolverIndex,
            -1,
            "Semantic Projection Resolver must be exposed through the browser js boundary."
        );

        assert.ok(
            resolverIndex < controllerIndex,
            "Semantic Projection Resolver must load before local-connector.js."
        );

        assert.doesNotMatch(
            browserHtml,
            /<script[^>]+src=["']\/server-domain\//,
            "Browser HTML must not depend on the physical server-domain path."
        );
    }
);

test(
    "browser can resolve semantic projections internally from human-confirmed source field mappings",
    () => {
        const match =
            browserSource.match(
                /function getSelectedSemanticProjectionType\(\) \{[\s\S]*?\n\}/
            );

        assert.ok(
            match,
            "Browser controller must define the semantic projection selection boundary."
        );

        const source = match[0];

        assert.match(
            source,
            /RisenSemanticProjectionResolver/,
            "Semantic projection selection must consult the governed internal Projection Resolver."
        );

        assert.match(
            source,
            /collectHumanConfirmedSemanticMappings\(\)/,
            "Internal Projection Resolution must use projection-independent human-confirmed semantic mappings."
        );
    }
);

test(
    "human-confirmed semantic mapping collection remains projection-independent",
    () => {
        const start =
            browserSource.indexOf(
                "function collectHumanConfirmedSemanticMappings()"
            );

        const end =
            browserSource.indexOf(
                "function collectConfirmedSourceFieldMappings()"
            );

        assert.notStrictEqual(
            start,
            -1,
            "Browser controller must define projection-independent human-confirmed semantic mapping collection."
        );

        assert.ok(
            end > start,
            "Projection-independent mapping collection must be a separate boundary before projection-filtered persistence mappings."
        );

        const source =
            browserSource.slice(start, end);

        assert.match(
            source,
            /confirmedSourceFieldSelections/
        );

        assert.match(
            source,
            /sourceFieldMeaningSelections/
        );

        assert.match(
            source,
            /standardFields/
        );

        assert.doesNotMatch(
            source,
            /getSelectedSemanticProjectionType/
        );

        assert.doesNotMatch(
            source,
            /isMeaningAllowedForConfirmedDocumentType/
        );
    }
);

test(
    "browser carries internally resolved resident-master projection through preview request and verification",
    () => {
        const start =
            browserSource.indexOf(
                "async function loadImportPreview()"
            );

        const end =
            browserSource.indexOf(
                "async function executeConfirmedImport(",
                start
            );

        assert.notStrictEqual(
            start,
            -1
        );

        assert.ok(
            end > start
        );

        const source =
            browserSource.slice(start, end);

        assert.match(
            source,
            /confirmedDocumentType\s*===\s*"resident_master"/
        );

        assert.match(
            source,
            /semanticType:\s*previewSemanticProjectionType/
        );

        assert.match(
            source,
            /result\.semanticType\s*!==\s*previewSemanticProjectionType/
        );
    }
);


test(
    "browser carries internally resolved projection from preview into confirmed execution semantic type",
    () => {
        const start =
            browserSource.indexOf(
                "function getConfirmedExecutionSemanticType("
            );

        const end =
            browserSource.indexOf(
                "async function refreshSubjectContextResolution()",
                start
            );

        assert.notStrictEqual(
            start,
            -1
        );

        assert.ok(
            end > start
        );

        const source =
            browserSource.slice(start, end);

        assert.match(
            source,
            /resolvedSemanticProjectionType:\s*getSelectedSemanticProjectionType\(\)/
        );
    }
);


test(
    "resident-master STEP3 readiness uses the internally resolved governed projection",
    () => {
        const start =
            browserSource.indexOf(
                'importReadyButton?.addEventListener('
            );

        assert.notStrictEqual(
            start,
            -1
        );

        const source =
            browserSource.slice(start);

        assert.match(
            source,
            /const selectedSemanticProjectionType\s*=\s*getSelectedSemanticProjectionType\(\)/
        );

        assert.match(
            source,
            /confirmedDocumentType\s*===\s*"resident_master"/
        );

        assert.match(
            source,
            /getSemanticProjectionRequirementState\(\s*selectedSemanticProjectionType,\s*mappings\s*\)/
        );
    }
);

test(
    "STEP3 presents internally resolved projection as RISEN-read information without a manual projection selector",
    () => {
        assert.doesNotMatch(
            browserSource,
            /id=["']semanticProjectionSelect["']/
        );

        assert.doesNotMatch(
            browserSource,
            /semanticProjectionSelect\?\.addEventListener/
        );

        assert.match(
            browserSource,
            /RISENが読み取った情報/
        );

        assert.match(
            browserSource,
            /getSelectedSemanticProjectionType\(\)/
        );
    }
);

test(
    "browser carries internally resolved recipient-certificate projection into STEP6 import-execute payload",
    () => {
        const start =
            browserSource.indexOf(
                "async function executeConfirmedImport("
            );

        assert.notStrictEqual(
            start,
            -1
        );

        const source =
            browserSource.slice(
                start,
                start + 7000
            );

        assert.match(
            source,
            /executionSemanticType\s*===\s*"recipient_certificate"[\s\S]*?payload\.semanticType\s*=\s*executionSemanticType/
        );
    }
);

test(
    "STEP3 semantic suggestions remain projection-independent while confirmation stays contract-governed",
    () => {
        const start =
            browserSource.indexOf(
                "function renderConfirmation()"
            );

        const end =
            browserSource.indexOf(
                "function collectHumanConfirmedSemanticMappings()",
                start
            );

        assert.notStrictEqual(
            start,
            -1
        );

        assert.ok(
            end > start
        );

        const source =
            browserSource.slice(
                start,
                end
            );

        assert.match(
            source,
            /const availableStandardFields\s*=\s*standardFields\s*;/
        );

        assert.doesNotMatch(
            source,
            /const availableStandardFields\s*=\s*getAvailableStandardFields\(\)/
        );

        assert.match(
            source,
            /isMeaningAllowedForConfirmedDocumentType/
        );
    }
);


test(
    "STEP3 human semantic confirmation remains projection-independent while execution stays contract-governed",
    () => {
        const start =
            browserSource.indexOf(
                '".source-field-confirm-suggestion"'
            );

        const end =
            browserSource.indexOf(
                "function collectHumanConfirmedSemanticMappings()",
                start
            );

        assert.notStrictEqual(
            start,
            -1
        );

        assert.ok(
            end > start
        );

        const source =
            browserSource.slice(
                start,
                end
            );

        assert.doesNotMatch(
            source,
            /!isMeaningAllowedForConfirmedDocumentType\(\s*standardMeaning\s*\)/
        );

        assert.match(
            browserSource,
            /isMeaningAllowedForConfirmedDocumentType/
        );
    }
);
