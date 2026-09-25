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

const residentLinkingSummary =
    document.getElementById("residentLinkingSummary");

const residentLinkingList =
    document.getElementById("residentLinkingList");

const residentLinkingBackButton =
    document.getElementById("residentLinkingBackButton");

const residentLinkingNextButton =
    document.getElementById("residentLinkingNextButton");

const residentBulkActionBar =
    document.getElementById("residentBulkActionBar");

const residentBulkActionCount =
    document.getElementById("residentBulkActionCount");

const importPreviewSummary =
    document.getElementById("importPreviewSummary");

const importPreviewBackButton =
    document.getElementById("importPreviewBackButton");

const importPreviewNextButton =
    document.getElementById("importPreviewNextButton");

const importExecutionSummary =
    document.getElementById("importExecutionSummary");

const importExecutionBackButton =
    document.getElementById("importExecutionBackButton");

const importExecutionConfirmButton =
    document.getElementById("importExecutionConfirmButton");

let latestAnalysis = null;
let confirmedImportPreviewFingerprint = null;
let confirmedImportPreview = null;

let standardFields = [];
let recipientCertificateSemanticTargets = [];

const sourceFieldMeaningSelections = new Map();
const confirmedSourceFieldSelections = new Set();
const sourceFieldReviewStates = new Map();
const sourceResidentMappings = new Map();
const residentCandidateGroups = new Map();
const selectedResidentAdmissionKeys = new Set();

let confirmedSourceRecordIdentity = null;
let selectedSourceRecordIdentityFieldKey = "";
let sourceRecordIdentityCandidates = [];
let sourceRecordIdentityCandidateStatus = null;
let confirmedDocumentType = null;
let selectedSemanticType = null;
let subjectContextResolution = null;
let subjectContextResolutionLoading = false;

function getSelectedSemanticProjectionType() {
    return window.RisenSemanticProjectionPolicy
        ?.resolveSemanticProjectionType(
            confirmedDocumentType,
            selectedSemanticType
        ) || null;
}

function getConfirmedExecutionSemanticType(
    preview = confirmedImportPreview
) {
    const explicitSemanticProjectionType =
        window.RisenSemanticProjectionPolicy
            ?.resolveExplicitSemanticProjectionType(
                selectedSemanticType
            ) || null;

    return window.RisenSemanticProjectionPolicy
        ?.resolveConfirmedExecutionSemanticType({
            confirmedDocumentType,
            explicitSemanticType:
                explicitSemanticProjectionType,
            previewSemanticType:
                preview?.semanticType ?? null
        }) || null;
}

async function refreshSubjectContextResolution() {
    if (!latestAnalysis) {
        subjectContextResolution = null;
        return;
    }

    const fieldDefinitions =
        Array.isArray(
            latestAnalysis.extracted?.fieldDefinitions
        )
            ? latestAnalysis.extracted.fieldDefinitions
            : [];

    subjectContextResolutionLoading = true;

    try {
        const response = await fetch(
            "/api/context-resolution",
            {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    fieldDefinitions,
                    confirmedDocumentType
                })
            }
        );

        const result = await response.json();

        if (!response.ok || result.success !== true) {
            throw new Error(
                result.message ||
                "データ文脈の解析に失敗しました"
            );
        }

        subjectContextResolution =
            result.context || null;
    } catch (error) {
        subjectContextResolution = null;
        console.warn(
            "データ文脈の解析に失敗しました:",
            error.message
        );
    } finally {
        subjectContextResolutionLoading = false;
    }
}

function getConfirmedDocumentTypeSnapshot() {
    if (
        !latestAnalysis ||
        typeof latestAnalysis.sourceDocumentKey !== "string" ||
        !latestAnalysis.sourceDocumentKey.trim() ||
        typeof latestAnalysis.sourceUpdatedAt !== "string" ||
        !latestAnalysis.sourceUpdatedAt.trim() ||
        Number.isNaN(Date.parse(latestAnalysis.sourceUpdatedAt)) ||
        !Number.isSafeInteger(latestAnalysis.sourceSize) ||
        latestAnalysis.sourceSize < 0
    ) {
        throw new Error(
            "データ種別の原本スナップショットを確認できません"
        );
    }

    return {
        sourceDocumentKey:
            latestAnalysis.sourceDocumentKey.trim(),
        sourceUpdatedAt:
            new Date(
                latestAnalysis.sourceUpdatedAt
            ).toISOString(),
        sourceSize:
            latestAnalysis.sourceSize
    };
}

async function loadPersistedConfirmedDocumentType() {
    const snapshot =
        getConfirmedDocumentTypeSnapshot();

    const params =
        new URLSearchParams({
            sourceDocumentKey:
                snapshot.sourceDocumentKey,
            sourceUpdatedAt:
                snapshot.sourceUpdatedAt,
            sourceSize:
                String(snapshot.sourceSize)
        });

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/confirmed-document-type?${params}`
        );

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result ||
        result.success !== true ||
        !["found", "not_found"].includes(result.status)
    ) {
        throw new Error(
            result?.message ||
            "保存済みのデータ種別を復元できませんでした"
        );
    }

    if (result.status === "not_found") {
        confirmedDocumentType = null;
        return null;
    }

    const documentType =
        typeof result.confirmation?.documentType === "string"
            ? result.confirmation.documentType.trim()
            : "";

    const profile =
        window.RisenDocumentTypeProfiles
            .getDocumentTypeProfile(documentType);

    if (!profile) {
        throw new Error(
            "保存済みのデータ種別が現在の定義に存在しません"
        );
    }

    confirmedDocumentType = profile.type;

    return {
        documentType:
            confirmedDocumentType
    };
}

async function persistConfirmedDocumentType(
    documentType
) {
    const snapshot =
        getConfirmedDocumentTypeSnapshot();

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/confirmed-document-type`,
            {
                method: "POST",
                headers: {
                    "content-type":
                        "application/json"
                },
                body: JSON.stringify({
                    ...snapshot,
                    documentType
                })
            }
        );

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result ||
        result.success !== true ||
        result.status !== "confirmed" ||
        result.documentType !== documentType ||
        !["created", "updated", "unchanged"]
            .includes(result.persistenceStatus)
    ) {
        throw new Error(
            result?.message ||
            "データ種別を保存できませんでした"
        );
    }

    return result;
}

function getSourceRecordIdentitySnapshot() {
    if (
        !latestAnalysis ||
        typeof latestAnalysis.sourceDocumentKey !== "string" ||
        !latestAnalysis.sourceDocumentKey.trim() ||
        typeof latestAnalysis.sourceUpdatedAt !== "string" ||
        !latestAnalysis.sourceUpdatedAt.trim() ||
        Number.isNaN(Date.parse(latestAnalysis.sourceUpdatedAt)) ||
        !Number.isSafeInteger(latestAnalysis.sourceSize) ||
        latestAnalysis.sourceSize < 0
    ) {
        throw new Error(
            "原本レコードIDのスナップショットを確認できません"
        );
    }

    return {
        sourceDocumentKey:
            latestAnalysis.sourceDocumentKey.trim(),
        sourceUpdatedAt:
            new Date(
                latestAnalysis.sourceUpdatedAt
            ).toISOString(),
        sourceSize:
            latestAnalysis.sourceSize
    };
}

async function loadSourceRecordIdentityCandidates() {
    const snapshot =
        getSourceRecordIdentitySnapshot();

    const params =
        new URLSearchParams({
            sourceDocumentKey:
                snapshot.sourceDocumentKey,
            sourceUpdatedAt:
                snapshot.sourceUpdatedAt,
            sourceSize:
                String(snapshot.sourceSize)
        });

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-record-identity-candidates?${params}`
        );

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result ||
        result.success !== true ||
        ![
            "candidates_available",
            "no_safe_single_field_candidate",
            "insufficient_source"
        ].includes(result.status) ||
        !Array.isArray(result.candidates)
    ) {
        throw new Error(
            result?.message ||
            "安全な取り込み方法の候補を確認できませんでした"
        );
    }

    sourceRecordIdentityCandidateStatus =
        result.status;
    sourceRecordIdentityCandidates =
        result.candidates;

    return {
        status:
            sourceRecordIdentityCandidateStatus,
        candidates:
            sourceRecordIdentityCandidates
    };
}

async function loadPersistedSourceRecordIdentity() {
    const snapshot =
        getSourceRecordIdentitySnapshot();

    const params =
        new URLSearchParams({
            sourceDocumentKey:
                snapshot.sourceDocumentKey,
            sourceUpdatedAt:
                snapshot.sourceUpdatedAt,
            sourceSize:
                String(snapshot.sourceSize)
        });

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-record-identity-mapping?${params}`
        );

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result ||
        result.success !== true ||
        !["found", "not_found"].includes(result.status)
    ) {
        throw new Error(
            result?.message ||
            "保存済みの原本レコードIDを取得できませんでした"
        );
    }

    if (result.status === "not_found") {
        confirmedSourceRecordIdentity = null;
        selectedSourceRecordIdentityFieldKey = "";
        return;
    }

    const sourceFieldKey =
        typeof result.mapping?.sourceFieldKey === "string"
            ? result.mapping.sourceFieldKey.trim()
            : "";

    const fieldDefinitions =
        Array.isArray(
            latestAnalysis.extracted?.fieldDefinitions
        )
            ? latestAnalysis.extracted.fieldDefinitions
            : [];

    const fieldExists =
        fieldDefinitions.some(
            field =>
                typeof field?.sourceFieldKey === "string" &&
                field.sourceFieldKey.trim() === sourceFieldKey
        );

    if (!sourceFieldKey || !fieldExists) {
        throw new Error(
            "保存済みの原本レコードIDが現在の原本構造と一致しません"
        );
    }

    confirmedSourceRecordIdentity = {
        sourceFieldKey,
        sheetName:
            typeof result.mapping.sheetName === "string"
                ? result.mapping.sheetName
                : null,
        headerLabel:
            typeof result.mapping.headerLabel === "string"
                ? result.mapping.headerLabel
                : null,
        confirmedAt:
            typeof result.mapping.confirmedAt === "string"
                ? result.mapping.confirmedAt
                : null
    };

    selectedSourceRecordIdentityFieldKey =
        sourceFieldKey;
}

async function confirmSourceRecordIdentity(
    sourceFieldKey
) {
    const snapshot =
        getSourceRecordIdentitySnapshot();

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-record-identity-mapping`,
            {
                method: "POST",
                headers: {
                    "content-type":
                        "application/json"
                },
                body:
                    JSON.stringify({
                        sourceDocumentKey:
                            snapshot.sourceDocumentKey,
                        sourceUpdatedAt:
                            snapshot.sourceUpdatedAt,
                        sourceSize:
                            snapshot.sourceSize,
                        sourceFieldKey
                    })
            }
        );

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (
        !response.ok ||
        !result ||
        result.success !== true ||
        result.status !== "confirmed" ||
        typeof result.mapping?.sourceFieldKey !== "string" ||
        !result.mapping.sourceFieldKey.trim()
    ) {
        const error =
            new Error(
                result?.message ||
                "原本レコードIDを確認できませんでした"
            );

        error.validation =
            result?.validation || null;

        throw error;
    }

    confirmedSourceRecordIdentity = {
        sourceFieldKey:
            result.mapping.sourceFieldKey.trim(),
        sheetName:
            typeof result.mapping.sheetName === "string"
                ? result.mapping.sheetName
                : null,
        headerLabel:
            typeof result.mapping.headerLabel === "string"
                ? result.mapping.headerLabel
                : null,
        confirmedAt:
            typeof result.mapping.confirmedAt === "string"
                ? result.mapping.confirmedAt
                : null,
        validation:
            result.validation || null
    };

    selectedSourceRecordIdentityFieldKey =
        confirmedSourceRecordIdentity.sourceFieldKey;

    return result;
}

function createSourceResidentMappingKey(
    identifierType,
    identifierDigest
) {
    return `${String(identifierType || "")}:${String(
        identifierDigest || ""
    )}`;
}

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

async function loadRecipientCertificateSemanticTargets() {
    const response = await fetch(
        `${LOCAL_CONNECTOR_BASE}/semantic-contracts/recipient-certificate`
    );

    const result = await response.json();

    if (
        !response.ok ||
        result?.success !== true ||
        result?.semanticType !==
            "recipient_certificate" ||
        !Array.isArray(
            result?.supportedSemanticTargets
        )
    ) {
        throw new Error(
            "受給者証の標準項目契約を取得できませんでした"
        );
    }

    recipientCertificateSemanticTargets =
        [...result.supportedSemanticTargets];
}

function getAvailableStandardFields() {
    const semanticProjectionType =
        getSelectedSemanticProjectionType();

    if (
        semanticProjectionType !==
        "recipient_certificate"
    ) {
        return standardFields;
    }

    return window.RisenStandardFieldMapping
        ?.filterStandardFieldsBySemanticTargets(
            standardFields,
            recipientCertificateSemanticTargets
        ) || [];
}

function isMeaningAllowedForConfirmedDocumentType(
    semanticMeaning
) {
    return window.RisenStandardFieldMapping
        ?.isSemanticTargetAllowedForDocumentType(
            getSelectedSemanticProjectionType(),
            semanticMeaning,
            recipientCertificateSemanticTargets
        ) === true;
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

async function loadPersistedSourceFieldMappings(
    analysis
) {
    if (
        !analysis ||
        typeof analysis.sourceDocumentKey !== "string" ||
        !analysis.sourceDocumentKey.trim() ||
        typeof analysis.sourceUpdatedAt !== "string" ||
        !analysis.sourceUpdatedAt.trim() ||
        Number.isNaN(
            Date.parse(analysis.sourceUpdatedAt)
        ) ||
        !Number.isSafeInteger(
            analysis.sourceSize
        ) ||
        analysis.sourceSize < 0
    ) {
        return;
    }

    const fieldDefinitions =
        Array.isArray(
            analysis.extracted?.fieldDefinitions
        )
            ? analysis.extracted.fieldDefinitions
            : [];

    const currentSourceFieldKeys =
        new Set(
            fieldDefinitions
                .map(field =>
                    typeof field?.sourceFieldKey === "string"
                        ? field.sourceFieldKey.trim()
                        : ""
                )
                .filter(Boolean)
        );

    const params =
        new URLSearchParams({
            sourceDocumentKey:
                analysis.sourceDocumentKey.trim(),
            sourceUpdatedAt:
                new Date(
                    analysis.sourceUpdatedAt
                ).toISOString(),
            sourceSize:
                String(analysis.sourceSize)
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
        !Array.isArray(result.mappings)
    ) {
        throw new Error(
            result?.message ||
            "保存済みの項目対応を取得できませんでした"
        );
    }

    for (const mapping of result.mappings) {
        const sourceFieldKey =
            typeof mapping?.sourceFieldKey === "string"
                ? mapping.sourceFieldKey.trim()
                : "";

        const standardEntityName =
            typeof mapping?.standardEntityName === "string"
                ? mapping.standardEntityName.trim()
                : "";

        const standardFieldName =
            typeof mapping?.standardFieldName === "string"
                ? mapping.standardFieldName.trim()
                : "";

        if (
            !sourceFieldKey ||
            !currentSourceFieldKeys.has(
                sourceFieldKey
            ) ||
            !standardEntityName ||
            !standardFieldName
        ) {
            continue;
        }

        const selectionKey =
            createSourceFieldSelectionKey(
                analysis.sourceDocumentKey.trim(),
                sourceFieldKey
            );

        sourceFieldMeaningSelections.set(
            selectionKey,
            `${standardEntityName}.${standardFieldName}`
        );
    }
}

async function loadPersistedSourceFieldReviewStates(
    analysis
) {
    if (
        !analysis ||
        typeof analysis.sourceDocumentKey !== "string" ||
        !analysis.sourceDocumentKey.trim() ||
        typeof analysis.sourceUpdatedAt !== "string" ||
        !analysis.sourceUpdatedAt.trim() ||
        Number.isNaN(
            Date.parse(analysis.sourceUpdatedAt)
        ) ||
        !Number.isSafeInteger(analysis.sourceSize) ||
        analysis.sourceSize < 0
    ) {
        return;
    }

    const sourceDocumentKey =
        analysis.sourceDocumentKey.trim();

    const params =
        new URLSearchParams({
            sourceDocumentKey,
            sourceUpdatedAt:
                new Date(
                    analysis.sourceUpdatedAt
                ).toISOString(),
            sourceSize:
                String(analysis.sourceSize)
        });

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-field-interpretations?${params}`
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

            continue;
        }

        const confirmedMeaning =
            typeof interpretation.confirmedMeaning === "string"
                ? interpretation.confirmedMeaning.trim()
                : "";

        if (confirmedMeaning) {
            sourceFieldMeaningSelections.set(
                selectionKey,
                confirmedMeaning
            );

            confirmedSourceFieldSelections.add(
                selectionKey
            );

            sourceFieldReviewStates.set(
                selectionKey,
                "confirmed"
            );
        }
    }
}

