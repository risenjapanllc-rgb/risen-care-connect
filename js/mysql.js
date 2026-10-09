"use strict";

const LOCAL_CONNECTOR =
    "http://127.0.0.1:4310";

const host =
    document.getElementById("host");

const port =
    document.getElementById("port");

const database =
    document.getElementById("database");

const user =
    document.getElementById("user");

const password =
    document.getElementById("password");

const table =
    document.getElementById("table");

const identityField =
    document.getElementById(
        "identityField"
    );

const residentCodeField =
    document.getElementById(
        "residentCodeField"
    );

const residentNameField =
    document.getElementById(
        "residentNameField"
    );

const birthDateField =
    document.getElementById(
        "birthDateField"
    );

const testButton =
    document.getElementById("testButton");

const saveButton =
    document.getElementById("saveButton");

const status =
    document.getElementById("status");

function payload() {
    return {
        host:
            String(
                host?.value || ""
            ).trim(),
        port:
            Number(
                port?.value
            ) || 3306,
        database:
            String(
                database?.value || ""
            ).trim(),
        user:
            String(
                user?.value || ""
            ).trim(),
        password:
            String(
                password?.value || ""
            )
    };
}

function validatePayload(
    value
) {
    const missing = [];

    if (!value.host) {
        missing.push(
            "ホスト"
        );
    }

    if (!value.database) {
        missing.push(
            "データベース名"
        );
    }

    if (!value.user) {
        missing.push(
            "ユーザー名"
        );
    }

    if (!value.password) {
        missing.push(
            "パスワード"
        );
    }

    return missing;
}

async function request(
    path,
    options = {}
) {
    const response =
        await fetch(
            `${LOCAL_CONNECTOR}${path}`,
            {
                ...options,
                headers: {
                    "Content-Type":
                        "application/json",
                    ...(options.headers || {})
                }
            }
        );

    const body =
        await response.json();

    if (!response.ok) {
        throw new Error(
            body.message ||
            body.errorCode ||
            "処理に失敗しました"
        );
    }

    return body;
}

function resetIdentityField() {
    identityField.innerHTML =
        '<option value="">テーブル選択後に確認</option>';

    residentCodeField.innerHTML =
        '<option value="">テーブル選択後に選択</option>';

    residentNameField.innerHTML =
        '<option value="">テーブル選択後に選択</option>';

    birthDateField.innerHTML =
        '<option value="">テーブル選択後に選択</option>';

    identityField.disabled =
        true;

    residentCodeField.disabled =
        true;

    residentNameField.disabled =
        true;

    birthDateField.disabled =
        true;

    saveButton.disabled =
        true;
}

function updateSaveState() {
    saveButton.disabled =
        !identityField.value.trim() ||
        !residentCodeField.value.trim() ||
        !residentNameField.value.trim() ||
        !birthDateField.value.trim();
}

testButton.addEventListener(
    "click",
    async () => {
        status.textContent =
            "接続を確認しています…";

        table.disabled =
            true;

        resetIdentityField();

        try {
            const requestPayload =
                payload();

            const missing =
                validatePayload(
                    requestPayload
                );

            if (missing.length > 0) {
                status.textContent =
                    `未入力があります: ${missing.join("、")}`;

                return;
            }

            const result =
                await request(
                    "/mysql/test",
                    {
                        method: "POST",
                        body:
                            JSON.stringify(
                                requestPayload
                            )
                    }
                );

            table.innerHTML =
                '<option value="">テーブルを選択</option>';

            for (
                const name of
                result.tables || []
            ) {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    name;

                option.textContent =
                    name;

                table.appendChild(
                    option
                );
            }

            table.disabled =
                false;

            status.textContent =
                "MySQLへの接続に成功しました。取込対象テーブルを選択してください。";
        } catch (error) {
            status.textContent =
                `接続に失敗しました: ${error.message}`;
        }
    }
);

