"use strict";

const API_BASE = "http://localhost:3001/api";

// URLパラメータ取得
const params = new URLSearchParams(window.location.search);
const selectedTable = params.get("table");

// URLにtableがない場合はcare_recordsを使用
const SOURCE_TABLE = selectedTable || "care_records";

console.log("Selected Table:", SOURCE_TABLE);

const mappingTableBody = document.querySelector(
    "#mappingTable tbody"
);

const sourceTableName = document.getElementById(
    "sourceTableName"
);

const saveButton = document.getElementById(
    "saveButton"
);

const bottomSaveButton = document.getElementById(
    "bottomSaveButton"
);

const statusElement = document.getElementById(
    "mappingStatus"
);

let columns = [];
let standardFields = [];
let savedMappings = {};

/**
 * APIからJSONを取得する
 */
async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

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
    standardFieldsData,
    mappingsData,
    tableMappingsData
] = await Promise.all([
    fetchJson(
        `${API_BASE}/columns/${
            encodeURIComponent(SOURCE_TABLE)
        }`
    ),
    fetchJson(`${API_BASE}/standard-fields`),
    fetchJson(`${API_BASE}/mappings`),
    fetchJson(`${API_BASE}/table-mappings`)
]);

const currentTableMapping = Array.isArray(tableMappingsData)
    ? tableMappingsData.find(
        item => item.source_table === SOURCE_TABLE
    )
    : null;

const currentEntity =
    currentTableMapping?.standard_entity || null;

console.log("Current Entity:", currentEntity);

columns = Array.isArray(columnsData)
    ? columnsData
    : [];

standardFields = Array.isArray(standardFieldsData)
    ? standardFieldsData
    : [];

if (currentEntity) {
    standardFields = standardFields.filter(
        field => field.entity_name === currentEntity
    );
}

savedMappings = createSavedMappingIndex(
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
                mapping.source_table === SOURCE_TABLE
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
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 3;
        cell.className = "empty-cell";
        cell.textContent =
            "対象テーブルにカラムがありません";

        row.appendChild(cell);
        mappingTableBody.appendChild(row);

        return;
    }

    columns.forEach(column => {
        const row = createMappingRow(column);

        mappingTableBody.appendChild(row);
    });
}

/**
 * 1カラム分の行を作成する
 */
function createMappingRow(column) {
    const columnName = column.Field || "";
    const columnType = column.Type || "";

    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const typeCell = document.createElement("td");
    const mappingCell = document.createElement("td");

    const columnNameElement =
        document.createElement("span");

    columnNameElement.className = "column-name";
    columnNameElement.textContent = columnName;

    nameCell.appendChild(columnNameElement);

    typeCell.className = "data-type-cell";
    typeCell.textContent = columnType;

    const select =
        createStandardFieldSelect(columnName);

    mappingCell.appendChild(select);

    row.appendChild(nameCell);
    row.appendChild(typeCell);
    row.appendChild(mappingCell);

    return row;
}

/**
 * 標準項目プルダウンを作成する
 */
function createStandardFieldSelect(columnName) {
    const select = document.createElement("select");

    select.className = "mapping-select";
    select.dataset.sourceColumn = columnName;

    const emptyOption =
        document.createElement("option");

    emptyOption.value = "";
    emptyOption.textContent =
        "標準項目を選択してください";

    select.appendChild(emptyOption);

    const groupedFields =
        groupStandardFieldsByEntity();

    Object.entries(groupedFields).forEach(
        ([entityName, fields]) => {
            const optionGroup =
                document.createElement("optgroup");

            optionGroup.label =
                getEntityDisplayName(entityName);

            fields.forEach(field => {
                const option =
                    document.createElement("option");

                option.value = String(field.id);

                option.textContent =
                    `${field.display_name}` +
                    `（${field.field_name}）`;

                optionGroup.appendChild(option);
            });

            select.appendChild(optionGroup);
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
        const autoField =
            findAutomaticMapping(columnName);

        if (autoField) {
            select.value = String(autoField.id);
            select.classList.add("auto-mapped");
        }

        select.dataset.originalValue = "";
    }

    select.addEventListener("change", () => {
        updateSelectState(select);
    });

    return select;
}

/**
 * エンティティ単位で標準項目をまとめる
 */
function groupStandardFieldsByEntity() {
    return standardFields.reduce(
        (groups, field) => {
            const entityName =
                field.entity_name || "other";

            if (!groups[entityName]) {
                groups[entityName] = [];
            }

            groups[entityName].push(field);

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
    const normalized =
        normalizeFieldName(columnName);

    const aliases = {
        name: [
            "name",
            "user_name",
            "client_name",
            "full_name"
        ],
        birthday: [
            "birthday",
            "birth_date",
            "date_of_birth",
            "dob"
        ],
        gender: [
            "gender",
            "sex"
        ],
        postal_code: [
            "postal_code",
            "postcode",
            "zip",
            "zip_code"
        ],
        address: [
            "address",
            "user_address"
        ],
        phone: [
            "phone",
            "telephone",
            "tel",
            "phone_number"
        ],
        mobile: [
            "mobile",
            "mobile_phone",
            "cell_phone",
            "mobile_number"
        ],
        email: [
            "email",
            "mail",
            "email_address"
        ]
    };

    const targetFieldName = Object.entries(
        aliases
    ).find(([, aliasList]) => {
        return aliasList.includes(normalized);
    })?.[0];

    if (!targetFieldName) {
        return standardFields.find(field => {
            return (
                normalizeFieldName(
                    field.field_name
                ) === normalized
            );
        });
    }

    return standardFields.find(field => {
        return (
            normalizeFieldName(
                field.field_name
            ) === targetFieldName
        );
    });
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

    const selectedMappings = selects
        .filter(select => select.value !== "")
        .map(select => ({
            select,
            source_table: SOURCE_TABLE,
            source_column:
                select.dataset.sourceColumn,
            standard_field_id:
                Number(select.value),
            is_required: false
        }));

    if (selectedMappings.length === 0) {
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
                mapping.select.dataset.originalValue
            );
        });

    if (changedMappings.length === 0) {
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
        for (const mapping of changedMappings) {
            try {
                const result = await fetchJson(
                    "/api/mappings",
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

                mapping.select.dataset.originalValue =
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

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 3;
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

    statusElement.className = "mapping-status";

    if (type) {
        statusElement.classList.add(type);
    }
}

/**
 * 保存ボタンの有効・無効を切り替える
 */
function setButtonsDisabled(disabled) {
    saveButton.disabled = disabled;
    bottomSaveButton.disabled = disabled;
}

saveButton.addEventListener(
    "click",
    saveMappings
);

bottomSaveButton.addEventListener(
    "click",
    saveMappings
);

initializeMappingPage();