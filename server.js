const express = require("express");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const PORT = 3001;

// ミドルウェア
app.use(express.static("."));
app.use(express.json());

// MySQL接続設定
function getDatabaseConfig() {
    return {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    };
}

// サーバー起動確認
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "RISEN CARE Connect サーバー起動中"
    });
});

// 接続設定確認
app.get("/api/config", (req, res) => {
    res.json({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME
    });
});

// MySQL接続確認
app.get("/api/mysql-test", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(getDatabaseConfig());

        await connection.query("SELECT 1");

        res.json({
            success: true,
            message: "MySQLへの接続に成功しました"
        });
    } catch (error) {
        console.error("MySQL接続エラー全体:", error);

        res.status(500).json({
            success: false,
            message: "MySQLへの接続に失敗しました",
            error: error.message || "詳細メッセージなし",
            code: error.code || "",
            errno: error.errno || "",
            sqlState: error.sqlState || ""
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// テーブル一覧取得
app.get("/api/tables", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(getDatabaseConfig());

        const [rows] = await connection.query("SHOW TABLES");

        res.json(rows);
    } catch (error) {
        console.error("テーブル一覧取得エラー:", error);

        res.status(500).json({
            success: false,
            message: "テーブル一覧の取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// 指定テーブルのカラム一覧取得
app.get("/api/columns/:table", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(getDatabaseConfig());

        const tableName = req.params.table;

        const [rows] = await connection.query(
            "SHOW COLUMNS FROM ??",
            [tableName]
        );

        res.json(rows);
    } catch (error) {
        console.error("カラム取得エラー:", error);

        res.status(500).json({
            success: false,
            message: "カラム一覧の取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// RISEN CARE標準項目一覧取得
app.get("/api/standard-fields", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(getDatabaseConfig());

        const [rows] = await connection.query(`
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
        `);

        res.json(rows);
    } catch (error) {
        console.error("標準項目取得エラー:", error);

        res.status(500).json({
            success: false,
            message: "標準項目一覧の取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// マッピング保存
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

        const standardFieldId = Number(standard_field_id);

        if (!Number.isInteger(standardFieldId) || standardFieldId <= 0) {
            return res.status(400).json({
                success: false,
                message: "standard_field_idは正の整数で指定してください"
            });
        }

        connection = await mysql.createConnection(getDatabaseConfig());

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

        res.status(201).json({
            success: true,
            message: "マッピングを保存しました",
            id: result.insertId
        });
    } catch (error) {
        console.error("マッピング保存エラー:", error);

        res.status(500).json({
            success: false,
            message: "マッピングの保存に失敗しました",
            error: error.message || "詳細メッセージなし",
            code: error.code || ""
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// 保存済みマッピング一覧取得
app.get("/api/mappings", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(getDatabaseConfig());

        const [rows] = await connection.query(`
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
        `);

        res.json(rows);
    } catch (error) {
        console.error("マッピング取得エラー:", error);

        res.status(500).json({
            success: false,
            message: "マッピング一覧の取得に失敗しました",
            error: error.message || "詳細メッセージなし"
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(
        `RISEN CARE Connect 起動 http://localhost:${PORT}`
    );
});

app.get("/api/table-mappings", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(
            getDatabaseConfig()
        );

        const [rows] = await connection.execute(`
            SELECT
                id,
                source_table,
                standard_entity,
                display_name,
                created_at,
                updated_at
            FROM table_mappings
            ORDER BY source_table
        `);

        res.json(rows);
    } catch (error) {
        console.error(
            "テーブル分類取得エラー:",
            error
        );

        res.status(500).json({
            error: "テーブル分類の取得に失敗しました"
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

app.post("/api/table-mappings", async (req, res) => {
    const {
        source_table,
        standard_entity,
        display_name
    } = req.body;

    if (!source_table || !standard_entity) {
        return res.status(400).json({
            error:
                "source_table と standard_entity は必須です"
        });
    }

    let connection;

    try {
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

        res.json({
            message: "テーブル分類を保存しました",
            id: result.insertId,
            source_table,
            standard_entity,
            display_name: display_name || null
        });
    } catch (error) {
        console.error(
            "テーブル分類保存エラー:",
            error
        );

        res.status(500).json({
            error: "テーブル分類の保存に失敗しました"
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});
