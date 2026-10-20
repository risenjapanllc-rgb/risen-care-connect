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

const LocalConnectorConfig =
    require("./local-connector/LocalConnectorConfig");

const SupabaseConnectorTrustAuthProvider =
    require(
        "./server-trust-boundary/SupabaseConnectorTrustAuthProvider"
    );

const SupabaseConnectorActivationHandoffRepository =
    require(
        "./server-trust-boundary/SupabaseConnectorActivationHandoffRepository"
    );

const StandardMeaningAiProposalGenerator =
    require(
        "./server-trust-boundary/StandardMeaningAiProposalGenerator"
    );

require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const connectorActivationHandoffAuthProvider =
    new SupabaseConnectorTrustAuthProvider({
        supabaseUrl:
            process.env.SUPABASE_URL,
        apiKey:
            process.env.SUPABASE_PUBLISHABLE_KEY,
        email:
            process.env.SUPABASE_CONNECTOR_TRUST_EMAIL,
        password:
            process.env.SUPABASE_CONNECTOR_TRUST_PASSWORD
    });

const connectorActivationHandoffRepository =
    new SupabaseConnectorActivationHandoffRepository({
        supabaseUrl:
            process.env.SUPABASE_URL,
        apiKey:
            process.env.SUPABASE_PUBLISHABLE_KEY,
        authProvider:
            connectorActivationHandoffAuthProvider
    });


async function verifyRisenAdminRequest(req) {
    const authorization =
        String(
            req.headers.authorization || ""
        ).trim();

    const match =
        authorization.match(
            /^Bearer\s+(.+)$/i
        );

    if (!match) {
        return {
            status:
                "unauthenticated"
        };
    }

    const accessToken =
        String(match[1] || "").trim();

    const supabaseUrl =
        String(
            process.env.SUPABASE_URL || ""
        )
            .trim()
            .replace(/\/$/, "");

    const publishableKey =
        String(
            process.env.SUPABASE_PUBLISHABLE_KEY || ""
        ).trim();

    if (
        !supabaseUrl ||
        !publishableKey
    ) {
        return {
            status:
                "configuration_error"
        };
    }

    let response;

    try {
        response =
            await fetch(
                `${supabaseUrl}/auth/v1/user`,
                {
                    method: "GET",
                    headers: {
                        apikey:
                            publishableKey,
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );
    } catch {
        return {
            status:
                "verification_unavailable"
        };
    }

    if (!response.ok) {
        return {
            status:
                "unauthenticated"
        };
    }

    let user;

    try {
        user =
            await response.json();
    } catch {
        return {
            status:
                "verification_unavailable"
        };
    }

    const authRole =
        String(
            user?.role || ""
        ).trim();

    const risenCareRole =
        String(
            user?.app_metadata
                ?.risencare_role || ""
        ).trim();

    if (
        authRole !== "authenticated" ||
        risenCareRole !==
            "risen_admin"
    ) {
        return {
            status:
                "forbidden"
        };
    }

    return {
        status:
            "authenticated",
        accessToken
    };
}


async function verifyFacilitySystemRequest(req) {
    const authorization =
        String(
            req.headers.authorization || ""
        ).trim();

    const match =
        authorization.match(
            /^Bearer\s+(.+)$/i
        );

    if (!match) {
        return {
            status:
                "unauthenticated"
        };
    }

    const accessToken =
        String(match[1] || "").trim();

    const supabaseUrl =
        String(
            process.env.SUPABASE_URL || ""
        )
            .trim()
            .replace(/\/$/, "");

    const publishableKey =
        String(
            process.env.SUPABASE_PUBLISHABLE_KEY || ""
        ).trim();

    if (
        !supabaseUrl ||
        !publishableKey
    ) {
        return {
            status:
                "configuration_error"
        };
    }

    let response;

    try {
        response =
            await fetch(
                `${supabaseUrl}/auth/v1/user`,
                {
                    method: "GET",
                    headers: {
                        apikey:
                            publishableKey,
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );
    } catch (error) {
        return {
            status:
                "verification_unavailable"
        };
    }

    if (!response.ok) {
        return {
            status:
                "unauthenticated"
        };
    }

    let user;

    try {
        user =
            await response.json();
    } catch (error) {
        return {
            status:
                "verification_unavailable"
        };
    }

    const authRole =
        String(
            user?.role || ""
        ).trim();

    const risenCareRole =
        String(
            user?.app_metadata?.risencare_role || ""
        ).trim();

    if (
        authRole !== "authenticated" ||
        risenCareRole !== "facility_system"
    ) {
        return {
            status:
                "forbidden"
        };
    }

    return {
        status:
            "authenticated",
        accessToken
    };
}


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
app.get(
    "/js/semantic-candidate-signal-adapter.js",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "server-domain",
                "semantic-resolution",
                "SemanticCandidateSignalAdapter.js"
            )
        );
    }
);

app.get(
    "/js/semantic-candidate-resolver.js",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "server-domain",
                "semantic-resolution",
                "SemanticCandidateResolver.js"
            )
        );
    }
);

