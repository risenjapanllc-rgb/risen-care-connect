const express = require("express");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const PORT = 3001;

app.use(express.static("."));

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "RISEN CARE Connect サーバー起動中"
    });
});

app.get("/api/config", (req, res) => {
    res.json({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME
    });
});

app.get("/api/mysql-test", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

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

app.get("/api/tables", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        const [rows] = await connection.query("SHOW TABLES");

        res.json(rows);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

app.get("/api/columns/:table", async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

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

app.listen(PORT, () => {
    console.log(
        `RISEN CARE Connect 起動 http://localhost:${PORT}`
    );
});