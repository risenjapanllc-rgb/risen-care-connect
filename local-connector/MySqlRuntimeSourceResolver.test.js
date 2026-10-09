"use strict";

const assert =
    require("node:assert/strict");

const test =
    require("node:test");

const MySqlRuntimeSourceResolver =
    require(
        "./MySqlRuntimeSourceResolver"
    );

test(
    "prefers complete environment MySQL source",
    async () => {
        const environmentSource = {
            sourceId:
                "environment-source",
            host:
                "db.internal",
            port:
                3306,
            user:
                "reader",
            password:
                "environment-secret",
            database:
                "care",
            query:
                "SELECT * FROM residents"
        };

        const resolver =
            new MySqlRuntimeSourceResolver({
                runtimeConfig: {
                    resolveMySqlSource() {
                        return environmentSource;
                    }
                },
                localConfig: {
                    async getMySqlSource() {
                        throw new Error(
                            "saved config must not be read"
                        );
                    }
                },
                credentialStore: {
                    async read() {
                        throw new Error(
                            "credential store must not be read"
                        );
                    }
                }
            });

        assert.deepEqual(
            await resolver.resolve(),
            environmentSource
        );
    }
);

test(
    "returns null when no MySQL source is configured",
    async () => {
        const resolver =
            new MySqlRuntimeSourceResolver({
                runtimeConfig: {
                    resolveMySqlSource() {
                        return null;
                    }
                },
                localConfig: {
                    async getMySqlSource() {
                        return null;
                    }
                },
                credentialStore: {
                    async read() {
                        throw new Error(
                            "credential store must not be read"
                        );
                    }
                }
            });

        assert.equal(
            await resolver.resolve(),
            null
        );
    }
);

test(
    "combines persisted MySQL config with OS credential",
    async () => {
        const savedSource = {
            sourceId:
                "saved-source",
            host:
                "192.168.1.50",
            port:
                3306,
            user:
                "risen_reader",
            database:
                "facility",
            query:
                "SELECT * FROM residents"
        };

        const resolver =
            new MySqlRuntimeSourceResolver({
                runtimeConfig: {
                    resolveMySqlSource() {
                        return null;
                    }
                },
                localConfig: {
                    async getMySqlSource() {
                        return savedSource;
                    }
                },
                credentialStore: {
                    async read() {
                        return "mysql-secret";
                    }
                }
            });

        assert.deepEqual(
            await resolver.resolve(),
            {
                ...savedSource,
                password:
                    "mysql-secret"
            }
        );
    }
);
