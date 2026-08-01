const API_BASE = "http://localhost:3001/api";

const ENTITY_TYPES = [
    { value: "user", label: "利用者情報" },
    { value: "support_record", label: "日常記録" },
    { value: "support_plan", label: "個別支援計画" },
    { value: "staff", label: "職員情報" },
    { value: "office", label: "事業所情報" },
    { value: "service", label: "サービス情報" },
    { value: "billing", label: "請求情報" },
    { value: "other", label: "その他" }
];

let tables = [];
let mappings = [];

document.addEventListener("DOMContentLoaded", async () => {
    document
        .getElementById("saveButton")
        ?.addEventListener("click", saveTableMappings);

    document
        .getElementById("bottomSaveButton")
        ?.addEventListener("click", saveTableMappings);

    await loadData();
});

async function loadData() {
    try {
        const [tablesRes, mappingsRes] = await Promise.all([
            fetch(`${API_BASE}/tables`),
            fetch(`${API_BASE}/table-mappings`)
        ]);

        if (!tablesRes.ok || !mappingsRes.ok) {
            throw new Error("APIからデータを取得できませんでした");
        }

        tables = await tablesRes.json();
        mappings = await mappingsRes.json();

        console.log("Tables:", tables);
        console.log("Mappings:", mappings);

        renderTable();
    } catch (error) {
        console.error("データ取得エラー:", error);
        showStatus("テーブル情報の取得に失敗しました", "error");
    }
}

function getTableName(table) {
    if (typeof table === "string") {
        return table;
    }

    return (
        table.table_name ||
        table.TABLE_NAME ||
        Object.values(table)[0]
    );
}

function renderTable() {
    const tbody = document.querySelector("#tableMappingTable tbody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (tables.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3">
                    テーブルが見つかりませんでした。
                </td>
            </tr>
        `;
        return;
    }

    tables.forEach((table) => {
        const tableName = getTableName(table);

        const savedMapping = mappings.find(
            (mapping) => mapping.source_table === tableName
        );

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${escapeHtml(tableName)}</strong>
            </td>

            <td>
                <select
                    class="entity-select"
                    data-table="${escapeHtml(tableName)}"
                >
                    <option value="">未設定</option>

                    ${ENTITY_TYPES.map((entity) => `
                        <option
                            value="${entity.value}"
                            ${
                                savedMapping?.standard_entity === entity.value
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${entity.label}
                        </option>
                    `).join("")}
                </select>
            </td>

            <td>
                <a
                    href="mapping.html?table=${encodeURIComponent(tableName)}"
                    class="secondary-button"
                >
                    カラム設定へ
                </a>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showStatus(message, type = "") {
    const statusMessage = document.getElementById("statusMessage");

    if (!statusMessage) {
        return;
    }

    statusMessage.textContent = message;
    statusMessage.className = `mapping-status ${type}`.trim();
}

async function saveTableMappings() {
    const selects = document.querySelectorAll(".entity-select");

    const settings = Array.from(selects)
        .map((select) => {
            const selectedOption =
                select.options[select.selectedIndex];

            return {
                source_table: select.dataset.table,
                standard_entity: select.value,
                display_name:
                    select.value
                        ? selectedOption.textContent.trim()
                        : ""
            };
        })
        .filter((setting) => setting.standard_entity);

    if (settings.length === 0) {
        showStatus(
            "保存する分類を選択してください",
            "error"
        );
        return;
    }

    setSaveButtonsDisabled(true);
    showStatus("分類を保存しています...", "");

    try {
        const responses = await Promise.all(
            settings.map(async (setting) => {
                const response = await fetch(
                    `${API_BASE}/table-mappings`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(setting)
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                        "テーブル分類の保存に失敗しました"
                    );
                }

                return result;
            })
        );

        console.log("保存結果:", responses);

        showStatus(
            `${settings.length}件の分類を保存しました`,
            "success"
        );

        await loadData();
    } catch (error) {
        console.error("テーブル分類保存エラー:", error);

        showStatus(
            `保存に失敗しました：${error.message}`,
            "error"
        );
    } finally {
        setSaveButtonsDisabled(false);
    }
}

function setSaveButtonsDisabled(disabled) {
    const button = document.getElementById("saveButton");

    if (button) {
        button.disabled = disabled;
    }
}
