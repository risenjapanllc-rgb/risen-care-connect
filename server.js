"use strict";

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const path = require("path");
const crypto = require("crypto");
const CsvDataSourceAdapter =
    require("./adapters/csv/CsvDataSourceAdapter");
const CsvDataTypeDetector =
    require("./adapters/csv/CsvDataTypeDetector");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;


// ==========================================
// MySQL一時接続セッション
// パスワードはブラウザへ返さない
// ==========================================

const mysqlConnectionSessions = new Map();

const MYSQL_SESSION_TTL_MS =
    60 * 60 * 1000;

function createMysqlConnectionSession(config) {
    const connectionId =
        crypto.randomUUID();

    mysqlConnectionSessions.set(
        connectionId,
        {
            config: {
                ...config
            },
            expiresAt:
                Date.now() +
                MYSQL_SESSION_TTL_MS
        }
    );

    return connectionId;
}

function getMysqlConnectionSession(connectionId) {
    const id =
        String(connectionId || "").trim();

    if (!id) {
        return null;
    }

    const session =
        mysqlConnectionSessions.get(id);

    if (!session) {
        return null;
    }

    if (Date.now() > session.expiresAt) {
        mysqlConnectionSessions.delete(id);
        return null;
    }

    // 使用するたび有効期限を延長
    session.expiresAt =
        Date.now() +
        MYSQL_SESSION_TTL_MS;

    return session;
}


// ==========================================
// ミドルウェア
// ==========================================

app.use(cors());
app.use(express.json({
    limit: "50mb"
}));
app.use(express.static(__dirname));


// ==========================================
// MySQL接続設定
// ==========================================

function getDatabaseConfig() {
    return {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    };
}

function getRequestDatabaseConfig(req) {
    const connectionId =
        String(
            req.body?.connectionId ||
            req.headers["x-risen-connection-id"] ||
            ""
        ).trim();

    if (connectionId) {
        const session =
            getMysqlConnectionSession(
                connectionId
            );

        if (session?.config) {
            return {
                ...session.config
            };
        }
    }

    // 既存フローとの互換用
    return {
        host:
            String(req.body?.host || "").trim(),
        port:
            Number(req.body?.port) || 3306,
        database:
            String(req.body?.database || "").trim(),
        user:
            String(req.body?.user || "").trim(),
        password:
            String(req.body?.password || "")
    };
}


// ==========================================
// DB接続を安全に終了する
// ==========================================

async function closeConnection(connection) {
    if (!connection) {
        return;
    }

    try {
        await connection.end();
    } catch (error) {
        console.error("DB接続終了エラー:", error);
    }
}


// ==========================================
// サーバー起動確認
// ==========================================

app.get("/api/test", (req, res) => {
    return res.json({
        success: true,
        message: "RISEN CARE Connect サーバー起動中"
    });
});


// ==========================================
// 接続設定確認
// パスワードは返さない
// ==========================================

app.get("/api/config", (req, res) => {
    return res.json({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
    });
});


// ==========================================
// 既存MySQL接続セッション確認
// ==========================================