async function analyzeFile(filePath) {
    confirmedImportPreviewFingerprint = null;
    confirmedImportPreview = null;

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

        try {
            await loadRecipientCertificateSemanticTargets();
        } catch (error) {
            recipientCertificateSemanticTargets = [];
            console.warn(
                "受給者証の標準項目契約を取得できませんでした:",
                error.message
            );
        }

        sourceFieldMeaningSelections.clear();
        confirmedSourceFieldSelections.clear();
        sourceFieldReviewStates.clear();
        confirmedSourceRecordIdentity = null;
        selectedSourceRecordIdentityFieldKey = "";
        sourceRecordIdentityCandidates = [];
        sourceRecordIdentityCandidateStatus = null;
        confirmedDocumentType = null;
        selectedSemanticType = null;
        subjectContextResolution = null;

        latestAnalysis = result;

        try {
            await loadPersistedConfirmedDocumentType();
        } catch (error) {
            confirmedDocumentType = null;
            console.warn(
                "保存済みのデータ種別を復元できませんでした:",
                error.message
            );
        }

        await refreshSubjectContextResolution();

        try {
            await loadSourceRecordIdentityCandidates();
        } catch (error) {
            sourceRecordIdentityCandidates = [];
            sourceRecordIdentityCandidateStatus = null;
            console.warn(
                "安全な取り込み方法の候補を確認できませんでした:",
                error.message
            );
        }

        try {
            await loadPersistedSourceRecordIdentity();
        } catch (error) {
            console.warn(
                "保存済みの原本レコードIDを復元できませんでした:",
                error.message
            );
        }

        try {
            await loadPersistedSourceFieldMappings(
                result
            );
        } catch (error) {
            console.warn(
                "保存済みの項目対応を復元できませんでした:",
                error.message
            );
        }

        try {
            await loadPersistedSourceFieldReviewStates(
                result
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

    const identityOptions =
        fieldDefinitions
            .map(field => {
                const sourceFieldKey =
                    typeof field?.sourceFieldKey === "string"
                        ? field.sourceFieldKey.trim()
                        : "";

                const label =
                    typeof field?.headerLabel === "string" &&
                    field.headerLabel.trim()
                        ? field.headerLabel.trim()
                        : sourceFieldKey;

                return {
                    value: sourceFieldKey,
                    label
                };
            })
            .filter(option => option.value);

    const identityOptionHtml =
        identityOptions
            .map(option => `
                <option
                    value="${escapeHtml(option.value)}"
                    ${
                        option.value ===
                        selectedSourceRecordIdentityFieldKey
                            ? "selected"
                            : ""
                    }
                >
                    ${escapeHtml(option.label)}
                </option>
            `)
            .join("");

    const identityCandidateLabels =
        sourceRecordIdentityCandidates
            .map(candidate =>
                typeof candidate?.headerLabel === "string"
                    ? candidate.headerLabel.trim()
                    : ""
            )
            .filter(Boolean);

    const identityCandidateDiagnostic =
        sourceRecordIdentityCandidateStatus ===
            "candidates_available"
            ? `
                <div
                    style="
                        margin: 12px 0;
                        padding: 12px;
                        border: 1px solid #b7d7c2;
                        background: #f4fbf6;
                        border-radius: 8px;
                    "
                >
                    <strong>
                        RISEN CAREが確認した候補
                    </strong>
                    <p class="form-help">
                        候補数：${identityCandidateLabels.length}<br>
                        候補：${identityCandidateLabels
                            .map(escapeHtml)
                            .join("、")}
                    </p>
                </div>
            `
            : sourceRecordIdentityCandidateStatus ===
                "no_safe_single_field_candidate"
                ? `
                    <div
                        style="
                            margin: 12px 0;
                            padding: 12px;
                            border: 1px solid #e1c36a;
                            background: #fffaf0;
                            border-radius: 8px;
                        "
                    >
                        <strong>
                            RISEN CAREが確認した候補
                        </strong>
                        <p class="form-help">
                            1項目だけで安全に見分けられる候補はありません。
                        </p>
                    </div>
                `
                : "";

    const identityConfirmed =
        Boolean(
            confirmedSourceRecordIdentity &&
            typeof confirmedSourceRecordIdentity
                .sourceFieldKey === "string" &&
            confirmedSourceRecordIdentity
                .sourceFieldKey.trim()
        );

    const confirmedDocumentTypeProfile =
        window.RisenDocumentTypeProfiles
            .getDocumentTypeProfile(
                confirmedDocumentType
            );

    const sourceRecordIdentityRequired =
        confirmedDocumentTypeProfile
            ?.sourceRecordIdentityRequired === true;

    const identitySection =
        !sourceRecordIdentityRequired
            ? ""
            : `
        <div
            style="
                margin-top: 24px;
                margin-bottom: 20px;
                padding: 16px;
                border: 1px solid #d0d5dd;
                border-radius: 10px;
                background: #f9fafb;
            "
        >
            <h3 style="margin-top: 0;">
                原本レコードID
            </h3>

            ${identityCandidateDiagnostic}

            <p class="form-help">
                原本側で各記録を一意に識別する項目を選択してください。
                選択だけでは確定せず、確認時に原本全行の
                欠損・空欄・重複を検証します。
            </p>

            <div
                style="
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-top: 10px;
                "
            >
                <select
                    id="sourceRecordIdentitySelect"
                    ${identityConfirmed ? "disabled" : ""}
                >
                    <option value="">
                        原本レコードIDを選択
                    </option>
                    ${identityOptionHtml}
                </select>

                <button
                    id="sourceRecordIdentityConfirmButton"
                    type="button"
                    class="secondary-button"
                    ${identityConfirmed ? "disabled" : ""}
                >
                    ${
                        identityConfirmed
                            ? "確認済み"
                            : "この項目を確認"
                    }
                </button>
            </div>

            <div
                id="sourceRecordIdentityStatus"
                class="form-help"
                style="
                    margin-top: 10px;
                    color: ${
                        identityConfirmed
                            ? "#176b36"
                            : "#667085"
                    };
                "
            >
                ${
                    identityConfirmed
                        ? `確認済み：${escapeHtml(
                            confirmedSourceRecordIdentity
                                .headerLabel ||
                            confirmedSourceRecordIdentity
                                .sourceFieldKey
                        )}`
                        : "まだ確認されていません。"
                }
            </div>
        </div>
    `;

    const documentTypeProfiles =
        window.RisenDocumentTypeProfiles
            .listConfirmableDocumentTypes();

    const documentTypeOptions =
        documentTypeProfiles
            .map(profile => `
                <option
                    value="${escapeHtml(profile.type)}"
                    ${
                        confirmedDocumentType === profile.type
                            ? "selected"
                            : ""
                    }
                >
                    ${escapeHtml(profile.label)}
                </option>
            `)
            .join("");

    const detectedDocumentType =
        latestAnalysis.documentType || "unknown";

    const detectedDocumentTypeProfile =
        window.RisenDocumentTypeProfiles
            .getDocumentTypeProfile(
                detectedDocumentType
            );

    const documentTypeSection = `
        <div
            style="
                margin-top: 20px;
                margin-bottom: 20px;
                padding: 16px;
                border: 1px solid #d0d5dd;
                border-radius: 10px;
                background: #f9fafb;
            "
        >
            <h3 style="margin-top: 0;">
                データ種別の確認
            </h3>

            <p class="form-help">
                自動判定は参考情報です。
                実際のデータ種別は人が確認してください。
            </p>

            <p>
                <strong>自動判定：</strong>
                ${escapeHtml(
                    detectedDocumentTypeProfile?.label ||
                    detectedDocumentType
                )}
            </p>

            <div
                style="
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    flex-wrap: wrap;
                "
            >
                <select id="confirmedDocumentTypeSelect">
                    <option value="">
                        データ種別を選択
                    </option>
                    ${documentTypeOptions}
                </select>

                <button
                    id="confirmedDocumentTypeButton"
                    type="button"
                    class="secondary-button"
                >
                    このデータ種別を確認
                </button>
            </div>

            <div
                id="confirmedDocumentTypeStatus"
                class="form-help"
                style="
                    margin-top: 10px;
                    color: ${
                        confirmedDocumentType
                            ? "#176b36"
                            : "#667085"
                    };
                "
            >
                ${
                    confirmedDocumentType
                        ? "確認済み：" +
                            escapeHtml(
                                window.RisenDocumentTypeProfiles
                                    .getDocumentTypeProfile(
                                        confirmedDocumentType
                                    )?.label ||
                                confirmedDocumentType
                            )
                        : "まだ確認されていません。"
                }
            </div>
        </div>
    `;

    const explicitSemanticProjectionType =
        window.RisenSemanticProjectionPolicy
            ?.resolveExplicitSemanticProjectionType(
                selectedSemanticType
            ) || null;

    const semanticProjectionSection =
        confirmedDocumentType === "resident_master"
            ? `
                <div
                    style="
                        margin-top: 20px;
                        margin-bottom: 20px;
                        padding: 16px;
                        border: 1px solid #d0d5dd;
                        border-radius: 10px;
                        background: #f9fafb;
                    "
                >
                    <h3 style="margin-top: 0;">
                        取り込み対象
                    </h3>

                    <p class="form-help">
                        原本のデータ種別は変更せず、
                        このデータからRISENへ取り込む情報を選択します。
                    </p>

                    <select id="semanticProjectionSelect">
                        <option value="">
                            取り込み対象を選択
                        </option>
                        <option
                            value="recipient_certificate"
                            ${
                                explicitSemanticProjectionType ===
                                "recipient_certificate"
                                    ? "selected"
                                    : ""
                            }
                        >
                            受給者証
                        </option>
                    </select>

                    <div
                        class="form-help"
                        style="
                            margin-top: 10px;
                            color: ${
                                explicitSemanticProjectionType
                                    ? "#176b36"
                                    : "#667085"
                            };
                        "
                    >
                        ${
                            explicitSemanticProjectionType ===
                            "recipient_certificate"
                                ? "選択中：受給者証"
                                : "まだ選択されていません。"
                        }
                    </div>
                </div>
            `
            : "";

    const subjectLabels = {
        user: "利用者",
        staff: "職員",
        recipient_certificate: "受給者証"
    };

    const subjectContextSection = (() => {
        if (subjectContextResolutionLoading) {
            return `
                <div
                    style="
                        margin-bottom: 20px;
                        padding: 16px;
                        border: 1px solid #d0d5dd;
                        border-radius: 10px;
                        background: #f9fafb;
                    "
                >
                    <h3 style="margin-top: 0;">
                        このデータに紐づく情報
                    </h3>
                    <p class="form-help">
                        文書全体の文脈を確認しています。
                    </p>
                </div>
            `;
        }

        const context = subjectContextResolution;

        if (!context) {
            return "";
        }

        const hypotheses =
            Array.isArray(context.hypotheses)
                ? context.hypotheses
                : [];

        const evidence =
            Array.isArray(context.evidence)
                ? context.evidence
                : [];

        const ambiguousFields =
            Array.isArray(context.ambiguousFields)
                ? context.ambiguousFields
                : [];

        const hypothesisHtml =
            hypotheses.length > 0
                ? hypotheses
                    .map(item => `
                        <li>
                            ${escapeHtml(
                                subjectLabels[item.subject] ||
                                item.subject
                            )}に紐づく情報の可能性
                        </li>
                    `)
                    .join("")
                : "<li>主体をまだ判断できません。</li>";

        const evidenceHtml =
            evidence.length > 0
                ? evidence
                    .map(item => {
                        if (
                            item.type ===
                            "confirmed_document_type"
                        ) {
                            return `
                                <li>
                                    確認済みのデータ種別
                                </li>
                            `;
                        }

                        return `
                            <li>
                                原本項目：
                                ${escapeHtml(
                                    item.label || "-"
                                )}
                            </li>
                        `;
                    })
                    .join("")
                : "<li>明確な根拠はまだありません。</li>";

        const ambiguousHtml =
            ambiguousFields.length > 0
                ? `
                    <div style="margin-top: 12px;">
                        <strong>人の確認が必要な項目</strong>
                        <ul>
                            ${ambiguousFields
                                .map(item => `
                                    <li>
                                        ${escapeHtml(
                                            item.headerLabel || "-"
                                        )}
                                    </li>
                                `)
                                .join("")}
                        </ul>
                    </div>
                `
                : "";

        return `
            <div
                style="
                    margin-bottom: 20px;
                    padding: 16px;
                    border: 1px solid #d0d5dd;
                    border-radius: 10px;
                    background: #f9fafb;
                "
            >
                <h3 style="margin-top: 0;">
                    このデータに紐づく情報
                </h3>

                <p class="form-help">
                    原本全体から考えられる文脈です。
                    自動確定ではありません。
                </p>

                <strong>関連情報の候補</strong>
                <ul>
                    ${hypothesisHtml}
                </ul>

                <strong>判断材料</strong>
                <ul>
                    ${evidenceHtml}
                </ul>

                ${ambiguousHtml}
            </div>
        `;
    })();

    const availableStandardFields =
        getAvailableStandardFields();

    const standardMeaningOptions =
        availableStandardFields.map(field => ({
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
                            availableStandardFields
                        ) || null;

                const suggestedMeaning =
                    suggestedField
                        ? `${suggestedField.entity_name}.${suggestedField.field_name}`
                        : "";

                const suggestedLabel =
                    suggestedField
                        ? `${suggestedField.display_name} (${suggestedMeaning})`
                        : "";

                const contextualCandidate =
                    Array.isArray(
                        subjectContextResolution
                            ?.contextualCandidates
                    )
                        ? subjectContextResolution
                            .contextualCandidates
                            .find(candidate =>
                                candidate.sourceFieldKey ===
                                sourceFieldKey
                            ) || null
                        : null;

                const contextualMeaning =
                    contextualCandidate?.candidate
                        ? `${contextualCandidate.candidate.entityName}.${contextualCandidate.candidate.fieldName}`
                        : "";

                const contextualMeaningAllowed =
                    contextualMeaning
                        ? isMeaningAllowedForConfirmedDocumentType(
                            contextualMeaning
                        )
                        : false;

                const contextualLabel =
                    contextualCandidate?.candidate &&
                    contextualMeaningAllowed
                        ? `${contextualCandidate.candidate.displayName} (${contextualMeaning})`
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

                const confirmationValidity =
                    window.RisenStandardFieldMapping
                        ?.getSemanticConfirmationValidity(
                            reviewState,
                            getSelectedSemanticProjectionType(),
                            selectedMeaning,
                            recipientCertificateSemanticTargets
                        ) || "not_confirmed";

                const confirmedOutsideCurrentContract =
                    confirmationValidity ===
                    "confirmed_outside_current_contract";

                const stateLabel =
                    confirmedOutsideCurrentContract
                        ? "過去に確認済み・現在の契約対象外"
                        : reviewState === "confirmed"
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
                                    suggestedField &&
                                    reviewState !== "confirmed"
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
                                    !suggestedField &&
                                    contextualCandidate &&
                                    contextualMeaningAllowed &&
                                    reviewState !== "confirmed"
                                        ? `
                                            <div style="
                                                padding: 10px;
                                                border: 1px solid #f0c36d;
                                                border-radius: 8px;
                                                background: #fffaf0;
                                            ">
                                                <div style="
                                                    color: #7a5b13;
                                                    font-size: 0.8rem;
                                                    margin-bottom: 4px;
                                                ">
                                                    文脈からの候補・確認が必要
                                                </div>

                                                <strong>
                                                    ${escapeHtml(
                                                        contextualLabel
                                                    )}
                                                </strong>

                                                <div style="
                                                    margin-top: 6px;
                                                    color: #667085;
                                                    font-size: 0.82rem;
                                                ">
                                                    項目名だけでは判断できません。
                                                    文書全体の情報から考えられる候補です。
                                                </div>

                                                <div style="
                                                    margin-top: 8px;
                                                ">
                                                    <button
                                                        type="button"
                                                        class="secondary-button source-field-confirm-contextual-candidate"
                                                        data-source-field-key="${escapeHtml(
                                                            sourceFieldKey
                                                        )}"
                                                        data-standard-meaning="${escapeHtml(
                                                            contextualMeaning
                                                        )}"
                                                    >
                                                        この意味として確認
                                                    </button>
                                                </div>
                                            </div>
                                        `
                                        : ""
                                }

                                ${
                                    reviewState === "confirmed" &&
                                    selectedMeaning
                                        ? `
                                            <div style="
                                                color: ${
                                                    confirmedOutsideCurrentContract
                                                        ? "#8a6116"
                                                        : "#176b36"
                                                };
                                                font-size: 0.9rem;
                                            ">
                                                ${
                                                    confirmedOutsideCurrentContract
                                                        ? "過去に確認済み（現在の契約対象外）："
                                                        : "確認済み："
                                                }
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

                                ${
                                    reviewState !== "confirmed"
                                        ? `
                                            <details>
                                                <summary style="
                                                    cursor: pointer;
                                                    color: #3157a4;
                                                ">
                                                    ${
                                                        confirmedDocumentType ===
                                                        "recipient_certificate"
                                                            ? "受給者証で利用できるRISEN標準項目から探す"
                                                            : "すべてのRISEN標準項目から探す"
                                                    }
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
                                        `
                                        : ""
                                }

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

        ${documentTypeSection}
        ${semanticProjectionSection}
        ${subjectContextSection}
        ${identitySection}
        ${sourceFieldSection}
    `;

    const semanticProjectionSelect =
        document.getElementById(
            "semanticProjectionSelect"
        );

    semanticProjectionSelect?.addEventListener(
        "change",
        event => {
            const requestedSemanticType =
                typeof event.currentTarget?.value === "string"
                    ? event.currentTarget.value
                    : "";

            selectedSemanticType =
                window.RisenSemanticProjectionPolicy
                    ?.resolveExplicitSemanticProjectionType(
                        requestedSemanticType
                    ) || null;

            confirmedImportPreviewFingerprint = null;
            confirmedImportPreview = null;

            renderConfirmation();

            setStatus(
                selectedSemanticType ===
                    "recipient_certificate"
                    ? "取り込み対象として受給者証を選択しました。"
                    : "取り込み対象の選択を解除しました。",
                "success"
            );
        }
    );

    const documentTypeSelect =
        document.getElementById(
            "confirmedDocumentTypeSelect"
        );

    document.getElementById(
        "confirmedDocumentTypeButton"
    )?.addEventListener(
        "click",
        async () => {
            const selectedType =
                typeof documentTypeSelect?.value === "string"
                    ? documentTypeSelect.value.trim()
                    : "";

            const profile =
                window.RisenDocumentTypeProfiles
                    .getDocumentTypeProfile(selectedType);

            if (!profile) {
                setStatus(
                    "データ種別を選択してください。",
                    "error"
                );
                return;
            }

            const button =
                document.getElementById(
                    "confirmedDocumentTypeButton"
                );

            if (button) {
                button.disabled = true;
            }

            setStatus(
                "データ種別を保存しています...",
                "info"
            );

            try {
                await persistConfirmedDocumentType(
                    profile.type
                );

                confirmedDocumentType =
                    profile.type;
                selectedSemanticType =
                    null;
                confirmedImportPreviewFingerprint =
                    null;
                confirmedImportPreview =
                    null;
                subjectContextResolution =
                    null;

                renderConfirmation();

                await refreshSubjectContextResolution();
                renderConfirmation();

                setStatus(
                    "データ種別を確認しました: " +
                    profile.label,
                    "success"
                );
            } catch (error) {
                setStatus(
                    "データ種別を確認できませんでした: " +
                    error.message,
                    "error"
                );

                if (button) {
                    button.disabled = false;
                }
            }
        }
    );

    const identitySelect =
        document.getElementById(
            "sourceRecordIdentitySelect"
        );

    identitySelect?.addEventListener(
        "change",
        event => {
            selectedSourceRecordIdentityFieldKey =
                typeof event.currentTarget?.value === "string"
                    ? event.currentTarget.value.trim()
                    : "";
        }
    );

    document.getElementById(
        "sourceRecordIdentityConfirmButton"
    )?.addEventListener(
        "click",
        async () => {
            const sourceFieldKey =
                selectedSourceRecordIdentityFieldKey;

            if (!sourceFieldKey) {
                setStatus(
                    "原本レコードIDにする項目を選択してください。",
                    "error"
                );
                return;
            }

            const button =
                document.getElementById(
                    "sourceRecordIdentityConfirmButton"
                );

            const status =
                document.getElementById(
                    "sourceRecordIdentityStatus"
                );

            if (button) {
                button.disabled = true;
                button.textContent =
                    "全行を検証しています...";
            }

            if (status) {
                status.textContent =
                    "原本全行の欠損・空欄・重複を確認しています...";
                status.style.color =
                    "#667085";
            }

            try {
                const result =
                    await confirmSourceRecordIdentity(
                        sourceFieldKey
                    );

                const sourceEntityCount =
                    result.validation?.sourceEntityCount;

                const uniqueValueCount =
                    result.validation?.uniqueValueCount;

                if (status) {
                    status.textContent =
                        `確認済み：全${sourceEntityCount}件、` +
                        `一意${uniqueValueCount}件`;
                    status.style.color =
                        "#176b36";
                }

                if (button) {
                    button.textContent =
                        "確認済み";
                }

                if (identitySelect) {
                    identitySelect.disabled = true;
                }

                setStatus(
                    "原本レコードIDを確認して保存しました。",
                    "success"
                );
            } catch (error) {
                if (button) {
                    button.disabled = false;
                    button.textContent =
                        "この項目を確認";
                }

                if (status) {
                    const validation =
                        error.validation;

                    status.textContent =
                        validation
                            ? `確認できません：欠損${validation.missingFieldCount ?? 0}件、` +
                                `空欄${validation.blankValueCount ?? 0}件、` +
                                `重複${validation.duplicateValueCount ?? 0}件`
                            : error.message;

                    status.style.color =
                        "#b42318";
                }

                setStatus(
                    `原本レコードIDを確認できませんでした: ${error.message}`,
                    "error"
                );
            }
        }
    );

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
                    !standardMeaning ||
                    !isMeaningAllowedForConfirmedDocumentType(
                        standardMeaning
                    )
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

                const diagnosticMappings =
                    collectConfirmedSourceFieldMappings();

                setStatus(
                    `診断: confirmed=${confirmedSourceFieldSelections.size}, mappings=${diagnosticMappings.length}`,
                    "success"
                );
            });
        });

    importConfirmation
        .querySelectorAll(
            ".source-field-confirm-contextual-candidate"
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
                    !standardMeaning ||
                    !isMeaningAllowedForConfirmedDocumentType(
                        standardMeaning
                    )
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

                setStatus(
                    "文脈からの候補を人が確認しました。",
                    "success"
                );
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

                if (
                    !sourceFieldKey ||
                    (
                        standardMeaning &&
                        !isMeaningAllowedForConfirmedDocumentType(
                            standardMeaning
                        )
                    )
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

                confirmedSourceFieldSelections.delete(
                    selectionKey
                );

                sourceFieldReviewStates.set(
                    selectionKey,
                    "pending"
                );

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
        latestAnalysis.sourceDocumentKey.trim() === "" ||
        typeof latestAnalysis.sourceUpdatedAt !== "string" ||
        latestAnalysis.sourceUpdatedAt.trim() === "" ||
        Number.isNaN(
            Date.parse(latestAnalysis.sourceUpdatedAt)
        ) ||
        !Number.isSafeInteger(
            latestAnalysis.sourceSize
        ) ||
        latestAnalysis.sourceSize < 0
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
            standardMeaning === "" ||
            !isMeaningAllowedForConfirmedDocumentType(
                standardMeaning
            )
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
            sourceUpdatedAt:
                new Date(
                    latestAnalysis.sourceUpdatedAt
                ).toISOString(),
            sourceSize:
                latestAnalysis.sourceSize,
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
                sourceUpdatedAt:
                    new Date(
                        latestAnalysis.sourceUpdatedAt
                    ).toISOString(),
                sourceSize:
                    latestAnalysis.sourceSize,
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
                sourceUpdatedAt:
                    new Date(
                        latestAnalysis.sourceUpdatedAt
                    ).toISOString(),
                sourceSize:
                    latestAnalysis.sourceSize,
                sourceFieldKey,
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null
            }];
        }

        if (
            reviewState === "confirmed" &&
            confirmedSourceFieldSelections.has(
                selectionKey
            )
        ) {
            const confirmedMeaning =
                sourceFieldMeaningSelections.get(
                    selectionKey
                );

            if (
                typeof confirmedMeaning !== "string" ||
                !confirmedMeaning.trim() ||
                !isMeaningAllowedForConfirmedDocumentType(
                    confirmedMeaning.trim()
                )
            ) {
                return [];
            }

            return [{
                sourceDocumentKey:
                    latestAnalysis.sourceDocumentKey.trim(),
                sourceUpdatedAt:
                    new Date(
                        latestAnalysis.sourceUpdatedAt
                    ).toISOString(),
                sourceSize:
                    latestAnalysis.sourceSize,
                sourceFieldKey,
                interpretationStatus:
                    "confirmed",
                mappingStatus:
                    "mapped",
                confirmedMeaning:
                    confirmedMeaning.trim()
            }];
        }

        return [];
    });
}

