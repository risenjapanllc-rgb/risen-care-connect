"use strict";

const {
    spawn
} = require("node:child_process");

function runHelper({
    helperPath,
    command,
    key,
    input
}) {
    return new Promise(
        (resolve, reject) => {
            const child =
                spawn(
                    helperPath,
                    [
                        command,
                        key
                    ],
                    {
                        stdio: [
                            "pipe",
                            "pipe",
                            "pipe"
                        ],
                        windowsHide: true
                    }
                );

            let stdout = "";
            let stderr = "";

            child.stdout.on(
                "data",
                chunk => {
                    stdout += chunk;
                }
            );

            child.stderr.on(
                "data",
                chunk => {
                    stderr += chunk;
                }
            );

            child.once(
                "error",
                reject
            );

            child.once(
                "close",
                code => {
                    if (code !== 0) {
                        reject(
                            new Error(
                                stderr.trim() ||
                                `credential helper exited ${code}`
                            )
                        );
                        return;
                    }

                    resolve({
                        stdout,
                        stderr
                    });
                }
            );

            if (
                typeof input === "string"
            ) {
                child.stdin.end(input);
            } else {
                child.stdin.end();
            }
        }
    );
}

class NamedCredentialStore {
    constructor({
        helperPath,
        key
    } = {}) {
        if (
            typeof helperPath !== "string" ||
            !helperPath.trim()
        ) {
            throw new Error(
                "helperPath is required"
            );
        }

        if (
            typeof key !== "string" ||
            !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(
                key
            )
        ) {
            throw new Error(
                "valid credential key is required"
            );
        }

        this.helperPath =
            helperPath.trim();

        this.key =
            key.trim();
    }

    async save(value) {
        if (
            typeof value !== "string" ||
            !value
        ) {
            throw new Error(
                "credential value is required"
            );
        }

        await runHelper({
            helperPath:
                this.helperPath,
            command:
                "set",
            key:
                this.key,
            input:
                `${value}\n`
        });
    }

    async read() {
        const result =
            await runHelper({
                helperPath:
                    this.helperPath,
                command:
                    "get",
                key:
                    this.key
            });

        const value =
            String(
                result.stdout || ""
            ).trim();

        if (!value) {
            throw new Error(
                "credential is unavailable"
            );
        }

        return value;
    }

    async delete() {
        await runHelper({
            helperPath:
                this.helperPath,
            command:
                "delete",
            key:
                this.key
        });
    }
}

module.exports =
    NamedCredentialStore;
