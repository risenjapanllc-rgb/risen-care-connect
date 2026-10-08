"use strict";

const API_BASE = "/api";

const params = new URLSearchParams(window.location.search);
const selectedTable = params.get("table");
const SOURCE_TABLE = selectedTable || "care_records";

const mappingTableBody = document.querySelector(
    "#mappingTable tbody"
);

const sourceTableName = document.getElementById(
    "sourceTableName"
);

const saveButton = document.getElementById(
    "saveButton"
);


const statusElement = document.getElementById(
    "mappingStatus"
);

let columns = [];
let standardFields = [];
let savedMappings = {};
let sampleRecord = {};

const connectionId =
    sessionStorage.getItem(
        "risenMysqlConnectionId"
    ) || "";


/**
 * APIからJSONを取得する
 */
async function fetchJson(url, options = {}) {
    if (!connectionId) {
        throw new Error(
            "MySQL接続セッションがありません。接続設定からやり直してください"
        );
    }

    const headers = {
        ...(options.headers || {}),
        "x-risen-connection-id":
            connectionId
    };

    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            "サーバーから正しいJSONが返されませんでした"
        );
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            "API処理に失敗しました"
        );
    }

    return data;
}


/**
 * 初期表示
 */
async function initializeMappingPage() {
    sourceTableName.textContent = SOURCE_TABLE;

    setButtonsDisabled(true);

    setStatus(
        "マッピング情報を読み込んでいます...",
        "loading"
    );

    try {
        const [
            columnsData,
            sampleData,
            standardFieldsData,
            mappingsData,
            tableMappingsData
        ] = await Promise.all([
            fetchJson(
                `${API_BASE}/columns/${
                    encodeURIComponent(SOURCE_TABLE)
                }`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        connectionId
                    })
                }
            ),

            fetchJson(
                `${API_BASE}/sample/${
                    encodeURIComponent(SOURCE_TABLE)
                }`
            ),

            fetchJson(
                `${API_BASE}/standard-fields`
            ),

            fetchJson(
                `${API_BASE}/mappings`
            ),

            fetchJson(
                `${API_BASE}/table-mappings/list`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        connectionId
                    })
                }
            )
        ]);

        columns = Array.isArray(columnsData)
            ? columnsData
            : [];

        sampleRecord =
            sampleData &&
            typeof sampleData === "object" &&
            !Array.isArray(sampleData)
                ? sampleData
                : {};

        standardFields =
            Array.isArray(standardFieldsData)
                ? standardFieldsData
                : [];

        const currentTableMapping =
            Array.isArray(tableMappingsData)
                ? tableMappingsData.find(item => {
                    return (
                        item.source_table ===
                        SOURCE_TABLE
                    );
                })
                : null;

        const currentEntity =
            currentTableMapping?.standard_entity ||
            null;

        if (currentEntity) {
            standardFields =
                standardFields.filter(field => {
                    return (
                        field.entity_name ===
                        currentEntity
                    );
                });
        }

        savedMappings =
            createSavedMappingIndex(
                mappingsData
            );

        renderMappingTable();

        setStatus(
            `${columns.length}件のカラムを読み込みました`,
            "success"
        );

    } catch (error) {
        console.error(
            "マッピング画面初期化エラー:",
            error
        );

        renderErrorRow(error.message);

        setStatus(
            `読込に失敗しました：${error.message}`,
            "error"
        );

    } finally {
        setButtonsDisabled(false);
    }
}


/**
 * 保存済みマッピングを
 * source_column単位で参照できる形にする
 */
function createSavedMappingIndex(mappingData) {
    const index = {};

    if (!Array.isArray(mappingData)) {
        return index;
    }

    mappingData
        .filter(mapping => {
            return (
                mapping.source_table ===
                SOURCE_TABLE
            );
        })
        .forEach(mapping => {
            index[mapping.source_column] = {
                id: Number(mapping.id),

                standardFieldId: Number(
                    mapping.standard_field_id
                )
            };
        });

    return index;
}


/**
 * マッピング表を描画する
 */
