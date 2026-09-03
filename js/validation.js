"use strict";

const API_BASE = "/api";

const validationStatus =
    document.getElementById("validationStatus");

const connectionCheck =
    document.getElementById("connectionCheck");

const tableMappingSummary =
    document.getElementById("tableMappingSummary");

const validationTableBody =
    document.querySelector("#validationTable tbody");

const qualityCheck =
    document.getElementById("qualityCheck");

const registerButton =
    document.getElementById("registerButton");

const connectionId =
    sessionStorage.getItem(
        "risenMysqlConnectionId"
    ) || "";


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


async function initializeValidationPage() {
    if (registerButton) {
        registerButton.disabled = true;
    }

    try {
        const [
            connectionResult,
            tableMappings,
            mappings,
            standardFields
        ] = await Promise.all([
            fetchJson(
                `${API_BASE}/mysql-session-test`,
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
            ),

            fetchJson(
                `${API_BASE}/mappings`
            ),

            fetchJson(
                `${API_BASE}/standard-fields`
            )
        ]);

        const columnsByTable =
            await loadColumnsForMappedTables(
                tableMappings
            );

        renderConnectionCheck(
            connectionResult
        );

        renderTableMappings(
            tableMappings
        );

        const validationResult =
            buildValidationResult({
                tableMappings,
                mappings,
                standardFields,
                columnsByTable
            });

        renderColumnMappings(
            validationResult.rows
        );

        renderQualityCheck({
            connectionResult,
            tableMappings,
            validationResult
        });

        setValidationStatus(
            "設定内容の確認が完了しました",
            "success"
        );

    } catch (error) {
        console.error(
            "検証画面初期化エラー:",
            error
        );

        setValidationStatus(
            `確認に失敗しました：${error.message}`,
            "error"
        );
    }
}


