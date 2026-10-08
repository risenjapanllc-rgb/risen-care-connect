"use strict";

const API_BASE = "/api";

const csvFileInput = document.getElementById("csvFileInput");
const csvDataTypeMode = document.getElementById("csvDataTypeMode");
const csvLoadButton = document.getElementById("csvLoadButton");
const csvStatus = document.getElementById("csvPocStatus");
const csvSummary = document.getElementById("csvSummary");
const csvRecognizedFields = document.getElementById("csvRecognizedFields");
const csvAllHeaderList = document.getElementById("csvAllHeaderList");
const csvDetailPanel = document.getElementById("csvDetailPanel");
const csvToggleDetailButton = document.getElementById("csvToggleDetailButton");
const csvToggleAllItemsButton = document.getElementById("csvToggleAllItemsButton");
const csvAllItemsPanel = document.getElementById("csvAllItemsPanel");
const csvPreviewTableHead = document.querySelector("#csvPreviewTable thead");
const csvPreviewTableBody = document.querySelector("#csvPreviewTable tbody");
const csvAllPreviewTableHead = document.querySelector("#csvAllPreviewTable thead");
const csvAllPreviewTableBody = document.querySelector("#csvAllPreviewTable tbody");
const csvToQuestionButton = document.getElementById("csvToQuestionButton");
const csvStep3Title = document.getElementById("csvStep3Title");
const csvQuestionGuide = document.getElementById("csvQuestionGuide");
const csvQuestionForm = document.getElementById("csvQuestionForm");
const csvApplyAnswersButton = document.getElementById("csvApplyAnswersButton");
const csvCompletionSummary = document.getElementById("csvCompletionSummary");
const csvResultTableBody = document.querySelector("#csvResultTable tbody");

let currentCsvText = "";
let latestResult = null;
let isStep2DetailOpen = false;
let isStep2AllItemsOpen = false;

if (csvToggleDetailButton) {
    csvToggleDetailButton.addEventListener("click", () => {
        isStep2DetailOpen = !isStep2DetailOpen;
        applyStep2DetailVisibility();
    });
}

if (csvToggleAllItemsButton) {
    csvToggleAllItemsButton.addEventListener("click", () => {
        isStep2AllItemsOpen = !isStep2AllItemsOpen;
        applyStep2AllItemsVisibility();
    });
}

if (csvFileInput && csvLoadButton) {
    csvFileInput.addEventListener("change", () => {
        csvLoadButton.disabled = !csvFileInput.files || csvFileInput.files.length === 0;
    });

    csvLoadButton.addEventListener("click", async () => {
        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            setStatus("CSVファイルを選択してください", "error");
            return;
        }

        resetCsvFlowState();

        const file = csvFileInput.files[0];
        currentCsvText = await file.text();

        await runPipeline({
            csvText: currentCsvText,
            answers: {}
        });

        if (!latestResult) {
            return;
        }

        renderStep2(latestResult);
        showStep(2);
        setStatus("CSVを読み込みました。内容を確認してください。", "success");
    });
}

if (csvToQuestionButton) {
    csvToQuestionButton.addEventListener("click", () => {
        if (!latestResult) {
            return;
        }

        const dataType =
            latestResult.dataType?.type || "unknown";

        if (dataType === "unknown") {
            setStatus(
                "CSVの種類を特定できませんでした。全項目を確認して分類する必要があります。",
                ""
            );
            return;
        }

        const questions = latestResult.validation?.questions || [];

        if (questions.length === 0) {
            renderStep3(latestResult);
            showStep(3);
            setStatus("自動確認が完了しました。内容を確認して進んでください。", "success");
            return;
        }

        renderStep3(latestResult);
        showStep(3);
        setStatus("確認が必要な項目に回答してください。", "");
    });
}

if (csvApplyAnswersButton) {
    csvApplyAnswersButton.addEventListener("click", async () => {
        if (!currentCsvText) {
            setStatus("CSVを先に読み込んでください", "error");
            return;
        }

        const answers = collectAnswers();

        await runPipeline({
            csvText: currentCsvText,
            answers
        });

        if (!latestResult) {
            return;
        }

        const remaining = latestResult.validation?.questions || [];

        if (remaining.length > 0) {
            renderStep3(latestResult);
            setStatus("必須項目の確認がまだ残っています。", "error");
            return;
        }

        renderStep4(latestResult);
        showStep(4);
        setStatus("取込設定が完了しました。", "success");
    });
}