table.addEventListener(
    "change",
    async () => {
        const tableName =
            table.value.trim();

        identityField.innerHTML =
            '<option value="">識別列を選択</option>';

        identityField.disabled =
            true;

        saveButton.disabled =
            true;

        if (!tableName) {
            status.textContent =
                "取込対象テーブルを選択してください。";

            return;
        }

        status.textContent =
            "レコード識別列の候補を確認しています…";

        try {
            const requestPayload =
                payload();

            const missing =
                validatePayload(
                    requestPayload
                );

            if (missing.length > 0) {
                status.textContent =
                    `未入力があります: ${missing.join("、")}`;

                return;
            }

            const result =
                await request(
                    "/mysql/identity-candidates",
                    {
                        method: "POST",
                        body:
                            JSON.stringify({
                                ...requestPayload,
                                table:
                                    tableName
                            })
                    }
                );

            const candidates =
                Array.isArray(
                    result.candidates
                )
                    ? result.candidates
                    : [];

            const columns =
                Array.isArray(
                    result.columns
                )
                    ? result.columns
                    : [];

            residentCodeField.innerHTML =
                '<option value="">利用者コード列を選択</option>';

            residentNameField.innerHTML =
                '<option value="">利用者氏名列を選択</option>';

            birthDateField.innerHTML =
                '<option value="">生年月日列を選択</option>';

            for (const column of columns) {
                const field =
                    String(
                        column || ""
                    ).trim();

                if (!field) {
                    continue;
                }

                const codeOption =
                    document.createElement(
                        "option"
                    );

                codeOption.value =
                    field;

                codeOption.textContent =
                    field;

                residentCodeField.appendChild(
                    codeOption
                );

                const nameOption =
                    document.createElement(
                        "option"
                    );

                nameOption.value =
                    field;

                nameOption.textContent =
                    field;

                residentNameField.appendChild(
                    nameOption
                );

                const birthDateOption =
                    document.createElement(
                        "option"
                    );

                birthDateOption.value =
                    field;

                birthDateOption.textContent =
                    field;

                birthDateField.appendChild(
                    birthDateOption
                );
            }

            for (
                const candidate of
                candidates
            ) {
                const field =
                    String(
                        candidate?.field ||
                        ""
                    ).trim();

                if (!field) {
                    continue;
                }

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    field;

                option.textContent =
                    field;

                identityField.appendChild(
                    option
                );
            }

            if (
                candidates.length === 0
            ) {
                status.textContent =
                    "空欄・重複のない識別列候補が見つかりませんでした。";

                return;
            }

            identityField.disabled =
                false;

            residentCodeField.disabled =
                false;

            residentNameField.disabled =
                false;

            birthDateField.disabled =
                false;

            status.textContent =
                "レコード識別列・利用者コード列・利用者氏名列・生年月日列を確認してください。";
        } catch (error) {
            status.textContent =
                `識別列の確認に失敗しました: ${error.message}`;
        }
    }
);

identityField.addEventListener(
    "change",
    () => {
        updateSaveState();
    }
);

residentCodeField.addEventListener(
    "change",
    () => {
        updateSaveState();
    }
);

residentNameField.addEventListener(
    "change",
    () => {
        updateSaveState();
    }
);

birthDateField.addEventListener(
    "change",
    () => {
        updateSaveState();
    }
);

saveButton.addEventListener(
    "click",
    async () => {
        const tableName =
            table.value.trim();

        if (!tableName) {
            status.textContent =
                "取込対象テーブルを選択してください。";

            return;
        }

        const selectedIdentityField =
            identityField.value.trim();

        const selectedResidentCodeField =
            residentCodeField.value.trim();

        const selectedResidentNameField =
            residentNameField.value.trim();

        const selectedBirthDateField =
            birthDateField.value.trim();

        if (
            !selectedIdentityField ||
            !selectedResidentCodeField ||
            !selectedResidentNameField ||
            !selectedBirthDateField
        ) {
            status.textContent =
                "レコード識別列・利用者コード列・利用者氏名列・生年月日列を選択してください。";

            return;
        }

        const requestPayload =
            payload();

        const missing =
            validatePayload(
                requestPayload
            );

        if (missing.length > 0) {
            status.textContent =
                `未入力があります: ${missing.join("、")}`;

            return;
        }

        status.textContent =
            "接続設定を保存しています…";

        try {
            await request(
                "/mysql/config",
                {
                    method: "PUT",
                    body:
                        JSON.stringify({
                            ...requestPayload,
                            query:
                                `SELECT * FROM \`${tableName.replaceAll(
                                    "`",
                                    "``"
                                )}\``,
                            identityField:
                                selectedIdentityField,
                            residentCodeField:
                                selectedResidentCodeField,
                            residentNameField:
                                selectedResidentNameField,
                            birthDateField:
                                selectedBirthDateField
                        })
                }
            );

            password.value =
                "";

            status.textContent =
                "MySQL接続設定を保存しました。項目マッピングも保存されました。";
        } catch (error) {
            status.textContent =
                `保存に失敗しました: ${error.message}`;
        }
    }
);