function renderMappingTable() {
    mappingTableBody.innerHTML = "";

    if (columns.length === 0) {
        const row =
            document.createElement("tr");

        const cell =
            document.createElement("td");

        cell.colSpan = 4;
        cell.className = "empty-cell";

        cell.textContent =
            "対象テーブルにカラムがありません";

        row.appendChild(cell);
        mappingTableBody.appendChild(row);

        return;
    }

    columns.forEach(column => {
        const row =
            createMappingRow(column);

        mappingTableBody.appendChild(row);
    });
}


/**
 * 1カラム分の行を作成する
 */
function createMappingRow(column) {
    const columnName =
        column.Field || "";

    const columnType =
        column.Type || "";

    const row =
        document.createElement("tr");

    const nameCell =
        document.createElement("td");

    const typeCell =
        document.createElement("td");

    const sampleCell =
        document.createElement("td");

    const mappingCell =
        document.createElement("td");

    const columnNameElement =
        document.createElement("span");

    columnNameElement.className =
        "column-name";

    columnNameElement.textContent =
        columnName;

    nameCell.appendChild(
        columnNameElement
    );

    typeCell.className =
        "data-type-cell";

    typeCell.textContent =
        getTypeLabel(columnType);

    sampleCell.className =
        "sample-value-cell";

    sampleCell.textContent =
        formatSampleValue(
            sampleRecord[columnName],
            columnType
        );

    sampleCell.title =
        getFullSampleValue(
            sampleRecord[columnName],
            columnType
        );

    const select =
        createStandardFieldSelect(
            columnName
        );

    mappingCell.appendChild(select);

    row.appendChild(nameCell);
    row.appendChild(typeCell);
    row.appendChild(sampleCell);
    row.appendChild(mappingCell);

    return row;
}


/**
 * MySQLデータ型を分かりやすく表示する
 */
function getTypeLabel(type) {
    const normalizedType =
        String(type || "")
            .trim()
            .toLowerCase();

    if (
        normalizedType.startsWith("varchar") ||
        normalizedType.startsWith("char")
    ) {
        return "文字列";
    }

    if (
        normalizedType.includes("text")
    ) {
        return "長文";
    }

    if (
        normalizedType.startsWith("bigint")
    ) {
        return "大きな整数";
    }

    if (
        normalizedType.startsWith("int") ||
        normalizedType.startsWith("tinyint") ||
        normalizedType.startsWith("smallint") ||
        normalizedType.startsWith("mediumint")
    ) {
        return "整数";
    }

    if (
        normalizedType.startsWith("decimal") ||
        normalizedType.startsWith("numeric") ||
        normalizedType.startsWith("float") ||
        normalizedType.startsWith("double")
    ) {
        return "小数";
    }

    if (
        normalizedType.startsWith("datetime") ||
        normalizedType.startsWith("timestamp")
    ) {
        return "日時";
    }

    if (
        normalizedType.startsWith("date")
    ) {
        return "日付";
    }

    if (
        normalizedType.startsWith("time")
    ) {
        return "時刻";
    }

    if (
        normalizedType.startsWith("boolean") ||
        normalizedType.startsWith("bool")
    ) {
        return "はい／いいえ";
    }

    if (
        normalizedType.startsWith("json")
    ) {
        return "構造化データ";
    }

    return type || "不明";
}


/**
 * サンプル値を画面表示用に整形する
 */
function formatSampleValue(value, columnType) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "データなし";
    }

    const normalizedType =
        String(columnType || "")
            .toLowerCase();

    let displayValue;

    if (
        normalizedType.startsWith("datetime") ||
        normalizedType.startsWith("timestamp")
    ) {
        displayValue =
            formatDateTime(value);

    } else if (
        normalizedType.startsWith("date")
    ) {
        displayValue =
            formatDate(value);

    } else if (
        typeof value === "object"
    ) {
        displayValue =
            JSON.stringify(value);

    } else {
        displayValue =
            String(value);
    }

    const maximumLength = 40;

    if (
        displayValue.length >
        maximumLength
    ) {
        return (
            displayValue.slice(
                0,
                maximumLength
            ) + "…"
        );
    }

    return displayValue;
}


