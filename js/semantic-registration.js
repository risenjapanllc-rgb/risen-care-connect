"use strict";

const LOCAL_CONNECTOR_BASE =
    "http://127.0.0.1:4310";

let semanticStandardFields = [];
let semanticResolvedFields = [];
let semanticCurrentFilter = "all";
let semanticPersistedMappings = new Map();
let semanticCurrentAnalysis = null;

let semanticContextCandidates =
    new Map();
let semanticCurrentFieldDefinitions = [];
let semanticCurrentTemplateId = null;

const fileSelect =
    document.getElementById(
        "semanticFileSelect"
    );

const analyzeButton =
    document.getElementById(
        "semanticAnalyzeButton"
    );

const statusElement =
    document.getElementById(
        "semanticStatus"
    );

const summaryPanel =
    document.getElementById(
        "semanticSummaryPanel"
    );

const fieldsPanel =
    document.getElementById(
        "semanticFieldsPanel"
    );

const fieldsBody =
    document.getElementById(
        "semanticFieldsBody"
    );

const emptyState =
    document.getElementById(
        "semanticEmptyState"
    );

const registerButton =
    document.getElementById(
        "semanticRegisterButton"
    );

const confirmHighConfidenceButton =
    document.getElementById(
        "semanticConfirmHighConfidenceButton"
    );


