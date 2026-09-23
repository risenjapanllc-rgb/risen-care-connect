"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createServerTrustBoundaryApp } =
    require("./createServerTrustBoundaryApp");

function baseTransport() {
    return {
        async handle() {
            return {
                httpStatus: 200,
                body: { status: "ok" }
            };
        },
        createErrorResponse() {
            return {
                httpStatus: 503,
                body: { errorCode: "test_error" }
            };
        }
    };
}

async function withServer(admissionTransport, callback) {
    const app = createServerTrustBoundaryApp({
        transport: baseTransport(),
        connectorResidentAdmissionTransport: admissionTransport
    });

    const server = http.createServer(app);

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    try {
        const address = server.address();
        await callback(`http://127.0.0.1:${address.port}`);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

function requestJson(baseUrl, body) {
    const url = new URL("/connector/resident-admission", baseUrl);
    const payload = JSON.stringify(body);

    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: "POST",
            headers: {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
                "x-risen-connector-id": "connector-test",
                authorization: "Bearer test"
            }
        }, res => {
            let text = "";
            res.setEncoding("utf8");
            res.on("data", chunk => { text += chunk; });
            res.on("end", () => {
                let parsed = null;
                try { parsed = text ? JSON.parse(text) : null; } catch {}
                resolve({ statusCode: res.statusCode, body: parsed });
            });
        });

        req.on("error", reject);
        req.end(payload);
    });
}

test("resident admission route forwards HTTP request to transport", async () => {
    let received;

    const admissionTransport = {
        async handle(input) {
            received = input;
            return {
                httpStatus: 200,
                body: {
                    status: "created",
                    residentId: "resident-1",
                    residentCreated: true
                }
            };
        },
        createErrorResponse() {
            return { httpStatus: 503, body: {} };
        }
    };

    await withServer(admissionTransport, async baseUrl => {
        const body = {
            sourceDocumentKey: "source.xlsx",
            identifierType: "name",
            identifierDigest: "a".repeat(64),
            name: "Test Resident",
            sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
            sourceSize: 1234
        };

        const response = await requestJson(baseUrl, body);

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(response.body.status, "created");
        assert.strictEqual(received.method, "POST");
        assert.match(received.contentType, /^application\/json/);
        assert.strictEqual(
            received.headers["x-risen-connector-id"],
            "connector-test"
        );
        assert.deepStrictEqual(received.body, body);
    });
});

test("resident admission route preserves transport conflict response", async () => {
    const admissionTransport = {
        async handle() {
            return {
                httpStatus: 409,
                body: {
                    status: "stale",
                    residentId: null,
                    residentCreated: false
                }
            };
        },
        createErrorResponse() {
            return { httpStatus: 503, body: {} };
        }
    };

    await withServer(admissionTransport, async baseUrl => {
        const response = await requestJson(baseUrl, {
            sourceDocumentKey: "source.xlsx"
        });

        assert.strictEqual(response.statusCode, 409);
        assert.strictEqual(response.body.status, "stale");
        assert.strictEqual(response.body.residentCreated, false);
    });
});