/**
 * title属性用の省略しないサンプル値
 */
function getFullSampleValue(
    value,
    columnType
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "データなし";
    }

    const normalizedType =
        String(columnType || "")
            .toLowerCase();

    if (
        normalizedType.startsWith("datetime") ||
        normalizedType.startsWith("timestamp")
    ) {
        return formatDateTime(value);
    }

    if (
        normalizedType.startsWith("date")
    ) {
        return formatDate(value);
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}


/**
 * 日時を日本時間形式で表示する
 */
function formatDateTime(value) {
    const date = new Date(value);

    if (
        Number.isNaN(date.getTime())
    ) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        "ja-JP",
        {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }
    ).format(date);
}


/**
 * 日付を日本語形式で表示する
 */
function formatDate(value) {
    const date = new Date(value);

    if (
        Number.isNaN(date.getTime())
    ) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        "ja-JP",
        {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(date);
}


/**
 * 標準項目プルダウンを作成する
 */
function createStandardFieldSelect(columnName) {
    const select =
        document.createElement("select");

    select.className =
        "mapping-select";

    select.dataset.sourceColumn =
        columnName;

    const emptyOption =
        document.createElement("option");

    emptyOption.value = "";

    emptyOption.textContent =
        getEmptyOptionLabel(columnName);

    select.appendChild(emptyOption);

    const groupedFields =
        groupStandardFieldsByEntity();

    Object.entries(groupedFields).forEach(
        ([entityName, fields]) => {
            const optionGroup =
                document.createElement(
                    "optgroup"
                );

            optionGroup.label =
                getEntityDisplayName(
                    entityName
                );

            fields.forEach(field => {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(field.id);

                option.textContent =
                    `${field.display_name}` +
                    `（${field.field_name}）`;

                optionGroup.appendChild(
                    option
                );
            });

            select.appendChild(
                optionGroup
            );
        }
    );

    const savedMapping =
        savedMappings[columnName];

    if (savedMapping) {
        select.value = String(
            savedMapping.standardFieldId
        );

        select.dataset.originalValue =
            String(
                savedMapping.standardFieldId
            );

        select.classList.add("saved");

    } else {
        /*
         * ID系カラムは自動マッピングしない。
         * 利用者が必ず明示的に分類する。
         */
        const autoField =
            isIdentifierColumn(columnName)
                ? null
                : findAutomaticMapping(
                    columnName
                );

        if (autoField) {
            select.value =
                String(autoField.id);

            select.classList.add(
                "auto-mapped"
            );
        }

        select.dataset.originalValue = "";
    }

    select.addEventListener(
        "change",
        () => {
            updateSelectState(select);
        }
    );

    return select;
}


/**
 * ID系カラムか判定する
 */
function isIdentifierColumn(columnName) {
    const normalized =
        normalizeFieldName(columnName);

    return (
        normalized === "id" ||
        normalized.endsWith("_id")
    );
}


/**
 * 未選択時の案内文
 */
function getEmptyOptionLabel(columnName) {
    if (isIdentifierColumn(columnName)) {
        return "IDの役割を選択してください";
    }

    return "標準項目を選択してください";
}


/**
 * エンティティ単位で標準項目をまとめる
 */
function groupStandardFieldsByEntity() {
    return standardFields.reduce(
        (groups, field) => {
            const entityName =
                field.entity_name ||
                "other";

            if (!groups[entityName]) {
                groups[entityName] = [];
            }

            groups[entityName].push(
                field
            );

            return groups;
        },
        {}
    );
}


/**
 * エンティティ表示名
 */
function getEntityDisplayName(entityName) {
    const entityLabels = {
        user: "利用者",
        certificate: "受給者証",
        contact: "連絡先",
        emergency_contact: "緊急連絡先",
        contract: "契約",
        service: "サービス",
        support_record: "支援記録",
        resident: "利用者",
        staff: "職員",
        facility: "施設",
        other: "その他"
    };

    return (
        entityLabels[entityName] ||
        entityName
    );
}


/**
 * カラム名から標準項目を自動推定する
 */
function findAutomaticMapping(columnName) {
    return (
        window.RisenStandardFieldMapping
            ?.findStandardFieldSuggestion(
                columnName,
                standardFields
            ) ||
        null
    );
}


/**
 * 比較用に名前を正規化する
 */
function normalizeFieldName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}