function setStatus(message, type = "") {
    if (!statusElement) {
        return;
    }

    statusElement.textContent =
        String(message || "");

    statusElement.dataset.status =
        type;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeSemanticLabel(value) {
    return String(value || "")
        .trim()
        .replaceAll("（", "(")
        .replaceAll("）", ")")
        .replaceAll("　", " ")
        .replace(/\s+/g, "")
        .toLowerCase();
}

function getSourceFieldLabel(field) {
    const candidates = [
        field?.headerLabel,
        field?.header_label,
        field?.label,
        field?.displayName,
        field?.name,
        field?.sourceHeader,
        field?.sourceLabel
    ];

    for (const value of candidates) {
        if (
            typeof value === "string" &&
            value.trim()
        ) {
            return value.trim();
        }
    }

    return (
        typeof field?.sourceFieldKey === "string"
            ? field.sourceFieldKey
            : "項目名不明"
    );
}

function getSourceFieldKey(field, index) {
    if (
        typeof field?.sourceFieldKey === "string" &&
        field.sourceFieldKey.trim()
    ) {
        return field.sourceFieldKey.trim();
    }

    return `field:${index}`;
}

async function loadStandardFields() {
    const response =
        await fetch(
            "/api/standard-fields"
        );

    const result =
        await response.json();

    if (
        !response.ok ||
        !Array.isArray(result)
    ) {
        throw new Error(
            "RISEN標準Meaningを取得できませんでした"
        );
    }

    semanticStandardFields =
        result;
}

async function loadFiles() {
    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/files`
        );

    const result =
        await response.json();

    if (
        !response.ok ||
        !result ||
        typeof result !== "object"
    ) {
        throw new Error(
            "Local Connectorのファイル一覧を取得できませんでした"
        );
    }

    const files =
        Array.isArray(result.files)
            ? result.files
            : [];

    renderFileOptions(files);
}

function getFileName(file) {
    const candidates = [
        file?.fileName,
        file?.name,
        file?.path
    ];

    for (const value of candidates) {
        if (
            typeof value === "string" &&
            value.trim()
        ) {
            return value.trim();
        }
    }

    return "";
}

function renderFileOptions(files) {
    const supported =
        files
            .map(file => ({
                file,
                value:
                    getFileName(file)
            }))
            .filter(item => {
                const value =
                    item.value.toLowerCase();

                return (
                    value.endsWith(".csv") ||
                    value.endsWith(".xls") ||
                    value.endsWith(".xlsx") ||
                    value.endsWith(".doc") ||
                    value.endsWith(".docx")
                );
            });

    fileSelect.innerHTML = "";

    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value = "";

    placeholder.textContent =
        supported.length > 0
            ? "書類を選択してください"
            : "対象ファイルがありません";

    fileSelect.appendChild(
        placeholder
    );

    for (const item of supported) {
        const option =
            document.createElement(
                "option"
            );

        option.value =
            item.value;

        option.textContent =
            item.value;

        fileSelect.appendChild(
            option
        );
    }

    fileSelect.disabled =
        supported.length === 0;

    analyzeButton.disabled =
        true;

    setStatus(
        supported.length > 0
            ? `${supported.length}件の書類を確認できます。`
            : "CSV・Excel・Wordファイルがありません。"
    );
}

async function loadContextCandidates(
    analysis,
    fieldDefinitions
) {
    semanticContextCandidates =
        new Map();

    const semanticEvidence =
        Array.isArray(
            analysis?.extracted
                ?.semanticEvidence
        )
            ? analysis
                .extracted
                .semanticEvidence
            : [];

    const response =
        await fetch(
            "/api/context-resolution",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    fieldDefinitions,
                    confirmedDocumentType:
                        typeof analysis
                            ?.documentType ===
                            "string" &&
                        analysis.documentType !==
                            "unknown"
                            ? analysis
                                .documentType
                            : null,
                    semanticEvidence
                })
            }
        );

    const result =
        await response.json();

    if (
        !response.ok ||
        !result ||
        typeof result !== "object"
    ) {
        throw new Error(
            result?.message ||
            "文脈解析に失敗しました"
        );
    }

    const contextualCandidates =
        Array.isArray(
            result?.context
                ?.contextualCandidates
        )
            ? result
                .context
                .contextualCandidates
            : [];

    for (
        const candidate
        of contextualCandidates
    ) {
        const sourceFieldKey =
            typeof candidate
                ?.sourceFieldKey ===
                "string"
                ? candidate
                    .sourceFieldKey
                    .trim()
                : "";

        const entityName =
            typeof candidate
                ?.candidate
                ?.entityName ===
                "string"
                ? candidate
                    .candidate
                    .entityName
                    .trim()
                : "";

        const fieldName =
            typeof candidate
                ?.candidate
                ?.fieldName ===
                "string"
                ? candidate
                    .candidate
                    .fieldName
                    .trim()
                : "";

        if (
            !sourceFieldKey ||
            !entityName ||
            !fieldName
        ) {
            continue;
        }

        semanticContextCandidates.set(
            sourceFieldKey,
            {
                semanticMeaning:
                    `${entityName}.${fieldName}`,

                displayName:
                    typeof candidate
                        ?.candidate
                        ?.displayName ===
                        "string"
                        ? candidate
                            .candidate
                            .displayName
                            .trim()
                        : `${entityName}.${fieldName}`,

                reason:
                    typeof candidate
                        ?.reason ===
                        "string"
                        ? candidate
                            .reason
                        : null,

                evidence:
                    Array.isArray(
                        candidate?.evidence
                    )
                        ? candidate.evidence
                        : [],

                humanConfirmationRequired:
                    candidate
                        ?.humanConfirmationRequired ===
                    true
            }
        );
    }
}


function findMeaningCandidates(label) {
    const normalized =
        normalizeSemanticLabel(
            label
        );

    if (!normalized) {
        return [];
    }

    const matches = [];

    for (
        const field
        of semanticStandardFields
    ) {
        const meaning =
            [
                field?.entity_name,
                field?.field_name
            ]
                .filter(Boolean)
                .join(".");

        if (!meaning) {
            continue;
        }

        const displayName =
            String(
                field?.display_name ||
                ""
            ).trim();

        if (
            normalizeSemanticLabel(
                displayName
            ) === normalized
        ) {
            matches.push({
                semanticMeaning:
                    meaning,
                matchType:
                    "exact",
                matchedLabel:
                    displayName
            });

            continue;
        }

        const synonyms =
            Array.isArray(
                field?.synonyms
            )
                ? field.synonyms
                : [];

        const synonym =
            synonyms.find(item =>
                normalizeSemanticLabel(
                    item
                ) === normalized
            );

        if (synonym) {
            matches.push({
                semanticMeaning:
                    meaning,
                matchType:
                    "alias",
                matchedLabel:
                    synonym
            });
        }
    }

    const unique = new Map();

    for (const item of matches) {
        if (
            !unique.has(
                item.semanticMeaning
            )
        ) {
            unique.set(
                item.semanticMeaning,
                item
            );
        }
    }

    return [
        ...unique.values()
    ];
}

function resolveFields(
    fieldDefinitions
) {
    const SignalAdapter =
        window
            .RisenSemanticCandidateSignalAdapter;

    const CandidateResolver =
        window
            .RisenSemanticCandidateResolver;

    return fieldDefinitions.map(
        (field, index) => {
            const label =
                getSourceFieldLabel(
                    field
                );

            const sourceFieldKey =
                getSourceFieldKey(
                    field,
                    index
                );

            const persistedMeaning =
                semanticPersistedMappings.get(
                    sourceFieldKey
                );

            if (persistedMeaning) {
                return {
                    sourceFieldKey,
                    label,
                    status:
                        "registered",
                    semanticMeaning:
                        persistedMeaning,
                    displayName:
                        null,
                    candidates: []
                };
            }

            const standardCandidates =
                findMeaningCandidates(
                    label
                );

            const contextualCandidate =
                semanticContextCandidates.get(
                    sourceFieldKey
                ) || null;

            const suggestedMeaning =
                standardCandidates.length === 1
                    ? standardCandidates[0]
                        .semanticMeaning
                    : null;

            const contextualMeaning =
                contextualCandidate
                    ?.semanticMeaning ||
                null;

            if (
                SignalAdapter &&
                CandidateResolver
            ) {
                const signals =
                    SignalAdapter
                        .fromSourceFieldCandidates({
                            sourceFieldKey,
                            suggestedMeaning,
                            contextualMeaning,
                            contextualMeaningAllowed:
                                Boolean(
                                    contextualMeaning
                                )
                        });

                const resolved =
                    new CandidateResolver()
                        .resolve(
                            signals
                        );

                if (
                    resolved.status ===
                        "candidate" &&
                    resolved
                        .candidates
                        .length === 1
                ) {
                    const semanticMeaning =
                        resolved
                            .candidates[0]
                            .semanticTarget;

                    const standardMatch =
                        standardCandidates.find(
                            candidate =>
                                candidate
                                    .semanticMeaning ===
                                semanticMeaning
                        );

                    if (standardMatch) {
                        return {
                            sourceFieldKey,
                            label,
                            status:
                                standardMatch
                                    .matchType,
                            semanticMeaning,
                            displayName:
                                null,
                            candidates:
                                standardCandidates
                        };
                    }

                    if (
                        contextualCandidate &&
                        contextualCandidate
                            .semanticMeaning ===
                        semanticMeaning
                    ) {
                        return {
                            sourceFieldKey,
                            label,
                            status:
                                "context",
                            semanticMeaning,
                            displayName:
                                contextualCandidate
                                    .displayName,
                            contextReason:
                                contextualCandidate
                                    .reason,
                            contextEvidence:
                                contextualCandidate
                                    .evidence,
                            candidates: [{
                                semanticMeaning,
                                displayName:
                                    contextualCandidate
                                        .displayName,
                                matchType:
                                    "context"
                            }]
                        };
                    }
                }

                if (
                    resolved.status ===
                    "conflict"
                ) {
                    const candidates =
                        resolved
                            .candidates
                            .map(candidate => {
                                const semanticMeaning =
                                    candidate
                                        .semanticTarget;

                                const standard =
                                    standardCandidates
                                        .find(
                                            item =>
                                                item
                                                    .semanticMeaning ===
                                                semanticMeaning
                                        );

                                if (standard) {
                                    return {
                                        ...standard
                                    };
                                }

                                if (
                                    contextualCandidate &&
                                    contextualCandidate
                                        .semanticMeaning ===
                                    semanticMeaning
                                ) {
                                    return {
                                        semanticMeaning,
                                        displayName:
                                            contextualCandidate
                                                .displayName,
                                        matchType:
                                            "context"
                                    };
                                }

                                return {
                                    semanticMeaning,
                                    displayName:
                                        semanticMeaning,
                                    matchType:
                                        "candidate"
                                };
                            });

                    return {
                        sourceFieldKey,
                        label,
                        status:
                            "ambiguous",
                        semanticMeaning:
                            null,
                        displayName:
                            null,
                        candidates
                    };
                }
            }

            if (
                standardCandidates.length ===
                1
            ) {
                return {
                    sourceFieldKey,
                    label,
                    status:
                        standardCandidates[0]
                            .matchType,
                    semanticMeaning:
                        standardCandidates[0]
                            .semanticMeaning,
                    displayName:
                        null,
                    candidates:
                        standardCandidates
                };
            }

            return {
                sourceFieldKey,
                label,
                status:
                    standardCandidates.length >
                    1
                        ? "ambiguous"
                        : "review",
                semanticMeaning:
                    null,
                displayName:
                    null,
                candidates:
                    standardCandidates
            };
        }
    );
}

function renderSummary() {
    const ReviewModel =
        window.RisenSemanticReviewModel;

    const summary =
        ReviewModel
            ? ReviewModel.summarize(
                semanticResolvedFields
            )
            : {
                total:
                    semanticResolvedFields
                        .length,

                registered:
                    semanticResolvedFields
                        .filter(
                            item =>
                                item.status ===
                                "registered"
                        )
                        .length,

                resolved:
                    semanticResolvedFields
                        .filter(
                            item =>
                                item.status ===
                                    "exact" ||
                                item.status ===
                                    "alias"
                        )
                        .length,

                candidate:
                    semanticResolvedFields
                        .filter(
                            item =>
                                item.status ===
                                "context"
                        )
                        .length,

                review:
                    semanticResolvedFields
                        .filter(
                            item =>
                                ![
                                    "registered",
                                    "exact",
                                    "alias",
                                    "context"
                                ].includes(
                                    item.status
                                )
                        )
                        .length
            };

    document.getElementById(
        "semanticTotalCount"
    ).textContent =
        summary.total;

    document.getElementById(
        "semanticRegisteredCount"
    ).textContent =
        summary.registered;

    document.getElementById(
        "semanticExactCount"
    ).textContent =
        summary.resolved;

    document.getElementById(
        "semanticAliasCount"
    ).textContent =
        summary.candidate;

    document.getElementById(
        "semanticReviewCount"
    ).textContent =
        summary.review;

    summaryPanel.hidden =
        false;

    updateHighConfidenceButton();
}

function badgeFor(item) {
    if (item.status === "registered") {
        return `
            <span
                class="
                    semantic-badge
                    semantic-badge-exact
                "
            >
                ✓ 登録済み
            </span>
        `;
    }

    if (
        item.status === "exact" ||
        item.status === "alias"
    ) {
        return `
            <span
                class="
                    semantic-badge
                    semantic-badge-exact
                "
            >
                ✓ RISEN判定済み
            </span>
        `;
    }

    if (
        item.status === "context"
    ) {
        return `
            <span
                class="
                    semantic-badge
                    semantic-badge-review
                "
            >
                ○ RISEN候補
            </span>
        `;
    }

    if (
        item.status === "ambiguous"
    ) {
        return `
            <span
                class="
                    semantic-badge
                    semantic-badge-review
                "
            >
                △ 複数候補
            </span>
        `;
    }

    return `
        <span
            class="
                semantic-badge
                semantic-badge-review
            "
        >
            △ 要確認
        </span>
    `;
}

function getHighConfidenceCandidates() {
    return semanticResolvedFields.filter(
        item =>
            (
                item.status === "exact" ||
                item.status === "alias"
            ) &&
            typeof item.semanticMeaning ===
                "string" &&
            item.semanticMeaning.trim()
    );
}

function updateHighConfidenceButton() {
    if (!confirmHighConfidenceButton) {
        return;
    }

    const count =
        getHighConfidenceCandidates()
            .length;

    confirmHighConfidenceButton.disabled =
        !semanticCurrentTemplateId ||
        count === 0;

    confirmHighConfidenceButton.textContent =
        count > 0
            ? `RISEN判定をまとめて確定 (${count})`
            : "RISEN判定をまとめて確定";
}

async function persistConfirmedMeaning(
    item,
    semanticMeaning
) {
    const separator =
        semanticMeaning.indexOf(".");

    if (
        separator <= 0 ||
        separator ===
            semanticMeaning.length - 1
    ) {
        throw new Error(
            `${item.label} のMeaning形式が不正です`
        );
    }

    const standardEntityName =
        semanticMeaning.slice(
            0,
            separator
        );

    const standardFieldName =
        semanticMeaning.slice(
            separator + 1
        );

    const result =
        await postSemanticRegistration(
            "/source-template-semantic-authority",
            "sourceTemplateSemanticAuthority",
            {
                templateId:
                    semanticCurrentTemplateId,

                templateFieldKey:
                    item.sourceFieldKey,

                interpretationStatus:
                    "confirmed",

                mappingStatus:
                    "mapped",

                confirmedMeaning:
                    semanticMeaning,

                standardEntityName,

                standardFieldName,

                confirmedAt:
                    new Date()
                        .toISOString()
            }
        );

    if (
        result.status ===
        "conflict"
    ) {
        throw new Error(
            `${item.label} の既存Semantic定義と競合しています`
        );
    }

    item.semanticMeaning =
        semanticMeaning;

    item.status =
        "registered";

    return result;
}

async function confirmHighConfidenceCandidates() {
    if (!semanticCurrentTemplateId) {
        setStatus(
            "Semantic書式を確認できません。",
            "error"
        );
        return;
    }

    const candidates =
        getHighConfidenceCandidates();

    if (candidates.length === 0) {
        return;
    }

    confirmHighConfidenceButton.disabled =
        true;

    confirmHighConfidenceButton.textContent =
        `確定中... 0/${candidates.length}`;

    let confirmedCount = 0;

    try {
        for (const item of candidates) {
            await persistConfirmedMeaning(
                item,
                item.semanticMeaning.trim()
            );

            confirmedCount += 1;

            confirmHighConfidenceButton.textContent =
                `確定中... ${confirmedCount}/${candidates.length}`;
        }

        renderSummary();
        renderFields();

        setStatus(
            `RISEN判定 ${confirmedCount}件を確定しました。`,
            "success"
        );
    } catch (error) {
        console.error(error);

        renderSummary();
        renderFields();

        setStatus(
            error?.message ||
            "RISEN判定の一括確定に失敗しました。",
            "error"
        );
    } finally {
        updateHighConfidenceButton();
    }
}

function renderSemanticEvidence(
    review
) {
    const sampleValues =
        Array.isArray(
            review?.evidence
                ?.sampleValues
        )
            ? review
                .evidence
                .sampleValues
            : [];

    const neighboringFields =
        Array.isArray(
            review?.evidence
                ?.neighboringFields
        )
            ? review
                .evidence
                .neighboringFields
            : [];

    if (
        sampleValues.length === 0 &&
        neighboringFields.length === 0
    ) {
        return "";
    }

    return `
        <div
            class="semantic-review-evidence"
            style="
                margin-top: 10px;
                padding: 10px 12px;
                border: 1px solid #e1e7f0;
                border-radius: 8px;
                background: #f8fafc;
            "
        >
            ${
                sampleValues.length > 0
                    ? `
                        <p
                            class="form-help"
                            style="margin: 0 0 6px;"
                        >
                            原本の値:
                            <strong>
                                ${escapeHtml(
                                    sampleValues
                                        .slice(0, 5)
                                        .join(" / ")
                                )}
                            </strong>
                        </p>
                    `
                    : ""
            }

            ${
                neighboringFields.length > 0
                    ? `
                        <p
                            class="form-help"
                            style="margin: 0;"
                        >
                            周辺項目:
                            ${escapeHtml(
                                neighboringFields
                                    .slice(0, 8)
                                    .join(" / ")
                            )}
                        </p>
                    `
                    : ""
            }
        </div>
    `;
}


function renderMeaningEditor(item) {
    const ReviewModel =
        window.RisenSemanticReviewModel;

    const review =
        ReviewModel
            ? ReviewModel.toReviewItem({
                item,
                standardFields:
                    semanticStandardFields,
                analysis:
                    semanticCurrentAnalysis
            })
            : null;

    if (!review) {
        return "";
    }

    const canonicalMeaning =
        review.semanticMeaning || "";

    const displayName =
        review.displayName ||
        canonicalMeaning;

    if (
        review.state ===
            "registered" ||
        review.state ===
            "resolved"
    ) {
        return `
            <div>
                <strong>
                    ${escapeHtml(
                        displayName
                    )}
                </strong>

                ${
                    canonicalMeaning
                        ? `
                            <div
                                class="semantic-source-key"
                                style="margin-top: 4px;"
                            >
                                ${escapeHtml(
                                    canonicalMeaning
                                )}
                            </div>
                        `
                        : ""
                }
            </div>
        `;
    }

    if (
        review.state ===
        "candidate"
    ) {
        return `
            <div>
                <strong>
                    ${escapeHtml(
                        displayName
                    )}
                </strong>

                ${renderSemanticEvidence(
                    review
                )}

                <div
                    class="
                        bottom-actions
                        csv-step-actions
                    "
                    style="
                        justify-content: flex-start;
                        margin-top: 12px;
                    "
                >
                    <button
                        class="
                            primary-button
                            semantic-confirm-review-candidate-button
                        "
                        type="button"
                        data-source-field-key="${
                            escapeHtml(
                                review
                                    .sourceFieldKey
                            )
                        }"
                        data-semantic-meaning="${
                            escapeHtml(
                                canonicalMeaning
                            )
                        }"
                        ${
                            semanticCurrentTemplateId
                                ? ""
                                : "disabled"
                        }
                    >
                        ${escapeHtml(
                            displayName
                        )}として確定
                    </button>
                </div>
            </div>
        `;
    }

    if (
        review.state ===
        "conflict"
    ) {
        const buttons =
            review.candidates
                .map(candidate => `
                    <button
                        class="
                            primary-button
                            semantic-confirm-review-candidate-button
                        "
                        type="button"
                        data-source-field-key="${
                            escapeHtml(
                                review
                                    .sourceFieldKey
                            )
                        }"
                        data-semantic-meaning="${
                            escapeHtml(
                                candidate
                                    .semanticMeaning
                            )
                        }"
                        ${
                            semanticCurrentTemplateId
                                ? ""
                                : "disabled"
                        }
                    >
                        ${escapeHtml(
                            candidate
                                .displayName
                        )}として確定
                    </button>
                `)
                .join("");

        return `
            <div>
                <strong>
                    複数の意味候補があります
                </strong>

                ${renderSemanticEvidence(
                    review
                )}

                <div
                    class="
                        bottom-actions
                        csv-step-actions
                    "
                    style="
                        justify-content: flex-start;
                        margin-top: 12px;
                        flex-wrap: wrap;
                    "
                >
                    ${buttons}
                </div>
            </div>
        `;
    }

    return `
        <div>
            <strong>
                RISENで意味をまだ特定できません
            </strong>

            ${renderSemanticEvidence(
                review
            )}

            <p
                class="form-help"
                style="margin-top: 10px;"
            >
                原本の値と周辺項目を
                判断材料として保持します。
                Meaningコードを人が手入力する
                必要はありません。
            </p>
        </div>
    `;
}


async function confirmReviewCandidate(
    button
) {
    const sourceFieldKey =
        String(
            button?.dataset
                ?.sourceFieldKey ||
            ""
        ).trim();

    const semanticMeaning =
        String(
            button?.dataset
                ?.semanticMeaning ||
            ""
        ).trim();

    if (
        !sourceFieldKey ||
        !semanticMeaning ||
        !semanticCurrentTemplateId
    ) {
        setStatus(
            "Semantic候補を確定できません。",
            "error"
        );
        return;
    }

    const item =
        semanticResolvedFields.find(
            candidate =>
                candidate
                    .sourceFieldKey ===
                sourceFieldKey
        );

    if (!item) {
        return;
    }

    button.disabled = true;
    button.textContent =
        "保存中...";

    try {
        await persistConfirmedMeaning(
            item,
            semanticMeaning
        );

        renderSummary();
        renderFields();

        setStatus(
            `${item.label} の意味を確定しました。`,
            "success"
        );
    } catch (error) {
        console.error(error);

        button.disabled = false;
        button.textContent =
            "もう一度確認";

        setStatus(
            error?.message ||
            "Semantic候補の確定に失敗しました。",
            "error"
        );
    }
}


async function confirmSemanticMeaning(
    button
) {
    const sourceFieldKey =
        String(
            button?.dataset
                ?.sourceFieldKey ||
            ""
        ).trim();

    if (
        !sourceFieldKey ||
        !semanticCurrentTemplateId
    ) {
        setStatus(
            "先に書式を登録してください。",
            "error"
        );
        return;
    }

    const item =
        semanticResolvedFields.find(
            candidate =>
                candidate
                    .sourceFieldKey ===
                sourceFieldKey
        );

    if (!item) {
        return;
    }

    const editor =
        button.closest(
            ".semantic-meaning-editor"
        );

    const input =
        editor?.querySelector(
            ".semantic-meaning-input"
        );

    const semanticMeaning =
        String(
            input?.value ||
            ""
        ).trim();

    button.disabled = true;
    button.textContent = "保存中...";

    try {
        await persistConfirmedMeaning(
            item,
            semanticMeaning
        );

        renderSummary();
        renderFields();

        setStatus(
            `${item.label} を ${semanticMeaning} として確定しました。`,
            "success"
        );
    } catch (error) {
        console.error(error);

        button.disabled = false;
        button.textContent = "確定";

        setStatus(
            error?.message ||
            "Meaningの確定に失敗しました。",
            "error"
        );
    }
}

async function confirmContextMeaning(
    button
) {
    const sourceFieldKey =
        String(
            button?.dataset
                ?.sourceFieldKey ||
            ""
        ).trim();

    if (
        !sourceFieldKey ||
        !semanticCurrentTemplateId
    ) {
        setStatus(
            "先に書式を登録してください。",
            "error"
        );
        return;
    }

    const item =
        semanticResolvedFields.find(
            candidate =>
                candidate
                    .sourceFieldKey ===
                sourceFieldKey
        );

    if (
        !item ||
        item.status !== "context" ||
        typeof item.semanticMeaning !==
            "string" ||
        !item.semanticMeaning.trim()
    ) {
        return;
    }

    button.disabled = true;
    button.textContent =
        "保存中...";

    try {
        await persistConfirmedMeaning(
            item,
            item.semanticMeaning.trim()
        );

        renderSummary();
        renderFields();

        setStatus(
            `${item.label} を ${
                item.displayName ||
                item.semanticMeaning
            } として確定しました。`,
            "success"
        );
    } catch (error) {
        console.error(error);

        button.disabled = false;
        button.textContent =
            "この意味で確定";

        setStatus(
            error?.message ||
            "Semantic候補の確定に失敗しました。",
            "error"
        );
    }
}


function renderFields() {
    const visible =
        semanticResolvedFields.filter(
            item => {
                if (
                    semanticCurrentFilter ===
                    "review"
                ) {
                    return (
                        item.status !== "registered" &&
                        item.status !== "exact" &&
                        item.status !== "alias"
                    );
                }

                return true;
            }
        );

    fieldsBody.innerHTML =
        visible
            .map(item => {
                return `
                    <tr>
                        <td>
                            <strong>
                                ${escapeHtml(
                                    item.label
                                )}
                            </strong>

                            <div
                                class="
                                    semantic-source-key
                                "
                            >
                                ${escapeHtml(
                                    item.sourceFieldKey
                                )}
                            </div>
                        </td>

                        <td>
                            ${badgeFor(item)}
                        </td>

                        <td>
                            ${renderMeaningEditor(
                                item
                            )}
                        </td>
                    </tr>
                `;
            })
            .join("");

    fieldsBody
        .querySelectorAll(
            ".semantic-confirm-context-button"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () =>
                    confirmContextMeaning(
                        button
                    )
            );
        });

    fieldsBody
        .querySelectorAll(
            ".semantic-confirm-review-candidate-button"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () =>
                    confirmReviewCandidate(
                        button
                    )
            );
        });

    fieldsBody
        .querySelectorAll(
            ".semantic-confirm-meaning-button"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () =>
                    confirmSemanticMeaning(
                        button
                    )
            );
        });

    emptyState.hidden =
        visible.length !== 0;

    fieldsPanel.hidden = false;
}


async function loadPersistedMappings(
    analysis
) {
    semanticPersistedMappings =
        new Map();

    if (
        !analysis ||
        typeof analysis.sourceDocumentKey !==
            "string" ||
        !analysis.sourceDocumentKey.trim() ||
        typeof analysis.sourceUpdatedAt !==
            "string" ||
        !analysis.sourceUpdatedAt.trim() ||
        Number.isNaN(
            Date.parse(
                analysis.sourceUpdatedAt
            )
        ) ||
        !Number.isSafeInteger(
            analysis.sourceSize
        ) ||
        analysis.sourceSize < 0
    ) {
        return;
    }

    const params =
        new URLSearchParams({
            sourceDocumentKey:
                analysis.sourceDocumentKey
                    .trim(),
            sourceUpdatedAt:
                new Date(
                    analysis.sourceUpdatedAt
                ).toISOString(),
            sourceSize:
                String(
                    analysis.sourceSize
                )
        });

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-field-mappings?${params}`
        );

    let result = null;

    try {
        result =
            await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result ||
        result.success !== true ||
        !Array.isArray(
            result.mappings
        )
    ) {
        throw new Error(
            result?.message ||
            "登録済みSemanticを取得できませんでした"
        );
    }

    for (
        const mapping
        of result.mappings
    ) {
        const sourceFieldKey =
            typeof mapping?.sourceFieldKey ===
                "string"
                ? mapping.sourceFieldKey.trim()
                : "";

        const entityName =
            typeof mapping
                ?.standardEntityName ===
                "string"
                ? mapping
                    .standardEntityName
                    .trim()
                : "";

        const fieldName =
            typeof mapping
                ?.standardFieldName ===
                "string"
                ? mapping
                    .standardFieldName
                    .trim()
                : "";

        if (
            !sourceFieldKey ||
            !entityName ||
            !fieldName
        ) {
            continue;
        }

        semanticPersistedMappings.set(
            sourceFieldKey,
            `${entityName}.${fieldName}`
        );
    }

    if (!semanticCurrentTemplateId) {
        return;
    }

    const authorityParams =
        new URLSearchParams({
            templateId:
                semanticCurrentTemplateId
        });

    const authorityResponse =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-template-semantic-authority?${authorityParams}`
        );

    let authorityResult = null;

    try {
        authorityResult =
            await authorityResponse.json();
    } catch {
        authorityResult = null;
    }

    if (
        !authorityResponse.ok ||
        !authorityResult ||
        authorityResult.success !== true ||
        !Array.isArray(
            authorityResult.mappings
        )
    ) {
        throw new Error(
            authorityResult?.message ||
            "書式Semantic Authorityを取得できませんでした"
        );
    }

    for (
        const mapping
        of authorityResult.mappings
    ) {
        if (
            mapping?.mappingStatus !==
                "mapped" ||
            mapping?.interpretationStatus !==
                "confirmed"
        ) {
            continue;
        }

        const sourceFieldKey =
            typeof mapping
                ?.templateFieldKey ===
                "string"
                ? mapping
                    .templateFieldKey
                    .trim()
                : "";

        const confirmedMeaning =
            typeof mapping
                ?.confirmedMeaning ===
                "string"
                ? mapping
                    .confirmedMeaning
                    .trim()
                : "";

        const entityName =
            typeof mapping
                ?.standardEntityName ===
                "string"
                ? mapping
                    .standardEntityName
                    .trim()
                : "";

        const fieldName =
            typeof mapping
                ?.standardFieldName ===
                "string"
                ? mapping
                    .standardFieldName
                    .trim()
                : "";

        const semanticMeaning =
            confirmedMeaning ||
            (
                entityName &&
                fieldName
                    ? `${entityName}.${fieldName}`
                    : ""
            );

        if (
            !sourceFieldKey ||
            !semanticMeaning
        ) {
            continue;
        }

        semanticPersistedMappings.set(
            sourceFieldKey,
            semanticMeaning
        );
    }
}

function normalizeTemplateHeader(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ");
}

function getRegistrationFileType() {
    const name =
        String(
            fileSelect.value || ""
        )
            .trim()
            .toLowerCase();

    if (name.endsWith(".csv")) {
        return "csv";
    }

    if (
        name.endsWith(".xls") ||
        name.endsWith(".xlsx")
    ) {
        return "excel";
    }

    return null;
}

function getFieldCoordinates(
    field,
    index
) {
    const sourceFieldKey =
        getSourceFieldKey(
            field,
            index
        );

    const keyMatch =
        /^sheet:(\d+):column:(\d+)$/
            .exec(
                sourceFieldKey
            );

    const sheetIndex =
        Number.isSafeInteger(
            field?.sheetIndex
        )
            ? field.sheetIndex
            : keyMatch
                ? Number(
                    keyMatch[1]
                )
                : Number.NaN;

    const columnIndex =
        Number.isSafeInteger(
            field?.columnIndex
        )
            ? field.columnIndex
            : keyMatch
                ? Number(
                    keyMatch[2]
                )
                : Number.NaN;

    if (
        !Number.isSafeInteger(
            sheetIndex
        ) ||
        sheetIndex < 0 ||
        !Number.isSafeInteger(
            columnIndex
        ) ||
        columnIndex < 0
    ) {
        throw new Error(
            "書式の列位置を確認できませんでした"
        );
    }

    const expectedKey =
        `sheet:${sheetIndex}:column:${columnIndex}`;

    if (
        sourceFieldKey !==
        expectedKey
    ) {
        throw new Error(
            "書式の項目位置が一致しません"
        );
    }

    return {
        sourceFieldKey,
        sheetIndex,
        columnIndex
    };
}

function buildTemplateFields(
    fileType,
    fieldDefinitions
) {
    return fieldDefinitions.map(
        (field, index) => {
            const coordinates =
                getFieldCoordinates(
                    field,
                    index
                );

            const headerLabel =
                getSourceFieldLabel(
                    field
                );

            const normalizedHeaderLabel =
                normalizeTemplateHeader(
                    headerLabel
                );

            if (!normalizedHeaderLabel) {
                throw new Error(
                    "空の項目名はSemantic登録できません"
                );
            }

            const rawSheetName =
                typeof field?.sheetName ===
                    "string"
                    ? field.sheetName.trim()
                    : "";

            return {
                templateFieldKey:
                    coordinates
                        .sourceFieldKey,

                structuralPath:
                    coordinates
                        .sourceFieldKey,

                sheetIndex:
                    coordinates
                        .sheetIndex,

                ordinal:
                    coordinates
                        .columnIndex,

                sheetName:
                    fileType === "csv"
                        ? null
                        : rawSheetName ||
                            null,

                headerLabel,

                normalizedHeaderLabel
            };
        }
    );
}

function buildCanonicalStructure(
    fileType,
    fieldDefinitions
) {
    const fields =
        fieldDefinitions.map(
            (field, index) => {
                const coordinates =
                    getFieldCoordinates(
                        field,
                        index
                    );

                return {
                    sheetIndex:
                        coordinates
                            .sheetIndex,

                    columnIndex:
                        coordinates
                            .columnIndex,

                    sheetName:
                        normalizeTemplateHeader(
                            field?.sheetName ||
                            ""
                        ),

                    headerLabel:
                        normalizeTemplateHeader(
                            getSourceFieldLabel(
                                field
                            )
                        )
                };
            }
        )
        .sort(
            (a, b) =>
                a.sheetIndex -
                    b.sheetIndex ||
                a.columnIndex -
                    b.columnIndex
        );

    if (fileType === "csv") {
        return {
            type:
                "csv",

            fields:
                fields.map(field => ({
                    columnIndex:
                        field.columnIndex,

                    headerLabel:
                        field.headerLabel
                }))
        };
    }

    if (fileType === "excel") {
        const sheets =
            new Map();

        for (const field of fields) {
            if (
                !sheets.has(
                    field.sheetIndex
                )
            ) {
                sheets.set(
                    field.sheetIndex,
                    {
                        sheetIndex:
                            field.sheetIndex,

                        sheetName:
                            field.sheetName,

                        fields: []
                    }
                );
            }

            const sheet =
                sheets.get(
                    field.sheetIndex
                );

            if (
                sheet.sheetName !==
                field.sheetName
            ) {
                throw new Error(
                    "Excelシート構造が一致しません"
                );
            }

            sheet.fields.push({
                columnIndex:
                    field.columnIndex,

                headerLabel:
                    field.headerLabel
            });
        }

        return {
            type:
                "excel",

            sheets:
                [
                    ...sheets.values()
                ]
                .sort(
                    (a, b) =>
                        a.sheetIndex -
                        b.sheetIndex
                )
        };
    }

    throw new Error(
        "この書類形式は自動書式登録の対象外です"
    );
}

async function sha256Hex(value) {
    const bytes =
        new TextEncoder()
            .encode(value);

    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            bytes
        );

    return [
        ...new Uint8Array(
            digest
        )
    ]
        .map(
            value =>
                value
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join("");
}

async function postSemanticRegistration(
    path,
    envelopeName,
    payload
) {
    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}${path}`,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        [envelopeName]:
                            payload
                    })
            }
        );

    let result = null;

    try {
        result =
            await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result ||
        result.success !== true
    ) {
        throw new Error(
            result?.message ||
            "Semantic登録に失敗しました"
        );
    }

    return result;
}

