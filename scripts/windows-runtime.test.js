"use strict";

const assert =
    require("node:assert/strict");

const test =
    require("node:test");

const path =
    require("node:path");

const {
    resolveRuntimePaths,
    resolveSyncIntervalMs
} =
    require("./windows-runtime");

test(
    "uses LOCALAPPDATA for Windows runtime state",
    () => {
        const result =
            resolveRuntimePaths({
                env: {
                    LOCALAPPDATA:
                        "C:\\Users\\Test\\AppData\\Local"
                }
            });

        assert.equal(
            result.baseDirectory,
            path.join(
                "C:\\Users\\Test\\AppData\\Local",
                "RISEN CARE",
                "Connector"
            )
        );

        assert.match(
            result.localLogPath,
            /logs[\\/]local-connector\.log$/
        );

        assert.match(
            result.syncLogPath,
            /logs[\\/]sync\.log$/
        );
    }
);

test(
    "falls back to user profile AppData Local",
    () => {
        const result =
            resolveRuntimePaths({
                env: {},
                homeDirectory:
                    "C:\\Users\\Test"
            });

        assert.equal(
            result.baseDirectory,
            path.join(
                "C:\\Users\\Test",
                "AppData",
                "Local",
                "RISEN CARE",
                "Connector"
            )
        );
    }
);

test(
    "uses 60 second sync interval by default",
    () => {
        assert.equal(
            resolveSyncIntervalMs({
                env: {}
            }),
            60000
        );
    }
);

test(
    "accepts configured sync interval",
    () => {
        assert.equal(
            resolveSyncIntervalMs({
                env: {
                    RISEN_SYNC_INTERVAL_SECONDS:
                        "15"
                }
            }),
            15000
        );
    }
);

test(
    "rejects unsafe sync interval",
    () => {
        assert.equal(
            resolveSyncIntervalMs({
                env: {
                    RISEN_SYNC_INTERVAL_SECONDS:
                        "1"
                }
            }),
            60000
        );
    }
);
