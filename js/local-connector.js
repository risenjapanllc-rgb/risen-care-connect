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
            [".doc", ".docx", ".xls", ".xlsx"]
                .includes(
                    String(file.extension || "").toLowerCase()
                )
        );

    if (supportedFiles.length === 0) {
        fileList.innerHTML =
            "<p>Word / Excelファイルがありません。</p>";
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
                                ${escapeHtml(file.extension)}
                                /
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
    const documentType =
        result.documentType || "不明";

    const confidence =
        result.documentTypeConfidence || "low";

    analysisSummary.innerHTML = `
        <p>
            <strong>ファイル</strong><br>
            ${escapeHtml(result.fileName || "")}
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

    const extracted =
        result.extracted || {};

    const fields = [
        ["利用者ID", extracted.residentId],
        ["利用者名", extracted.sourceResidentName],
        ["本人の希望", extracted.wish],
        ["長期目標", extracted.longTermGoal],
        ["支援内容", extracted.supportContent || extracted.supportMethod]
    ];

    analysisFields.innerHTML =
        fields.map(([label, value]) => `
            <div style="
                padding: 16px 0;
                border-bottom: 1px solid #e1e7f0;
            ">
                <strong>${label}</strong>

                <div style="
                    margin-top: 6px;
                    color: ${value ? "#333" : "#8a94a5"};
                ">
                    ${value
                        ? escapeHtml(value.value)
                        : "読み取れませんでした"}
                </div>
            </div>
        `).join("");
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
