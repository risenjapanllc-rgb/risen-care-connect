const startButton = document.getElementById("startButton");

if (startButton) {
    startButton.addEventListener("click", () => {
        window.location.href = "connection.html";
    });
}

const connectButton =
    document.getElementById("connectButton");

const connectionStatus =
    document.getElementById("connectionStatus");

const tableList =
    document.getElementById("tableList");

const columnList =
    document.getElementById("columnList");

const tableGuide =
    document.getElementById("tableGuide");

const nextStepArea =
    document.getElementById("nextStepArea");

const nextStepButton =
    document.getElementById("nextStepButton");

let activeMysqlConfig = null;
let activeConnectionId = null;

if (nextStepButton) {
    nextStepButton.addEventListener("click", (event) => {
        if (nextStepButton.classList.contains("is-disabled")) {
            event.preventDefault();
        }
    });
}



if (connectButton && connectionStatus) {
    connectButton.addEventListener("click", async () => {
        connectButton.disabled = true;

        connectionStatus.textContent =
            "MySQLへの接続を確認しています...";

        connectionStatus.className = "";

        if (tableList) {
            tableList.innerHTML = "";
        }

        if (columnList) {
            columnList.innerHTML = "";
        }

        try {
            const mysqlConfig = {
                host:
                    document.getElementById("host")?.value?.trim() || "",
                port:
                    Number(
                        document.getElementById("port")?.value
                    ) || 3306,
                database:
                    document.getElementById("database")?.value?.trim() || "",
                user:
                    document.getElementById("username")?.value?.trim() || "",
                password:
                    document.getElementById("password")?.value || ""
            };

            if (
                !mysqlConfig.host ||
                !mysqlConfig.database ||
                !mysqlConfig.user
            ) {
                throw new Error(
                    "ホスト、データベース名、ユーザー名を入力してください"
                );
            }

            const connectionResponse =
                await fetch(
                    "/api/mysql-test",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(mysqlConfig)
                    }
                );

            const connectionResult =
                await connectionResponse.json();

            if (!connectionResponse.ok ||
                !connectionResult.success) {

                throw new Error(
                    connectionResult.error ||
                    connectionResult.message ||
                    "MySQLへの接続に失敗しました"
                );
            }

            activeMysqlConfig = {
                ...mysqlConfig
            };

            activeConnectionId =
                String(
                    connectionResult.connectionId || ""
                ).trim();

            if (!activeConnectionId) {
                throw new Error(
                    "MySQL接続セッションを作成できませんでした"
                );
            }

            sessionStorage.setItem(
                "risenMysqlConnectionId",
                activeConnectionId
            );

            connectionStatus.textContent =
              "✓ MySQLへの接続に成功しました";

            connectionStatus.className =
              "status-success";

            if (tableGuide) {
              tableGuide.hidden = false;
            }

            const tablesResponse =
                await fetch(
                    "/api/tables",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            connectionId:
                                activeConnectionId
                        })
                    }
                );

            const tables =
                await tablesResponse.json();

            if (!tablesResponse.ok) {
                throw new Error(
                    tables.error ||
                    tables.message ||
                    "テーブル一覧の取得に失敗しました"
                );
            }

            if (!tableList) {
                throw new Error(
                    "tableListがHTML内に見つかりません"
                );
            }

            if (!Array.isArray(tables) ||
                tables.length === 0) {

                const li =
                    document.createElement("li");

                li.textContent =
                    "テーブルが見つかりませんでした";

                tableList.appendChild(li);
                return;
            }

            tables.forEach((table) => {
                const tableName =
                    Object.values(table)[0];

                const li =
                    document.createElement("li");

                li.textContent =
                    `📋 ${tableName}`;

                li.style.cursor = "pointer";

                li.addEventListener("click", () => {
                    console.log(
                        "クリックされたテーブル:",
                        tableName
                    );

                    loadColumns(tableName);
                });

                tableList.appendChild(li);
            });

        } catch (error) {
            connectionStatus.textContent =
                `処理に失敗しました：${error.message}`;

            connectionStatus.className =
                "status-error";

            console.error("接続処理エラー:", error);

        } finally {
            connectButton.disabled = false;
        }
    });
}


async function loadColumns(tableName) {
    if (!columnList) {
        console.error(
            "columnListがHTML内に見つかりません"
        );
        return;
    }

    columnList.innerHTML = "";

    const loadingItem =
        document.createElement("li");

    loadingItem.textContent =
        `現在確認中：${tableName} のカラムを取得しています...`;

    columnList.appendChild(loadingItem);

    try {
        if (!activeConnectionId) {
            throw new Error(
                "MySQL接続セッションがありません。先に接続を確認してください"
            );
        }

        const response = await fetch(
            `/api/columns/${encodeURIComponent(tableName)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    connectionId:
                        activeConnectionId
                })
            }
        );

        const result = await response.json();

        console.log("カラム取得結果:", result);

        if (!response.ok) {
            throw new Error(
                result.error ||
                result.message ||
                "カラム一覧の取得に失敗しました"
            );
        }

        columnList.innerHTML = "";

        if (!Array.isArray(result) ||
            result.length === 0) {

            const li =
                document.createElement("li");

            li.textContent =
                "カラムが見つかりませんでした";

            columnList.appendChild(li);
            return;
        }

        result.forEach((column) => {
    const li =
        document.createElement("li");

    li.textContent =
        `📝 ${column.Field} (${column.Type})`;

    columnList.appendChild(li);
});

if (nextStepButton) {
    nextStepButton.classList.remove("is-disabled");
    nextStepButton.setAttribute("aria-disabled", "false");
}

    } catch (error) {
        columnList.innerHTML = "";

        const li =
            document.createElement("li");

        li.textContent =
            `カラム取得に失敗しました：${error.message}`;

        li.className = "status-error";

        columnList.appendChild(li);

        console.error(
            "カラム取得エラー:",
            error
        );
    }
}