app.post("/api/mysql-session-test", async (req, res) => {
    let connection;

    try {
        const config =
            getRequestDatabaseConfig(req);

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続セッションが無効です。接続設定からやり直してください"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        await connection.query("SELECT 1");

        return res.json({
            success: true,
            message:
                "MySQL接続セッションは正常です"
        });

    } catch (error) {
        console.error(
            "MySQL接続セッション確認エラー:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "MySQL接続セッションの確認に失敗しました",
            error:
                error.message ||
                "詳細メッセージなし"
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// MySQL接続確認
// ==========================================

app.post("/api/mysql-test", async (req, res) => {
    let connection;

    try {
        const config = {
            host:
                String(req.body?.host || "").trim(),
            port:
                Number(req.body?.port) || 3306,
            database:
                String(req.body?.database || "").trim(),
            user:
                String(req.body?.user || "").trim(),
            password:
                String(req.body?.password || "")
        };

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "ホスト、データベース名、ユーザー名を入力してください"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        await connection.query("SELECT 1");

        const connectionId =
            createMysqlConnectionSession(
                config
            );

        return res.json({
            success: true,
            message:
                "MySQLへの接続に成功しました",
            connectionId
        });

    } catch (error) {
        console.error("MySQL接続エラー:", error);

        return res.status(500).json({
            success: false,
            message: "MySQLへの接続に失敗しました",
            error: error.message || "詳細メッセージなし",
            code: error.code || "",
            errno: error.errno || "",
            sqlState: error.sqlState || ""
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// テーブル一覧取得
// ==========================================

app.post("/api/tables", async (req, res) => {
    let connection;

    try {
        const config =
            getRequestDatabaseConfig(req);

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続情報が不足しています"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        const [rows] = await connection.query(
            `
            SELECT
                table_name
            FROM information_schema.tables
            WHERE table_schema = ?
              AND table_name NOT IN (
                  'mapping_settings',
                  'standard_fields',
                  'table_mappings',
                  'data_sources'
              )
            ORDER BY table_name
            `,
            [config.database]
        );

        return res.json(rows);

    } catch (error) {
        console.error("テーブル一覧取得エラー:", error);

        return res.status(500).json({
            success: false,
            message: "テーブル一覧の取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// 指定テーブルのカラム一覧取得
// ==========================================

app.post("/api/columns/:table", async (req, res) => {
    let connection;

    try {
        const config =
            getRequestDatabaseConfig(req);

        const tableName = String(
            req.params.table || ""
        ).trim();

        if (!tableName) {
            return res.status(400).json({
                success: false,
                message: "テーブル名が指定されていません"
            });
        }

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続情報が不足しています"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        const [rows] = await connection.query(
            "SHOW COLUMNS FROM ??",
            [tableName]
        );

        return res.json(rows);

    } catch (error) {
        console.error("カラム取得エラー:", error);

        return res.status(500).json({
            success: false,
            message: "カラム一覧の取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// 指定テーブルのサンプルデータを1件取得
// ==========================================

app.get("/api/sample/:table", async (req, res) => {
    let connection;

    try {
        const tableName = String(
            req.params.table || ""
        ).trim();

        if (!tableName) {
            return res.status(400).json({
                success: false,
                message: "テーブル名が指定されていません"
            });
        }

        const config =
            getRequestDatabaseConfig(req);

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続セッションが無効です。接続設定からやり直してください"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        const [rows] = await connection.query(
            "SELECT * FROM ?? LIMIT 1",
            [tableName]
        );

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.json({});
        }

        return res.json(rows[0]);

    } catch (error) {
        console.error("サンプル取得エラー:", error);

        return res.status(500).json({
            success: false,
            message: "サンプルデータの取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// RISEN CARE標準項目一覧取得
// ==========================================

app.get("/api/standard-fields", async (req, res) => {
    let connection;

    try {
        const config =
            getDatabaseConfig();

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続セッションが無効です。接続設定からやり直してください"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        const [rows] = await connection.query(
            `
            SELECT
                id,
                entity_name,
                field_name,
                display_name,
                data_type,
                required_flag,
                description,
                created_at,
                updated_at
            FROM standard_fields
            ORDER BY entity_name, id
            `
        );

        return res.json(rows);

    } catch (error) {
        console.error("標準項目取得エラー:", error);

        return res.status(500).json({
            success: false,
            message: "標準項目一覧の取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// 保存済みマッピング一覧取得
// ==========================================

app.get("/api/mappings", async (req, res) => {
    let connection;

    try {
        const config =
            getDatabaseConfig();

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続セッションが無効です。接続設定からやり直してください"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        const [rows] = await connection.query(
            `
            SELECT
                ms.id,
                ms.source_table,
                ms.source_column,
                ms.standard_field_id,
                sf.entity_name,
                sf.field_name,
                sf.display_name,
                sf.data_type,
                ms.transformation_rule,
                ms.is_required,
                ms.created_at,
                ms.updated_at
            FROM mapping_settings AS ms
            INNER JOIN standard_fields AS sf
                ON ms.standard_field_id = sf.id
            ORDER BY
                ms.source_table,
                ms.source_column,
                ms.id
            `
        );

        return res.json(rows);

    } catch (error) {
        console.error("マッピング取得エラー:", error);

        return res.status(500).json({
            success: false,
            message: "マッピング一覧の取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// マッピング保存
// ==========================================

app.post("/api/mappings", async (req, res) => {
    let connection;

    try {
        const {
            source_table,
            source_column,
            standard_field_id,
            transformation_rule = null,
            is_required = false
        } = req.body;

        if (
            !source_table ||
            !source_column ||
            standard_field_id === undefined ||
            standard_field_id === null
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "source_table、source_column、standard_field_idは必須です"
            });
        }

        const standardFieldId = Number(
            standard_field_id
        );

        if (
            !Number.isInteger(standardFieldId) ||
            standardFieldId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "standard_field_idは正の整数で指定してください"
            });
        }

        const config =
            getDatabaseConfig();

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続セッションが無効です。接続設定からやり直してください"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        const [existingRows] = await connection.execute(
            `
            SELECT id
            FROM mapping_settings
            WHERE source_table = ?
              AND source_column = ?
            ORDER BY id DESC
            LIMIT 1
            `,
            [
                source_table,
                source_column
            ]
        );

        if (existingRows.length > 0) {
            const mappingId = existingRows[0].id;

            await connection.execute(
                `
                UPDATE mapping_settings
                SET
                    standard_field_id = ?,
                    transformation_rule = ?,
                    is_required = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                `,
                [
                    standardFieldId,
                    transformation_rule,
                    Boolean(is_required),
                    mappingId
                ]
            );

            return res.json({
                success: true,
                message: "マッピングを更新しました",
                id: mappingId
            });
        }

        const [result] = await connection.execute(
            `
            INSERT INTO mapping_settings (
                source_table,
                source_column,
                standard_field_id,
                transformation_rule,
                is_required
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                source_table,
                source_column,
                standardFieldId,
                transformation_rule,
                Boolean(is_required)
            ]
        );

        return res.status(201).json({
            success: true,
            message: "マッピングを保存しました",
            id: result.insertId
        });

    } catch (error) {
        console.error("マッピング保存エラー:", error);

        return res.status(500).json({
            success: false,
            message: "マッピングの保存に失敗しました",
            error: error.message || "詳細メッセージなし",
            code: error.code || ""
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// テーブル分類一覧取得
// ==========================================

app.post("/api/table-mappings/list", async (req, res) => {
    let connection;

    try {
        const config =
            getDatabaseConfig();

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続情報が不足しています"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        const [rows] = await connection.execute(
            `
            SELECT
                id,
                source_table,
                standard_entity,
                display_name,
                created_at,
                updated_at
            FROM table_mappings
            ORDER BY source_table
            `
        );

        return res.json(rows);

    } catch (error) {
        console.error("テーブル分類取得エラー:", error);

        return res.status(500).json({
            success: false,
            message: "テーブル分類の取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// テーブル分類保存
// ==========================================

app.post("/api/table-mappings", async (req, res) => {
    let connection;

    try {
        const config =
            getDatabaseConfig();

        const {
            source_table,
            standard_entity,
            display_name
        } = req.body;

        if (!source_table || !standard_entity) {
            return res.status(400).json({
                success: false,
                message:
                    "source_table と standard_entity は必須です"
            });
        }

        if (
            !config.host ||
            !config.database ||
            !config.user
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続情報が不足しています"
            });
        }

        connection = await mysql.createConnection(
            config
        );

        const [result] = await connection.execute(
            `
            INSERT INTO table_mappings (
                source_table,
                standard_entity,
                display_name
            )
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                standard_entity = VALUES(standard_entity),
                display_name = VALUES(display_name),
                updated_at = CURRENT_TIMESTAMP
            `,
            [
                source_table,
                standard_entity,
                display_name || null
            ]
        );

        return res.json({
            success: true,
            message: "テーブル分類を保存しました",
            id: result.insertId,
            source_table,
            standard_entity,
            display_name: display_name || null
        });

    } catch (error) {
        console.error("テーブル分類保存エラー:", error);

        return res.status(500).json({
            success: false,
            message: "テーブル分類の保存に失敗しました",
            error: error.message || "詳細メッセージなし"
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// Data Source 登録
// 一時MySQL接続をAIKOの永続データソースへ登録
// ==========================================

app.post("/api/data-sources/register", async (req, res) => {
    let connection;

    try {
        const connectionId =
            String(
                req.body?.connectionId || ""
            ).trim();

        const displayName =
            String(
                req.body?.displayName ||
                "MySQL Data Source"
            ).trim();

        if (!connectionId) {
            return res.status(400).json({
                success: false,
                message:
                    "connectionId は必須です"
            });
        }

        const session =
            getMysqlConnectionSession(
                connectionId
            );

        if (!session?.config) {
            return res.status(400).json({
                success: false,
                message:
                    "MySQL接続セッションが無効です。接続設定からやり直してください"
            });
        }

        const config = session.config;

        connection = await mysql.createConnection(
            config
        );

        await connection.query("SELECT 1");

        const safeConfig = {
            host:
                config.host,
            port:
                Number(config.port) || 3306,
            database:
                config.database,
            user:
                config.user
        };

        const [result] =
            await connection.execute(
                `
                INSERT INTO data_sources (
                    source_type,
                    display_name,
                    status,
                    config_json,
                    secret_ref,
                    last_verified_at
                )
                VALUES (
                    'mysql',
                    ?,
                    'verified',
                    ?,
                    NULL,
                    NOW()
                )
                `,
                [
                    displayName,
                    JSON.stringify(safeConfig)
                ]
            );

        const dataSourceId =
            result.insertId;

        session.dataSourceId =
            dataSourceId;

        return res.status(201).json({
            success: true,
            message:
                "AIKOデータソースとして登録しました",
            dataSourceId,
            sourceType:
                "mysql",
            displayName
        });

    } catch (error) {
        console.error(
            "データソース登録エラー:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "データソースの登録に失敗しました",
            error:
                error.message ||
                "詳細メッセージなし"
        });

    } finally {
        await closeConnection(connection);
    }
});


// ==========================================
// CSV PoC: 利用者基本情報の読み込み処理
// Metadata -> Mapping -> Validation
// ==========================================

app.post("/api/csv/poc/process", async (req, res) => {
    const csvText = String(req.body?.csvText || "");

    const answers =
        req.body &&
        typeof req.body.answers === "object" &&
        req.body.answers !== null
            ? req.body.answers
            : {};

    const dataTypeMode =
        String(req.body?.dataTypeMode || "auto");

    if (!csvText.trim()) {
        return res.status(400).json({
            success: false,
            message: "CSV内容が空です"
        });
    }

    const adapter = new CsvDataSourceAdapter({
        csvText
    });

    try {
        const connectionResult =
            await adapter.validateConnection({
                csvText
            });

        if (!connectionResult.success) {
            return res.status(400).json({
                success: false,
                message: connectionResult.message,
                metadata: connectionResult.metadata || {}
            });
        }

        const metadata =
            await adapter.buildMetadata({
                csvText
            });

        // CSV全体の構造からデータ種別を判定
        const detector =
            new CsvDataTypeDetector();

        const detectedDataType =
            detector.detect(metadata);

        const manualDataTypes = {
            resident_basic_info: "利用者基本情報",
            support_record: "支援記録"
        };

        const manualTypeLabel =
            manualDataTypes[dataTypeMode] || null;

        const dataType =
            manualTypeLabel
                ? {
                    ...detectedDataType,
                    type: dataTypeMode,
                    label: manualTypeLabel,
                    source: "manual",
                    detectedType: detectedDataType.type,
                    detectedLabel: detectedDataType.label,
                    detectedConfidence:
                        detectedDataType.confidence,
                    matchesDetection:
                        detectedDataType.type === dataTypeMode
                }
                : {
                    ...detectedDataType,
                    source: "auto",
                    detectedType: detectedDataType.type,
                    detectedLabel: detectedDataType.label,
                    detectedConfidence:
                        detectedDataType.confidence,
                    matchesDetection: true
                };

        // 採用されたデータ種類に対応する
        // 標準フィールドセットを metadata に設定
        metadata.standardFields =
            adapter.getStandardFields(
                dataType.type
            );

        const mapping =
            adapter.buildMapping(
                metadata,
                answers
            );

        const validation =
            adapter.buildValidation(
                metadata,
                mapping
            );

        return res.json({
            success: true,
            sourceType: "csv",
            dataType,
            metadata,
            mapping,
            validation
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "CSV処理中にエラーが発生しました",
            error: error.message || "詳細メッセージなし"
        });

    } finally {
        await adapter.disconnect();
    }
});


// ==========================================
// 存在しないAPI
// ==========================================

app.use("/api", (req, res) => {
    return res.status(404).json({
        success: false,
        message: "指定されたAPIが見つかりません"
    });
});


// ==========================================
// サーバー起動
// 必ず全APIの後に置く
// ==========================================

app.listen(PORT, () => {
    console.log(
        `RISEN CARE Connect 起動 http://localhost:${PORT}`
    );
});