async function restoreCurrentTemplateRegistration() {
    const fileType =
        getRegistrationFileType();

    if (
        !fileType ||
        !Array.isArray(
            semanticCurrentFieldDefinitions
        ) ||
        semanticCurrentFieldDefinitions
            .length === 0
    ) {
        semanticCurrentTemplateId =
            null;

        return null;
    }

    const canonicalStructure =
        buildCanonicalStructure(
            fileType,
            semanticCurrentFieldDefinitions
        );

    const canonicalizationVersion =
        "risen-source-template-canonicalization-1";

    const structureFingerprint =
        await sha256Hex(
            JSON.stringify(
                canonicalStructure
            )
        );

    const templateResult =
        await postSemanticRegistration(
            "/source-templates/exact",
            "sourceTemplateExact",
            {
                displayName:
                    String(
                        fileSelect.value ||
                        ""
                    ).trim(),

                fileType,

                documentType:
                    null,

                structureFingerprint,

                canonicalizationVersion,

                canonicalStructure
            }
        );

    if (
        templateResult.status ===
        "conflict"
    ) {
        throw new Error(
            "既存のSemantic書式と構造が競合しています"
        );
    }

    const templateId =
        typeof templateResult
            .templateId ===
            "string"
            ? templateResult
                .templateId
                .trim()
            : "";

    if (!templateId) {
        throw new Error(
            "Template IDを取得できませんでした"
        );
    }

    const templateFields =
        buildTemplateFields(
            fileType,
            semanticCurrentFieldDefinitions
        );

    const fieldResult =
        await postSemanticRegistration(
            "/source-template-fields/exact",
            "sourceTemplateFields",
            {
                templateId,
                fields:
                    templateFields
            }
        );

    if (
        fieldResult.status ===
        "conflict"
    ) {
        throw new Error(
            "既存の書式項目と構造が競合しています"
        );
    }

    semanticCurrentTemplateId =
        templateId;

    return {
        templateId,
        templateStatus:
            templateResult.status,
        fieldStatus:
            fieldResult.status
    };
}