/**
 * プルダウンの見た目を更新する
 */
function updateSelectState(select) {
    select.classList.remove(
        "saved",
        "auto-mapped",
        "changed"
    );

    if (
        select.value !==
        select.dataset.originalValue
    ) {
        select.classList.add("changed");
        return;
    }

    if (select.value) {
        select.classList.add("saved");
    }
}


/**
 * 画面上で選択されたマッピングを保存する
 */
async function saveMappings() {
    const selects = Array.from(
        document.querySelectorAll(
            ".mapping-select"
        )
    );

    const selectedMappings =
        selects
            .filter(select => {
                return select.value !== "";
            })
            .map(select => ({
                select,

                source_table:
                    SOURCE_TABLE,

                source_column:
                    select.dataset.sourceColumn,

                standard_field_id:
                    Number(select.value),

                is_required: false
            }));

    if (
        selectedMappings.length === 0
    ) {
        setStatus(
            "標準項目を1件以上選択してください",
            "error"
        );

        return;
    }

    const changedMappings =
        selectedMappings.filter(mapping => {
            return (
                String(
                    mapping.standard_field_id
                ) !==
                mapping.select.dataset
                    .originalValue
            );
        });

    if (
        changedMappings.length === 0
    ) {
        setStatus(
            "変更されたマッピングはありません",
            "info"
        );

        return;
    }

    setButtonsDisabled(true);

    setStatus(
        `${changedMappings.length}件を保存しています...`,
        "loading"
    );

    let successCount = 0;
    const errors = [];

    try {
        for (
            const mapping of
            changedMappings
        ) {
            try {
                const result =
                    await fetchJson(
                        `${API_BASE}/mappings`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                source_table:
                                    mapping.source_table,

                                source_column:
                                    mapping.source_column,

                                standard_field_id:
                                    mapping.standard_field_id,

                                is_required:
                                    mapping.is_required
                            })
                        }
                    );

                savedMappings[
                    mapping.source_column
                ] = {
                    id: Number(result.id),

                    standardFieldId:
                        mapping.standard_field_id
                };

                mapping.select.dataset
                    .originalValue =
                    String(
                        mapping.standard_field_id
                    );

                mapping.select.classList.remove(
                    "changed",
                    "auto-mapped"
                );

                mapping.select.classList.add(
                    "saved"
                );

                successCount += 1;

            } catch (error) {
                errors.push(
                    `${mapping.source_column}: ` +
                    error.message
                );
            }
        }

        if (errors.length > 0) {
            setStatus(
                `${successCount}件保存、` +
                `${errors.length}件失敗しました`,
                "error"
            );

            console.error(
                "マッピング保存失敗:",
                errors
            );

        } else {
            setStatus(
                `${successCount}件のマッピングを保存しました`,
                "success"
            );
        }

    } finally {
        setButtonsDisabled(false);
    }
}


/**
 * エラー行を表示する
 */
function renderErrorRow(message) {
    mappingTableBody.innerHTML = "";

    const row =
        document.createElement("tr");

    const cell =
        document.createElement("td");

    cell.colSpan = 4;
    cell.className = "error-cell";
    cell.textContent = message;

    row.appendChild(cell);
    mappingTableBody.appendChild(row);
}


/**
 * 状態メッセージを表示する
 */
function setStatus(message, type = "") {
    statusElement.textContent = message;

    statusElement.className =
        "mapping-status";

    if (type) {
        statusElement.classList.add(type);
    }
}


/**
 * 保存ボタンの有効・無効を切り替える
 */
function setButtonsDisabled(disabled) {
    if (saveButton) {
        saveButton.disabled = disabled;
    }
}


saveButton.addEventListener(
    "click",
    saveMappings
);



initializeMappingPage();