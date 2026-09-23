"use strict";

const assert = require("assert");
const {
    normalizeObservedLabel,
    resolveSubjectContext
} = require("../server-domain/context-resolution/ContextResolver");

assert.strictEqual(normalizeObservedLabel("(生年月日)"), "生年月日");

{
    const result = resolveSubjectContext({
        fieldDefinitions: [
            { sourceFieldKey: "c0", headerLabel: "社員番号" }
        ]
    });

    assert.strictEqual(result.status, "insufficient_context");
    assert.strictEqual(result.ambiguousFields.length, 1);
}

{
    const result = resolveSubjectContext({
        fieldDefinitions: [
            { sourceFieldKey: "c0", headerLabel: "社員番号" },
            { sourceFieldKey: "c1", headerLabel: "(氏名)" },
            { sourceFieldKey: "c4", headerLabel: "受給者証NO" },
            { sourceFieldKey: "c5", headerLabel: "有効期限" },
            { sourceFieldKey: "c8", headerLabel: "(性別)" },
            { sourceFieldKey: "c9", headerLabel: "(生年月日)" }
        ],
        confirmedDocumentType: "recipient_certificate"
    });

    assert.strictEqual(result.status, "hypotheses_available");
    assert.ok(
        result.hypotheses.some(item => item.subject === "user")
    );
    assert.ok(
        result.hypotheses.some(
            item => item.subject === "recipient_certificate"
        )
    );

    const employeeNumber = result.ambiguousFields.find(
        item => item.headerLabel === "社員番号"
    );

    assert.ok(employeeNumber);
    assert.strictEqual(
        employeeNumber.reason,
        "subject_not_determined_by_label_alone"
    );
}

console.log("ContextResolver tests PASS");


{
    const result = resolveSubjectContext({
        fieldDefinitions: [
            { sourceFieldKey: "c0", headerLabel: "社員番号" },
            { sourceFieldKey: "c4", headerLabel: "受給者証NO" },
            { sourceFieldKey: "c5", headerLabel: "有効期限" },
            { sourceFieldKey: "c9", headerLabel: "(生年月日)" }
        ],
        confirmedDocumentType: "recipient_certificate"
    });

    assert.strictEqual(
        result.humanConfirmationRequired,
        true
    );

    assert.ok(
        result.hypotheses.every(
            item =>
                item.status === "hypothesis" &&
                item.humanConfirmationRequired === true
        )
    );

    const employeeNumber =
        result.ambiguousFields.find(
            item => item.headerLabel === "社員番号"
        );

    assert.ok(employeeNumber);
    assert.strictEqual(
        employeeNumber.humanConfirmationRequired,
        true
    );

    assert.ok(
        !Object.prototype.hasOwnProperty.call(
            employeeNumber,
            "resolvedMeaning"
        )
    );
}


{
    const result = resolveSubjectContext({
        fieldDefinitions: [
            { sourceFieldKey: "c0", headerLabel: "社員番号" },
            { sourceFieldKey: "c4", headerLabel: "受給者証NO" },
            { sourceFieldKey: "c8", headerLabel: "(性別)" },
            { sourceFieldKey: "c9", headerLabel: "(生年月日)" }
        ]
    });

    const candidate =
        result.contextualCandidates.find(
            item => item.headerLabel === "社員番号"
        );

    assert.ok(candidate);
    assert.strictEqual(
        candidate.status,
        "contextual_candidate"
    );
    assert.strictEqual(
        candidate.candidate.entityName,
        "user"
    );
    assert.strictEqual(
        candidate.candidate.fieldName,
        "user_code"
    );
    assert.strictEqual(
        candidate.humanConfirmationRequired,
        true
    );
}

{
    const result = resolveSubjectContext({
        fieldDefinitions: [
            { sourceFieldKey: "c0", headerLabel: "社員番号" }
        ]
    });

    assert.strictEqual(
        result.contextualCandidates.length,
        0
    );
}

{
    const result = resolveSubjectContext({
        fieldDefinitions: [
            { sourceFieldKey: "c0", headerLabel: "社員番号" },
            { sourceFieldKey: "c1", headerLabel: "記録者" },
            { sourceFieldKey: "c2", headerLabel: "担当職員" }
        ]
    });

    assert.strictEqual(
        result.contextualCandidates.length,
        0
    );
}

{
    const result = resolveSubjectContext({
        fieldDefinitions: [
            { sourceFieldKey: "c0", headerLabel: "社員番号" },
            { sourceFieldKey: "c4", headerLabel: "受給者証NO" },
            { sourceFieldKey: "c9", headerLabel: "(生年月日)" }
        ]
    });

    const candidate =
        result.contextualCandidates[0];

    assert.ok(candidate);
    assert.ok(
        candidate.evidence.length >= 2
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            candidate,
            "resolvedMeaning"
        ),
        false
    );
}
