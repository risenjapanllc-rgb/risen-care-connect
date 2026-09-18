"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordExecutionDecision =
    require("./ConnectorSupportRecordExecutionDecision");

const ConnectorSupportRecordCanonicalizer =
    require("../server-domain/semantic/ConnectorSupportRecordCanonicalizer");

const decision =
    new ConnectorSupportRecordExecutionDecision();

const canonicalizer =
    new ConnectorSupportRecordCanonicalizer();

const TARGET_CONTENT =
    canonicalizer.process({
        record_date:
            "2026-09-17 09:00",
        record_content:
            "更新後",
        staff_name: null,
        record_category: null,
        created_at: null
    });

const BASELINE_CONTENT =
    canonicalizer.process({
        record_date:
            "2026-09-17 09:00",
        record_content:
            "更新前",
        staff_name: null,
        record_category: null,
        created_at: null
    });

const BASELINE =
    BASELINE_CONTENT.contentHash;
const TARGET =
    TARGET_CONTENT.contentHash;
const OTHER = "c".repeat(64);

function current({
    contentHash = BASELINE,
    residentId = "resident-1",
    recordId = "record-1",
    semanticType = "support_record",
    canonicalizationVersion =
        "risen-semantic-canonicalization-2"
} = {}) {
    return {
        contentHash,
        residentId,
        recordId,
        semanticType,
        canonicalizationVersion,
        semanticContent:
            contentHash === TARGET
                ? TARGET_CONTENT.semanticContent
                : BASELINE_CONTENT.semanticContent
    };
}

test(
    "new with no current identity executes create",
    () => {
        assert.deepEqual(
            decision.decide({
                plannedAction: "new",
                residentId: "resident-1",
                targetHash: TARGET,
                targetSemanticContent:
                    TARGET_CONTENT.semanticContent,
                currentRecord: null
            }),
            {
                status: "execute",
                operation: "create"
            }
        );
    }
);

test(
    "new with target already present is already applied",
    () => {
        assert.deepEqual(
            decision.decide({
                plannedAction: "new",
                residentId: "resident-1",
                targetHash: TARGET,
                targetSemanticContent:
                    TARGET_CONTENT.semanticContent,
                currentRecord: current({
                    contentHash: TARGET
                })
            }),
            {
                status: "already_applied"
            }
        );
    }
);

test(
    "new with different current content conflicts",
    () => {
        assert.deepEqual(
            decision.decide({
                plannedAction: "new",
                residentId: "resident-1",
                targetHash: TARGET,
                targetSemanticContent:
                    TARGET_CONTENT.semanticContent,
                currentRecord: current({
                    contentHash: OTHER
                })
            }),
            {
                status: "conflict"
            }
        );
    }
);

test(
    "update at baseline executes optimistic update",
    () => {
        assert.deepEqual(
            decision.decide({
                plannedAction: "update",
                residentId: "resident-1",
                recordId: "record-1",
                baselineHash: BASELINE,
                targetHash: TARGET,
                targetSemanticContent:
                    TARGET_CONTENT.semanticContent,
                currentRecord: current()
            }),
            {
                status: "execute",
                operation: "update"
            }
        );
    }
);

test(
    "update already at target is already applied",
    () => {
        assert.deepEqual(
            decision.decide({
                plannedAction: "update",
                residentId: "resident-1",
                recordId: "record-1",
                baselineHash: BASELINE,
                targetHash: TARGET,
                targetSemanticContent:
                    TARGET_CONTENT.semanticContent,
                currentRecord: current({
                    contentHash: TARGET
                })
            }),
            {
                status: "already_applied"
            }
        );
    }
);

test(
    "update changed away from baseline and target conflicts",
    () => {
        assert.deepEqual(
            decision.decide({
                plannedAction: "update",
                residentId: "resident-1",
                recordId: "record-1",
                baselineHash: BASELINE,
                targetHash: TARGET,
                targetSemanticContent:
                    TARGET_CONTENT.semanticContent,
                currentRecord: current({
                    contentHash: OTHER
                })
            }),
            {
                status: "conflict"
            }
        );
    }
);

test(
    "resident type version or record identity mismatch conflicts",
    () => {
        for (const currentRecord of [
            current({
                residentId: "resident-2"
            }),
            current({
                semanticType: "other"
            }),
            current({
                canonicalizationVersion:
                    "risen-semantic-canonicalization-1"
            }),
            current({
                recordId: "record-2"
            })
        ]) {
            assert.deepEqual(
                decision.decide({
                    plannedAction: "update",
                    residentId: "resident-1",
                    recordId: "record-1",
                    baselineHash: BASELINE,
                    targetHash: TARGET,
                    targetSemanticContent:
                        TARGET_CONTENT.semanticContent,
                    currentRecord
                }),
                {
                    status: "conflict"
                }
            );
        }
    }
);


test(
    "matching baseline hash with tampered semantic content conflicts",
    () => {
        const currentRecord =
            current();

        currentRecord.semanticContent = {
            semanticType:
                "support_record",
            fields: {
                record_date:
                    "2026-09-17 09:00",
                record_content:
                    "改ざん",
                staff_name: null,
                record_category: null,
                created_at: null
            },
            customFields: {}
        };

        assert.deepEqual(
            decision.decide({
                plannedAction: "update",
                residentId: "resident-1",
                recordId: "record-1",
                baselineHash: BASELINE,
                targetHash: TARGET,
                targetSemanticContent:
                    TARGET_CONTENT.semanticContent,
                currentRecord
            }),
            {
                status: "conflict"
            }
        );
    }
);

test(
    "matching target hash with tampered semantic content conflicts",
    () => {
        const currentRecord =
            current({
                contentHash: TARGET
            });

        currentRecord.semanticContent = {
            semanticType:
                "support_record",
            fields: {
                record_date:
                    "2026-09-17 09:00",
                record_content:
                    "改ざん",
                staff_name: null,
                record_category: null,
                created_at: null
            },
            customFields: {}
        };

        assert.deepEqual(
            decision.decide({
                plannedAction: "update",
                residentId: "resident-1",
                recordId: "record-1",
                baselineHash: BASELINE,
                targetHash: TARGET,
                targetSemanticContent:
                    TARGET_CONTENT.semanticContent,
                currentRecord
            }),
            {
                status: "conflict"
            }
        );
    }
);