async function persistAnalyzedSourceDocumentSnapshot() {
    if (
        typeof selectedFilePath !== "string" ||
        selectedFilePath.trim() === "" ||
        !latestAnalysis ||
        typeof latestAnalysis.sourceDocumentKey !== "string" ||
        latestAnalysis.sourceDocumentKey.trim() === "" ||
        typeof latestAnalysis.sourceUpdatedAt !== "string" ||
        latestAnalysis.sourceUpdatedAt.trim() === "" ||
        Number.isNaN(
            Date.parse(
                latestAnalysis.sourceUpdatedAt
            )
        ) ||
        !Number.isSafeInteger(
            latestAnalysis.sourceSize
        ) ||
        latestAnalysis.sourceSize < 0
    ) {
        throw new Error(
            "解析済み原本の確認情報が不正です。もう一度解析してください。"
        );
    }

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/files/${encodeURIComponent(
                selectedFilePath.trim()
            )}/source-document`,
            {
                method: "POST",
                headers: {
                    "content-type":
                        "application/json"
                },
                body:
                    JSON.stringify({
                        sourceDocumentKey:
                            latestAnalysis
                                .sourceDocumentKey
                                .trim(),
                        sourceUpdatedAt:
                            new Date(
                                latestAnalysis
                                    .sourceUpdatedAt
                            ).toISOString(),
                        sourceSize:
                            latestAnalysis
                                .sourceSize
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

    if (!response.ok) {
        const error =
            new Error(
                response.status === 409
                    ? "原本ファイルが更新されています。もう一度解析してください。"
                    : result?.message ||
                        "原本ファイルの保存に失敗しました。"
            );

        error.httpStatus =
            response.status;

        if (response.status === 409) {
            error.code =
                "source_snapshot_changed";
        }

        throw error;
    }

    if (
        !result ||
        result.success !== true ||
        ![
            "created",
            "updated",
            "unchanged"
        ].includes(result.status)
    ) {
        throw new Error(
            "原本ファイルの保存結果が不正です。"
        );
    }

    return result;
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
            const safeFieldKey =
                typeof sourceFieldInterpretation?.sourceFieldKey === "string"
                    ? sourceFieldInterpretation.sourceFieldKey.trim()
                    : "unknown";

            const error =
                new Error(
                    `${result?.message || "項目確認状態の保存に失敗しました"} ` +
                    `(field=${safeFieldKey}, HTTP ${response.status})`
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

function getResidentLinkingSnapshot() {
    if (
        !latestAnalysis ||
        typeof latestAnalysis.sourceDocumentKey !== "string" ||
        !latestAnalysis.sourceDocumentKey.trim() ||
        typeof latestAnalysis.sourceUpdatedAt !== "string" ||
        !latestAnalysis.sourceUpdatedAt.trim() ||
        Number.isNaN(
            Date.parse(latestAnalysis.sourceUpdatedAt)
        ) ||
        !Number.isSafeInteger(
            latestAnalysis.sourceSize
        ) ||
        latestAnalysis.sourceSize < 0
    ) {
        throw new Error(
            "現在のファイル状態を確認できません"
        );
    }

    return {
        sourceDocumentKey:
            latestAnalysis.sourceDocumentKey.trim(),
        sourceUpdatedAt:
            new Date(
                latestAnalysis.sourceUpdatedAt
            ).toISOString(),
        sourceSize:
            latestAnalysis.sourceSize
    };
}

async function loadPersistedResidentLinks(snapshot) {
    const params =
        new URLSearchParams({
            sourceDocumentKey:
                snapshot.sourceDocumentKey,
            sourceUpdatedAt:
                snapshot.sourceUpdatedAt,
            sourceSize:
                String(snapshot.sourceSize)
        });

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-resident-links?${params}`
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
        result.status !== "found" ||
        !Array.isArray(result.links)
    ) {
        throw new Error(
            result?.message ||
            "保存済みの利用者紐付けを取得できませんでした"
        );
    }

    return result.links;
}

