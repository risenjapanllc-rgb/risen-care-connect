"use strict";

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;


// ==========================================
// ミドルウェア
// ==========================================

app.use(cors());
app.use(express.json());
app.use(express.static("."));


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
// MySQL接続確認
// ==========================================

app.get("/api/mysql-test", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(
            getDatabaseConfig()
        );

        await connection.query("SELECT 1");

        return res.json({
            success: true,
            message: "MySQLへの接続に成功しました"
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

app.get("/api/tables", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(
            getDatabaseConfig()
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
                  'table_mappings'
              )
            ORDER BY table_name
            `,
            [process.env.DB_NAME]
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

app.get("/api/columns/:table", async (req, res) => {
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

        connection = await mysql.createConnection(
            getDatabaseConfig()
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

        connection = await mysql.createConnection(
            getDatabaseConfig()
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
        connection = await mysql.createConnection(
            getDatabaseConfig()
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
        connection = await mysql.createConnection(
            getDatabaseConfig()
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

        connection = await mysql.createConnection(
            getDatabaseConfig()
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

app.get("/api/table-mappings", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(
            getDatabaseConfig()
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

        connection = await mysql.createConnection(
            getDatabaseConfig()
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