async function runPipeline({ csvText, answers }) {
    setButtonsDisabled(true);
    setStatus("処理中です...", "");

    try {
        const response = await fetch(`${API_BASE}/csv/poc/process`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                csvText,
                answers,
                dataTypeMode:
                    csvDataTypeMode?.value || "auto"
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "CSV処理に失敗しました");
        }

        latestResult = result;
    } catch (error) {
        latestResult = null;
        setStatus(`処理に失敗しました: ${error.message}`, "error");
    } finally {
        setButtonsDisabled(false);
    }
}

function renderStep2(result) {
    const metadata = result.metadata || {};
    const dataType = result.dataType || {};
    const rowCount = Number(metadata.rowCount || 0);
    const columns = Array.isArray(metadata.columns) ? metadata.columns : [];
    const sampleRows = Array.isArray(metadata.sampleRows) ? metadata.sampleRows : [];
    const mappingItems = Array.isArray(result.mapping?.items)
        ? result.mapping.items
        : [];

    const recognizedItems = mappingItems.filter(item => {
        return Boolean(getMappingCsvHeader(item));
    });

    const typeLabel =
        dataType.label || "未確定";

    const confidenceLabel =
        dataType.confidence === "high"
            ? "高"
            : dataType.confidence === "medium"
                ? "中"
                : "低";

    const rowUnit =
        dataType.type === "resident_basic_info"
            ? "名"
            : "件";

    const hasTypeMismatch =
        dataType.source === "manual" &&
        dataType.matchesDetection === false &&
        Boolean(dataType.detectedType);

    const mismatchHtml =
        hasTypeMismatch
            ? `
                <div class="validation-warning csv-type-mismatch">
                    <strong>
                        指定されたデータ種類と、
                        RISEN CARE Connectの判定が異なります。
                    </strong>

                    <p>
                        指定：
                        <strong>${escapeHtml(dataType.label || "")}</strong>
                        <br>
                        RISENの判定：
                        <strong>${escapeHtml(dataType.detectedLabel || "")}</strong>
                        （信頼度：
                        ${escapeHtml(
                            dataType.detectedConfidence === "high"
                                ? "高"
                                : dataType.detectedConfidence === "medium"
                                    ? "中"
                                    : "低"
                        )}）
                    </p>

                    <p>
                        内容を確認してください。
                        担当者の指定のまま進むこともできます。
                    </p>

                    <button
                        id="csvUseDetectedTypeButton"
                        class="secondary-button"
                        type="button"
                    >
                        RISENの判定に変更する
                    </button>
                </div>
            `
            : "";

    csvSummary.innerHTML = `
        <div class="validation-ready">
            ${
                dataType.source === "manual"
                    ? "指定されたデータ種類："
                    : "このCSVは"
            }
            <strong>「${escapeHtml(typeLabel)}」</strong>
            ${
                dataType.source === "manual"
                    ? ""
                    : "と判断しました"
            }
        </div>

        ${mismatchHtml}

        <div class="quality-grid">
            <div class="quality-item">
                <span>データ件数</span>
                <strong>${rowCount}${rowUnit}</strong>
            </div>

            <div class="quality-item">
                <span>判定信頼度</span>
                <strong>${escapeHtml(confidenceLabel)}</strong>
            </div>
        </div>
    `;

    const useDetectedTypeButton =
        document.getElementById(
            "csvUseDetectedTypeButton"
        );

    if (
        useDetectedTypeButton &&
        csvDataTypeMode &&
        dataType.detectedType
    ) {
        useDetectedTypeButton.addEventListener(
            "click",
            async () => {
                csvDataTypeMode.value =
                    dataType.detectedType;

                await runPipeline({
                    csvText: currentCsvText,
                    answers: {}
                });

                if (!latestResult) {
                    return;
                }

                renderStep2(latestResult);

                setStatus(
                    "RISEN CARE Connectの判定に変更しました。",
                    "success"
                );
            }
        );
    }

    const recognizedListHtml = recognizedItems.length > 0
        ? recognizedItems.map(item => {
            return `<li>✓ ${escapeHtml(getCareFriendlyFieldLabel(item))}</li>`;
        }).join("")
        : "<li>該当する項目が見つかりませんでした</li>";

    csvRecognizedFields.innerHTML = `
        <p class="csv-summary-subtitle">RISEN CARE が確認できた内容</p>

        <ul class="csv-recognized-list">
            ${recognizedListHtml}
        </ul>

        <p class="csv-summary-note">
            その他の項目は、<br>
            今回の確認対象には含まれません。<br><br>
            必要になった場合は、<br>
            後から追加で確認できます。
        </p>
    `;

    isStep2DetailOpen = false;
    isStep2AllItemsOpen = false;
    applyStep2DetailVisibility();
    applyStep2AllItemsVisibility();

    const targetColumns = buildStep2TargetColumns(mappingItems);

    renderPreviewTable({
        tableHead: csvPreviewTableHead,
        tableBody: csvPreviewTableBody,
        columns: targetColumns,
        sampleRows,
        mappingItems
    });

    if (csvAllHeaderList) {
        csvAllHeaderList.innerHTML = `
            <p class="csv-summary-subtitle">CSV全項目一覧</p>
            <div class="csv-all-header-chips">
                ${columns.map(column => {
                    return `<span class="csv-chip">${escapeHtml(column.displayName || column.name || "")}</span>`;
                }).join("")}
            </div>
        `;
    }

    const allColumns = columns.map(column => {
        return {
            name: column.name,
            displayName: column.displayName || column.name,
            fieldKey: ""
        };
    });

    renderPreviewTable({
        tableHead: csvAllPreviewTableHead,
        tableBody: csvAllPreviewTableBody,
        columns: allColumns,
        sampleRows,
        mappingItems
    });
}