async function loadColumnsForMappedTables(
    tableMappings
) {
    const result = {};

    if (!Array.isArray(tableMappings)) {
        return result;
    }

    await Promise.all(
        tableMappings.map(async mapping => {
            const tableName =
                mapping.source_table;

            if (!tableName) {
                return;
            }

            const columns =
                await fetchJson(
                    `${API_BASE}/columns/${
                        encodeURIComponent(tableName)
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
                );

            result[tableName] =
                Array.isArray(columns)
                    ? columns
                    : [];
        })
    );

    return result;
}


function renderConnectionCheck(result) {
    if (result?.success) {
        connectionCheck.innerHTML = `
            <div class="validation-result is-success">
                <strong>✓ MySQL接続</strong>
                <span>正常に接続されています</span>
            </div>
        `;

        return;
    }

    connectionCheck.innerHTML = `
        <div class="validation-result is-error">
            <strong>✕ MySQL接続</strong>
            <span>接続を確認してください</span>
        </div>
    `;
}


function renderTableMappings(tableMappings) {
    if (
        !Array.isArray(tableMappings) ||
        tableMappings.length === 0
    ) {
        tableMappingSummary.innerHTML = `
            <div class="validation-result is-warning">
                <strong>未設定</strong>
                <span>
                    テーブル分類が保存されていません
                </span>
            </div>
        `;

        return;
    }

    tableMappingSummary.innerHTML =
        tableMappings
            .map(mapping => {
                return `
                    <div class="validation-result is-success">
                        <strong>
                            ${escapeHtml(
                                mapping.source_table
                            )}
                        </strong>

                        <span>
                            →
                            ${escapeHtml(
                                mapping.display_name ||
                                mapping.standard_entity
                            )}
                        </span>
                    </div>
                `;
            })
            .join("");
}


function buildValidationResult({
    tableMappings,
    mappings,
    standardFields,
    columnsByTable
}) {
    const mappingIndex = new Map();

    if (Array.isArray(mappings)) {
        mappings.forEach(mapping => {
            mappingIndex.set(
                createMappingKey(
                    mapping.source_table,
                    mapping.source_column
                ),
                mapping
            );
        });
    }

    const rows = [];

    if (Array.isArray(tableMappings)) {
        tableMappings.forEach(
            tableMapping => {
                const tableName =
                    tableMapping.source_table;

                const columns =
                    columnsByTable[tableName] || [];

                columns.forEach(column => {
                    const columnName =
                        column.Field ||
                        column.COLUMN_NAME ||
                        "";

                    const mapping =
                        mappingIndex.get(
                            createMappingKey(
                                tableName,
                                columnName
                            )
                        ) || null;

                    let status = "mapped";

                    if (!mapping) {
                        status =
                            isAmbiguousColumn(
                                columnName
                            )
                                ? "review"
                                : "optional";
                    }

                    rows.push({
                        sourceTable:
                            tableName,

                        sourceColumn:
                            columnName,

                        standardEntity:
                            tableMapping.standard_entity,

                        mapping,
                        status
                    });
                });
            }
        );
    }

    const requiredFields =
        Array.isArray(standardFields)
            ? standardFields.filter(field => {
                return (
                    Number(field.required_flag) === 1
                );
            })
            : [];

    const requiredChecks = [];

    if (Array.isArray(tableMappings)) {
        tableMappings.forEach(
            tableMapping => {
                const requiredForEntity =
                    requiredFields.filter(field => {
                        return (
                            field.entity_name ===
                            tableMapping.standard_entity
                        );
                    });

                const mappingsForTable =
                    Array.isArray(mappings)
                        ? mappings.filter(mapping => {
                            return (
                                mapping.source_table ===
                                tableMapping.source_table
                            );
                        })
                        : [];

                requiredForEntity.forEach(field => {
                    const mapped =
                        mappingsForTable.some(mapping => {
                            return (
                                Number(
                                    mapping.standard_field_id
                                ) ===
                                Number(field.id)
                            );
                        });

                    requiredChecks.push({
                        sourceTable:
                            tableMapping.source_table,

                        field,
                        mapped
                    });
                });
            }
        );
    }

    const missingRequired =
        requiredChecks.filter(item => {
            return !item.mapped;
        });

    const reviewRows =
        rows.filter(row => {
            return row.status === "review";
        });

    const optionalRows =
        rows.filter(row => {
            return row.status === "optional";
        });

    const mappedRows =
        rows.filter(row => {
            return row.status === "mapped";
        });

    const requiredTotal =
        requiredChecks.length;

    const requiredMapped =
        requiredTotal -
        missingRequired.length;

    const requiredCompletionRate =
        requiredTotal === 0
            ? 100
            : Math.round(
                requiredMapped /
                requiredTotal *
                100
            );

    return {
        rows,
        mappedRows,
        reviewRows,
        optionalRows,
        requiredChecks,
        missingRequired,
        requiredTotal,
        requiredMapped,
        requiredCompletionRate
    };
}


function renderColumnMappings(rows) {
    validationTableBody.innerHTML = "";

    if (
        !Array.isArray(rows) ||
        rows.length === 0
    ) {
        validationTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-cell">
                    確認対象のカラムがありません
                </td>
            </tr>
        `;

        return;
    }

    rows.forEach(item => {
        const row =
            document.createElement("tr");

        if (item.status === "mapped") {
            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        item.sourceTable
                    )}
                </td>

                <td>
                    <span class="column-name">
                        ${escapeHtml(
                            item.sourceColumn
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        item.mapping.display_name
                    )}

                    <span class="validation-field-name">
                        (${escapeHtml(
                            item.mapping.field_name
                        )})
                    </span>
                </td>

                <td>
                    <span class="validation-badge is-success">
                        設定済み
                    </span>
                </td>
            `;
        }

        if (item.status === "review") {
            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        item.sourceTable
                    )}
                </td>

                <td>
                    <span class="column-name">
                        ${escapeHtml(
                            item.sourceColumn
                        )}
                    </span>
                </td>

                <td>
                    <span class="validation-review-text">
                        IDの役割を確認してください
                    </span>
                </td>

                <td>
                    <span class="validation-badge is-review">
                        要確認
                    </span>
                </td>
            `;
        }

        if (item.status === "optional") {
            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        item.sourceTable
                    )}
                </td>

                <td>
                    <span class="column-name">
                        ${escapeHtml(
                            item.sourceColumn
                        )}
                    </span>
                </td>

                <td>
                    <span class="validation-optional-text">
                        AIKO連携では任意です
                    </span>
                </td>

                <td>
                    <span class="validation-badge is-optional">
                        任意
                    </span>
                </td>
            `;
        }

        validationTableBody.appendChild(row);
    });
}


function renderQualityCheck({
    connectionResult,
    tableMappings,
    validationResult
}) {
    const connectionOk =
        Boolean(connectionResult?.success);

    const tableMappingOk =
        Array.isArray(tableMappings) &&
        tableMappings.length > 0;

    const requiredOk =
        validationResult.missingRequired.length === 0;

    const registrationAllowed =
        connectionOk &&
        tableMappingOk &&
        requiredOk;

    const requiredWarningList =
        validationResult.missingRequired
            .map(item => {
                return `
                    <li>
                        <strong>
                            ${escapeHtml(
                                item.sourceTable
                            )}
                        </strong>
                        に
                        「${escapeHtml(
                            item.field.display_name
                        )}」
                        の設定が必要です
                    </li>
                `;
            })
            .join("");

    const reviewList =
        validationResult.reviewRows
            .map(item => {
                return `
                    <li>
                        <strong>
                            ${escapeHtml(
                                item.sourceTable
                            )}.${escapeHtml(
                                item.sourceColumn
                            )}
                        </strong>
                        の役割を確認してください
                    </li>
                `;
            })
            .join("");

    qualityCheck.innerHTML = `
        <div class="quality-grid">

            ${createQualityItem(
                "データベース接続",
                connectionOk,
                connectionOk
                    ? "完了"
                    : "未完了"
            )}

            ${createQualityItem(
                "テーブル分類",
                tableMappingOk,
                tableMappingOk
                    ? "完了"
                    : "未完了"
            )}

            ${createQualityItem(
                "必須設定",
                requiredOk,
                requiredOk
                    ? "完了"
                    : "不足あり"
            )}

        </div>

        <div class="completion-panel">
            <div>
                <span>必須設定</span>

                <p class="completion-detail">
                    ${
                        validationResult.requiredTotal === 0
                            ? "必須指定された標準項目はありません"
                            : (
                                `${validationResult.requiredMapped}` +
                                ` / ` +
                                `${validationResult.requiredTotal}` +
                                ` 項目設定済み`
                            )
                    }
                </p>
            </div>

            <strong>
                ${validationResult.requiredCompletionRate}%
            </strong>
        </div>

        ${
            validationResult.missingRequired.length > 0
                ? `
                    <div class="validation-blocking">
                        <strong>
                            必須設定が
                            ${validationResult.missingRequired.length}
                            件不足しています
                        </strong>

                        <ul class="validation-warning-list">
                            ${requiredWarningList}
                        </ul>
                    </div>
                `
                : `
                    <div class="validation-ready">
                        AIKO利用に必要な設定は完了しています。
                    </div>
                `
        }

        ${
            validationResult.reviewRows.length > 0
                ? `
                    <div class="validation-review">
                        <strong>
                            確認が必要な項目：
                            ${validationResult.reviewRows.length}
                            件
                        </strong>

                        <ul class="validation-warning-list">
                            ${reviewList}
                        </ul>

                        <p>
                            この項目は必須不足ではありません。
                            内容を確認したうえで登録できます。
                        </p>
                    </div>
                `
                : `
                    <div class="validation-review is-clear">
                        確認が必要な項目はありません。
                    </div>
                `
        }

        ${
            validationResult.optionalRows.length > 0
                ? `
                    <div class="validation-optional-summary">
                        任意未設定：
                        ${validationResult.optionalRows.length}
                        件
                    </div>
                `
                : ""
        }
    `;

    if (registerButton) {
        registerButton.disabled =
            !registrationAllowed;

        registerButton.textContent =
            validationResult.reviewRows.length > 0
                ? "確認してAIKOへ登録"
                : "AIKOへ登録";
    }
}


function createQualityItem(
    label,
    isCompleted,
    resultText
) {
    return `
        <div class="quality-item">
            <span class="${
                isCompleted
                    ? "quality-icon is-success"
                    : "quality-icon is-warning"
            }">
                ${isCompleted ? "✓" : "!"}
            </span>

            <span>
                ${escapeHtml(label)}
            </span>

            <strong>
                ${escapeHtml(resultText)}
            </strong>
        </div>
    `;
}


function isAmbiguousColumn(columnName) {
    const normalized =
        String(columnName || "")
            .trim()
            .toLowerCase();

    return [
        "id",
        "code",
        "key",
        "no",
        "number"
    ].includes(normalized);
}


function createMappingKey(
    tableName,
    columnName
) {
    return (
        String(tableName || "") +
        "::" +
        String(columnName || "")
    );
}


function setValidationStatus(
    message,
    type = ""
) {
    validationStatus.textContent =
        message;

    validationStatus.className =
        "mapping-status";

    if (type) {
        validationStatus.classList.add(
            type
        );
    }
}


function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


if (registerButton) {
    registerButton.addEventListener(
        "click",
        async () => {
            if (!connectionId) {
                setValidationStatus(
                    "MySQL接続セッションがありません。接続設定からやり直してください",
                    "error"
                );
                return;
            }

            const originalText =
                registerButton.textContent;

            registerButton.disabled = true;
            registerButton.textContent =
                "AIKOデータソースとして登録しています...";

            try {
                const result =
                    await fetchJson(
                        `${API_BASE}/data-sources/register`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                connectionId,
                                displayName:
                                    "RISEN CARE Connect MySQL"
                            })
                        }
                    );

                const dataSourceId =
                    Number(
                        result.dataSourceId
                    );

                if (
                    !Number.isInteger(dataSourceId) ||
                    dataSourceId <= 0
                ) {
                    throw new Error(
                        "dataSourceIdを取得できませんでした"
                    );
                }

                sessionStorage.setItem(
                    "risenDataSourceId",
                    String(dataSourceId)
                );

                setValidationStatus(
                    "AIKOデータソースとして登録しました",
                    "success"
                );

                const completeMessage =
                    document.createElement("div");

                completeMessage.className =
                    "registration-complete";

                completeMessage.innerHTML = `
                    <strong>
                        ✓ AIKOデータソースとして登録しました
                    </strong>
                    <span>
                        AIKOで利用する準備が完了しました。
                    </span>
                `;

                registerButton.replaceWith(
                    completeMessage
                );

            } catch (error) {
                console.error(
                    "AIKOデータソース登録エラー:",
                    error
                );

                setValidationStatus(
                    `登録に失敗しました：${error.message}`,
                    "error"
                );

                registerButton.textContent =
                    originalText;

                registerButton.disabled = false;
            }
        }
    );
}


initializeValidationPage();