app.get(
    "/js/semantic-review-model.js",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "server-domain",
                "semantic-review",
                "SemanticReviewModel.js"
            )
        );
    }
);

app.get(
    "/js/semantic-projection-resolver.js",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "server-domain",
                "semantic-resolution",
                "SemanticProjectionResolver.js"
            )
        );
    }
);


app.get(
    "/js/semantic-registration.js",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "js",
                "semantic-registration.js"
            )
        );
    }
);

/*
 * Browserへ公開するVonage Client SDK。
 * node_modules全体のURLへ直接依存せず、
 * 必要なbundleだけを固定経路で配信する。
 */
app.get(
    "/vendor/vonage-client-sdk.js",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "node_modules",
                "@vonage",
                "client-sdk",
                "dist",
                "vonageClientSDK.min.js"
            )
        );
    }
);

/*
 * Public UI allowlist.
 *
 * リポジトリ全体を静的公開せず、
 * Browserで必要なファイルだけを明示的に配信する。
 */
app.get("/", (req, res) => {
    return res.sendFile(
        path.join(__dirname, "index.html")
    );
});

app.get("/index.html", (req, res) => {
    return res.sendFile(
        path.join(__dirname, "index.html")
    );
});

app.get("/local-connector.html", (req, res) => {
    return res.sendFile(
        path.join(__dirname, "local-connector.html")
    );
});

app.get(
    "/semantic-registration.html",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "semantic-registration.html"
            )
        );
    }
);

app.get(
    "/semantic-workspace.html",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "semantic-workspace.html"
            )
        );
    }
);

app.get(
    "/connect",
    (req, res) => {
        res.setHeader(
            "Cache-Control",
            "no-store"
        );

        return res.sendFile(
            path.join(
                __dirname,
                "connector-activation-bridge.html"
            )
        );
    }
);

app.get(
    "/connector-activation-bridge",
    (req, res) => {
        res.setHeader(
            "Cache-Control",
            "no-store"
        );

        return res.sendFile(
            path.join(
                __dirname,
                "connector-activation-bridge.html"
            )
        );
    }
);

app.post(
    "/api/connector-activation-handoffs",
    async (req, res) => {

        const authentication =
            await verifyFacilitySystemRequest(
                req
            );


        if (
            authentication.status ===
            "unauthenticated"
        ) {
            return res.status(401).json({
                success: false,
                errorCode:
                    "facility_system_authentication_required"
            });
        }

        if (
            authentication.status ===
            "forbidden"
        ) {
            return res.status(403).json({
                success: false,
                errorCode:
                    "facility_system_role_required"
            });
        }

        if (
            authentication.status !==
            "authenticated"
        ) {
            return res.status(503).json({
                success: false,
                errorCode:
                    "facility_system_authentication_unavailable"
            });
        }

        const activationToken =
            String(
                req.body?.activationToken || ""
            ).trim();

        const connectorId =
            String(
                req.body?.connectorId || ""
            ).trim();

        const activationTokenValid =
            /^ract_[0-9a-f]{64}$/
                .test(activationToken);

        const connectorIdValid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                .test(connectorId);


        if (
            !activationTokenValid ||
            !connectorIdValid
        ) {
            return res.status(400).json({
                success: false,
                errorCode:
                    "invalid_activation_handoff"
            });
        }

        const handoffId =
            crypto.randomBytes(32)
                .toString("hex");

        try {
            await connectorActivationHandoffRepository
                .create({
                    handoffId,
                    connectorId,
                    activationToken,
                    facilitySystemAccessToken:
                        authentication.accessToken,
                    ttlSeconds:
                        120
                });
        } catch (error) {
            return res.status(503).json({
                success: false,
                errorCode:
                    "activation_handoff_persistence_unavailable"
            });
        }

        res.setHeader(
            "Cache-Control",
            "no-store"
        );

        return res.status(201).json({
            success: true,
            handoffId,
            expiresInSeconds: 120
        });
    }
);

