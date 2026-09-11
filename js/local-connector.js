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

        latestAnalysis = result;

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

    importConfirmation.innerHTML = `
        <h3>今回の確認内容</h3>

        <p>
            <strong>ファイル：</strong>
            ${escapeHtml(latestAnalysis.fileName)}
        </p>

        <p>
            <strong>文書種別：</strong>
            ${escapeHtml(latestAnalysis.documentType)}
        </p>

        <p>
            読み取った内容を確認しました。
            この段階ではまだデータベースへの登録は行いません。
        </p>
    `;
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
    () => {
        setStatus(
            "取り込み内容の確認が完了しました。登録処理はまだ実行していません。",
            "success"
        );
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
