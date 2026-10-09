"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

require("dotenv").config({
    quiet: true
});

const ROOT_DIR =
    path.resolve(__dirname, "..");

function resolveRuntimePaths({
    env = process.env,
    homeDirectory = env.USERPROFILE || env.HOME || ""
} = {}) {
    const localAppData =
        String(
            env.LOCALAPPDATA ||
            (
                homeDirectory
                    ? path.join(
                        homeDirectory,
                        "AppData",
                        "Local"
                    )
                    : ""
            )
        ).trim();

    if (!localAppData) {
        throw new Error(
            "LOCALAPPDATA is unavailable"
        );
    }

    const baseDirectory =
        path.join(
            localAppData,
            "RISEN CARE",
            "Connector"
        );

    return {
        baseDirectory,
        logDirectory:
            path.join(
                baseDirectory,
                "logs"
            ),
        localLogPath:
            path.join(
                baseDirectory,
                "logs",
                "local-connector.log"
            ),
        syncLogPath:
            path.join(
                baseDirectory,
                "logs",
                "sync.log"
            ),
        lockPath:
            path.join(
                baseDirectory,
                "runtime.lock"
            )
    };
}

function processExists(
    pid
) {
    if (
        !Number.isInteger(pid) ||
        pid <= 0
    ) {
        return false;
    }

    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error &&
            error.code === "EPERM";
    }
}

function acquireRuntimeLock(
    lockPath
) {
    const tryCreate =
        () => {
            const fd =
                fs.openSync(
                    lockPath,
                    "wx"
                );

            fs.writeFileSync(
                fd,
                `${process.pid}\n`,
                "utf8"
            );

            fs.closeSync(fd);

            let released = false;

            return {
                release() {
                    if (released) {
                        return;
                    }

                    released = true;

                    try {
                        fs.unlinkSync(
                            lockPath
                        );
                    } catch (error) {
                        if (
                            !error ||
                            error.code !==
                                "ENOENT"
                        ) {
                            throw error;
                        }
                    }
                }
            };
        };

    try {
        return tryCreate();
    } catch (error) {
        if (
            !error ||
            error.code !== "EEXIST"
        ) {
            throw error;
        }
    }

    let existingPid = 0;

    try {
        existingPid =
            Number(
                fs.readFileSync(
                    lockPath,
                    "utf8"
                ).trim()
            );
    } catch {
        existingPid = 0;
    }

    if (
        processExists(
            existingPid
        )
    ) {
        return null;
    }

    try {
        fs.unlinkSync(
            lockPath
        );
    } catch (error) {
        if (
            !error ||
            error.code !== "ENOENT"
        ) {
            return null;
        }
    }

    try {
        return tryCreate();
    } catch (error) {
        if (
            error &&
            error.code === "EEXIST"
        ) {
            return null;
        }

        throw error;
    }
}

function resolveSyncIntervalMs({
    env = process.env
} = {}) {
    const seconds =
        Number(
            env.RISEN_SYNC_INTERVAL_SECONDS ||
            60
        );

    if (
        !Number.isFinite(seconds) ||
        seconds < 5
    ) {
        return 60 * 1000;
    }

    return Math.floor(
        seconds * 1000
    );
}

function createNodeChild({
    scriptPath,
    logPath,
    env = process.env,
    detached = false
}) {
    const logFd =
        fs.openSync(
            logPath,
            "a"
        );

    const child =
        spawn(
            process.execPath,
            [
                "-r",
                "dotenv/config",
                scriptPath
            ],
            {
                cwd:
                    ROOT_DIR,
                env: {
                    ...env,
                    NODE_ENV:
                        "production"
                },
                detached,
                windowsHide:
                    true,
                stdio: [
                    "ignore",
                    logFd,
                    logFd
                ]
            }
        );

    child.once(
        "close",
        () => {
            try {
                fs.closeSync(logFd);
            } catch {
                // already closed
            }
        }
    );

    return child;
}

