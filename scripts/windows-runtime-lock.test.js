"use strict";

const assert =
    require("node:assert/strict");

const fs =
    require("node:fs");

const os =
    require("node:os");

const path =
    require("node:path");

const test =
    require("node:test");

const {
    acquireRuntimeLock
} =
    require("./windows-runtime");

test(
    "allows only one runtime supervisor lock",
    () => {
        const directory =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "risen-windows-runtime-"
                )
            );

        const lockPath =
            path.join(
                directory,
                "runtime.lock"
            );

        try {
            const first =
                acquireRuntimeLock(
                    lockPath
                );

            assert.ok(first);

            const second =
                acquireRuntimeLock(
                    lockPath
                );

            assert.equal(
                second,
                null
            );

            first.release();

            const third =
                acquireRuntimeLock(
                    lockPath
                );

            assert.ok(third);

            third.release();
        } finally {
            fs.rmSync(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);
