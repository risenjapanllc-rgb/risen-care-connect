"use strict";

const LOCAL_CONNECTOR_BASE =
    "http://127.0.0.1:4310";

const statusElement =
    document.getElementById("localConnectorStatus");

const folderSummary =
    document.getElementById("connectorFolderSummary");

const fileList =
    document.getElementById("connectorFileList");

const analysisSummary =
    document.getElementById("analysisSummary");

const analysisFields =
    document.getElementById("analysisFields");

const importConfirmation =
    document.getElementById("importConfirmation");

const analysisBackButton =
    document.getElementById("analysisBackButton");

const analysisConfirmButton =
    document.getElementById("analysisConfirmButton");

const importBackButton =
    document.getElementById("importBackButton");

const importReadyButton =
    document.getElementById("importReadyButton");

let latestAnalysis = null;

let standardFields = [];

const sourceFieldMeaningSelections = new Map();
const confirmedSourceFieldSelections = new Set();
const sourceFieldReviewStates = new Map();

function createSourceFieldSelectionKey(
    sourceDocumentKey,
    sourceFieldKey
) {
    return `${String(sourceDocumentKey || "")}::${String(
        sourceFieldKey || ""
    )}`;
}

async function loadStandardFields() {
    const response = await fetch("/api/standard-fields");
    const result = await response.json();

    if (!response.ok || !Array.isArray(result)) {
        throw new Error(
            "RISEN標準項目を取得できませんでした"
        );
    }

    standardFields = result;
}

function setStatus(message, type = "") {
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.className =
        `mapping-status ${type ? `status-${type}` : ""}`;
}

function showStep(stepNumber) {
    document.querySelectorAll(".csv-step").forEach(step => {
        const active =
            Number(step.dataset.step) === stepNumber;

        step.hidden = !active;
        step.classList.toggle("is-active", active);
    });
}

async function loadFiles() {
    try {
        setStatus("Local Connectorに接続しています...");

        const response =
            await fetch(`${LOCAL_CONNECTOR_BASE}/files`);

        const result =
            await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message ||
                "ファイル一覧を取得できませんでした"
            );
        }

        folderSummary.innerHTML = `
            <strong>Local Connector 接続済み</strong>
            <p>
                登録フォルダ：
                ${escapeHtml(result.folderName || "")}
            </p>
            <p>
                対象ファイル：
                ${Number(result.fileCount || 0)}件
            </p>
        `;

        renderFiles(result.files || []);

        setStatus(
            "Local Connectorに接続しました。",
            "success"
        );
    } catch (error) {
        folderSummary.textContent =
            "Local Connectorに接続できませんでした。";

        fileList.textContent =
            "Local Connectorが起動していることを確認してください。";

        setStatus(
            `接続に失敗しました: ${error.message}`,
            "error"
        );
    }
}

let selectedFilePath = "";

function renderFiles(files) {
    const supportedFiles =
        files.filter(file =>
            [".docx", ".xls", ".xlsx", ".csv"]
                .includes(
                    String(file.extension || "").toLowerCase()
                )
        );

    if (supportedFiles.length === 0) {
        fileList.innerHTML =
            "<p>Word / Excel / CSVファイルがありません。</p>";
        return;
    }

    fileList.innerHTML = `
        <div class="local-file-selection">
            ${supportedFiles.map(file => {
                const changeType =
                    file.changeType || "";

                const changeLabel =
                    changeType === "new"
                        ? "🆕 新規"
                        : changeType === "updated"
                            ? "🔄 更新"
                            : changeType === "unchanged"
                                ? "変更なし"
                                : "";

                const changeClass =
                    changeType
                        ? ` local-file-option--${changeType}`
                        : "";

                return `
                    <button
                        type="button"
                        class="local-file-option${changeClass}"
                        data-select-file="${escapeHtml(file.relativePath || file.fileName)}"
                    >
                        <span class="local-file-option__body">
                            <strong>
                                ${escapeHtml(file.fileName)}
                            </strong>

                            <span class="form-help">
                                場所：
                                ${escapeHtml(file.relativePath || file.fileName)}
                            </span>

                            <span>
                                ${formatSize(file.size)}
                            </span>

                            <span class="form-help">
                                更新：
                                ${escapeHtml(file.updatedAt || "")}
                            </span>

                            ${
                                changeLabel
                                    ? `<span class="local-file-option__change ${changeClass.trim()}">${changeLabel}</span>`
                                    : ""
                            }
                        </span>

                        <span class="local-file-option__check">
                            選択
                        </span>
                    </button>
                `;
            }).join("")}
        </div>

        <div class="local-file-selection__footer">
            <p id="selectedFileMessage">
                ファイルを選択してください。
            </p>

            <button
                id="analyzeSelectedFileButton"
                class="primary-button"
                type="button"
                disabled
            >
                このファイルを読み取る
            </button>
        </div>
    `;

    fileList
        .querySelectorAll("[data-select-file]")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => selectFile(
                    button.dataset.selectFile
                )
            );
        });

    document
        .getElementById("analyzeSelectedFileButton")
        ?.addEventListener(
            "click",
            () => {
                if (selectedFilePath) {
                    analyzeFile(selectedFilePath);
                }
            }
        );
}