async function localHealthReady({
    port =
        Number(
            process.env
                .RISEN_LOCAL_CONNECTOR_PORT ||
            4310
        )
} = {}) {
    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () =>
                controller.abort(),
            3000
        );

    try {
        const response =
            await fetch(
                `http://127.0.0.1:${port}/health`,
                {
                    signal:
                        controller.signal,
                    cache:
                        "no-store"
                }
            );

        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

async function credentialAvailable({
    env = process.env
} = {}) {
    return await new Promise(
        (resolve) => {
            const child =
                spawn(
                    process.execPath,
                    [
                        path.join(
                            ROOT_DIR,
                            "scripts",
                            "connector-credential-available.js"
                        )
                    ],
                    {
                        cwd:
                            ROOT_DIR,
                        env,
                        windowsHide:
                            true,
                        stdio:
                            "ignore"
                    }
                );

            child.once(
                "error",
                () =>
                    resolve(false)
            );

            child.once(
                "exit",
                (code) =>
                    resolve(code === 0)
            );
        }
    );
}

function appendRuntimeLog(
    logPath,
    message
) {
    fs.appendFileSync(
        logPath,
        `${new Date().toISOString()} ${message}\n`
    );
}

async function run({
    env = process.env
} = {}) {
    const paths =
        resolveRuntimePaths({
            env
        });

    fs.mkdirSync(
        paths.logDirectory,
        {
            recursive: true
        }
    );

    const runtimeLock =
        acquireRuntimeLock(
            paths.lockPath
        );

    if (!runtimeLock) {
        appendRuntimeLog(
            paths.localLogPath,
            "runtime_already_running"
        );

        return;
    }

    process.once(
        "exit",
        () => {
            try {
                runtimeLock.release();
            } catch {
                // best effort
            }
        }
    );

    const syncIntervalMs =
        resolveSyncIntervalMs({
            env
        });

    let localChild = null;
    let syncRunning = false;
    let stopping = false;

    const startLocal =
        async () => {
            if (
                localChild &&
                localChild.exitCode === null
            ) {
                return;
            }

            if (
                await localHealthReady()
            ) {
                return;
            }

            appendRuntimeLog(
                paths.localLogPath,
                "starting_local_connector"
            );

            localChild =
                createNodeChild({
                    scriptPath:
                        path.join(
                            ROOT_DIR,
                            "local-connector",
                            "server.js"
                        ),
                    logPath:
                        paths.localLogPath,
                    env
                });

            localChild.once(
                "exit",
                (code, signal) => {
                    appendRuntimeLog(
                        paths.localLogPath,
                        `local_connector_exited code=${code} signal=${signal || ""}`
                    );

                    localChild = null;
                }
            );
        };

    const runSyncOnce =
        async () => {
            if (
                stopping ||
                syncRunning
            ) {
                return;
            }

            if (
                !await credentialAvailable({
                    env
                })
            ) {
                appendRuntimeLog(
                    paths.syncLogPath,
                    "waiting_for_provisioning"
                );
                return;
            }

            syncRunning = true;

            const child =
                createNodeChild({
                    scriptPath:
                        path.join(
                            ROOT_DIR,
                            "scripts",
                            "sync-once.js"
                        ),
                    logPath:
                        paths.syncLogPath,
                    env
                });

            await new Promise(
                (resolve) => {
                    child.once(
                        "error",
                        resolve
                    );

                    child.once(
                        "exit",
                        (code, signal) => {
                            appendRuntimeLog(
                                paths.syncLogPath,
                                `sync_completed code=${code} signal=${signal || ""}`
                            );

                            resolve();
                        }
                    );
                }
            );

            syncRunning = false;
        };

    const supervise =
        async () => {
            if (stopping) {
                return;
            }

            await startLocal();
        };

    await supervise();
    await runSyncOnce();

    const supervisorTimer =
        setInterval(
            () => {
                supervise().catch(
                    () => {
                        appendRuntimeLog(
                            paths.localLogPath,
                            "supervisor_iteration_failed"
                        );
                    }
                );
            },
            10 * 1000
        );

    const syncTimer =
        setInterval(
            () => {
                runSyncOnce().catch(
                    () => {
                        syncRunning = false;

                        appendRuntimeLog(
                            paths.syncLogPath,
                            "sync_iteration_failed"
                        );
                    }
                );
            },
            syncIntervalMs
        );

    const shutdown =
        () => {
            if (stopping) {
                return;
            }

            stopping = true;

            clearInterval(
                supervisorTimer
            );

            clearInterval(
                syncTimer
            );

            if (
                localChild &&
                localChild.exitCode === null
            ) {
                localChild.kill();
            }

            try {
                runtimeLock.release();
            } catch {
                // best effort
            }

            setTimeout(
                () =>
                    process.exit(0),
                250
            );
        };

    process.on(
        "SIGINT",
        shutdown
    );

    process.on(
        "SIGTERM",
        shutdown
    );
}

if (require.main === module) {
    if (
        process.platform !== "win32" &&
        process.env
            .RISEN_ALLOW_WINDOWS_RUNTIME_TEST !==
            "1"
    ) {
        process.stderr.write(
            "windows_runtime_requires_win32\n"
        );
        process.exitCode = 64;
    } else {
        run().catch(() => {
            process.stderr.write(
                "windows_runtime_failed\n"
            );
            process.exitCode = 1;
        });
    }
}

module.exports = {
    resolveRuntimePaths,
    resolveSyncIntervalMs,
    localHealthReady,
    credentialAvailable,
    acquireRuntimeLock
};
