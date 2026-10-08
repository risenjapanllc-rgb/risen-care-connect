"use strict";

const {
    spawn
} = require("node:child_process");

function defaultRunHelper({
    helperPath,
    command,
    input
}) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            const child =
                spawn(
                    helperPath,
                    [
                        command
                    ],
                    {
                        stdio: [
                            "pipe",
                            "pipe",
                            "pipe"
                        ]
                    }
                );

            let stdout = "";
            let stderr = "";

            child.stdout.on(
                "data",
                chunk => {
                    stdout +=
                        chunk.toString();
                }
            );

            child.stderr.on(
                "data",
                chunk => {
                    stderr +=
                        chunk.toString();
                }
            );

            child.on(
                "error",
                reject
            );

            child.on(
                "close",
                code => {
                    if (code !== 0) {
                        return reject(
                            new Error(
                                stderr.trim() ||
                                `credential helper failed: ${code}`
                            )
                        );
                    }

                    resolve({
                        stdout,
                        stderr
                    });
                }
            );

            if (
                typeof input ===
                    "string"
            ) {
                child.stdin.end(
                    input
                );
            } else {
                child.stdin.end();
            }
        }
    );
}

class ConnectorCredentialStore {
    constructor({
        helperPath,
        runHelper =
            defaultRunHelper
    } = {}) {
        if (
            typeof helperPath !==
                "string" ||
            !helperPath.trim()
        ) {
            throw new Error(
                "ConnectorCredentialStore requires helperPath"
            );
        }

        if (
            typeof runHelper !==
                "function"
        ) {
            throw new Error(
                "ConnectorCredentialStore requires runHelper"
            );
        }

        this.helperPath =
            helperPath.trim();

        this.runHelper =
            runHelper;
    }

    async save(
        credential
    ) {
        if (
            typeof credential !==
                "string" ||
            !credential.trim()
        ) {
            throw new Error(
                "credential is required"
            );
        }

        await this.runHelper({
            helperPath:
                this.helperPath,
            command:
                "set",
            input:
                `${credential.trim()}\n`
        });
    }

    async read() {
        const result =
            await this.runHelper({
                helperPath:
                    this.helperPath,
                command:
                    "get",
                input:
                    undefined
            });

        const credential =
            String(
                result?.stdout || ""
            ).trim();

        if (!credential) {
            throw new Error(
                "credential is unavailable"
            );
        }

        return credential;
    }

    async delete() {
        await this.runHelper({
            helperPath:
                this.helperPath,
            command:
                "delete",
            input:
                undefined
        });
    }
}

module.exports =
    ConnectorCredentialStore;