app.get(
    "/connector-activation-bridge/complete",
    async (req, res) => {
        const handoffId =
            String(
                req.query?.handoffId || ""
            ).trim();

        if (
            !/^[0-9a-f]{64}$/
                .test(handoffId)
        ) {
            return res
                .status(400)
                .send(
                    "Invalid activation handoff"
                );
        }

        let entry;

        try {
            entry =
                await connectorActivationHandoffRepository
                    .consume({
                        handoffId
                    });
        } catch (error) {
            return res
                .status(503)
                .send(
                    "Activation handoff service unavailable"
                );
        }

        if (
            !entry ||
            entry.status !== "consumed"
        ) {
            return res
                .status(404)
                .send(
                    "Activation handoff expired or already used"
                );
        }

        res.setHeader(
            "Cache-Control",
            "no-store"
        );

        res.setHeader(
            "Referrer-Policy",
            "no-referrer"
        );

        const activationTokenJson =
            JSON.stringify(
                entry.activationToken
            );

        const connectorIdJson =
            JSON.stringify(
                entry.connectorId
            );

        return res
            .type("html")
            .send(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width, initial-scale=1">
<title>RISEN CARE PC接続</title>
</head>
<body>
<main>
<h1>RISEN CARE</h1>
<p id="status">
このPCの接続を確認しています…
</p>
</main>

<script>
(async function () {
  const status =
    document.getElementById("status");

  const activationToken =
    ${activationTokenJson};

  const expectedConnectorId =
    ${connectorIdJson};

  try {
    const identityResponse =
      await fetch(
        "http://127.0.0.1:4310/identity",
        {
          method: "GET",
          cache: "no-store",
          mode: "cors",
          targetAddressSpace:
            "loopback"
        }
      );

    if (!identityResponse.ok) {
      throw new Error(
        "Local Connectorへ接続できません。"
      );
    }

    const identity =
      await identityResponse.json();

    const localConnectorId =
      identity &&
      typeof identity.connectorId ===
        "string"
        ? identity.connectorId.trim()
        : "";

    if (!localConnectorId) {
      throw new Error(
        "Connector IDを取得できません。"
      );
    }

    if (
      localConnectorId !==
        expectedConnectorId
    ) {
      throw new Error(
        "この接続情報は別のPC用です。"
      );
    }

    status.textContent =
      "このPCへ接続情報を保存しています…";

    const activationResponse =
      await fetch(
        "http://127.0.0.1:4310/activate",
        {
          method: "POST",
          cache: "no-store",
          mode: "cors",
          targetAddressSpace:
            "loopback",
          headers: {
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify({
              activationToken:
                activationToken
            })
        }
      );

    const activation =
      await activationResponse.json();

    if (
      !activationResponse.ok ||
      !activation ||
      activation.success !== true
    ) {
      throw new Error(
        "このPCを接続できませんでした。"
      );
    }

    status.textContent =
      "このPCの接続が完了しました。";

  } catch (error) {
    status.textContent =
      error && error.message
        ? error.message
        : "このPCを接続できませんでした。";
  }
})();
</script>
</body>
</html>`);
    }
);

app.get("/style.css", (req, res) => {
    return res.sendFile(
        path.join(__dirname, "style.css")
    );
});

[
    "common.js",
    "standard-field-mapping.js",
    "document-type-profiles.js",
    "semantic-projection-policy.js",
    "local-connector-runtime-compatibility-policy.js",
    "local-connector.js"
].forEach(fileName => {
    app.get(`/js/${fileName}`, (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "js",
                fileName
            )
        );
    });
});


// ==========================================
// Voice Client Token Proxy
//
// BrowserへConnector credentialや電話番号を
// 渡さず、localhost serverからTrust Boundaryへ
// token発行要求を中継する。
// ==========================================

const voiceLocalConnectorConfig =
    new LocalConnectorConfig();

function isLoopbackAddress(address) {
    const value =
        String(address || "").trim();

    return (
        value === "127.0.0.1" ||
        value === "::1" ||
        value === "::ffff:127.0.0.1"
    );
}

function getVoiceTokenEndpoint() {
    const configured =
        String(
            process.env
                .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT ||
            ""
        ).trim();

    if (!configured) {
        throw new Error(
            "RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT is missing"
        );
    }

    const parsed =
        new URL(configured);

    const isLocalhost =
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "::1";

    if (
        parsed.protocol !== "https:" &&
        !(
            parsed.protocol === "http:" &&
            isLocalhost
        )
    ) {
        throw new Error(
            "Voice token Trust Boundary endpoint must use HTTPS or localhost HTTP"
        );
    }

    return new URL(
        "/connector/voice-token",
        parsed.origin
    ).toString();
}

app.post(
    "/api/voice/client-token",
    async (req, res) => {
        /*
         * Local PoC boundary.
         *
         * A malicious remote website must not be able
         * to use this localhost proxy to obtain tokens.
         */
        if (
            !isLoopbackAddress(
                req.socket?.remoteAddress
            )
        ) {
            return res.status(403).json({
                errorCode:
                    "voice_client_proxy_forbidden"
            });
        }

        const origin =
            typeof req.headers.origin ===
                "string"
                ? req.headers.origin.trim()
                : "";

        if (origin) {
            let parsedOrigin;

            try {
                parsedOrigin =
                    new URL(origin);
            } catch (error) {
                return res.status(403).json({
                    errorCode:
                        "voice_client_proxy_forbidden"
                });
            }

            const originHost =
                parsedOrigin.hostname;

            if (
                originHost !== "localhost" &&
                originHost !== "127.0.0.1" &&
                originHost !== "::1"
            ) {
                return res.status(403).json({
                    errorCode:
                        "voice_client_proxy_forbidden"
                });
            }
        }

        const body =
            req.body;

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body)
        ) {
            return res.status(400).json({
                errorCode:
                    "malformed_json"
            });
        }

        const allowedKeys = [
            "caseId",
            "contactId"
        ];

        if (
            Object.keys(body).some(
                key =>
                    !allowedKeys.includes(key)
            )
        ) {
            return res.status(400).json({
                errorCode:
                    "malformed_json"
            });
        }

        const caseId =
            typeof body.caseId === "string"
                ? body.caseId.trim()
                : "";

        const contactId =
            typeof body.contactId === "string"
                ? body.contactId.trim()
                : "";

        if (!caseId || !contactId) {
            return res.status(422).json({
                errorCode:
                    "voice_token_request_invalid"
            });
        }

        const credential =
            String(
                process.env
                    .CONNECTOR_CREDENTIAL ||
                ""
            ).trim();

        if (!credential) {
            return res.status(503).json({
                errorCode:
                    "voice_client_proxy_unavailable"
            });
        }

        try {
            const connectorId =
                await voiceLocalConnectorConfig
                    .getConnectorId();

            const endpoint =
                getVoiceTokenEndpoint();

            const controller =
                new AbortController();

            const timeout =
                setTimeout(
                    () =>
                        controller.abort(),
                    10000
                );

            let response;

            try {
                response =
                    await fetch(
                        endpoint,
                        {
                            method:
                                "POST",

                            headers: {
                                "content-type":
                                    "application/json",

                                "authorization":
                                    `RISEN-Connector ${credential}`,

                                "x-risen-connector-id":
                                    connectorId
                            },

                            body:
                                JSON.stringify({
                                    caseId,
                                    contactId
                                }),

                            signal:
                                controller.signal
                        }
                    );
            } finally {
                clearTimeout(timeout);
            }

            let upstream = {};

            try {
                upstream =
                    await response.json();
            } catch (error) {
                upstream = {};
            }

            if (
                response.status === 200 &&
                upstream?.status ===
                    "issued" &&
                typeof upstream.token ===
                    "string" &&
                upstream.token &&
                typeof upstream.intentId ===
                    "string" &&
                upstream.intentId
            ) {
                return res.status(200).json({
                    requestId:
                        upstream.requestId,

                    status:
                        "issued",

                    token:
                        upstream.token,

                    intentId:
                        upstream.intentId,

                    expiresIn:
                        upstream.expiresIn
                });
            }

            const allowedStatuses =
                new Set([
                    400,
                    401,
                    422,
                    503
                ]);

            const status =
                allowedStatuses.has(
                    response.status
                )
                    ? response.status
                    : 502;

            return res.status(status).json({
                requestId:
                    upstream?.requestId,

                errorCode:
                    (
                        typeof upstream?.errorCode ===
                            "string" &&
                        upstream.errorCode
                    )
                        ? upstream.errorCode
                        : "voice_token_proxy_failed"
            });

        } catch (error) {
            return res.status(503).json({
                errorCode:
                    "voice_client_proxy_unavailable"
            });
        }
    }
);


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
    try {
        const {
            listStandardMeanings
        } = require("./server-domain/standard-fields/RisenStandardMeaningCatalog");

        const staticMeanings =
            listStandardMeanings();

        const supabaseUrl =
            String(
                process.env.SUPABASE_URL || ""
            )
                .trim()
                .replace(/\/+$/, "");

        const publishableKey =
            String(
                process.env.SUPABASE_PUBLISHABLE_KEY || ""
            ).trim();

        let dynamicRows = [];

        if (
            supabaseUrl &&
            publishableKey
        ) {
            try {
                const response =
                    await fetch(
                        `${supabaseUrl}/rest/v1/rpc/list_active_standard_meanings`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                apikey:
                                    publishableKey,
                                Authorization:
                                    `Bearer ${publishableKey}`
                            },
                            body:
                                JSON.stringify({})
                        }
                    );

                if (response.ok) {
                    const result =
                        await response.json();

                    if (Array.isArray(result)) {
                        dynamicRows =
                            result;
                    } else {
                        console.warn(
                            "Standard Meaning query returned invalid result; using static catalog only"
                        );
                    }
                } else {
                    console.warn(
                        `Standard Meaning query failed: ${response.status}; using static catalog only`
                    );
                }
            } catch (error) {
                console.warn(
                    "Standard Meaning query unavailable; using static catalog only:",
                    error?.message ||
                        "unknown error"
                );
            }
        }

        const merged =
            new Map();

        for (const meaning of staticMeanings) {
            const key =
                `${meaning.entityName}.${meaning.fieldName}`;

            merged.set(
                key,
                {
                    entityName:
                        meaning.entityName,
                    fieldName:
                        meaning.fieldName,
                    displayName:
                        meaning.displayName,
                    synonyms:
                        Array.isArray(
                            meaning.synonyms
                        )
                            ? meaning.synonyms
                            : []
                }
            );
        }

        for (const row of dynamicRows) {
            const entityName =
                typeof row?.entity_name ===
                    "string"
                    ? row.entity_name.trim()
                    : "";

            const fieldName =
                typeof row?.field_name ===
                    "string"
                    ? row.field_name.trim()
                    : "";

            const displayName =
                typeof row?.display_name ===
                    "string"
                    ? row.display_name.trim()
                    : "";

            if (
                !entityName ||
                !fieldName ||
                !displayName
            ) {
                continue;
            }

            const key =
                `${entityName}.${fieldName}`;

            if (merged.has(key)) {
                continue;
            }

            merged.set(
                key,
                {
                    entityName,
                    fieldName,
                    displayName,
                    synonyms:
                        Array.isArray(
                            row?.synonyms
                        )
                            ? row.synonyms
                                .filter(
                                    value =>
                                        typeof value ===
                                            "string" &&
                                        value.trim()
                                )
                                .map(
                                    value =>
                                        value.trim()
                                )
                            : []
                }
            );
        }

        const rows =
            Array.from(
                merged.values()
            ).map(
                (meaning, index) => ({
                    id:
                        `risen-standard-meaning-${index + 1}`,
                    entity_name:
                        meaning.entityName,
                    field_name:
                        meaning.fieldName,
                    display_name:
                        meaning.displayName,
                    data_type:
                        null,
                    required_flag:
                        0,
                    description:
                        null,
                    synonyms:
                        meaning.synonyms
                })
            );

        return res.json(rows);
    } catch (error) {
        console.error(
            "RISEN標準意味カタログ取得エラー:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "RISEN標準項目一覧の取得に失敗しました"
        });
    }
});



app.post("/api/context-resolution", (req, res) => {
    try {
        const {
            resolveSubjectContext
        } = require("./server-domain/context-resolution/ContextResolver");

        const fieldDefinitions =
            Array.isArray(req.body?.fieldDefinitions)
                ? req.body.fieldDefinitions
                : [];

        const confirmedDocumentType =
            typeof req.body?.confirmedDocumentType === "string"
                ? req.body.confirmedDocumentType.trim()
                : null;

        const semanticEvidence =
            Array.isArray(req.body?.semanticEvidence)
                ? req.body.semanticEvidence
                : [];

        const sourceFields =
            Array.isArray(req.body?.sourceFields)
                ? req.body.sourceFields
                : [];

        const result = resolveSubjectContext({
            fieldDefinitions,
            confirmedDocumentType,
            semanticEvidence,
            sourceFields
        });

        return res.json({
            success: true,
            context: result
        });
    } catch (error) {
        console.error(
            "Context Resolution エラー:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "データ文脈の解析に失敗しました"
        });
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

app.get(
    "/semantic-admin.html",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "semantic-admin.html"
            )
        );
    }
);


app.get(
    "/js/semantic-admin.js",
    (req, res) => {
        return res.sendFile(
            path.join(
                __dirname,
                "js",
                "semantic-admin.js"
            )
        );
    }
);


app.post(
    "/api/admin/session",
    async (req, res) => {
        const supabaseUrl =
            String(
                process.env.SUPABASE_URL ||
                ""
            )
                .trim()
                .replace(/\/$/, "");

        const publishableKey =
            String(
                process.env
                    .SUPABASE_PUBLISHABLE_KEY ||
                ""
            ).trim();

        if (
            !supabaseUrl ||
            !publishableKey
        ) {
            return res.status(503).json({
                success: false,
                errorCode:
                    "admin_authentication_unavailable"
            });
        }

        let response;

        try {
            response =
                await fetch(
                    `${supabaseUrl}/auth/v1/token?grant_type=password`,
                    {
                        method: "POST",
                        headers: {
                            apikey:
                                publishableKey,
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                email:
                                    req.body?.email,
                                password:
                                    req.body?.password
                            })
                    }
                );
        } catch {
            return res.status(503).json({
                success: false,
                errorCode:
                    "admin_authentication_unavailable"
            });
        }

        let body = {};

        try {
            body =
                await response.json();
        } catch {}

        if (!response.ok) {
            return res.status(401).json({
                success: false,
                errorCode:
                    "admin_authentication_required"
            });
        }

        const accessToken =
            typeof body?.access_token ===
                "string"
                ? body.access_token
                : "";

        const risenCareRole =
            String(
                body?.user?.app_metadata
                    ?.risencare_role ||
                ""
            ).trim();

        if (
            !accessToken ||
            risenCareRole !==
                "risen_admin"
        ) {
            return res.status(403).json({
                success: false,
                errorCode:
                    "risen_admin_role_required"
            });
        }

        return res.json({
            success: true,
            accessToken
        });
    }
);


app.get(
    "/api/admin/standard-meaning-candidates",
    async (req, res) => {
        const authentication =
            await verifyRisenAdminRequest(
                req
            );

        if (
            authentication.status ===
                "unauthenticated"
        ) {
            return res.status(401).json({
                success: false,
                errorCode:
                    "admin_authentication_required"
            });
        }

        if (
            authentication.status ===
                "forbidden"
        ) {
            return res.status(403).json({
                success: false,
                errorCode:
                    "risen_admin_role_required"
            });
        }

        if (
            authentication.status !==
                "authenticated"
        ) {
            return res.status(503).json({
                success: false,
                errorCode:
                    "admin_authentication_unavailable"
            });
        }

        const supabaseUrl =
            String(
                process.env.SUPABASE_URL ||
                ""
            )
                .trim()
                .replace(/\/$/, "");

        const publishableKey =
            String(
                process.env
                    .SUPABASE_PUBLISHABLE_KEY ||
                ""
            ).trim();

        const response =
            await fetch(
                `${supabaseUrl}/rest/v1/rpc/risen_admin_list_standard_meaning_candidates`,
                {
                    method: "POST",
                    headers: {
                        apikey:
                            publishableKey,
                        Authorization:
                            `Bearer ${authentication.accessToken}`,
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({})
                }
            );

        if (!response.ok) {
            return res.status(
                response.status
            ).json({
                success: false,
                errorCode:
                    "standard_meaning_candidate_query_failed"
            });
        }

        const rows =
            await response.json();

        return res.json({
            success: true,
            candidates:
                Array.isArray(rows)
                    ? rows.map(row => ({
                        candidateId:
                            row.candidate_id,
                        facilityId:
                            row.facility_id,
                        connectorId:
                            row.connector_id,
                        templateId:
                            row.template_id,
                        templateFieldKey:
                            row.template_field_key,
                        proposedMeaning:
                            row.proposed_meaning,
                        evidence:
                            row.evidence,
                        status:
                            row.status,
                        acceptedMeaningId:
                            row.accepted_meaning_id,
                        submittedAt:
                            row.submitted_at,
                        acceptedAt:
                            row.accepted_at
                    }))
                    : []
        });
    }
);



app.post(
    "/api/admin/standard-meaning-candidates/:candidateId/proposal",
    async (req, res) => {
        const authentication =
            await verifyRisenAdminRequest(
                req
            );

        if (
            authentication.status ===
                "unauthenticated"
        ) {
            return res.status(401).json({
                success: false,
                errorCode:
                    "admin_authentication_required"
            });
        }

        if (
            authentication.status ===
                "forbidden"
        ) {
            return res.status(403).json({
                success: false,
                errorCode:
                    "risen_admin_role_required"
            });
        }

        if (
            authentication.status !==
                "authenticated"
        ) {
            return res.status(503).json({
                success: false,
                errorCode:
                    "admin_authentication_unavailable"
            });
        }

        const candidateId =
            String(
                req.params?.candidateId ||
                ""
            ).trim();

        if (!candidateId) {
            return res.status(422).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_proposal_invalid"
            });
        }

        const apiKey =
            String(
                process.env.OPENAI_API_KEY ||
                ""
            ).trim();

        if (!apiKey) {
            return res.status(503).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_proposal_unavailable"
            });
        }

        const supabaseUrl =
            String(
                process.env.SUPABASE_URL ||
                ""
            )
                .trim()
                .replace(/\/$/, "");

        const publishableKey =
            String(
                process.env
                    .SUPABASE_PUBLISHABLE_KEY ||
                ""
            ).trim();

        if (
            !supabaseUrl ||
            !publishableKey
        ) {
            return res.status(503).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_proposal_unavailable"
            });
        }

        const adminInterpretation =
            String(
                req.body
                    ?.adminInterpretation ||
                ""
            ).trim();

        if (adminInterpretation) {
            let interpretationResponse;

            try {
                interpretationResponse =
                    await fetch(
                        `${supabaseUrl}/rest/v1/rpc/risen_admin_update_standard_meaning_candidate_interpretation`,
                        {
                            method:
                                "POST",

                            headers: {
                                apikey:
                                    publishableKey,

                                Authorization:
                                    `Bearer ${authentication.accessToken}`,

                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    p_candidate_id:
                                        candidateId,

                                    p_interpretation:
                                        adminInterpretation,

                                    p_interpreted_at:
                                        new Date()
                                            .toISOString()
                                })
                        }
                    );
            } catch {
                return res.status(503).json({
                    success: false,
                    errorCode:
                        "standard_meaning_admin_interpretation_unavailable"
                });
            }

            if (!interpretationResponse.ok) {
                const interpretationErrorText =
                    await interpretationResponse
                        .text();

                console.error(
                    "Standard Meaning admin interpretation failed:",
                    interpretationResponse.status,
                    interpretationErrorText
                );

                return res.status(
                    interpretationResponse.status
                ).json({
                    success: false,
                    errorCode:
                        "standard_meaning_admin_interpretation_failed"
                });
            }

            const interpretationRows =
                await interpretationResponse
                    .json();

            const interpretationResult =
                Array.isArray(
                    interpretationRows
                )
                    ? interpretationRows[0]
                    : interpretationRows;

            if (
                !interpretationResult ||
                ![
                    "updated",
                    "unchanged"
                ].includes(
                    interpretationResult.status
                )
            ) {
                return res.status(409).json({
                    success: false,
                    errorCode:
                        "standard_meaning_admin_interpretation_rejected"
                });
            }
        }

        let contextResponse;

        try {
            contextResponse =
                await fetch(
                    `${supabaseUrl}/rest/v1/rpc/risen_admin_get_standard_meaning_candidate_proposal_context`,
                    {
                        method: "POST",
                        headers: {
                            apikey:
                                publishableKey,
                            Authorization:
                                `Bearer ${authentication.accessToken}`,
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                p_candidate_id:
                                    candidateId
                            })
                    }
                );
        } catch {
            return res.status(503).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_proposal_context_unavailable"
            });
        }

        if (!contextResponse.ok) {
            const contextErrorText =
                await contextResponse.text();

            console.error(
                "Standard Meaning proposal context failed:",
                contextResponse.status,
                contextErrorText
            );

            return res.status(
                contextResponse.status
            ).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_proposal_context_failed"
            });
        }

        const contextRows =
            await contextResponse.json();

        const context =
            Array.isArray(contextRows)
                ? contextRows[0]
                : contextRows;

        if (
            !context ||
            typeof context !==
                "object"
        ) {
            return res.status(404).json({
                success: false,
                errorCode:
                    "standard_meaning_candidate_not_found"
            });
        }

        const semanticType =
            String(
                context.semantic_type ||
                ""
            ).trim();

        if (!semanticType) {
            return res.status(409).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_proposal_semantic_type_ambiguous"
            });
        }

        const {
            listStandardMeanings
        } = require(
            "./server-domain/standard-fields/RisenStandardMeaningCatalog"
        );

        const standardMeanings =
            listStandardMeanings();

        let dynamicRows = [];

        try {
            const meaningsResponse =
                await fetch(
                    `${supabaseUrl}/rest/v1/rpc/list_active_standard_meanings`,
                    {
                        method: "POST",
                        headers: {
                            apikey:
                                publishableKey,
                            Authorization:
                                `Bearer ${publishableKey}`,
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({})
                    }
                );

            if (!meaningsResponse.ok) {
                const meaningsErrorText =
                    await meaningsResponse.text();

                console.error(
                    "Standard Meaning dynamic catalog failed:",
                    meaningsResponse.status,
                    meaningsErrorText
                );

                return res.status(503).json({
                    success: false,
                    errorCode:
                        "standard_meaning_catalog_unavailable"
                });
            }

            const result =
                await meaningsResponse.json();

            if (!Array.isArray(result)) {
                console.error(
                    "Standard Meaning dynamic catalog returned invalid result"
                );

                return res.status(503).json({
                    success: false,
                    errorCode:
                        "standard_meaning_catalog_unavailable"
                });
            }

            dynamicRows =
                result;
        } catch (error) {
            console.error(
                "Standard Meaning dynamic catalog unavailable:",
                error?.message ||
                    "unknown error"
            );

            return res.status(503).json({
                success: false,
                errorCode:
                    "standard_meaning_catalog_unavailable"
            });
        }

        const merged =
            new Map();

        for (const meaning of standardMeanings) {
            merged.set(
                `${meaning.entityName}.${meaning.fieldName}`,
                {
                    entityName:
                        meaning.entityName,
                    fieldName:
                        meaning.fieldName,
                    displayName:
                        meaning.displayName,
                    synonyms:
                        Array.isArray(
                            meaning.synonyms
                        )
                            ? meaning.synonyms
                            : []
                }
            );
        }

        for (const row of dynamicRows) {
            const entityName =
                String(
                    row?.entity_name ||
                    ""
                ).trim();

            const fieldName =
                String(
                    row?.field_name ||
                    ""
                ).trim();

            const displayName =
                String(
                    row?.display_name ||
                    ""
                ).trim();

            if (
                !entityName ||
                !fieldName ||
                !displayName
            ) {
                continue;
            }

            const key =
                `${entityName}.${fieldName}`;

            if (merged.has(key)) {
                continue;
            }

            merged.set(
                key,
                {
                    entityName,
                    fieldName,
                    displayName,
                    synonyms:
                        Array.isArray(
                            row?.synonyms
                        )
                            ? row.synonyms
                            : []
                }
            );
        }

        let proposal;

        try {
            const generator =
                new StandardMeaningAiProposalGenerator({
                    apiKey,
                    model:
                        String(
                            process.env
                                .OPENAI_STANDARD_MEANING_MODEL ||
                            "gpt-6-luna"
                        ).trim()
                });

            proposal =
                await generator.generate({
                    proposedMeaning:
                        context.proposed_meaning,
                    evidence:
                        context.evidence &&
                        typeof context.evidence ===
                            "object"
                            ? context.evidence
                            : {},
                    semanticType,
                    standardMeanings:
                        Array.from(
                            merged.values()
                        )
                });
        } catch (error) {
            console.error(
                "Standard Meaning AI proposal failed:",
                error?.message ||
                    "unknown error"
            );

            return res.status(503).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_proposal_failed"
            });
        }

        if (
            proposal?.mode ===
            "existing"
        ) {
            const proposalKey =
                `${
                    String(
                        proposal.entityName ||
                        ""
                    ).trim()
                }.${
                    String(
                        proposal.fieldName ||
                        ""
                    ).trim()
                }`;

            if (
                !merged.has(
                    proposalKey
                )
            ) {
                console.error(
                    "Standard Meaning AI proposed unknown existing meaning:",
                    proposalKey
                );

                return res.status(409).json({
                    success: false,
                    errorCode:
                        "standard_meaning_ai_existing_meaning_not_found"
                });
            }
        }

        const reviewedAt =
            new Date()
                .toISOString();

        let aiReviewResponse;

        try {
            aiReviewResponse =
                await fetch(
                    `${supabaseUrl}/rest/v1/rpc/risen_admin_update_standard_meaning_candidate_ai_review`,
                    {
                        method:
                            "POST",

                        headers: {
                            apikey:
                                publishableKey,

                            Authorization:
                                `Bearer ${authentication.accessToken}`,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                p_candidate_id:
                                    candidateId,

                                p_mode:
                                    proposal.mode,

                                p_facility_question:
                                    proposal.mode ===
                                        "review"
                                        ? proposal
                                            .facilityQuestion
                                        : "",

                                p_reviewed_at:
                                    reviewedAt
                            })
                    }
                );
        } catch (error) {
            console.error(
                "Standard Meaning AI review persistence unavailable:",
                error?.message ||
                    "unknown error"
            );

            return res.status(503).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_review_persistence_unavailable"
            });
        }

        if (!aiReviewResponse.ok) {
            const aiReviewErrorText =
                await aiReviewResponse.text();

            console.error(
                "Standard Meaning AI review persistence failed:",
                aiReviewResponse.status,
                aiReviewErrorText
            );

            return res.status(
                aiReviewResponse.status
            ).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_review_persistence_failed"
            });
        }

        const aiReviewRows =
            await aiReviewResponse.json();

        const aiReviewResult =
            Array.isArray(aiReviewRows)
                ? aiReviewRows[0]
                : aiReviewRows;

        if (
            !aiReviewResult ||
            ![
                "updated",
                "unchanged"
            ].includes(
                aiReviewResult.status
            )
        ) {
            console.error(
                "Standard Meaning AI review persistence rejected:",
                aiReviewResult
            );

            return res.status(409).json({
                success: false,
                errorCode:
                    "standard_meaning_ai_review_persistence_rejected"
            });
        }

        return res.json({
            success: true,
            proposal
        });
    }
);


app.post(
    "/api/admin/standard-meaning-candidates/:candidateId/accept",
    async (req, res) => {
        const authentication =
            await verifyRisenAdminRequest(
                req
            );

        if (
            authentication.status ===
                "unauthenticated"
        ) {
            return res.status(401).json({
                success: false,
                errorCode:
                    "admin_authentication_required"
            });
        }

        if (
            authentication.status ===
                "forbidden"
        ) {
            return res.status(403).json({
                success: false,
                errorCode:
                    "risen_admin_role_required"
            });
        }

        if (
            authentication.status !==
                "authenticated"
        ) {
            return res.status(503).json({
                success: false,
                errorCode:
                    "admin_authentication_unavailable"
            });
        }

        const candidateId =
            String(
                req.params?.candidateId ||
                ""
            ).trim();

        const entityName =
            String(
                req.body?.entityName || ""
            ).trim();

        const fieldName =
            String(
                req.body?.fieldName || ""
            ).trim();

        const displayName =
            String(
                req.body?.displayName || ""
            ).trim();

        const semanticType =
            String(
                req.body?.semanticType || ""
            ).trim();

        const synonyms =
            Array.isArray(
                req.body?.synonyms
            )
                ? req.body.synonyms
                    .filter(
                        value =>
                            typeof value ===
                                "string"
                    )
                    .map(
                        value =>
                            value.trim()
                    )
                    .filter(Boolean)
                : [];

        if (
            !candidateId ||
            !entityName ||
            !fieldName ||
            !displayName ||
            !semanticType
        ) {
            return res.status(422).json({
                success: false,
                errorCode:
                    "standard_meaning_acceptance_invalid"
            });
        }

        const supabaseUrl =
            String(
                process.env.SUPABASE_URL ||
                ""
            )
                .trim()
                .replace(/\/$/, "");

        const publishableKey =
            String(
                process.env
                    .SUPABASE_PUBLISHABLE_KEY ||
                ""
            ).trim();

        const response =
            await fetch(
                `${supabaseUrl}/rest/v1/rpc/risen_admin_accept_standard_meaning_candidate`,
                {
                    method: "POST",
                    headers: {
                        apikey:
                            publishableKey,
                        Authorization:
                            `Bearer ${authentication.accessToken}`,
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            p_candidate_id:
                                candidateId,
                            p_entity_name:
                                entityName,
                            p_field_name:
                                fieldName,
                            p_display_name:
                                displayName,
                            p_synonyms:
                                synonyms,
                            p_semantic_type:
                                semanticType
                        })
                }
            );

        if (!response.ok) {
            return res.status(
                response.status
            ).json({
                success: false,
                errorCode:
                    "standard_meaning_acceptance_failed"
            });
        }

        const rows =
            await response.json();

        const row =
            Array.isArray(rows)
                ? rows[0]
                : rows;

        return res.json({
            success: true,
            status:
                row?.status || null,
            meaningId:
                row?.meaning_id || null
        });
    }
);



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