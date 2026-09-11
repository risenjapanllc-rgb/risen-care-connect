"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    startServerTrustBoundary
} = require("./server");

function validEnv() {
    return {
        SERVER_TRUST_BOUNDARY_HOST:
            "0.0.0.0",
        SERVER_TRUST_BOUNDARY_PORT:
            "8787",
        SUPABASE_URL:
            "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY:
            "test-publishable-key",
        SUPABASE_CONNECTOR_TRUST_EMAIL:
            "connector@example.test",
        SUPABASE_CONNECTOR_TRUST_PASSWORD:
            "test-password"
    };
}

test(
    "production runtime exposes health before listen",
    () => {
        const events = [];

        const app = {
            get(path, handler) {
                events.push({
                    type: "get",
                    path,
                    handler
                });
            },

            listen(port, host, callback) {
                events.push({
                    type: "listen",
                    port,
                    host
                });

                callback();

                return {
                    close() {}
                };
            }
        };

        startServerTrustBoundary({
            env:
                validEnv(),

            runtimeFactory() {
                return {
                    app
                };
            }
        });

        assert.strictEqual(
            events[0].type,
            "get"
        );

        assert.strictEqual(
            events[0].path,
            "/health"
        );

        assert.deepStrictEqual(
            {
                port:
                    events[1].port,
                host:
                    events[1].host
            },
            {
                port: 8787,
                host: "0.0.0.0"
            }
        );

        let body = null;

        events[0].handler(
            {},
            {
                json(value) {
                    body = value;
                    return value;
                }
            }
        );

        assert.deepStrictEqual(
            body,
            {
                success: true,
                service:
                    "RISEN CARE Server Trust Boundary",
                status: "ready"
            }
        );
    }
);