async function loadPersistedSourceResidentMappings(
    snapshot
) {
    const params =
        new URLSearchParams({
            sourceDocumentKey:
                snapshot.sourceDocumentKey,
            sourceUpdatedAt:
                snapshot.sourceUpdatedAt,
            sourceSize:
                String(snapshot.sourceSize)
        });

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-resident-mappings?${params}`
        );

    const result =
        await response
            .json()
            .catch(() => null);

    if (
        !response.ok ||
        !result ||
        result.success !== true ||
        result.status !== "found" ||
        !Array.isArray(result.mappings)
    ) {
        throw new Error(
            result?.message ||
            "保存済みの利用者マッピングを取得できませんでした"
        );
    }

    sourceResidentMappings.clear();

    for (const mapping of result.mappings) {
        if (
            !mapping ||
            !["user_code", "name"].includes(
                mapping.identifierType
            ) ||
            !/^[0-9a-f]{64}$/.test(
                mapping.identifierDigest || ""
            ) ||
            ![
                "confirmed",
                "deferred",
                "no_match"
            ].includes(mapping.mappingStatus)
        ) {
            continue;
        }

        sourceResidentMappings.set(
            createSourceResidentMappingKey(
                mapping.identifierType,
                mapping.identifierDigest
            ),
            mapping
        );
    }
}

async function loadResidentCandidateGroups(
    snapshot
) {
    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/resident-candidate-groups`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify({
                        sourceDocumentKey:
                            snapshot.sourceDocumentKey,
                        sourceUpdatedAt:
                            snapshot.sourceUpdatedAt,
                        sourceSize:
                            snapshot.sourceSize
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
        !["user_code", "name"].includes(
            result.identifierType
        ) ||
        !Number.isSafeInteger(
            result.sourceEntityCount
        ) ||
        !Number.isSafeInteger(
            result.unavailableSourceEntityCount
        ) ||
        !Array.isArray(result.groups)
    ) {
        const error = new Error(
            result?.message ||
            "利用者候補グループを取得できませんでした"
        );

        error.code =
            typeof result?.errorCode === "string"
                ? result.errorCode
                : null;

        error.identityReason =
            typeof result?.identityReason === "string"
                ? result.identityReason
                : null;

        throw error;
    }

    if (
        result.identityDiagnostic &&
        typeof result.identityDiagnostic === "object"
    ) {
        console.log(
            "STEP4 identity diagnostic",
            {
                fieldDefinitionMatched:
                    result.identityDiagnostic.fieldDefinitionMatched === true,
                mappingHasHeaderLabel:
                    result.identityDiagnostic.mappingHasHeaderLabel === true,
                keyPresentInEverySourceEntity:
                    result.identityDiagnostic.keyPresentInEverySourceEntity === true,
                fieldDefinitionCount:
                    Number.isSafeInteger(
                        result.identityDiagnostic.fieldDefinitionCount
                    )
                        ? result.identityDiagnostic.fieldDefinitionCount
                        : null
            }
        );
    }

    return result;
}

async function persistSourceResidentLink({
    snapshot,
    sourceEntityKey,
    linkStatus,
    residentId = null
}) {
    if (
        !snapshot ||
        typeof sourceEntityKey !== "string" ||
        !sourceEntityKey.trim()
    ) {
        throw new Error(
            "利用者紐付けの保存対象が不正です"
        );
    }

    if (
        linkStatus !== "confirmed" &&
        linkStatus !== "deferred" &&
        linkStatus !== "no_match"
    ) {
        throw new Error(
            "利用者紐付けの確認状態が不正です"
        );
    }

    if (
        linkStatus === "confirmed" &&
        (
            typeof residentId !== "string" ||
            !residentId.trim()
        )
    ) {
        throw new Error(
            "確定する利用者を取得できません"
        );
    }

    if (
        linkStatus !== "confirmed" &&
        residentId !== null
    ) {
        throw new Error(
            "保留または該当なしに利用者IDは指定できません"
        );
    }

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-resident-links`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify({
                        sourceDocumentKey:
                            snapshot.sourceDocumentKey,
                        sourceEntityKey:
                            sourceEntityKey.trim(),
                        linkStatus,
                        residentId:
                            linkStatus === "confirmed"
                                ? residentId.trim()
                                : null,
                        sourceUpdatedAt:
                            snapshot.sourceUpdatedAt,
                        sourceSize:
                            snapshot.sourceSize
                    })
            }
        );

    const result =
        await response
            .json()
            .catch(() => ({}));

    if (!response.ok || result?.success === false) {
        throw new Error(
            result?.message ||
            result?.error ||
            `利用者紐付けの保存に失敗しました (${response.status})`
        );
    }

    return result;
}

async function persistResidentAdmissionDecision({
    snapshot,
    identifierType,
    identifierDigest,
    decision
}) {
    if (
        !snapshot ||
        !["user_code", "name"].includes(identifierType) ||
        !/^[0-9a-f]{64}$/.test(identifierDigest) ||
        ![
            "approved_new",
            "rejected",
            "deferred"
        ].includes(decision)
    ) {
        throw new Error(
            "利用者登録判断の保存対象が不正です"
        );
    }

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/resident-admission-decisions`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify({
                        sourceDocumentKey:
                            snapshot.sourceDocumentKey,
                        sourceUpdatedAt:
                            snapshot.sourceUpdatedAt,
                        sourceSize:
                            snapshot.sourceSize,
                        identifierType,
                        identifierDigest,
                        decision
                    })
            }
        );

    const result =
        await response
            .json()
            .catch(() => ({}));

    if (
        !response.ok ||
        result?.success !== true ||
        result?.status !== "decided" ||
        result?.decision !== decision ||
        ![
            "created",
            "updated",
            "unchanged"
        ].includes(result.persistenceStatus)
    ) {
        throw new Error(
            result?.message ||
            `利用者登録判断の保存に失敗しました (${response.status})`
        );
    }

    return {
        decision:
            result.decision,
        persistenceStatus:
            result.persistenceStatus
    };
}

async function loadResidentAdmissionDecision({
    snapshot,
    identifierType,
    identifierDigest
}) {
    if (
        !snapshot ||
        !["user_code", "name"].includes(identifierType) ||
        !/^[0-9a-f]{64}$/.test(identifierDigest)
    ) {
        throw new Error(
            "利用者登録判断の取得対象が不正です"
        );
    }

    const params =
        new URLSearchParams({
            sourceDocumentKey:
                snapshot.sourceDocumentKey,
            sourceUpdatedAt:
                snapshot.sourceUpdatedAt,
            sourceSize:
                String(snapshot.sourceSize),
            identifierType,
            identifierDigest
        });

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/resident-admission-decisions?${params}`
        );

    const result =
        await response
            .json()
            .catch(() => ({}));

    if (
        !response.ok ||
        result?.success !== true ||
        !["found", "not_found"].includes(
            result.status
        )
    ) {
        throw new Error(
            result?.message ||
            `利用者登録判断の取得に失敗しました (${response.status})`
        );
    }

    if (result.status === "not_found") {
        return null;
    }

    if (
        !result.decision ||
        ![
            "approved_new",
            "rejected",
            "deferred"
        ].includes(result.decision.decision)
    ) {
        throw new Error(
            "保存済みの利用者登録判断が不正です"
        );
    }

    return {
        decision:
            result.decision.decision,
        reviewedAt:
            result.decision.reviewedAt
    };
}


async function persistSourceResidentMapping({
    snapshot,
    identifierType,
    identifierDigest,
    mappingStatus,
    residentId = null
}) {
    if (
        !snapshot ||
        !["user_code", "name"].includes(identifierType) ||
        !/^[0-9a-f]{64}$/.test(identifierDigest) ||
        ![
            "confirmed",
            "deferred",
            "no_match"
        ].includes(mappingStatus)
    ) {
        throw new Error(
            "利用者マッピングの保存対象が不正です"
        );
    }

    if (
        mappingStatus === "confirmed" &&
        (
            typeof residentId !== "string" ||
            !residentId.trim()
        )
    ) {
        throw new Error(
            "確定する利用者を取得できません"
        );
    }

    if (
        mappingStatus !== "confirmed" &&
        residentId !== null
    ) {
        throw new Error(
            "保留または該当なしに利用者IDは指定できません"
        );
    }

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/source-resident-mappings`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify({
                        sourceDocumentKey:
                            snapshot.sourceDocumentKey,
                        identifierType,
                        identifierDigest,
                        mappingStatus,
                        residentId:
                            mappingStatus === "confirmed"
                                ? residentId.trim()
                                : null,
                        sourceUpdatedAt:
                            snapshot.sourceUpdatedAt,
                        sourceSize:
                            snapshot.sourceSize
                    })
            }
        );

    const result =
        await response
            .json()
            .catch(() => ({}));

    if (
        !response.ok ||
        result?.success !== true ||
        !["created", "updated", "unchanged"].includes(
            result.status
        )
    ) {
        throw new Error(
            result?.message ||
            `利用者マッピングの保存に失敗しました (${response.status})`
        );
    }

    return result;
}

function renderResidentMappingState(mapping) {
    if (!mapping) {
        return "";
    }

    if (mapping.mappingStatus === "confirmed") {
        return `
            <div
                style="
                    margin-top: 10px;
                    padding: 10px;
                    background: #f1fbf4;
                    border: 1px solid #86c99a;
                    border-radius: 8px;
                "
            >
                <strong>利用者紐付け確認済み</strong>
                <p class="form-help">
                    人が確認した利用者との紐付けを保存済みです。
                </p>
            </div>
        `;
    }

    if (mapping.mappingStatus === "no_match") {
        return `
            <div
                style="
                    margin-top: 10px;
                    padding: 10px;
                    background: #f7f8fa;
                    border-radius: 8px;
                "
            >
                <strong>該当利用者なしとして確認済み</strong>
            </div>
        `;
    }

    return `
        <div
            style="
                margin-top: 10px;
                padding: 10px;
                background: #fff8e8;
                border-radius: 8px;
            "
        >
            <strong>確認を保留中</strong>
        </div>
    `;
}