function selectFile(filePath) {
    selectedFilePath = filePath;

    fileList
        .querySelectorAll("[data-select-file]")
        .forEach(button => {
            const isSelected =
                button.dataset.selectFile === filePath;

            button.classList.toggle(
                "is-selected",
                isSelected
            );

            button.setAttribute(
                "aria-pressed",
                String(isSelected)
            );

            const check =
                button.querySelector(
                    ".local-file-option__check"
                );

            if (check) {
                check.textContent =
                    isSelected
                        ? "選択中"
                        : "選択";
            }
        });

    const message =
        document.getElementById("selectedFileMessage");

    if (message) {
        message.textContent =
            `選択中：${filePath}`;
    }

    const analyzeButton =
        document.getElementById(
            "analyzeSelectedFileButton"
        );

    if (analyzeButton) {
        analyzeButton.disabled = false;
    }
}

async function loadPersistedSourceFieldReviewStates(
    sourceDocumentKey
) {
    if (
        typeof sourceDocumentKey !== "string" ||
        !sourceDocumentKey.trim()
    ) {
        return;
    }

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-field-interpretations?sourceDocumentKey=${encodeURIComponent(
                sourceDocumentKey.trim()
            )}`
        );

    const result =
        await response.json();

    if (
        !response.ok ||
        !result.success ||
        result.status !== "found" ||
        !Array.isArray(result.interpretations)
    ) {
        throw new Error(
            result.message ||
            "保存済みの項目確認状態を取得できませんでした"
        );
    }

    for (const interpretation of result.interpretations) {
        if (
            !interpretation ||
            typeof interpretation !== "object" ||
            typeof interpretation.sourceFieldKey !== "string" ||
            !interpretation.sourceFieldKey.trim() ||
            interpretation.confirmedByHuman !== true
        ) {
            continue;
        }

        const selectionKey =
            createSourceFieldSelectionKey(
                sourceDocumentKey,
                interpretation.sourceFieldKey.trim()
            );

        if (
            interpretation.interpretationStatus ===
            "deferred"
        ) {
            sourceFieldMeaningSelections.set(
                selectionKey,
                ""
            );

            confirmedSourceFieldSelections.delete(
                selectionKey
            );

            sourceFieldReviewStates.set(
                selectionKey,
                "deferred"
            );

            continue;
        }

        if (
            interpretation.mappingStatus ===
            "no_standard_match"
        ) {
            sourceFieldMeaningSelections.set(
                selectionKey,
                ""
            );

            confirmedSourceFieldSelections.delete(
                selectionKey
            );

            sourceFieldReviewStates.set(
                selectionKey,
                "unmapped"
            );
        }
    }
}

async function analyzeFile(filePath) {
    try {
        setStatus("ファイルを解析しています...");

        const encodedFilePath =
            encodeURIComponent(filePath);

        const response =
            await fetch(
                `${LOCAL_CONNECTOR_BASE}/files/${encodedFilePath}/analyze`,
                {
                    method: "POST"
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message ||
                "ファイルの解析に失敗しました"
            );
        }

        try {
            await loadStandardFields();
        } catch (error) {
            standardFields = [];
            console.warn(
                "標準項目の取得に失敗しました:",
                error.message
            );
        }

        latestAnalysis = result;

        try {
            await loadPersistedSourceFieldReviewStates(
                result.sourceDocumentKey
            );
        } catch (error) {
            console.warn(
                "保存済みの項目確認状態を復元できませんでした:",
                error.message
            );
        }

        renderAnalysis(result);
        showStep(2);

        setStatus(
            "解析が完了しました。読み取り内容を確認してください。",
            "success"
        );
    } catch (error) {
        setStatus(
            `解析に失敗しました: ${error.message}`,
            "error"
        );
    }
}

function renderAnalysis(result) {
    const sourceType =
        result.sourceType || "unknown";

    const documentType =
        result.documentType || "不明";

    const confidence =
        result.documentTypeConfidence || "low";

    const sourceTypeLabels = {
        word: "Word",
        excel: "Excel",
        csv: "CSV",
        mysql: "MySQL"
    };

    analysisSummary.innerHTML = `
        <p>
            <strong>ファイル</strong><br>
            ${escapeHtml(result.fileName || "")}
        </p>

        <p>
            <strong>ファイル形式</strong><br>
            ${escapeHtml(
                sourceTypeLabels[sourceType] ||
                sourceType
            )}
        </p>

        <p>
            <strong>文書種別</strong><br>
            ${escapeHtml(documentType)}
        </p>

        <p>
            <strong>判定信頼度</strong><br>
            ${escapeHtml(confidence)}
        </p>
    `;

    const content =
        result.content || {};

    if (sourceType === "word") {
        const text =
            typeof content.text === "string"
                ? content.text.trim()
                : "";

        analysisFields.innerHTML = text
            ? `
                <h3>読み取った原文</h3>

                <pre style="
                    white-space: pre-wrap;
                    overflow-wrap: anywhere;
                    max-height: 520px;
                    overflow: auto;
                    margin: 16px 0 0;
                    padding: 16px;
                    background: #f7f9fc;
                    border: 1px solid #e1e7f0;
                    border-radius: 8px;
                    font-family: inherit;
                    line-height: 1.7;
                ">${escapeHtml(text)}</pre>
            `
            : `
                <p>
                    Wordファイルから表示できる本文を
                    取得できませんでした。
                </p>
            `;

        return;
    }

    if (
        sourceType === "excel" ||
        sourceType === "csv" ||
        sourceType === "mysql"
    ) {
        const sheets =
            Array.isArray(content.sheets)
                ? content.sheets
                : [];

        if (sheets.length === 0) {
            analysisFields.innerHTML = `
                <p>
                    表として表示できる内容を
                    取得できませんでした。
                </p>
            `;
            return;
        }

        analysisFields.innerHTML =
            sheets.map(sheet => {
                const rows =
                    Array.isArray(sheet.rows)
                        ? sheet.rows
                        : [];

                const maxColumns =
                    rows.reduce(
                        (max, row) =>
                            Math.max(
                                max,
                                Array.isArray(row)
                                    ? row.length
                                    : 0
                            ),
                        0
                    );

                const previewRowCount =
                    Math.min(rows.length, 10);

                const previewColumnCount =
                    Math.min(maxColumns, 20);

                const previewRows =
                    rows.slice(
                        0,
                        previewRowCount
                    );

                const tableRows =
                    previewRows.map(
                        (row, rowIndex) => {
                            const cells =
                                Array.isArray(row)
                                    ? row.slice(
                                        0,
                                        previewColumnCount
                                    )
                                    : [];

                            while (
                                cells.length <
                                previewColumnCount
                            ) {
                                cells.push("");
                            }

                            return `
                                <tr>
                                    <td style="
                                        position: sticky;
                                        left: 0;
                                        background: #f7f9fc;
                                        color: #6b7280;
                                        text-align: right;
                                        white-space: nowrap;
                                    ">
                                        ${rowIndex + 1}
                                    </td>

                                    ${cells.map(cell => `
                                        <td style="
                                            min-width: 120px;
                                            max-width: 280px;
                                            vertical-align: top;
                                            overflow-wrap: anywhere;
                                        ">
                                            ${escapeHtml(
                                                cell ?? ""
                                            )}
                                        </td>
                                    `).join("")}
                                </tr>
                            `;
                        }
                    ).join("");

                const truncated =
                    rows.length > previewRowCount ||
                    maxColumns > previewColumnCount;

                return `
                    <div style="margin-bottom: 28px;">
                        <h3>
                            ${escapeHtml(
                                sheet.sheetName ||
                                "データ"
                            )}
                        </h3>

                        <p style="
                            color: #667085;
                            margin: 8px 0 12px;
                        ">
                            ${rows.length} 行 /
                            最大 ${maxColumns} 列
                        </p>

                        <div style="
                            overflow: auto;
                            border: 1px solid #e1e7f0;
                            border-radius: 8px;
                        ">
                            <table style="
                                border-collapse: collapse;
                                width: max-content;
                                min-width: 100%;
                            ">
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>

                        ${truncated
                            ? `
                                <p style="
                                    margin-top: 10px;
                                    color: #667085;
                                    font-size: 0.9rem;
                                ">
                                    プレビューは先頭
                                    ${previewRowCount}行・
                                    ${previewColumnCount}列まで
                                    表示しています。
                                </p>
                            `
                            : ""
                        }
                    </div>
                `;
            }).join("");

        return;
    }

    analysisFields.innerHTML = `
        <p>
            このファイルから表示できる原本構造を
            取得できませんでした。
        </p>
    `;
}

function renderConfirmation() {
    if (!latestAnalysis) {
        return;
    }

    const fieldDefinitions =
        Array.isArray(
            latestAnalysis.extracted?.fieldDefinitions
        )
            ? latestAnalysis.extracted.fieldDefinitions
            : [];

    const standardMeaningOptions =
        standardFields.map(field => ({
            value: `${field.entity_name}.${field.field_name}`,
            label:
                `${field.display_name} ` +
                `(${field.entity_name}.${field.field_name})`
        }));

    const sourceFieldRows =
        fieldDefinitions.length > 0
            ? fieldDefinitions.map(field => {
                const sourceFieldKey =
                    field.sourceFieldKey || "";

                const selectionKey =
                    createSourceFieldSelectionKey(
                        latestAnalysis.sourceDocumentKey,
                        sourceFieldKey
                    );

                const selectedMeaning =
                    sourceFieldMeaningSelections.get(
                        selectionKey
                    ) || "";

                const suggestedField =
                    window.RisenStandardFieldMapping
                        ?.findStandardFieldSuggestion(
                            field.headerLabel || "",
                            standardFields
                        ) || null;

                const suggestedMeaning =
                    suggestedField
                        ? `${suggestedField.entity_name}.${suggestedField.field_name}`
                        : "";

                const suggestedLabel =
                    suggestedField
                        ? `${suggestedField.display_name} (${suggestedMeaning})`
                        : "";

                const reviewState =
                    sourceFieldReviewStates.get(
                        selectionKey
                    ) ||
                    (
                        confirmedSourceFieldSelections.has(
                            selectionKey
                        )
                            ? "confirmed"
                            : "pending"
                    );

                const stateLabel =
                    reviewState === "confirmed"
                        ? "確認済み"
                        : reviewState === "unmapped"
                            ? "標準項目なし"
                            : reviewState === "deferred"
                                ? "保留"
                                : suggestedField
                                    ? "おすすめ候補あり"
                                    : "要確認";

                const options =
                    standardMeaningOptions.map(option => `
                        <option
                            value="${escapeHtml(option.value)}"
                            ${
                                option.value === selectedMeaning
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${escapeHtml(option.label)}
                        </option>
                    `).join("");

                return `
                    <tr
                        data-source-field-row="${escapeHtml(
                            sourceFieldKey
                        )}"
                    >
                        <td>
                            ${escapeHtml(
                                field.sheetName || "-"
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    field.headerLabel || "-"
                                )}
                            </strong>
                        </td>

                        <td style="
                            color: #667085;
                            font-family: monospace;
                            font-size: 0.85rem;
                        ">
                            ${escapeHtml(sourceFieldKey)}
                        </td>

                        <td style="min-width: 300px;">
                            <div style="
                                display: grid;
                                gap: 8px;
                            ">
                                <div>
                                    <span style="
                                        display: inline-block;
                                        padding: 3px 8px;
                                        border-radius: 999px;
                                        background: #f2f4f7;
                                        color: #475467;
                                        font-size: 0.8rem;
                                    ">
                                        ${escapeHtml(stateLabel)}
                                    </span>
                                </div>

                                ${
                                    suggestedField
                                        ? `
                                            <div style="
                                                padding: 10px;
                                                border: 1px solid #d9e4ff;
                                                border-radius: 8px;
                                                background: #f7f9ff;
                                            ">
                                                <div style="
                                                    color: #475467;
                                                    font-size: 0.8rem;
                                                    margin-bottom: 4px;
                                                ">
                                                    おすすめ候補
                                                </div>

                                                <strong>
                                                    ${escapeHtml(
                                                        suggestedLabel
                                                    )}
                                                </strong>

                                                <div style="
                                                    margin-top: 8px;
                                                ">
                                                    <button
                                                        type="button"
                                                        class="secondary-button source-field-confirm-suggestion"
                                                        data-source-field-key="${escapeHtml(
                                                            sourceFieldKey
                                                        )}"
                                                        data-standard-meaning="${escapeHtml(
                                                            suggestedMeaning
                                                        )}"
                                                    >
                                                        この候補を確認
                                                    </button>
                                                </div>
                                            </div>
                                        `
                                        : `
                                            <div style="
                                                color: #667085;
                                                font-size: 0.9rem;
                                            ">
                                                明確なおすすめ候補はありません。
                                            </div>
                                        `
                                }

                                ${
                                    reviewState === "confirmed" &&
                                    selectedMeaning
                                        ? `
                                            <div style="
                                                color: #176b36;
                                                font-size: 0.9rem;
                                            ">
                                                確認済み：
                                                ${escapeHtml(
                                                    standardMeaningOptions
                                                        .find(
                                                            option =>
                                                                option.value ===
                                                                selectedMeaning
                                                        )
                                                        ?.label ||
                                                    selectedMeaning
                                                )}
                                            </div>
                                        `
                                        : ""
                                }

                                <details>
                                    <summary style="
                                        cursor: pointer;
                                        color: #3157a4;
                                    ">
                                        すべてのRISEN標準項目から探す
                                    </summary>

                                    <div style="
                                        margin-top: 8px;
                                    ">
                                        <select
                                            class="source-field-meaning-select"
                                            data-source-field-key="${escapeHtml(
                                                sourceFieldKey
                                            )}"
                                        >
                                            <option value="">
                                                標準項目を選択
                                            </option>
                                            ${options}
                                        </select>
                                    </div>
                                </details>

                                <div style="
                                    display: flex;
                                    gap: 8px;
                                    flex-wrap: wrap;
                                ">
                                    <button
                                        type="button"
                                        class="secondary-button source-field-mark-unmapped"
                                        data-source-field-key="${escapeHtml(
                                            sourceFieldKey
                                        )}"
                                    >
                                        標準項目なし
                                    </button>

                                    <button
                                        type="button"
                                        class="secondary-button source-field-defer"
                                        data-source-field-key="${escapeHtml(
                                            sourceFieldKey
                                        )}"
                                    >
                                        保留
                                    </button>
                                </div>

                                ${
                                    reviewState === "unmapped" ||
                                    reviewState === "deferred"
                                        ? `
                                            <div style="
                                                color: #667085;
                                                font-size: 0.8rem;
                                            ">
                                                「取り込み準備を完了する」で、この確認状態を保存します。
                                            </div>
                                        `
                                        : ""
                                }
                            </div>
                        </td>
                    </tr>
                `;
            }).join("")
            : "";

    const sourceFieldSection =
        sourceFieldRows
            ? `
                <h3 style="margin-top: 24px;">
                    原本項目
                </h3>

                <p style="
                    color: #667085;
                    margin-bottom: 12px;
                ">
                    おすすめ候補は自動提案です。
                    人が確認するまでRISEN標準項目として確定しません。
                    候補にない場合は全標準項目から探せます。
                </p>

                <div style="
                    overflow: auto;
                    border: 1px solid #e1e7f0;
                    border-radius: 8px;
                ">
                    <table style="
                        width: 100%;
                        border-collapse: collapse;
                    ">
                        <thead>
                            <tr>
                                <th>シート</th>
                                <th>原本項目</th>
                                <th>内部識別子</th>
                                <th>RISEN標準項目</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${sourceFieldRows}
                        </tbody>
                    </table>
                </div>
            `
            : "";

    importConfirmation.innerHTML = `
        <h3>今回の確認内容</h3>

        <p>
            <strong>ファイル：</strong>
            ${escapeHtml(latestAnalysis.fileName)}
        </p>

        <p>
            <strong>文書種別：</strong>
            ${escapeHtml(
                latestAnalysis.documentType || "不明"
            )}
        </p>

        <p>
            読み取った内容を確認しました。
            原本データ自体の業務データ登録はまだ行いません。
        </p>

        ${sourceFieldSection}
    `;

    importConfirmation
        .querySelectorAll(
            ".source-field-confirm-suggestion"
        )
        .forEach(button => {
            button.addEventListener("click", event => {
                const sourceFieldKey =
                    event.currentTarget.dataset
                        .sourceFieldKey || "";

                const standardMeaning =
                    event.currentTarget.dataset
                        .standardMeaning || "";

                if (
                    !sourceFieldKey ||
                    !standardMeaning
                ) {
                    return;
                }

                const selectionKey =
                    createSourceFieldSelectionKey(
                        latestAnalysis?.sourceDocumentKey,
                        sourceFieldKey
                    );

                sourceFieldMeaningSelections.set(
                    selectionKey,
                    standardMeaning
                );

                confirmedSourceFieldSelections.add(
                    selectionKey
                );

                sourceFieldReviewStates.set(
                    selectionKey,
                    "confirmed"
                );

                renderConfirmation();
            });
        });

    importConfirmation
        .querySelectorAll(".source-field-meaning-select")
        .forEach(select => {
            select.addEventListener("change", event => {
                const sourceFieldKey =
                    event.currentTarget.dataset
                        .sourceFieldKey || "";

                const standardMeaning =
                    event.currentTarget.value || "";

                if (!sourceFieldKey) {
                    return;
                }

                const selectionKey =
                    createSourceFieldSelectionKey(
                        latestAnalysis?.sourceDocumentKey,
                        sourceFieldKey
                    );

                sourceFieldMeaningSelections.set(
                    selectionKey,
                    standardMeaning
                );

                if (standardMeaning) {
                    confirmedSourceFieldSelections.add(
                        selectionKey
                    );

                    sourceFieldReviewStates.set(
                        selectionKey,
                        "confirmed"
                    );
                } else {
                    confirmedSourceFieldSelections.delete(
                        selectionKey
                    );

                    sourceFieldReviewStates.set(
                        selectionKey,
                        "pending"
                    );
                }

                renderConfirmation();
            });
        });

    importConfirmation
        .querySelectorAll(".source-field-mark-unmapped")
        .forEach(button => {
            button.addEventListener("click", event => {
                const sourceFieldKey =
                    event.currentTarget.dataset
                        .sourceFieldKey || "";

                if (!sourceFieldKey) {
                    return;
                }

                const selectionKey =
                    createSourceFieldSelectionKey(
                        latestAnalysis?.sourceDocumentKey,
                        sourceFieldKey
                    );

                sourceFieldMeaningSelections.set(
                    selectionKey,
                    ""
                );

                confirmedSourceFieldSelections.delete(
                    selectionKey
                );

                sourceFieldReviewStates.set(
                    selectionKey,
                    "unmapped"
                );

                renderConfirmation();
            });
        });

    importConfirmation
        .querySelectorAll(".source-field-defer")
        .forEach(button => {
            button.addEventListener("click", event => {
                const sourceFieldKey =
                    event.currentTarget.dataset
                        .sourceFieldKey || "";

                if (!sourceFieldKey) {
                    return;
                }

                const selectionKey =
                    createSourceFieldSelectionKey(
                        latestAnalysis?.sourceDocumentKey,
                        sourceFieldKey
                    );

                sourceFieldMeaningSelections.set(
                    selectionKey,
                    ""
                );

                confirmedSourceFieldSelections.delete(
                    selectionKey
                );

                sourceFieldReviewStates.set(
                    selectionKey,
                    "deferred"
                );

                renderConfirmation();
            });
        });
}

function collectConfirmedSourceFieldMappings() {
    if (
        !latestAnalysis ||
        typeof latestAnalysis.sourceDocumentKey !== "string" ||
        latestAnalysis.sourceDocumentKey.trim() === ""
    ) {
        return [];
    }

    const fieldDefinitions =
        Array.isArray(
            latestAnalysis.extracted?.fieldDefinitions
        )
            ? latestAnalysis.extracted.fieldDefinitions
            : [];

    return fieldDefinitions.flatMap(field => {
        const sourceFieldKey =
            typeof field.sourceFieldKey === "string"
                ? field.sourceFieldKey.trim()
                : "";

        if (!sourceFieldKey) {
            return [];
        }

        const selectionKey =
            createSourceFieldSelectionKey(
                latestAnalysis.sourceDocumentKey,
                sourceFieldKey
            );

        /*
         * 自動提案されただけの項目は保存対象にしない。
         * 人がselectを操作した項目だけを見る。
         */
        if (
            !confirmedSourceFieldSelections.has(
                selectionKey
            )
        ) {
            return [];
        }

        const standardMeaning =
            sourceFieldMeaningSelections.get(
                selectionKey
            );

        /*
         * 空欄は「対応付けない」という確認状態。
         * delete/unmapping RPCはまだないため、
         * 現段階では保存対象には含めない。
         */
        if (
            typeof standardMeaning !== "string" ||
            standardMeaning === ""
        ) {
            return [];
        }

        const separatorIndex =
            standardMeaning.indexOf(".");

        if (
            separatorIndex <= 0 ||
            separatorIndex ===
                standardMeaning.length - 1
        ) {
            return [];
        }

        const standardEntityName =
            standardMeaning
                .slice(0, separatorIndex)
                .trim();

        const standardFieldName =
            standardMeaning
                .slice(separatorIndex + 1)
                .trim();

        if (
            !standardEntityName ||
            !standardFieldName
        ) {
            return [];
        }

        return [{
            sourceDocumentKey:
                latestAnalysis.sourceDocumentKey.trim(),
            sourceFieldKey,
            standardEntityName,
            standardFieldName,
            sheetName:
                typeof field.sheetName === "string"
                    ? field.sheetName
                    : null,
            headerLabel:
                typeof field.headerLabel === "string"
                    ? field.headerLabel
                    : null
        }];
    });
}

async function persistConfirmedSourceFieldMappings(
    mappings
) {
    let savedCount = 0;

    for (const sourceFieldMapping of mappings) {
        const response =
            await fetch(
                `${LOCAL_CONNECTOR_BASE}/source-field-mappings`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceFieldMapping
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
            result.success !== true ||
            ![
                "created",
                "updated",
                "unchanged"
            ].includes(result.status)
        ) {
            const error =
                new Error(
                    result?.message ||
                    "項目対応の保存に失敗しました"
                );

            error.savedCount =
                savedCount;

            throw error;
        }

        savedCount += 1;
    }

    return {
        savedCount
    };
}

function collectSourceFieldInterpretations() {
    if (
        !latestAnalysis ||
        typeof latestAnalysis.sourceDocumentKey !== "string" ||
        latestAnalysis.sourceDocumentKey.trim() === ""
    ) {
        return [];
    }

    const fieldDefinitions =
        Array.isArray(
            latestAnalysis.extracted?.fieldDefinitions
        )
            ? latestAnalysis.extracted.fieldDefinitions
            : [];

    return fieldDefinitions.flatMap(field => {
        const sourceFieldKey =
            typeof field.sourceFieldKey === "string"
                ? field.sourceFieldKey.trim()
                : "";

        if (!sourceFieldKey) {
            return [];
        }

        const selectionKey =
            createSourceFieldSelectionKey(
                latestAnalysis.sourceDocumentKey,
                sourceFieldKey
            );

        const reviewState =
            sourceFieldReviewStates.get(
                selectionKey
            );

        if (reviewState === "unmapped") {
            return [{
                sourceDocumentKey:
                    latestAnalysis.sourceDocumentKey.trim(),
                sourceFieldKey,
                interpretationStatus:
                    "confirmed",
                mappingStatus:
                    "no_standard_match",
                confirmedMeaning:
                    null
            }];
        }

        if (reviewState === "deferred") {
            return [{
                sourceDocumentKey:
                    latestAnalysis.sourceDocumentKey.trim(),
                sourceFieldKey,
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null
            }];
        }

        return [];
    });
}

async function persistSourceFieldInterpretations(
    interpretations
) {
    let savedCount = 0;

    for (
        const sourceFieldInterpretation
        of interpretations
    ) {
        const response =
            await fetch(
                `${LOCAL_CONNECTOR_BASE}/source-field-interpretations`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceFieldInterpretation
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
            result.success !== true ||
            ![
                "created",
                "updated",
                "unchanged"
            ].includes(result.status)
        ) {
            const error =
                new Error(
                    result?.message ||
                    "項目確認状態の保存に失敗しました"
                );

            error.savedCount =
                savedCount;

            throw error;
        }

        savedCount += 1;
    }

    return {
        savedCount
    };
}

analysisBackButton?.addEventListener(
    "click",
    () => showStep(1)
);

analysisConfirmButton?.addEventListener(
    "click",
    () => {
        renderConfirmation();
        showStep(3);
    }
);

importBackButton?.addEventListener(
    "click",
    () => showStep(2)
);

importReadyButton?.addEventListener(
    "click",
    async () => {
        const mappings =
            collectConfirmedSourceFieldMappings();

        const interpretations =
            collectSourceFieldInterpretations();

        if (
            mappings.length === 0 &&
            interpretations.length === 0
        ) {
            setStatus(
                "保存する項目対応または確認状態がありません。",
                "error"
            );

            return;
        }

        importReadyButton.disabled = true;
        importReadyButton.textContent =
            "確認内容を保存しています...";

        let mappingSavedCount = 0;
        let interpretationSavedCount = 0;

        try {
            if (mappings.length > 0) {
                const result =
                    await persistConfirmedSourceFieldMappings(
                        mappings
                    );

                mappingSavedCount =
                    result.savedCount;
            }

            if (interpretations.length > 0) {
                const result =
                    await persistSourceFieldInterpretations(
                        interpretations
                    );

                interpretationSavedCount =
                    result.savedCount;
            }

            setStatus(
                `${mappingSavedCount}件の項目対応、` +
                `${interpretationSavedCount}件の確認状態を保存しました。`,
                "success"
            );

            let readyMessage =
                document.getElementById(
                    "importReadyMessage"
                );

            if (!readyMessage) {
                readyMessage =
                    document.createElement("div");

                readyMessage.id =
                    "importReadyMessage";
                readyMessage.className =
                    "validation-card";
                readyMessage.style.marginTop =
                    "16px";
                readyMessage.style.borderColor =
                    "#86c99a";
                readyMessage.style.background =
                    "#f1fbf4";
                readyMessage.style.color =
                    "#176b36";

                importConfirmation.appendChild(
                    readyMessage
                );
            }

            readyMessage.textContent =
                `${mappingSavedCount}件の項目対応、` +
                `${interpretationSavedCount}件の確認状態を保存しました。` +
                "原本データ自体の業務データ登録はまだ行っていません。";

            importReadyButton.textContent =
                "準備完了";
            importReadyButton.disabled =
                true;

            readyMessage.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        } catch (error) {
            const partialCount =
                Number.isInteger(
                    error?.savedCount
                )
                    ? error.savedCount
                    : 0;

            const completedCount =
                mappingSavedCount +
                interpretationSavedCount +
                partialCount;

            setStatus(
                completedCount > 0
                    ? `${completedCount}件まで保存しましたが、途中で失敗しました。再実行できます。`
                    : `確認内容の保存に失敗しました: ${error.message}`,
                "error"
            );

            importReadyButton.textContent =
                "取り込み準備を完了する";
            importReadyButton.disabled =
                false;
        }
    }
);

function formatSize(size) {
    const value = Number(size);

    if (!Number.isFinite(value)) {
        return "-";
    }

    if (value < 1024) {
        return `${value} B`;
    }

    return `${(value / 1024).toFixed(1)} KB`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadFiles();
