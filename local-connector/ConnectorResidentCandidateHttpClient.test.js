"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorResidentCandidateHttpClient =
    require("./ConnectorResidentCandidateHttpClient");

test(
    "posts only userCode with connector authentication",
    async () => {
        let capturedUrl = null;
        let capturedOptions = null;

        const client =
            new ConnectorResidentCandidateHttpClient({
                endpoint:
                    "http://127.0.0.1:8787/connector/resident-candidates",
                connectorId:
                    "connector-test",
                credential:
                    "credential-test",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async (url, options) => {
                        capturedUrl = url;
                        capturedOptions = options;

                        return {
                            ok: true,
                            status: 200,
                            async json() {
                                return {
                                    status: "ok",
                                    candidates: [
                                        {
                                            residentId:
                                                "resident-1",
                                            userCode:
                                                "U001",
                                            name:
                                                "Test Resident",
                                            kana:
                                                null,
                                            birthDate:
                                                null
                                        }
                                    ]
                                };
                            }
                        };
                    }
            });

        const result =
            await client.findCandidates({
                userCode: " U001 "
            });

        assert.equal(
            capturedUrl,
            "http://127.0.0.1:8787/connector/resident-candidates"
        );

        assert.equal(
            capturedOptions.method,
            "POST"
        );

        assert.equal(
            capturedOptions.headers[
                "x-risen-connector-id"
            ],
            "connector-test"
        );

        assert.equal(
            capturedOptions.headers.authorization,
            "RISEN-Connector credential-test"
        );

        assert.deepEqual(
            JSON.parse(capturedOptions.body),
            {
                userCode: "U001"
            }
        );

        assert.equal(result.length, 1);
        assert.equal(
            result[0].residentId,
            "resident-1"
        );
    }
);

test(
    "rejects blank userCode without making a request",
    async () => {
        let fetchCalled = false;

        const client =
            new ConnectorResidentCandidateHttpClient({
                endpoint:
                    "http://127.0.0.1:8787/connector/resident-candidates",
                connectorId:
                    "connector-test",
                credential:
                    "credential-test",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async () => {
                        fetchCalled = true;
                    }
            });

        await assert.rejects(
            () => client.findCandidates(" "),
            TypeError
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);

test(
    "does not expose an unapproved server error code",
    async () => {
        const client =
            new ConnectorResidentCandidateHttpClient({
                endpoint:
                    "http://127.0.0.1:8787/connector/resident-candidates",
                connectorId:
                    "connector-test",
                credential:
                    "credential-test",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async () => ({
                        ok: false,
                        status: 503,
                        async json() {
                            return {
                                errorCode:
                                    "internal_database_detail"
                            };
                        }
                    })
            });

        await assert.rejects(
            () =>
                client.findCandidates({
                    userCode: "U001"
                }),
            error => {
                assert.equal(
                    error.code,
                    "server_trust_boundary_request_failed"
                );
                assert.equal(
                    error.httpStatus,
                    503
                );
                return true;
            }
        );
    }
);