function renderResidentCandidateDetails(
    candidateResult,
    mapping = null,
    admissionDecision = null
) {
    const candidates =
        Array.isArray(candidateResult?.candidates)
            ? candidateResult.candidates
            : [];

    const sourceName =
        candidateResult?.identifierType === "name" &&
        typeof candidateResult.identifierValue ===
            "string"
            ? candidateResult.identifierValue.trim()
            : "";

    if (
        mapping?.mappingStatus === "confirmed"
    ) {
        return `
            ${
                sourceName
                    ? `
                        <p style="margin: 0 0 10px;">
                            原本の利用者名:
                            <strong>${escapeHtml(
                                sourceName
                            )}</strong>
                        </p>
                    `
                    : ""
            }
            ${renderResidentMappingState(mapping)}
        `;
    }

    const candidateButtons =
        candidates.map(candidate => {
            const residentId =
                typeof candidate?.residentId === "string"
                    ? candidate.residentId.trim()
                    : "";

            if (!residentId) {
                return "";
            }

            return `
                <div
                    style="
                        margin-top: 10px;
                        padding: 10px;
                        border: 1px solid #e1e7f0;
                        border-radius: 8px;
                    "
                >
                    <p style="margin: 0 0 8px;">
                        <strong>
                            ${escapeHtml(
                                candidate.name || "氏名未設定"
                            )}
                        </strong>
                        ${
                            candidate.userCode
                                ? ` / ${escapeHtml(
                                    candidate.userCode
                                )}`
                                : ""
                        }
                    </p>
                    <button
                        class="primary-button"
                        type="button"
                        data-resident-mapping-action="confirmed"
                        data-resident-id="${escapeHtml(
                            residentId
                        )}"
                    >
                        この利用者に紐付け
                    </button>
                </div>
            `;
        }).join("");

    if (
        candidateResult?.status === "matched" ||
        candidateResult?.status === "ambiguous"
    ) {
        return `
            <div>
                ${
                    sourceName
                        ? `
                            <p style="margin: 0 0 10px;">
                                原本の利用者名:
                                <strong>${escapeHtml(
                                    sourceName
                                )}</strong>
                            </p>
                        `
                        : ""
                }
                <strong>
                    ${
                        candidateResult.status === "matched"
                            ? "候補が1件見つかりました"
                            : "複数の候補があります"
                    }
                </strong>
                <p class="form-help">
                    候補を確認し、紐付ける利用者を選択してください。
                    選択するまで確定しません。
                </p>
                ${candidateButtons}
                <div
                    class="bottom-actions csv-step-actions"
                    style="
                        justify-content: flex-start;
                        margin-top: 12px;
                    "
                >
                    <button
                        class="secondary-button"
                        type="button"
                        data-resident-mapping-action="deferred"
                    >
                        保留
                    </button>
                </div>
            </div>
        `;
    }

    if (
        candidateResult?.status === "not_found" &&
        candidateResult?.identifierType === "name" &&
        sourceName
    ) {
        return `
            <div>
                <p style="margin: 0 0 10px;">
                    原本の利用者名:
                    <strong>${escapeHtml(
                        sourceName
                    )}</strong>
                </p>
                <div
                    style="
                        padding: 12px;
                        background: #fff4e5;
                        border: 1px solid #f0b35a;
                        border-radius: 8px;
                    "
                >
                    <strong>
                        この施設に登録されていない利用者です
                    </strong>
                    <p class="form-help">
                        別施設のデータが、この施設のパソコンに
                        混入している可能性があります。
                        登録を進める前に、パソコン内の元データが
                        保存されているフォルダを確認してください。
                    </p>
                    <p class="form-help">
                        現在は安全のため、この画面から
                        新規利用者を登録しません。
                    </p>
                </div>
                ${
                    mapping?.mappingStatus === "no_match"
                        ? `
                            <p class="form-help" style="color: #9a6700;">
                                以前「該当利用者なし」と確認されていますが、
                                日次記録には利用者の確定が必要なため
                                未解決として扱います。
                            </p>
                        `
                        : mapping?.mappingStatus === "deferred"
                            ? `
                                <p class="form-help" style="color: #9a6700;">
                                    現在、この利用者は確認保留中です。
                                </p>
                            `
                            : ""
                }
                ${
                    admissionDecision?.decision === "approved_new"
                        ? `
                            <div style="margin-top: 10px; padding: 10px; background: #eef8f1; border-radius: 8px;">
                                <strong>新規利用者として登録予定</strong>
                                <p class="form-help">まだ利用者登録は行っていません。</p>
                            </div>
                        `
                        : admissionDecision?.decision === "rejected"
                            ? `
                                <div style="margin-top: 10px; padding: 10px; background: #fff1f0; border-radius: 8px;">
                                    <strong>このデータは取り込まない</strong>
                                </div>
                            `
                            : admissionDecision?.decision === "deferred"
                                ? `
                                    <div style="margin-top: 10px; padding: 10px; background: #fff8e8; border-radius: 8px;">
                                        <strong>確認を保留中</strong>
                                    </div>
                                `
                                : ""
                }
                <p class="form-help">
                    この施設の利用者として扱ってよいか、
                    元データを確認したうえで選択してください。
                    ここではまだ利用者登録は行いません。
                </p>
                <div
                    class="bottom-actions csv-step-actions"
                    style="
                        justify-content: flex-start;
                        margin-top: 12px;
                        flex-wrap: wrap;
                    "
                >
                    <button
                        class="primary-button"
                        type="button"
                        data-resident-admission-action="approved_new"
                        ${admissionDecision?.decision === "approved_new" ? "disabled" : ""}
                    >
                        ${admissionDecision?.decision === "approved_new" ? "✓ 新規利用者として登録予定" : "この施設の新規利用者として登録予定"}
                    </button>
                    <button
                        class="secondary-button"
                        type="button"
                        data-resident-admission-action="rejected"
                        ${admissionDecision?.decision === "rejected" ? "disabled" : ""}
                    >
                        ${admissionDecision?.decision === "rejected" ? "✓ このデータは取り込まない" : "このデータは取り込まない"}
                    </button>
                    <button
                        class="secondary-button"
                        type="button"
                        data-resident-admission-action="deferred"
                        ${admissionDecision?.decision === "deferred" ? "disabled" : ""}
                    >
                        ${admissionDecision?.decision === "deferred" ? "✓ 保留中" : "保留"}
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div>
            <strong>利用者を確定できません</strong>
            <p class="form-help">
                利用者識別情報を確認してください。
            </p>
        </div>
    `;
}
async function loadImportPreview() {
    const snapshot =
        getResidentLinkingSnapshot();

    const explicitSemanticProjectionType =
        window.RisenSemanticProjectionPolicy
            ?.resolveExplicitSemanticProjectionType(
                selectedSemanticType
            ) || null;

    const payload =
        explicitSemanticProjectionType
            ? {
                ...snapshot,
                semanticType:
                    explicitSemanticProjectionType
            }
            : snapshot;

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/import-preview`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify(payload)
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
        !["ready", "blocked", "preview_only"].includes(
            result.status
        )
    ) {
        throw new Error(
            result?.message ||
            "取り込みプレビューを確認できませんでした"
        );
    }

    if (
        explicitSemanticProjectionType &&
        result.semanticType !==
            explicitSemanticProjectionType
    ) {
        throw new Error(
            "取り込み対象とプレビューの意味種別が一致しません"
        );
    }

    return result;
}

async function executeConfirmedImport(
    executionSemanticType
) {
    if (
        !["support_record", "recipient_certificate"].includes(
            executionSemanticType
        ) ||
        !latestAnalysis ||
        typeof latestAnalysis.sourceDocumentKey !== "string" ||
        !latestAnalysis.sourceDocumentKey.trim() ||
        typeof latestAnalysis.sourceUpdatedAt !== "string" ||
        !latestAnalysis.sourceUpdatedAt.trim() ||
        !Number.isSafeInteger(latestAnalysis.sourceSize) ||
        latestAnalysis.sourceSize < 0 ||
        typeof confirmedImportPreviewFingerprint !== "string" ||
        !/^[0-9a-f]{64}$/.test(
            confirmedImportPreviewFingerprint
        )
    ) {
        throw new Error(
            "最終確定する取り込み条件を確認できません"
        );
    }

    const payload = {
        sourceDocumentKey:
            latestAnalysis.sourceDocumentKey.trim(),
        sourceUpdatedAt:
            new Date(
                latestAnalysis.sourceUpdatedAt
            ).toISOString(),
        sourceSize:
            latestAnalysis.sourceSize,
        expectedFingerprint:
            confirmedImportPreviewFingerprint
    };

    const explicitSemanticProjectionType =
        window.RisenSemanticProjectionPolicy
            ?.resolveExplicitSemanticProjectionType(
                selectedSemanticType
            ) || null;

    if (explicitSemanticProjectionType) {
        if (
            explicitSemanticProjectionType !==
                executionSemanticType
        ) {
            throw new Error(
                "確認済みの取り込み対象と最終確定条件が一致しません"
            );
        }

        payload.semanticType =
            explicitSemanticProjectionType;
    }

    const response =
        await fetch(
            `${LOCAL_CONNECTOR_BASE}/import-execute`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body:
                    JSON.stringify(payload)
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
        response.ok &&
        result?.success === true &&
        result.status === "completed" &&
        Number.isSafeInteger(result.processed) &&
        Number.isSafeInteger(result.created) &&
        Number.isSafeInteger(result.updated) &&
        (
            (
                executionSemanticType ===
                    "support_record" &&
                Number.isSafeInteger(
                    result.alreadyApplied
                )
            ) ||
            (
                executionSemanticType ===
                    "recipient_certificate" &&
                Number.isSafeInteger(
                    result.unchanged
                ) &&
                Number.isSafeInteger(
                    result.residentsCreated
                )
            )
        )
    ) {
        return result;
    }

    const error =
        new Error(
            result?.message ||
            "取り込み結果を確認できませんでした"
        );

    error.status =
        typeof result?.status === "string"
            ? result.status
            : "error";

    error.result =
        result;

    throw error;
}

function applyImportPreviewGate(preview) {
    if (!residentLinkingNextButton) {
        return;
    }

    const ready =
        preview?.status === "ready" &&
        Number.isSafeInteger(
            preview.sourceEntityCount
        ) &&
        preview.sourceEntityCount > 0 &&
        preview.readySourceEntityCount ===
            preview.sourceEntityCount &&
        preview.unresolvedResidentCount === 0 &&
        preview.missingResidentNameCount === 0 &&
        Number.isSafeInteger(
            preview.readyRowCount
        ) &&
        preview.readyRowCount ===
            preview.sourceEntityCount &&
        Number.isSafeInteger(
            preview.invalidRowCount
        ) &&
        preview.invalidRowCount === 0 &&
        Number.isSafeInteger(
            preview.newRecordCount
        ) &&
        preview.newRecordCount >= 0 &&
        Number.isSafeInteger(
            preview.unchangedRecordCount
        ) &&
        preview.unchangedRecordCount >= 0 &&
        Number.isSafeInteger(
            preview.updateCandidateCount
        ) &&
        preview.updateCandidateCount >= 0 &&
        Number.isSafeInteger(
            preview.reviewRequiredCount
        ) &&
        preview.reviewRequiredCount === 0 &&
        preview.newRecordCount +
            preview.unchangedRecordCount +
            preview.updateCandidateCount +
            preview.reviewRequiredCount ===
            preview.readyRowCount &&
        Number.isSafeInteger(
            preview.duplicateSourceRecordKeyCount
        ) &&
        preview.duplicateSourceRecordKeyCount === 0;

    residentLinkingNextButton.disabled =
        !ready;

    residentLinkingNextButton.dataset.ready =
        ready ? "true" : "false";
}

async function refreshImportPreviewGate() {
    if (residentLinkingNextButton) {
        residentLinkingNextButton.dataset.ready =
            "false";
    }

    const preview =
        await loadImportPreview();

    applyImportPreviewGate(preview);

    return preview;
}

function renderImportPreviewSummary(preview) {
    if (!importPreviewSummary) {
        return;
    }

    if (preview?.status === "preview_only") {
        const summary =
            preview?.summary &&
            typeof preview.summary === "object"
                ? preview.summary
                : {};

        const existingResidents =
            Number.isSafeInteger(
                summary.existingResidentCount
            )
                ? summary.existingResidentCount
                : 0;

        const plannedNewResidents =
            Number.isSafeInteger(
                summary.plannedNewResidentCount
            )
                ? summary.plannedNewResidentCount
                : 0;

        const excluded =
            Number.isSafeInteger(
                summary.excludedCount
            )
                ? summary.excludedCount
                : 0;

        const deferred =
            Number.isSafeInteger(
                summary.deferredCount
            )
                ? summary.deferredCount
                : 0;

        const undecided =
            Number.isSafeInteger(
                summary.undecidedCount
            )
                ? summary.undecidedCount
                : 0;

        const certificateCreates =
            Number.isSafeInteger(
                summary.recipientCertificateCreateCount
            )
                ? summary.recipientCertificateCreateCount
                : 0;

        const certificateUpdates =
            Number.isSafeInteger(
                summary.recipientCertificateUpdateCount
            )
                ? summary.recipientCertificateUpdateCount
                : 0;

        const certificateUnchanged =
            Number.isSafeInteger(
                summary.recipientCertificateUnchangedCount
            )
                ? summary.recipientCertificateUnchangedCount
                : 0;

        const sourceEntities =
            Number.isSafeInteger(
                preview.sourceEntityCount
            )
                ? preview.sourceEntityCount
                : 0;

        const residentSubjects =
            Number.isSafeInteger(
                preview.residentSubjectCount
            )
                ? preview.residentSubjectCount
                : 0;

        const unavailable =
            Number.isSafeInteger(
                preview.unavailableSourceEntityCount
            )
                ? preview.unavailableSourceEntityCount
                : 0;

        const plannedPeople =
            Array.isArray(preview.items)
                ? preview.items.filter(
                    item =>
                        item &&
                        ["planned_new", "existing"].includes(
                            item.resolution
                        )
                )
                : [];

        const semanticFieldPresentation = {
            "recipient_certificate.certificate_number": {
                label: "受給者証番号",
                role: "登録予定"
            },
            "recipient_certificate.valid_from": {
                label: "有効期間開始日",
                role: "登録予定"
            },
            "recipient_certificate.valid_until": {
                label: "有効期限",
                role: "登録予定"
            },
            "recipient_certificate.municipality": {
                label: "市区町村",
                role: "登録予定"
            },
            "recipient_certificate.support_classification": {
                label: "障害支援区分",
                role: "登録予定"
            },
            "user.birth_date": {
                label: "生年月日",
                role: "本人照合に使用"
            },
            "user.sex": {
                label: "性別",
                role: "本人照合に使用"
            }
        };

        const renderSemanticRecords =
            item => {
                const profileLabels = {
                    name: "氏名",
                    birth_date: "生年月日",
                    gender: "性別",
                    user_code: "利用者コード"
                };

                const profileRows = [];

                if (
                    item?.resolution === "existing" &&
                    item?.residentProfileComparison
                ) {
                    const comparison =
                        item.residentProfileComparison;

                    for (
                        const field of [
                            "name",
                            "birth_date",
                            "gender",
                            "user_code"
                        ]
                    ) {
                        if (
                            Object.hasOwn(
                                comparison.fill || {},
                                field
                            )
                        ) {
                            profileRows.push({
                                label: profileLabels[field],
                                value:
                                    `未登録 → ${
                                        comparison.fill[field]
                                    }`,
                                role: "補完予定"
                            });
                            continue;
                        }

                        if (
                            Object.hasOwn(
                                comparison.unchanged || {},
                                field
                            )
                        ) {
                            profileRows.push({
                                label: profileLabels[field],
                                value: String(
                                    comparison.unchanged[field]
                                ),
                                role: "変更なし"
                            });
                            continue;
                        }

                        if (
                            Object.hasOwn(
                                comparison.conflicts || {},
                                field
                            )
                        ) {
                            const conflict =
                                comparison.conflicts[field];

                            const currentValue =
                                conflict?.current ??
                                conflict?.currentValue ??
                                "未登録";

                            const incomingValue =
                                conflict?.incoming ??
                                conflict?.incomingValue ??
                                conflict?.source ??
                                "不明";

                            profileRows.push({
                                label: profileLabels[field],
                                value:
                                    `現在 ${currentValue} / 取込 ${incomingValue}`,
                                role: "競合"
                            });
                        }
                    }
                }

                const persistenceRole =
                    item?.persistenceAction === "create"
                        ? "新規登録予定"
                        : item?.persistenceAction === "update"
                            ? "更新予定"
                            : item?.persistenceAction === "unchanged"
                                ? "変更なし"
                                : "状態未確定";

                const records =
                    Array.isArray(item.semanticRecords)
                        ? item.semanticRecords
                        : [];

                const rows = [...profileRows];

                for (const record of records) {
                    const values =
                        record?.semanticValues &&
                        typeof record.semanticValues === "object" &&
                        !Array.isArray(record.semanticValues)
                            ? record.semanticValues
                            : {};

                    for (
                        const [meaning, rawValue]
                        of Object.entries(values)
                    ) {
                        if (
                            meaning === "user.name" ||
                            rawValue === null ||
                            rawValue === undefined ||
                            String(rawValue).trim() === ""
                        ) {
                            continue;
                        }

                        const presentation =
                            semanticFieldPresentation[meaning];

                        if (!presentation) {
                            continue;
                        }

                        rows.push({
                            meaning,
                            label: presentation.label,
                                role:
                                    meaning.startsWith("recipient_certificate.")
                                        ? persistenceRole
                                        : presentation.role,
                            value: String(rawValue).trim()
                        });
                    }
                }

                if (rows.length === 0) {
                    return `
                        <p class="form-help">
                            確認済みの登録項目はありません。
                        </p>
                    `;
                }

                return `
                    <div class="recipient-certificate-preview-fields">
                        ${rows.map(row => `
                            <div class="recipient-certificate-preview-field">
                                <span class="recipient-certificate-preview-label">
                                    ${escapeHtml(row.label)}
                                </span>
                                <strong class="recipient-certificate-preview-value">
                                    ${escapeHtml(row.value)}
                                </strong>
                                <span class="recipient-certificate-preview-role">
                                    ${escapeHtml(row.role)}
                                </span>
                            </div>
                        `).join("")}
                    </div>
                `;
            };

        const plannedPeopleHtml =
            plannedPeople.length > 0
                ? `
                    <div class="import-preview-people">
                        <strong>登録予定の利用者</strong>
                        ${plannedPeople.map(item => {
                            const name =
                                typeof item.displayName === "string" &&
                                item.displayName.trim()
                                    ? escapeHtml(
                                        item.displayName.trim()
                                    )
                                    : "氏名表示なし";

                            const residentLabel =
                                item.resolution === "planned_new"
                                    ? "新規利用者として登録予定"
                                    : "既存利用者";

                            return `
                                <div class="recipient-certificate-preview-person">
                                    <div class="recipient-certificate-preview-person-head">
                                        <strong>${name}</strong>
                                        <span>
                                            ${residentLabel}
                                        </span>
                                    </div>
                                    ${renderSemanticRecords(item)}
                                </div>
                            `;
                        }).join("")}
                    </div>
                `
                : "";

        importPreviewSummary.innerHTML = `
            <strong>
                受給者証の取り込み予定を確認できます
            </strong>
            <p class="form-help">
                原本行: ${sourceEntities}件<br>
                利用者: ${residentSubjects}件<br>
                既存利用者に紐付け済み:
                ${existingResidents}件<br>
                新規利用者登録予定:
                ${plannedNewResidents}件<br>
                取り込み対象外:
                ${excluded}件<br>
                保留:
                ${deferred}件<br>
                未確認:
                ${undecided}件<br>
                識別情報なし:
                ${unavailable}件<br>
                受給者証新規:
                ${certificateCreates}件<br>
                受給者証更新:
                ${certificateUpdates}件<br>
                変更なし:
                ${certificateUnchanged}件
            </p>
            <p class="form-help">
                これは確認用プレビューです。
                まだ利用者登録・受給者証登録は行いません。
                内容を確認後、最終確定へ進めます。
            </p>
            ${plannedPeopleHtml}
        `;
        return;
    }

    const total =
        Number.isSafeInteger(
            preview?.sourceEntityCount
        )
            ? preview.sourceEntityCount
            : 0;

    const ready =
        Number.isSafeInteger(
            preview?.readySourceEntityCount
        )
            ? preview.readySourceEntityCount
            : 0;

    const unresolved =
        Number.isSafeInteger(
            preview?.unresolvedResidentCount
        )
            ? preview.unresolvedResidentCount
            : 0;

    const missingName =
        Number.isSafeInteger(
            preview?.missingResidentNameCount
        )
            ? preview.missingResidentNameCount
            : 0;

    const readyRows =
        Number.isSafeInteger(
            preview?.readyRowCount
        )
            ? preview.readyRowCount
            : 0;

    const invalidRows =
        Number.isSafeInteger(
            preview?.invalidRowCount
        )
            ? preview.invalidRowCount
            : 0;

    const newRecords =
        Number.isSafeInteger(
            preview?.newRecordCount
        )
            ? preview.newRecordCount
            : 0;

    const unchangedRecords =
        Number.isSafeInteger(
            preview?.unchangedRecordCount
        )
            ? preview.unchangedRecordCount
            : 0;

    const updateCandidates =
        Number.isSafeInteger(
            preview?.updateCandidateCount
        )
            ? preview.updateCandidateCount
            : 0;

    const reviewRequired =
        Number.isSafeInteger(
            preview?.reviewRequiredCount
        )
            ? preview.reviewRequiredCount
            : 0;

    const previewBatches =
        Number.isSafeInteger(
            preview?.semanticPreviewBatchCount
        )
            ? preview.semanticPreviewBatchCount
            : 0;

    const duplicateSourceRecordKeys =
        Number.isSafeInteger(
            preview?.duplicateSourceRecordKeyCount
        )
            ? preview.duplicateSourceRecordKeyCount
            : 0;

    const invalidReasons =
        preview?.invalidReasons &&
        typeof preview.invalidReasons === "object" &&
        !Array.isArray(preview.invalidReasons)
            ? preview.invalidReasons
            : {};

    const invalidReasonLabels = {
        resident_name_missing:
            "利用者名欠損",
        record_date_missing:
            "記録日時欠損",
        record_content_missing:
            "支援記録本文欠損",
        resident_id_unresolved:
            "利用者未確定",
        source_record_identity_duplicate:
            "原本レコードID重複"
    };

    const invalidReasonLines =
        Object.entries(invalidReasons)
            .filter(
                ([, count]) =>
                    Number.isSafeInteger(count) &&
                    count > 0
            )
            .map(
                ([reason, count]) =>
                    `${
                        invalidReasonLabels[reason] ||
                        escapeHtml(reason)
                    }: ${count}件`
            );

    importPreviewSummary.innerHTML = `
        <strong>
            ${
                preview?.status === "ready"
                    ? "取り込み準備が整いました"
                    : "取り込み前の確認が必要です"
            }
        </strong>
        <p class="form-help">
            原本行: ${total}件<br>
            利用者確定済み: ${ready}件<br>
            利用者未確定: ${unresolved}件<br>
            利用者名欠損: ${missingName}件<br>
            取り込み可能: ${readyRows}件<br>
            新規: ${newRecords}件<br>
            変更なし: ${unchangedRecords}件<br>
            更新候補: ${updateCandidates}件<br>
            要確認: ${reviewRequired}件<br>
            原本レコードID重複: ${duplicateSourceRecordKeys}件<br>
            照合バッチ: ${previewBatches}件<br>
            取り込み不可: ${invalidRows}件
            ${
                invalidReasonLines.length > 0
                    ? `<br>${invalidReasonLines.join("<br>")}`
                    : ""
            }
        </p>
        <p class="form-help">
            このSTEPでは確認のみを行います。
            記録データへの書き込みはまだ行いません。
        </p>
    `;
}

async function openImportPreviewStep() {
    confirmedImportPreviewFingerprint = null;
    confirmedImportPreview = null;

    if (importPreviewNextButton) {
        importPreviewNextButton.disabled = true;
    }

    if (!residentLinkingNextButton) {
        setStatus(
            "利用者紐付けの確認状態を取得できません。",
            "error"
        );
        return;
    }

    if (
        residentLinkingNextButton.dataset.ready !==
            "true"
    ) {
        setStatus(
            "保留・未確認・識別情報なしを解消してから次へ進んでください。",
            "error"
        );
        return;
    }

    showStep(5);

    if (importPreviewSummary) {
        importPreviewSummary.textContent =
            "取り込み内容を確認しています...";
    }

    setStatus(
        "取り込みプレビューを確認しています..."
    );

    try {
        const preview =
            await loadImportPreview();

        applyImportPreviewGate(preview);
        renderImportPreviewSummary(preview);

        if (
            preview.status === "preview_only" &&
            preview.executionAvailable === false
        ) {
            confirmedImportPreviewFingerprint = null;
            confirmedImportPreview = preview;

            if (importPreviewNextButton) {
                importPreviewNextButton.disabled =
                    true;
            }

            setStatus(
                "受給者証の取り込み予定を確認できます。まだ最終確定は行いません。",
                "success"
            );
            return;
        }

        const previewExecutionSemanticType =
            getConfirmedExecutionSemanticType(
                preview
            );

        const previewExecutionAuthorized =
            (
                previewExecutionSemanticType ===
                    "support_record" &&
                preview.status === "ready"
            ) ||
            (
                previewExecutionSemanticType ===
                    "recipient_certificate" &&
                preview.status === "preview_only" &&
                preview.executionAvailable === true
            );

        if (
            !previewExecutionAuthorized ||
            typeof preview.previewFingerprint !==
                "string" ||
            !/^[0-9a-f]{64}$/.test(
                preview.previewFingerprint
            )
        ) {
            confirmedImportPreviewFingerprint = null;
            confirmedImportPreview = null;
            showStep(4);

            setStatus(
                "利用者紐付けの状態が変わりました。再確認してください。",
                "error"
            );
            return;
        }

        confirmedImportPreviewFingerprint =
            preview.previewFingerprint;
        confirmedImportPreview =
            preview;

        if (importPreviewNextButton) {
            importPreviewNextButton.disabled =
                false;
        }

        setStatus(
            "取り込みプレビューを確認しました。記録データへの書き込みはまだ行っていません。",
            "success"
        );
    } catch (error) {
        confirmedImportPreviewFingerprint = null;
        confirmedImportPreview = null;
        showStep(4);

        setStatus(
            `取り込みプレビューの確認に失敗しました: ${error.message}`,
            "error"
        );
    }
}

async function renderResidentLinking() {
    if (
        !residentLinkingSummary ||
        !residentLinkingList
    ) {
        return;
    }

    const sourceEntities =
        Array.isArray(
            latestAnalysis?.extracted?.sourceEntities
        )
            ? latestAnalysis.extracted.sourceEntities
            : [];

    if (sourceEntities.length === 0) {
        throw new Error(
            "利用者紐付けの対象行を取得できません"
        );
    }

    const snapshot =
        getResidentLinkingSnapshot();

    residentLinkingSummary.innerHTML = `
        <strong>利用者候補を確認しています</strong>
        <p class="form-help">
            ${sourceEntities.length}件の原本行を、
            同じ利用者識別値ごとにまとめて確認します。
            候補が見つかっても、人が確認するまで
            紐付けは確定しません。
        </p>
    `;

    residentLinkingList.textContent =
        "利用者候補を取得しています...";

    const [
        candidateResult
    ] =
        await Promise.all([
            loadResidentCandidateGroups(
                snapshot
            ),
            loadPersistedSourceResidentMappings(
                snapshot
            )
        ]);

    residentCandidateGroups.clear();

    for (const group of candidateResult.groups) {
        residentCandidateGroups.set(
            createSourceResidentMappingKey(
                group.identifierType,
                group.identifierDigest
            ),
            group
        );
    }

    const residentAdmissionDecisions =
        new Map();

    const admissionGroups =
        candidateResult.groups.filter(
            group =>
                group.status === "not_found" &&
                ["user_code", "name"].includes(
                    group.identifierType
                ) &&
                /^[0-9a-f]{64}$/.test(
                    group.identifierDigest || ""
                )
        );

    const admissionResults =
        await Promise.all(
            admissionGroups.map(
                async group => ({
                    key:
                        createSourceResidentMappingKey(
                            group.identifierType,
                            group.identifierDigest
                        ),
                    decision:
                        await loadResidentAdmissionDecision({
                            snapshot,
                            identifierType:
                                group.identifierType,
                            identifierDigest:
                                group.identifierDigest
                        })
                })
            )
        );

    for (const result of admissionResults) {
        residentAdmissionDecisions.set(
            result.key,
            result.decision
        );
    }

    const admissionSummary = {
        approvedNew: 0,
        rejected: 0,
        deferred: 0,
        undecided: 0
    };

    for (const group of admissionGroups) {
        const key =
            createSourceResidentMappingKey(
                group.identifierType,
                group.identifierDigest
            );

        const decision =
            residentAdmissionDecisions.get(key)
                ?.decision || null;

        if (decision === "approved_new") {
            admissionSummary.approvedNew += 1;
        } else if (decision === "rejected") {
            admissionSummary.rejected += 1;
        } else if (decision === "deferred") {
            admissionSummary.deferred += 1;
        } else {
            admissionSummary.undecided += 1;
        }
    }

    const validAdmissionKeys =
        new Set(
            admissionGroups.map(group =>
                createSourceResidentMappingKey(
                    group.identifierType,
                    group.identifierDigest
                )
            )
        );

    for (const selectedKey of [
        ...selectedResidentAdmissionKeys
    ]) {
        if (!validAdmissionKeys.has(selectedKey)) {
            selectedResidentAdmissionKeys.delete(
                selectedKey
            );
        }
    }

    const rows =
        candidateResult.groups.map(
            group => {
                const key =
                    createSourceResidentMappingKey(
                        group.identifierType,
                        group.identifierDigest
                    );

                const admissionDecision =
                    residentAdmissionDecisions.get(
                        key
                    ) || null;

                const isSelectableAdmission =
                    group.status === "not_found" &&
                    validAdmissionKeys.has(key);

                const selectionHtml =
                    isSelectableAdmission
                        ? `
                            <label
                                style="
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                    margin-bottom: 10px;
                                    font-weight: 600;
                                "
                            >
                                <input
                                    type="checkbox"
                                    data-resident-admission-select
                                    ${
                                        selectedResidentAdmissionKeys.has(
                                            key
                                        )
                                            ? "checked"
                                            : ""
                                    }
                                >
                                この利用者を一括変更の対象にする
                            </label>
                        `
                        : "";

                return `
                    <div
                        style="
                            padding: 14px 0;
                            border-bottom: 1px solid #e1e7f0;
                        "
                    >
                        <div
                            data-resident-identifier-type="${escapeHtml(
                                group.identifierType
                            )}"
                            data-resident-identifier-digest="${escapeHtml(
                                group.identifierDigest
                            )}"
                        >
                            ${selectionHtml}
                            <p class="form-help">
                                原本 ${group.sourceEntityCount}件
                            </p>
                            ${renderResidentCandidateDetails(
                                group,
                                sourceResidentMappings.get(
                                    key
                                ) || null,
                                admissionDecision
                            )}
                        </div>
                    </div>
                `;
            }
        );
    const unavailableMessage =
        candidateResult
            .unavailableSourceEntityCount > 0
            ? candidateResult.identifierType === "name"
                ? `
                    <div
                        style="
                            margin-top: 12px;
                            padding: 12px;
                            border: 1px solid #d92d20;
                            border-radius: 8px;
                            background: #fff5f4;
                            color: #b42318;
                        "
                    >
                        <strong>
                            原本データに利用者名がない行があります
                        </strong>
                        <p class="form-help">
                            ${candidateResult.unavailableSourceEntityCount}件の
                            原本行で利用者名を取得できません。
                            原本データの利用者を確定できないため、
                            この状態では次の取り込み工程へ進めません。
                        </p>
                    </div>
                `
                : `
                    <p class="form-help">
                        識別値を取得できない原本行が
                        ${candidateResult.unavailableSourceEntityCount}件あります。
                        これらは自動では紐付けません。
                    </p>
                `
            : "";

    const residentIdentifierLabel =
        candidateResult.identifierType === "user_code"
            ? "利用者コード"
            : "利用者名";

    const residentIdentifierSourceLabel =
        typeof candidateResult.identifierHeaderLabel === "string" &&
        candidateResult.identifierHeaderLabel.trim()
            ? candidateResult.identifierHeaderLabel.trim()
            : "確認できません";


    residentLinkingSummary.innerHTML = `
        <strong>利用者紐付け</strong>
        <p class="form-help">
            識別方法：${residentIdentifierLabel}<br>
            元データの項目：${escapeHtml(
                residentIdentifierSourceLabel
            )}<br>
            原本：${candidateResult.sourceEntityCount}件 /
            利用者識別グループ：${candidateResult.groups.length}件 /
            識別情報なし：${candidateResult.unavailableSourceEntityCount}件
        </p>
        <p class="form-help">
            同じ識別情報を持つ原本行をまとめて確認します。
            候補はまだ確定ではありません。
        </p>
        ${
            admissionGroups.length > 0
                ? `
                    <div style="
                        margin-top: 12px;
                        padding: 12px;
                        border: 1px solid #d0d5dd;
                        border-radius: 8px;
                        background: #f8fafc;
                    ">
                        <strong>施設未登録利用者の確認状況</strong>
                        <p class="form-help" style="margin-bottom: 0;">
                            新規登録予定：${admissionSummary.approvedNew}件 /
                            取り込まない：${admissionSummary.rejected}件 /
                            保留：${admissionSummary.deferred}件 /
                            未確認：${admissionSummary.undecided}件
                        </p>
                    </div>
                `
                : ""
        }
        ${
            admissionGroups.length > 0
                ? `
                    <div style="
                        margin-top: 12px;
                        padding: 12px;
                        border: 1px solid #98a2b3;
                        border-radius: 8px;
                        background: #ffffff;
                    ">
                        <strong>
                            施設未登録利用者をまとめて変更
                        </strong>
                        <p
                            class="form-help"
                            data-resident-admission-selection-count
                        >
                            選択中：
                            ${selectedResidentAdmissionKeys.size}件
                        </p>
                        <div style="
                            display: flex;
                            flex-wrap: wrap;
                            gap: 8px;
                            margin-bottom: 10px;
                        ">
                            <button
                                type="button"
                                data-resident-admission-select-all
                            >
                                施設未登録利用者を全選択
                            </button>
                            <button
                                type="button"
                                data-resident-admission-clear-selection
                            >
                                選択解除
                            </button>
                        </div>
                        <div style="
                            display: flex;
                            flex-wrap: wrap;
                            gap: 8px;
                        ">
                            <button
                                type="button"
                                data-resident-admission-bulk-action="approved_new"
                                ${
                                    selectedResidentAdmissionKeys.size === 0
                                        ? "disabled"
                                        : ""
                                }
                            >
                                選択した人を新規登録予定
                            </button>
                            <button
                                type="button"
                                data-resident-admission-bulk-action="rejected"
                                ${
                                    selectedResidentAdmissionKeys.size === 0
                                        ? "disabled"
                                        : ""
                                }
                            >
                                選択した人を取り込まない
                            </button>
                            <button
                                type="button"
                                data-resident-admission-bulk-action="deferred"
                                ${
                                    selectedResidentAdmissionKeys.size === 0
                                        ? "disabled"
                                        : ""
                                }
                            >
                                選択した人を保留
                            </button>
                        </div>
                        <p class="form-help" style="margin-bottom: 0;">
                            全選択しただけでは保存されません。
                            判断ボタンを押した時だけ保存します。
                        </p>
                    </div>
                `
                : ""
        }
        ${unavailableMessage}
    `;

    residentLinkingList.innerHTML =
        rows.length > 0
            ? rows.join("")
            : "<p>確認対象がありません。</p>";

    const linkingSummary = {
        existingLinked: 0,
        approvedNew: 0,
        rejected: 0,
        deferred: 0,
        undecided: 0,
        unavailable:
            candidateResult.unavailableSourceEntityCount
    };

    for (const group of candidateResult.groups) {
        const key =
            createSourceResidentMappingKey(
                group.identifierType,
                group.identifierDigest
            );

        const mapping =
            sourceResidentMappings.get(key) || null;

        if (
            mapping &&
            mapping.mappingStatus === "confirmed" &&
            typeof mapping.residentId === "string" &&
            mapping.residentId.trim()
        ) {
            linkingSummary.existingLinked += 1;
            continue;
        }

        if (group.status === "not_found") {
            const decision =
                residentAdmissionDecisions.get(key)
                    ?.decision || null;

            if (decision === "approved_new") {
                linkingSummary.approvedNew += 1;
            } else if (decision === "rejected") {
                linkingSummary.rejected += 1;
            } else if (decision === "deferred") {
                linkingSummary.deferred += 1;
            } else {
                linkingSummary.undecided += 1;
            }

            continue;
        }

        linkingSummary.undecided += 1;
    }

    const residentLinkingReady =
        linkingSummary.deferred === 0 &&
        linkingSummary.undecided === 0 &&
        linkingSummary.unavailable === 0;

    if (residentLinkingNextButton) {
        residentLinkingNextButton.disabled =
            !residentLinkingReady;
        residentLinkingNextButton.dataset.ready =
            residentLinkingReady
                ? "true"
                : "false";
    }

    residentLinkingSummary.innerHTML += `
        <div style="
            margin-top: 12px;
            padding: 12px;
            border: 1px solid #d0d5dd;
            border-radius: 8px;
            background: #f8fafc;
        ">
            <strong>利用者確認の結果</strong>
            <p class="form-help" style="margin-bottom: 0;">
                既存利用者に紐付け済み：
                ${linkingSummary.existingLinked}件<br>
                新規登録予定：
                ${linkingSummary.approvedNew}件<br>
                取り込み対象外：
                ${linkingSummary.rejected}件<br>
                保留：
                ${linkingSummary.deferred}件<br>
                未確認：
                ${linkingSummary.undecided}件<br>
                識別情報なし：
                ${linkingSummary.unavailable}件
            </p>
        </div>
        <p class="form-help">
            ${
                residentLinkingReady
                    ? "利用者の確認が完了しました。次の取り込みプレビューへ進めます。"
                    : "保留・未確認・識別情報なしを解消すると次へ進めます。"
            }
        </p>
    `;

    updateResidentBulkActionBar();
}

async function openResidentLinkingStep() {
    showStep(4);

    if (residentLinkingNextButton) {
        residentLinkingNextButton.disabled = true;
        residentLinkingNextButton.dataset.ready =
            "false";
    }

    setStatus(
        "利用者候補を確認しています..."
    );

    if (residentLinkingSummary) {
        residentLinkingSummary.innerHTML = `
            <strong>利用者候補を確認しています</strong>
            <p class="form-help">
                保存済みの紐付け状態と利用者候補を確認しています。
            </p>
        `;
    }

    if (residentLinkingList) {
        residentLinkingList.textContent =
            "利用者候補を取得しています...";
    }

    try {
        await renderResidentLinking();

        setStatus(
            "利用者候補を確認してください。",
            "success"
        );
    } catch (error) {
        const identityReasonLabels = {
            resident_mapping_missing:
                "利用者識別項目の保存済みマッピングが見つかりません。",
            human_confirmation_missing:
                "利用者識別項目の人による確認結果が見つかりません。",
            confirmed_meaning_mismatch:
                "保存済みマッピングと人による確認結果が一致していません。",
            resident_identity_mapping_ambiguous:
                "利用者識別項目を1つに確定できません。"
        };

        const identityReason =
            identityReasonLabels[
                error?.identityReason
            ] || null;

        const reason =
            error?.code ===
            "resident_identifier_mapping_unavailable"
                ? identityReason ||
                    "STEP 3で利用者名または利用者番号の意味を確認してください。"
                : error?.code ===
                  "source_entities_unavailable"
                    ? "確認対象の原本行を取得できませんでした。"
                    : error?.code ===
                      "resident_candidate_response_invalid"
                        ? "利用者候補の応答内容を安全に確認できませんでした。"
                        : "利用者候補の取得処理を確認できませんでした.";

        setStatus(
            `利用者候補の確認に失敗しました: ${reason}`,
            "error"
        );

        if (residentLinkingList) {
            residentLinkingList.innerHTML = `
                <strong>
                    利用者候補を確認できませんでした
                </strong>
                <p class="form-help">
                    ${escapeHtml(reason)}
                </p>
                <p class="form-help">
                    STEP 3の確認内容は保存済みです。
                    原本データの登録や利用者紐付けの確定は
                    行っていません。
                </p>
            `;
        }
    }
}

analysisBackButton?.addEventListener(
    "click",
    () => showStep(1)
);

analysisConfirmButton?.addEventListener(
    "click",
    async () => {
        if (analysisConfirmButton.disabled) {
            return;
        }

        analysisConfirmButton.disabled = true;

        const originalText =
            analysisConfirmButton.textContent;

        analysisConfirmButton.textContent =
            "確認対象の原本を固定しています...";

        setStatus(
            "解析した時点の原本を確認対象として固定しています..."
        );

        try {
            await persistAnalyzedSourceDocumentSnapshot();

            renderConfirmation();
            showStep(3);

            setStatus(
                "確認対象の原本を固定しました。項目を確認してください。",
                "success"
            );
        } catch (error) {
            setStatus(
                `確認対象の原本を固定できませんでした: ${error.message}`,
                "error"
            );
        } finally {
            analysisConfirmButton.disabled = false;
            analysisConfirmButton.textContent =
                originalText;
        }
    }
);

importBackButton?.addEventListener(
    "click",
    () => showStep(2)
);

residentLinkingBackButton?.addEventListener(
    "click",
    () => showStep(3)
);

residentLinkingNextButton?.addEventListener(
    "click",
    openImportPreviewStep
);

importPreviewBackButton?.addEventListener(
    "click",
    () => {
        confirmedImportPreviewFingerprint = null;
        confirmedImportPreview = null;

        if (importPreviewNextButton) {
            importPreviewNextButton.disabled =
                true;
        }

        showStep(4);
    }
);

importPreviewNextButton?.addEventListener(
    "click",
    () => {
        const executionSemanticType =
            getConfirmedExecutionSemanticType();

        if (
            !confirmedImportPreview ||
            !executionSemanticType ||
            typeof confirmedImportPreviewFingerprint !==
                "string" ||
            !/^[0-9a-f]{64}$/.test(
                confirmedImportPreviewFingerprint
            ) ||
            !(
                (
                    executionSemanticType ===
                        "support_record" &&
                    confirmedImportPreview.status ===
                        "ready"
                ) ||
                (
                    executionSemanticType ===
                        "recipient_certificate" &&
                    confirmedImportPreview.status ===
                        "preview_only" &&
                    confirmedImportPreview
                        .executionAvailable === true
                )
            )
        ) {
            setStatus(
                "取り込みプレビューをもう一度確認してください。",
                "error"
            );
            return;
        }

        let executionSummaryHtml = "";

        if (
            executionSemanticType ===
                "recipient_certificate"
        ) {
            const summary =
                confirmedImportPreview.summary;

            const plannedNewResidents =
                summary?.plannedNewResidentCount;
            const creates =
                summary?.recipientCertificateCreateCount;
            const updates =
                summary?.recipientCertificateUpdateCount;
            const unchanged =
                summary?.recipientCertificateUnchangedCount;

            if (
                !Number.isSafeInteger(plannedNewResidents) ||
                plannedNewResidents < 0 ||
                !Number.isSafeInteger(creates) ||
                creates < 0 ||
                !Number.isSafeInteger(updates) ||
                updates < 0 ||
                !Number.isSafeInteger(unchanged) ||
                unchanged < 0
            ) {
                setStatus(
                    "最終確定する件数を確認できません。",
                    "error"
                );
                return;
            }

            const total =
                creates + updates + unchanged;

            if (total < 1) {
                setStatus(
                    "最終確定する件数を確認できません。",
                    "error"
                );
                return;
            }

            executionSummaryHtml = `
                <strong>この内容を記録データへ取り込みます</strong>
                <p class="form-help">
                    受給者証対象: ${total}件<br>
                    新規利用者: ${plannedNewResidents}件<br>
                    受給者証新規: ${creates}件<br>
                    受給者証更新: ${updates}件<br>
                    変更なし: ${unchanged}件
                </p>
                <p class="form-help">
                    「この内容で取り込む」を押すまでは、
                    記録データへの書き込みは行いません。
                </p>
            `;
        } else {
            const total =
                confirmedImportPreview.sourceEntityCount;
            const newRecords =
                confirmedImportPreview.newRecordCount;
            const updates =
                confirmedImportPreview.updateCandidateCount;
            const unchanged =
                confirmedImportPreview.unchangedRecordCount;

            if (
                !Number.isSafeInteger(total) ||
                total < 1 ||
                !Number.isSafeInteger(newRecords) ||
                newRecords < 0 ||
                !Number.isSafeInteger(updates) ||
                updates < 0 ||
                !Number.isSafeInteger(unchanged) ||
                unchanged < 0
            ) {
                setStatus(
                    "最終確定する件数を確認できません。",
                    "error"
                );
                return;
            }

            executionSummaryHtml = `
                <strong>この内容を記録データへ取り込みます</strong>
                <p class="form-help">
                    対象: ${total}件<br>
                    新規: ${newRecords}件<br>
                    更新: ${updates}件<br>
                    変更なし: ${unchanged}件
                </p>
                <p class="form-help">
                    「この内容で取り込む」を押すまでは、
                    記録データへの書き込みは行いません。
                </p>
            `;
        }

        if (importExecutionSummary) {
            importExecutionSummary.innerHTML =
                executionSummaryHtml;
        }

        if (importExecutionConfirmButton) {
            importExecutionConfirmButton.disabled =
                false;
            importExecutionConfirmButton.textContent =
                "この内容で取り込む";
        }

        showStep(6);

        setStatus(
            "最終確定する取り込み件数を確認してください。"
        );
    }
);

importExecutionBackButton?.addEventListener(
    "click",
    () => {
        if (importExecutionConfirmButton) {
            importExecutionConfirmButton.disabled =
                false;
        }

        importExecutionBackButton.disabled =
            false;

        showStep(5);
        setStatus(
            "取り込みプレビューを確認してください。"
        );
    }
);

importExecutionConfirmButton?.addEventListener(
    "click",
    async () => {
        const executionSemanticType =
            getConfirmedExecutionSemanticType();

        if (
            !confirmedImportPreview ||
            !executionSemanticType ||
            !(
                (
                    executionSemanticType ===
                        "support_record" &&
                    confirmedImportPreview.status ===
                        "ready"
                ) ||
                (
                    executionSemanticType ===
                        "recipient_certificate" &&
                    confirmedImportPreview.status ===
                        "preview_only" &&
                    confirmedImportPreview
                        .executionAvailable === true
                )
            ) ||
            typeof confirmedImportPreviewFingerprint !==
                "string" ||
            !/^[0-9a-f]{64}$/.test(
                confirmedImportPreviewFingerprint
            )
        ) {
            setStatus(
                "取り込みプレビューをもう一度確認してください。",
                "error"
            );
            showStep(5);
            return;
        }

        importExecutionConfirmButton.disabled =
            true;
        importExecutionBackButton.disabled =
            true;

        const originalText =
            importExecutionConfirmButton.textContent;

        importExecutionConfirmButton.textContent =
            "取り込んでいます...";

        setStatus(
            "確認済みの内容を取り込んでいます..."
        );

        try {
            const result =
                await executeConfirmedImport(
                    executionSemanticType
                );

            confirmedImportPreviewFingerprint =
                null;
            confirmedImportPreview =
                null;

            if (importPreviewNextButton) {
                importPreviewNextButton.disabled =
                    true;
            }

            if (importExecutionSummary) {
                const completionDetails =
                    executionSemanticType ===
                        "recipient_certificate"
                        ? `
                            処理済み: ${result.processed}件<br>
                            新規登録: ${result.created}件<br>
                            更新: ${result.updated}件<br>
                            変更なし: ${result.unchanged}件<br>
                            新規利用者: ${result.residentsCreated}件
                        `
                        : `
                            処理済み: ${result.processed}件<br>
                            新規登録: ${result.created}件<br>
                            更新: ${result.updated}件<br>
                            既に反映済み: ${result.alreadyApplied}件
                        `;

                importExecutionSummary.innerHTML = `
                    <strong>取り込みが完了しました</strong>
                    <p class="form-help">
                        ${completionDetails}
                    </p>
                `;
            }

            importExecutionConfirmButton.hidden =
                true;

            importExecutionBackButton.hidden =
                true;

            setStatus(
                "記録データへの取り込みが完了しました。",
                "success"
            );
        } catch (error) {
            const executionFailureStatus =
                typeof error?.status === "string"
                    ? error.status
                    : "error";

            console.error(
                "import_execution_failed",
                {
                    status:
                        executionFailureStatus
                }
            );

            confirmedImportPreviewFingerprint =
                null;
            confirmedImportPreview =
                null;

            if (importPreviewNextButton) {
                importPreviewNextButton.disabled =
                    true;
            }

            importExecutionConfirmButton.textContent =
                originalText;
            importExecutionConfirmButton.disabled =
                true;
            importExecutionBackButton.disabled =
                false;

            try {
                await openImportPreviewStep();

                if (importExecutionConfirmButton) {
                    importExecutionConfirmButton.disabled =
                        false;
                }

                if (importExecutionBackButton) {
                    importExecutionBackButton.disabled =
                        false;
                }

                showStep(5);

                const failureLabel =
                    {
                        stale:
                            "プレビュー条件が変化しました。",
                        blocked:
                            "取り込み条件を確定できませんでした。",
                        invalid:
                            "取り込み条件が不正です。",
                        conflict:
                            "取り込み対象と現在のデータに差異が発生しました。",
                        resident_mismatch:
                            "利用者の紐付けに差異が発生しました。",
                        error:
                            "取り込み結果を確定できませんでした。"
                    }[executionFailureStatus] ||
                    "取り込み結果を確定できませんでした。";

                setStatus(
                    `${failureLabel} 自動再試行は行いません。最新の取り込みプレビューを再取得しました。内容を再確認してください。`,
                    "error"
                );
            } catch (previewError) {
                showStep(4);

                setStatus(
                    `${error.message} 自動再試行は行いません。取り込みプレビューの再取得にも失敗しました: ${previewError.message}`,
                    "error"
                );
            }
        }
    }
);

residentLinkingSummary?.addEventListener(
    "click",
    async event => {
        const selectAllButton =
            event.target.closest(
                "[data-resident-admission-select-all]"
            );

        if (selectAllButton) {
            const checkboxes =
                residentLinkingList.querySelectorAll(
                    "[data-resident-admission-select]"
                );

            selectedResidentAdmissionKeys.clear();

            for (const checkbox of checkboxes) {
                const groupElement =
                    checkbox.closest(
                        "[data-resident-identifier-type][data-resident-identifier-digest]"
                    );

                const identifierType =
                    groupElement?.dataset
                        ?.residentIdentifierType?.trim() ||
                    "";

                const identifierDigest =
                    groupElement?.dataset
                        ?.residentIdentifierDigest?.trim() ||
                    "";

                if (
                    ["user_code", "name"].includes(
                        identifierType
                    ) &&
                    /^[0-9a-f]{64}$/.test(
                        identifierDigest
                    )
                ) {
                    selectedResidentAdmissionKeys.add(
                        createSourceResidentMappingKey(
                            identifierType,
                            identifierDigest
                        )
                    );
                }
            }

            await renderResidentLinking();
            return;
        }

        const clearButton =
            event.target.closest(
                "[data-resident-admission-clear-selection]"
            );

        if (clearButton) {
            selectedResidentAdmissionKeys.clear();
            await renderResidentLinking();
            return;
        }

        const bulkButton =
            event.target.closest(
                "[data-resident-admission-bulk-action]"
            );

        if (!bulkButton) {
            return;
        }

        const decision =
            bulkButton.dataset
                .residentAdmissionBulkAction?.trim() ||
            "";

        if (
            ![
                "approved_new",
                "rejected",
                "deferred"
            ].includes(decision) ||
            selectedResidentAdmissionKeys.size === 0
        ) {
            return;
        }

        const snapshot =
            getResidentLinkingSnapshot();

        const targets =
            [...selectedResidentAdmissionKeys]
                .map(key => ({
                    key,
                    group:
                        residentCandidateGroups.get(key)
                }))
                .filter(
                    item =>
                        item.group &&
                        item.group.status === "not_found"
                );

        if (targets.length === 0) {
            selectedResidentAdmissionKeys.clear();
            await renderResidentLinking();
            return;
        }

        bulkButton.disabled = true;
        confirmedImportPreviewFingerprint = null;
        confirmedImportPreview = null;

        setStatus(
            `${targets.length}件の利用者判断を保存しています...`
        );

        let savedCount = 0;

        try {
            for (const target of targets) {
                await persistResidentAdmissionDecision({
                    snapshot,
                    identifierType:
                        target.group.identifierType,
                    identifierDigest:
                        target.group.identifierDigest,
                    decision
                });

                savedCount += 1;
                selectedResidentAdmissionKeys.delete(
                    target.key
                );
            }

            await renderResidentLinking();

            const decisionLabel =
                decision === "approved_new"
                    ? "新規登録予定"
                    : decision === "rejected"
                        ? "取り込まない"
                        : "保留";

            setStatus(
                `${savedCount}名を「${decisionLabel}」として保存しました。内容を確認し、画面下の「取り込みプレビューへ」を押してください。`,
                "success"
            );
        } catch (error) {
            await renderResidentLinking();

            setStatus(
                `${savedCount}件を保存した後に処理を停止しました: ${error.message}`,
                "error"
            );
        }
    }
);

residentLinkingList?.addEventListener(
    "change",
    async event => {
        const checkbox =
            event.target.closest(
                "[data-resident-admission-select]"
            );

        if (!checkbox) {
            return;
        }

        const groupElement =
            checkbox.closest(
                "[data-resident-identifier-type][data-resident-identifier-digest]"
            );

        const identifierType =
            groupElement?.dataset
                ?.residentIdentifierType?.trim() ||
            "";

        const identifierDigest =
            groupElement?.dataset
                ?.residentIdentifierDigest?.trim() ||
            "";

        if (
            !["user_code", "name"].includes(
                identifierType
            ) ||
            !/^[0-9a-f]{64}$/.test(
                identifierDigest
            )
        ) {
            checkbox.checked = false;
            return;
        }

        const key =
            createSourceResidentMappingKey(
                identifierType,
                identifierDigest
            );

        const group =
            residentCandidateGroups.get(key);

        if (!group || group.status !== "not_found") {
            checkbox.checked = false;
            return;
        }

        if (checkbox.checked) {
            selectedResidentAdmissionKeys.add(key);
        } else {
            selectedResidentAdmissionKeys.delete(key);
        }

        const selectionCount =
            residentLinkingSummary.querySelector(
                "[data-resident-admission-selection-count]"
            );

        if (selectionCount) {
            selectionCount.textContent =
                `選択中：${selectedResidentAdmissionKeys.size}件`;
        }

        const bulkButtons =
            residentLinkingSummary.querySelectorAll(
                "[data-resident-admission-bulk-action]"
            );

        bulkButtons.forEach(item => {
            item.disabled =
                selectedResidentAdmissionKeys.size === 0;
        });

        updateResidentBulkActionBar();
    }
);

residentLinkingList?.addEventListener(
    "click",
    async event => {
        const button =
            event.target.closest(
                "[data-resident-admission-action]"
            );

        if (!button) {
            return;
        }

        const groupElement =
            button.closest(
                "[data-resident-identifier-type][data-resident-identifier-digest]"
            );

        const identifierType =
            groupElement?.dataset
                ?.residentIdentifierType?.trim() ||
            "";

        const identifierDigest =
            groupElement?.dataset
                ?.residentIdentifierDigest?.trim() ||
            "";

        const decision =
            button.dataset
                .residentAdmissionAction?.trim() ||
            "";

        const key =
            createSourceResidentMappingKey(
                identifierType,
                identifierDigest
            );

        const group =
            residentCandidateGroups.get(key);

        if (
            !group ||
            group.status !== "not_found" ||
            !["user_code", "name"].includes(
                identifierType
            ) ||
            !/^[0-9a-f]{64}$/.test(
                identifierDigest
            ) ||
            ![
                "approved_new",
                "rejected",
                "deferred"
            ].includes(decision)
        ) {
            setStatus(
                "利用者登録判断の対象を確認できません。",
                "error"
            );
            return;
        }

        const snapshot =
            getResidentLinkingSnapshot();

        confirmedImportPreviewFingerprint = null;
        confirmedImportPreview = null;

        const buttons =
            groupElement.querySelectorAll(
                "[data-resident-admission-action]"
            );

        buttons.forEach(item => {
            item.disabled = true;
        });

        setStatus(
            decision === "approved_new"
                ? "新規利用者としての登録予定を保存しています..."
                : decision === "rejected"
                    ? "取り込まない判断を保存しています..."
                    : "保留として保存しています..."
        );

        try {
            await persistResidentAdmissionDecision({
                snapshot,
                identifierType,
                identifierDigest,
                decision
            });

            setStatus(
                decision === "approved_new"
                    ? "この施設の新規利用者として登録予定にしました。まだ利用者登録は行っていません。"
                    : decision === "rejected"
                        ? "このデータは取り込まない判断を保存しました。"
                        : "この利用者の確認を保留しました。",
                "success"
            );

            await renderResidentLinking();
        } catch (error) {
            buttons.forEach(item => {
                item.disabled = false;
            });

            setStatus(
                `利用者登録判断の保存に失敗しました: ${error.message}`,
                "error"
            );
        }
    }
);

residentLinkingList?.addEventListener(
    "click",
    async event => {
        const button =
            event.target.closest(
                "[data-resident-mapping-action]"
            );

        if (!button) {
            return;
        }

        const groupElement =
            button.closest(
                "[data-resident-identifier-type][data-resident-identifier-digest]"
            );

        const identifierType =
            groupElement?.dataset
                ?.residentIdentifierType?.trim() ||
            "";

        const identifierDigest =
            groupElement?.dataset
                ?.residentIdentifierDigest?.trim() ||
            "";

        const mappingAction =
            button.dataset.residentMappingAction;

        let mappingStatus =
            mappingAction;

        let residentId =
            mappingStatus === "confirmed"
                ? button.dataset.residentId?.trim() || ""
                : null;

        const key =
            createSourceResidentMappingKey(
                identifierType,
                identifierDigest
            );

        const group =
            residentCandidateGroups.get(key);

        if (
            !group ||
            !["user_code", "name"].includes(
                identifierType
            ) ||
            !/^[0-9a-f]{64}$/.test(
                identifierDigest
            ) ||
            ![
                "confirmed",
                "deferred"
            ].includes(mappingAction) ||
            (
                mappingAction === "confirmed" &&
                !residentId
            )
        ) {
            setStatus(
                "利用者マッピングの保存対象を確認できません。",
                "error"
            );
            return;
        }

        const snapshot =
            getResidentLinkingSnapshot();

        confirmedImportPreviewFingerprint = null;
        confirmedImportPreview = null;
        button.disabled = true;

        setStatus(
            mappingAction === "confirmed"
                ? "利用者紐付けを保存しています..."
                : "保留として保存しています..."
        );

        try {
            await persistSourceResidentMapping({
                snapshot,
                identifierType,
                identifierDigest,
                mappingStatus,
                residentId
            });

            const mapping = {
                identifierType,
                identifierDigest,
                mappingStatus,
                residentId:
                    mappingStatus === "confirmed"
                        ? residentId
                        : null
            };

            sourceResidentMappings.set(
                key,
                mapping
            );

            await renderResidentLinking();

            setStatus(
                mappingStatus === "confirmed"
                    ? "利用者紐付けを確認しました。"
                    : "利用者紐付けを保留しました。",
                "success"
            );
        } catch (error) {
            button.disabled = false;

            setStatus(
                `利用者マッピングの保存に失敗しました: ${error.message}`,
                "error"
            );
        }
    }
);


importReadyButton?.addEventListener(
    "click",
    async () => {
        const mappings =
            collectConfirmedSourceFieldMappings();

        const interpretations =
            collectSourceFieldInterpretations();


        const explicitSemanticProjectionType =
            window.RisenSemanticProjectionPolicy
                ?.resolveExplicitSemanticProjectionType(
                    selectedSemanticType
                ) || null;

        const step3RequirementState =
            explicitSemanticProjectionType
                ? window.RisenSemanticProjectionPolicy
                    .getSemanticProjectionRequirementState(
                        explicitSemanticProjectionType,
                        mappings
                    )
                : window.RisenDocumentTypeProfiles
                    .getStep3RequirementState(
                        confirmedDocumentType,
                        mappings
                    );

        if (
            step3RequirementState.status ===
            "semantic_projection_not_supported"
        ) {
            setStatus(
                "選択した取り込み対象は、まだ取り込み確定に対応していません。",
                "error"
            );

            return;
        }

        if (
            step3RequirementState.status ===
            "document_type_unresolved"
        ) {
            setStatus(
                "STEP 3を確定する前に、データ種別の確認が必要です。",
                "error"
            );

            return;
        }

        if (
            step3RequirementState.status ===
            "document_type_not_supported"
        ) {
            setStatus(
                "このデータ種別は、まだ取り込み確定に対応していません: " +
                step3RequirementState.profile.label,
                "error"
            );

            return;
        }

        if (
            step3RequirementState.status ===
            "required_mapping_missing"
        ) {
            setStatus(
                "STEP 3の必須項目が未確認です: " +
                step3RequirementState
                    .missingRequiredMeanings
                    .map(required => required.label)
                    .join("、"),
                "error"
            );

            return;
        }

        const sourceRecordIdentityRequired =
            explicitSemanticProjectionType
                ? step3RequirementState
                    .sourceRecordIdentityRequired === true
                : step3RequirementState
                    .profile
                    ?.sourceRecordIdentityRequired === true;

        if (
            sourceRecordIdentityRequired &&
            (
                !confirmedSourceRecordIdentity ||
                typeof confirmedSourceRecordIdentity
                    .sourceFieldKey !== "string" ||
                !confirmedSourceRecordIdentity
                    .sourceFieldKey.trim()
            )
        ) {
            setStatus(
                "STEP 3の原本レコードIDが未確認です。原本側で各記録を一意に識別する項目を選択して確認してください。",
                "error"
            );

            return;
        }

        if (
            sourceRecordIdentityRequired
        ) {
            const identityFieldDefinitions =
                Array.isArray(
                    latestAnalysis?.extracted?.fieldDefinitions
                )
                    ? latestAnalysis.extracted.fieldDefinitions
                    : [];

            const confirmedIdentityFieldExists =
                identityFieldDefinitions.some(
                    field =>
                        typeof field?.sourceFieldKey === "string" &&
                        field.sourceFieldKey.trim() ===
                            confirmedSourceRecordIdentity
                                .sourceFieldKey.trim()
                );

            if (!confirmedIdentityFieldExists) {
                setStatus(
                    "確認済みの原本レコードIDが現在の原本構造と一致しません。もう一度確認してください。",
                    "error"
                );

                return;
            }
        }

        importReadyButton.disabled = true;
        importReadyButton.textContent =
            "確認内容を保存しています...";

        let mappingSavedCount = 0;
        let interpretationSavedCount = 0;

        try {
            await persistAnalyzedSourceDocumentSnapshot();

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

            await openResidentLinkingStep();
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
                    ? `${completedCount}件まで保存しましたが、途中で失敗しました。再実行できます。詳細: ${error.message}`
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

function updateResidentBulkActionBar() {
    if (
        !residentBulkActionBar ||
        !residentBulkActionCount
    ) {
        return;
    }

    const selectedCount =
        selectedResidentAdmissionKeys.size;

    residentBulkActionCount.textContent =
        `${selectedCount}人選択中`;

    residentBulkActionBar.hidden =
        selectedCount === 0;
}

residentBulkActionBar?.addEventListener(
    "click",
    event => {
        const clearButton =
            event.target.closest(
                "[data-resident-bulk-fixed-clear]"
            );

        if (clearButton) {
            selectedResidentAdmissionKeys.clear();

            residentLinkingList
                ?.querySelectorAll(
                    "[data-resident-admission-select]"
                )
                .forEach(checkbox => {
                    checkbox.checked = false;
                });

            const selectionCount =
                residentLinkingSummary
                    ?.querySelector(
                        "[data-resident-admission-selection-count]"
                    );

            if (selectionCount) {
                selectionCount.textContent =
                    "選択中：0件";
            }

            const bulkButtons =
                residentLinkingSummary
                    ?.querySelectorAll(
                        "[data-resident-admission-bulk-action]"
                    );

            bulkButtons?.forEach(button => {
                button.disabled = true;
            });

            updateResidentBulkActionBar();
            return;
        }

        const actionButton =
            event.target.closest(
                "[data-resident-bulk-fixed-action]"
            );

        if (!actionButton) {
            return;
        }

        const decision =
            actionButton.dataset
                .residentBulkFixedAction;

        const existingBulkButton =
            residentLinkingSummary
                ?.querySelector(
                    `[data-resident-admission-bulk-action="${decision}"]`
                );

        if (!existingBulkButton) {
            setStatus(
                "一括変更処理を確認できません。",
                "error"
            );
            return;
        }

        existingBulkButton.click();
    }
);