async function ensureCurrentSourceDocumentRegistered() {
    const selected =
        String(
            fileSelect.value || ""
        ).trim();

    if (!selected) {
        throw new Error(
            "登録対象の書類を確認できませんでした"
        );
    }

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/files/${
                encodeURIComponent(
                    selected
                )
            }/source-document`,
            {
                method: "POST"
            }
        );

    let result = null;

    try {
        result =
            await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result ||
        result.success !== true
    ) {
        throw new Error(
            result?.message ||
            "原本ファイルを登録できませんでした"
        );
    }

    return result;
}

async function registerSemanticTemplate() {
    if (
        !semanticCurrentAnalysis ||
        !Array.isArray(
            semanticCurrentFieldDefinitions
        ) ||
        semanticCurrentFieldDefinitions
            .length === 0
    ) {
        return;
    }

    const fileType =
        getRegistrationFileType();

    if (!fileType) {
        setStatus(
            "現在はCSV・Excelの書式登録に対応しています。",
            "error"
        );

        return;
    }

    let registrationSucceeded =
        false;

    registerButton.disabled =
        true;

    registerButton.textContent =
        "書式登録中...";

    registerButton.title =
        "Semantic書式を登録しています";

    setStatus(
        "Semantic書式を登録しています..."
    );

    try {
        let sourceDocumentRegistered =
            false;

        let sourceDocumentWarning =
            "";

        try {
            await ensureCurrentSourceDocumentRegistered();

            sourceDocumentRegistered =
                true;
        } catch (error) {
            console.warn(
                "Source document registration deferred:",
                error
            );

            sourceDocumentWarning =
                error?.message ||
                "原本ファイルの登録を保留しました";
        }

        const canonicalStructure =
            buildCanonicalStructure(
                fileType,
                semanticCurrentFieldDefinitions
            );

        const canonicalizationVersion =
            "risen-source-template-canonicalization-1";

        const structureFingerprint =
            await sha256Hex(
                JSON.stringify(
                    canonicalStructure
                )
            );

        const templateResult =
            await postSemanticRegistration(
                "/source-templates/exact",
                "sourceTemplateExact",
                {
                    displayName:
                        String(
                            fileSelect.value ||
                            ""
                        ).trim(),

                    fileType,

                    documentType:
                        null,

                    structureFingerprint,

                    canonicalizationVersion,

                    canonicalStructure
                }
            );

        if (
            templateResult.status ===
            "conflict"
        ) {
            throw new Error(
                "同じ書式の既存テンプレートと定義が競合しています"
            );
        }

        const templateId =
            typeof templateResult
                .templateId ===
                "string"
                ? templateResult
                    .templateId
                    .trim()
                : "";

        if (!templateId) {
            throw new Error(
                "Template IDを取得できませんでした"
            );
        }

        const templateFields =
            buildTemplateFields(
                fileType,
                semanticCurrentFieldDefinitions
            );

        const fieldResult =
            await postSemanticRegistration(
                "/source-template-fields/exact",
                "sourceTemplateFields",
                {
                    templateId,
                    fields:
                        templateFields
                }
            );

        if (
            fieldResult.status ===
            "conflict"
        ) {
            throw new Error(
                "書式項目の既存定義と競合しています"
            );
        }

        semanticCurrentTemplateId =
            templateId;

        const confirmedAt =
            new Date()
                .toISOString();

        const resolved =
            semanticResolvedFields.filter(
                item =>
                    typeof item
                        .semanticMeaning ===
                        "string" &&
                    item.semanticMeaning
                        .trim()
            );

        for (const item of resolved) {
            const semanticMeaning =
                item.semanticMeaning.trim();

            const separator =
                semanticMeaning.indexOf(
                    "."
                );

            if (
                separator <= 0 ||
                separator ===
                    semanticMeaning.length -
                        1
            ) {
                throw new Error(
                    `${item.label} のMeaning形式が不正です`
                );
            }

            const standardEntityName =
                semanticMeaning.slice(
                    0,
                    separator
                );

            const standardFieldName =
                semanticMeaning.slice(
                    separator + 1
                );

            const authorityResult =
                await postSemanticRegistration(
                    "/source-template-semantic-authority",
                    "sourceTemplateSemanticAuthority",
                    {
                        templateId,

                        templateFieldKey:
                            item
                                .sourceFieldKey,

                        interpretationStatus:
                            "confirmed",

                        mappingStatus:
                            "mapped",

                        confirmedMeaning:
                            semanticMeaning,

                        standardEntityName,

                        standardFieldName,

                        confirmedAt
                    }
                );

            if (
                authorityResult.status ===
                "conflict"
            ) {
                throw new Error(
                    `${item.label} の既存Semantic定義と競合しています`
                );
            }
        }

        const analysis =
            semanticCurrentAnalysis;

        let sourceDocumentBound =
            false;

        if (sourceDocumentRegistered) {
            try {
                const bindingResult =
                    await postSemanticRegistration(
                        "/source-document-template-bindings",
                        "sourceDocumentTemplateBinding",
                        {
                            sourceDocumentKey:
                                analysis
                                    .sourceDocumentKey,

                            sourceUpdatedAt:
                                new Date(
                                    analysis
                                        .sourceUpdatedAt
                                ).toISOString(),

                            sourceSize:
                                analysis
                                    .sourceSize,

                            templateId,

                            matchMethod:
                                "confirmed_by_human",

                            matchConfidence:
                                "high",

                            confirmedByHuman:
                                true,

                            confirmedAt
                        }
                    );

                if (
                    bindingResult.status ===
                    "conflict"
                ) {
                    throw new Error(
                        "原本と書式テンプレートの既存関連付けと競合しています"
                    );
                }

                sourceDocumentBound =
                    true;
            } catch (error) {
                console.warn(
                    "Source document binding deferred:",
                    error
                );

                sourceDocumentWarning =
                    error?.message ||
                    "原本と書式の紐付けを保留しました";
            }
        }

        semanticResolvedFields =
            semanticResolvedFields.map(
                item =>
                    item.semanticMeaning
                        ? {
                            ...item,
                            status:
                                "registered"
                        }
                        : item
            );

        renderSummary();
        renderFields();

        const unresolvedCount =
            semanticResolvedFields
                .filter(
                    item =>
                        !item.semanticMeaning
                )
                .length;

        registrationSucceeded =
            true;

        registerButton.textContent =
            "書式登録済み ✓";

        const sourceStatusText =
            sourceDocumentBound
                ? "原本紐付け済み"
                : "原本紐付け保留";

        registerButton.title =
            `Meaning確定 ${resolved.length}件、未解決 ${unresolvedCount}件、${sourceStatusText}`;

        setStatus(
            sourceDocumentBound
                ? `書式を登録しました。Meaning確定 ${resolved.length}件、未解決 ${unresolvedCount}件。原本紐付け済み。`
                : `書式を登録しました。Meaning確定 ${resolved.length}件、未解決 ${unresolvedCount}件。原本紐付けは保留しています。${sourceDocumentWarning ? ` ${sourceDocumentWarning}` : ""}`,
            "success"
        );
    } catch (error) {
        console.error(error);

        registerButton.textContent =
            "書式を登録";

        registerButton.title =
            "Semantic書式を登録します";

        setStatus(
            error?.message ||
            "Semantic登録に失敗しました。",
            "error"
        );
    } finally {
        registerButton.disabled =
            registrationSucceeded ||
            !semanticCurrentAnalysis ||
            !getRegistrationFileType();
    }
}

async function analyzeSelectedFile() {
    const selected =
        String(
            fileSelect.value || ""
        ).trim();

    if (!selected) {
        return;
    }

    analyzeButton.disabled = true;

    setStatus(
        "書類の項目を確認しています..."
    );

    try {
        const response =
            await fetch(
                `${LOCAL_CONNECTOR_BASE}/files/${
                    encodeURIComponent(
                        selected
                    )
                }/analyze`,
                {
                    method: "POST"
                }
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result ||
            typeof result !== "object"
        ) {
            throw new Error(
                result?.message ||
                "書類を解析できませんでした"
            );
        }

        const fieldDefinitions =
            Array.isArray(
                result?.extracted
                    ?.fieldDefinitions
            )
                ? result
                    .extracted
                    .fieldDefinitions
                : [];

        if (
            fieldDefinitions.length === 0
        ) {
            throw new Error(
                "書類から項目を検出できませんでした"
            );
        }

        semanticCurrentAnalysis =
            result;

        semanticCurrentFieldDefinitions =
            fieldDefinitions;

        await restoreCurrentTemplateRegistration();

        await loadPersistedMappings(
            result
        );

        await loadContextCandidates(
            result,
            fieldDefinitions
        );

        semanticResolvedFields =
            resolveFields(
                fieldDefinitions
            );

        renderSummary();
        renderFields();

        registerButton.disabled =
            !getRegistrationFileType();

        setStatus(
            `${fieldDefinitions.length}項目を検出しました。`,
            "success"
        );
    } catch (error) {
        console.error(error);

        setStatus(
            error?.message ||
            "Semantic解析に失敗しました。",
            "error"
        );
    } finally {
        analyzeButton.disabled =
            !fileSelect.value;
    }
}

function bindFilters() {
    document
        .querySelectorAll(
            "[data-semantic-filter]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    semanticCurrentFilter =
                        button.dataset
                            .semanticFilter ||
                        "all";

                    document
                        .querySelectorAll(
                            "[data-semantic-filter]"
                        )
                        .forEach(item =>
                            item.classList
                                .remove(
                                    "is-active"
                                )
                        );

                    button.classList.add(
                        "is-active"
                    );

                    renderFields();
                }
            );
        });
}

async function initialize() {
    bindFilters();

    fileSelect.addEventListener(
        "change",
        () => {
            analyzeButton.disabled =
                !fileSelect.value;

            summaryPanel.hidden = true;
            fieldsPanel.hidden = true;

            semanticResolvedFields = [];
            semanticCurrentAnalysis =
                null;

            semanticCurrentFieldDefinitions =
                [];

            semanticCurrentTemplateId =
                null;

            registerButton.disabled =
                true;

            registerButton.textContent =
                "書式を登録";

            registerButton.title =
                "Semantic書式を登録します";
        }
    );

    analyzeButton.addEventListener(
        "click",
        analyzeSelectedFile
    );

    registerButton.addEventListener(
        "click",
        registerSemanticTemplate
    );

    if (confirmHighConfidenceButton) {
        confirmHighConfidenceButton
            .addEventListener(
                "click",
                confirmHighConfidenceCandidates
            );
    }

    try {
        setStatus(
            "RISEN標準Meaningを読み込んでいます..."
        );

        await loadStandardFields();

        setStatus(
            "Local Connectorの書類を確認しています..."
        );

        await loadFiles();
    } catch (error) {
        console.error(error);

        setStatus(
            error?.message ||
            "初期化に失敗しました。",
            "error"
        );
    }
}

initialize();