function buildStep2TargetColumns(mappingItems) {
    if (!Array.isArray(mappingItems)) {
        return [];
    }

    return mappingItems
        .filter(item => Boolean(getMappingCsvHeader(item)))
        .map(item => {
            return {
                name: getMappingCsvHeader(item),
                displayName: getCareFriendlyFieldLabel(item),
                fieldKey: item.fieldKey || ""
            };
        });
}

function renderPreviewTable({ tableHead, tableBody, columns, sampleRows, mappingItems }) {
    if (!tableHead || !tableBody) {
        return;
    }

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    if (!Array.isArray(columns) || columns.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td class="empty-cell">表示できる内容がありません</td>
            </tr>
        `;
        return;
    }

    const headRow = document.createElement("tr");

    columns.forEach(column => {
        const th = document.createElement("th");
        th.textContent = column.displayName || column.name || "";
        headRow.appendChild(th);
    });

    tableHead.appendChild(headRow);

    if (!Array.isArray(sampleRows) || sampleRows.length === 0) {
        const emptyRow = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = columns.length;
        td.className = "empty-cell";
        td.textContent = "データ行がありません";
        emptyRow.appendChild(td);
        tableBody.appendChild(emptyRow);
        return;
    }

    sampleRows.forEach(row => {
        const tr = document.createElement("tr");

        columns.forEach(column => {
            const td = document.createElement("td");
            td.textContent = maskCellValue({
                columnName: column.name,
                rawValue: row[column.name] || "",
                mappingItems,
                mappedFieldKey: column.fieldKey || ""
            });
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });
}

function renderStep3(result) {
    const questions = result.validation?.questions || [];

    if (csvStep3Title) {
        csvStep3Title.textContent =
            questions.length > 0
                ? `あと${questions.length}項目だけ確認してください`
                : "自動確認が完了しました";
    }

    if (csvApplyAnswersButton) {
        csvApplyAnswersButton.textContent =
            questions.length > 0
                ? "この内容で進む"
                : "次へ進む";
    }

    if (questions.length === 0) {
        csvQuestionGuide.innerHTML = `
            <strong>
                RISEN CARE Connectが今回の対象項目を
                すべて確認できました。
            </strong>
            <p>
                内容を確認して次へ進んでください。
            </p>
        `;
    } else {
        csvQuestionGuide.innerHTML = `
            <strong>
                RISEN CARE Connectが判断できなかった項目があります。
            </strong>
            <p>
                それぞれ、該当するCSVの項目を選んでください。
            </p>
        `;
    }

    csvQuestionForm.innerHTML = "";

    questions.forEach(question => {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "csv-question-item";

        const label = document.createElement("label");
        label.textContent =
            question.multiSelect
                ? "『記録内容』として取り込むCSV項目を選択してください"
                : getStep3QuestionLabel(question.fieldLabel);

        fieldset.appendChild(label);

        if (question.multiSelect) {
            const guide = document.createElement("p");
            guide.textContent =
                "複数選択できます。選択したCSV項目は、RISEN CAREでは『記録内容』としてまとめて扱います。";
            fieldset.appendChild(guide);

            question.choices.forEach(choice => {
                const wrapper = document.createElement("label");
                wrapper.className = "csv-checkbox-option";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = question.fieldKey;
                checkbox.value = choice;

                // 今回の曖昧候補は初期状態で選択しておく
                checkbox.checked = true;

                const text = document.createElement("span");
                text.textContent = choice;

                wrapper.appendChild(checkbox);
                wrapper.appendChild(text);
                fieldset.appendChild(wrapper);
            });
        } else {
            const select = document.createElement("select");
            select.id = `answer-${question.fieldKey}`;
            select.name = question.fieldKey;
            select.className = "mapping-select";

            const defaultOption =
                document.createElement("option");

            defaultOption.value = "";
            defaultOption.textContent = "選択してください";
            select.appendChild(defaultOption);

            question.choices.forEach(choice => {
                const option =
                    document.createElement("option");

                option.value = choice;
                option.textContent = choice;
                select.appendChild(option);
            });

            fieldset.appendChild(select);
        }

        csvQuestionForm.appendChild(fieldset);
    });
}

function renderStep4(result) {
    const mappingItems = result.mapping?.items || [];
    const validation = result.validation || {};
    const rowCount = Number(result.metadata?.rowCount || 0);
    const dataType = result.dataType || {};

    const isSupportRecord =
        dataType.type === "support_record";

    const dataLabel =
        isSupportRecord
            ? "支援記録"
            : "利用者情報";

    const rowUnit =
        isSupportRecord
            ? "件"
            : "名";

    csvCompletionSummary.innerHTML = `
        <div class="validation-ready">
            ${dataLabel}を確認しました。<br>
            ${rowCount}${rowUnit}の${dataLabel}を<br>
            RISEN CAREで確認できる状態になりました。<br><br>
            このPoCではデータは保存されません。<br><br>
            今回確認した標準項目への対応結果です。
        </div>
        ${validation.duplicateAssignments && validation.duplicateAssignments.length > 0
            ? `<div class="validation-warning">同じCSV見出しに複数項目が割り当てられています。内容を確認してください。</div>`
            : ""}
    `;

    csvResultTableBody.innerHTML = "";

    mappingItems.forEach(item => {
        const tr = document.createElement("tr");
        const standardLabel = getMappingStandardLabel(item);
        const csvHeader = getMappingCsvHeader(item);

        const nameCell = document.createElement("td");
        nameCell.textContent = standardLabel;

        const sourceCell = document.createElement("td");
        sourceCell.textContent = csvHeader || "未設定";

        const statusCell = document.createElement("td");
        statusCell.textContent = getDecisionLabel(item.confidence, csvHeader);

        tr.appendChild(nameCell);
        tr.appendChild(sourceCell);
        tr.appendChild(statusCell);

        csvResultTableBody.appendChild(tr);
    });
}

function getDecisionLabel(confidence, sourceHeader) {
    if (!sourceHeader) {
        return "未確認";
    }

    if (confidence === "auto") {
        return "自動で確認";
    }

    if (confidence === "manual") {
        return "職員が確認";
    }

    return "設定済み";
}

function collectAnswers() {
    const answers = {};

    const selects =
        csvQuestionForm.querySelectorAll(
            "select[name]"
        );

    selects.forEach(select => {
        const value =
            String(select.value || "").trim();

        if (value) {
            answers[select.name] = value;
        }
    });

    const checkboxes =
        csvQuestionForm.querySelectorAll(
            'input[type="checkbox"][name]'
        );

    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            return;
        }

        if (!Array.isArray(answers[checkbox.name])) {
            answers[checkbox.name] = [];
        }

        answers[checkbox.name].push(
            String(checkbox.value || "").trim()
        );
    });

    return answers;
}

function showStep(stepNumber) {
    const sections = document.querySelectorAll(".csv-step");

    sections.forEach(section => {
        const sectionStep = Number(section.dataset.step || 0);
        const active = sectionStep <= stepNumber;

        section.hidden = !active;
        section.classList.toggle("is-active", active);
    });
}

function setButtonsDisabled(disabled) {
    if (csvLoadButton) {
        csvLoadButton.disabled = disabled || !csvFileInput.files || csvFileInput.files.length === 0;
    }

    if (csvToQuestionButton) {
        csvToQuestionButton.disabled = disabled;
    }

    if (csvApplyAnswersButton) {
        csvApplyAnswersButton.disabled = disabled;
    }
}

function setStatus(message, type = "") {
    if (!csvStatus) {
        return;
    }

    csvStatus.textContent = message;
    csvStatus.className = `mapping-status ${type}`.trim();
}

function applyStep2DetailVisibility() {
    if (!csvDetailPanel || !csvToggleDetailButton) {
        return;
    }

    csvDetailPanel.hidden = !isStep2DetailOpen;
    csvToggleDetailButton.textContent = isStep2DetailOpen
        ? "閉じる"
        : "CSVの内容を見る";

    if (!isStep2DetailOpen) {
        isStep2AllItemsOpen = false;
        applyStep2AllItemsVisibility();
    }
}

function applyStep2AllItemsVisibility() {
    if (!csvAllItemsPanel || !csvToggleAllItemsButton) {
        return;
    }

    csvAllItemsPanel.hidden = !isStep2AllItemsOpen;
    csvToggleAllItemsButton.textContent = isStep2AllItemsOpen
        ? "閉じる"
        : "すべての項目を見る";
}

function getCareFriendlyFieldLabel(item) {
    const labelByKey = {
        resident_id: "利用者番号",
        full_name: "お名前",
        kana_name: "フリガナ",
        birth_date: "生年月日",
        gender: "性別",
        address: "ご住所",
        postal_code: "郵便番号",
        phone_number: "電話番号",

        record_id: "記録ID",
        record_datetime: "記録日時",
        resident_name: "利用者名",
        staff_name: "記録者",
        record_type: "記録種別",
        support_content: "支援内容",
        record_detail: "記録内容",
        behavior_type: "行動分類",
        created_at: "作成日時"
    };

    if (item?.fieldKey && labelByKey[item.fieldKey]) {
        return labelByKey[item.fieldKey];
    }

    return getMappingStandardLabel(item);
}

function getMappingCsvHeader(item) {
    if (
        Array.isArray(item?.csvHeaders) &&
        item.csvHeaders.length > 0
    ) {
        return item.csvHeaders.join(" ＋ ");
    }

    return item?.csvHeader || item?.sourceHeader || "";
}

function getMappingStandardLabel(item) {
    return item?.standardFieldLabel || item?.fieldLabel || "";
}

function getStep3QuestionLabel(fieldLabel) {
    if (fieldLabel === "住所") {
        return "住所として利用するCSV項目を確認してください";
    }

    if (fieldLabel === "郵便番号") {
        return "郵便番号として利用するCSV項目を確認してください";
    }

    if (fieldLabel === "記録内容") {
        return "記録内容として利用するCSV項目を確認してください";
    }

    return `${fieldLabel}として利用するCSV項目を確認してください`;
}

function maskCellValue({ columnName, rawValue, mappingItems, mappedFieldKey = "" }) {
    const value = String(rawValue || "");

    if (!value) {
        return "";
    }

    const normalized = normalizeText(columnName);

    const mappedItem = Array.isArray(mappingItems)
        ? mappingItems.find(item => getMappingCsvHeader(item) === columnName)
        : null;

    const mappedKey = mappedFieldKey || mappedItem?.fieldKey || "";

    if (
        mappedKey === "full_name" ||
        mappedKey === "kana_name" ||
        mappedKey === "resident_name" ||
        mappedKey === "staff_name" ||
        normalized.includes("氏名") ||
        normalized.includes("利用者名") ||
        normalized.includes("フリガナ") ||
        normalized.includes("名前")
    ) {
        return maskName(value);
    }

    if (
        mappedKey === "birth_date" ||
        normalized.includes("生年月日") ||
        normalized.includes("誕生日")
    ) {
        return maskBirthDate(value);
    }

    if (
        normalized.includes("email") ||
        normalized.includes("メール") ||
        normalized.includes("mail")
    ) {
        return maskEmail(value);
    }

    if (
        normalized.includes("受給者証番号") ||
        normalized.includes("受給者番号")
    ) {
        return maskBeneficiaryNumber(value);
    }

    if (
        mappedKey === "postal_code" ||
        normalized.includes("郵便番号") ||
        normalized.includes("zipcode") ||
        normalized.includes("postcode") ||
        normalized.includes("zip")
    ) {
        return maskPostalCode(value);
    }

    if (
        mappedKey === "address" ||
        normalized.includes("住所") ||
        normalized.includes("本籍地") ||
        normalized.includes("所在地")
    ) {
        return maskAddress(value);
    }

    if (
        normalized.includes("携帯") ||
        normalized.includes("mobile") ||
        normalized.includes("cell")
    ) {
        return maskMobilePhone(value);
    }

    if (
        mappedKey === "phone_number" ||
        normalized.includes("電話") ||
        normalized.includes("連絡先") ||
        normalized.includes("tel") ||
        normalized.includes("phone")
    ) {
        return maskPhone(value);
    }

    return value;
}

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[\s_\-()（）]/g, "");
}

function maskName(value) {
    const text = String(value || "").trim();

    if (!text) {
        return "";
    }

    const parts = text.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
        return `${parts[0]} ○○`;
    }

    if (text.length <= 2) {
        return `${text[0]}○`;
    }

    return `${text.slice(0, 2)} ○○`;
}

function maskBirthDate(value) {
    const text = String(value || "").trim();
    const yearMatch = text.match(/(19|20)\d{2}/);
    const year = yearMatch ? yearMatch[0] : "0000";
    return `${year}/○○/○○`;
}

function maskAddress(value) {
    const text = String(value || "").trim();

    if (!text) {
        return "";
    }

    const boundary = text.search(/[市区町村]/);

    if (boundary >= 0) {
        return `${text.slice(0, boundary + 1)} ○○`;
    }

    if (text.length <= 4) {
        return "○○";
    }

    return `${text.slice(0, 4)} ○○`;
}

function maskPhone(value) {
    const text = String(value || "").trim();
    const digits = text.replace(/\D/g, "");

    if (digits.length < 7) {
        return "***";
    }

    return `${digits.slice(0, 3)}-***-${digits.slice(-4)}`;
}

function maskMobilePhone(value) {
    const text = String(value || "").trim();
    const digits = text.replace(/\D/g, "");

    if (digits.length < 8) {
        return "****";
    }

    return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function maskEmail(value) {
    const text = String(value || "").trim();
    const atIndex = text.indexOf("@");

    if (atIndex <= 0) {
        return "***";
    }

    const local = text.slice(0, atIndex);
    const domain = text.slice(atIndex + 1);
    return `${local[0] || "*"}***@${domain}`;
}

function maskBeneficiaryNumber(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (!digits) {
        return "";
    }

    if (digits.length <= 4) {
        return digits;
    }

    return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

function maskPostalCode(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length < 3) {
        return "***-****";
    }

    return `${digits.slice(0, 3)}-****`;
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function resetCsvFlowState() {
    latestResult = null;
    isStep2DetailOpen = false;
    isStep2AllItemsOpen = false;

    if (csvQuestionForm) {
        csvQuestionForm.innerHTML = "";
    }

    if (csvResultTableBody) {
        csvResultTableBody.innerHTML = "";
    }

    if (csvCompletionSummary) {
        csvCompletionSummary.innerHTML = "";
    }

    if (csvDetailPanel) {
        csvDetailPanel.hidden = true;
    }

    if (csvAllItemsPanel) {
        csvAllItemsPanel.hidden = true;
    }

    showStep(1);
}
