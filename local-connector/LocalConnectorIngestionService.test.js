"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const LocalConnectorIngestionService =
    require("./LocalConnectorIngestionService");

test("requires localConnectorService", () => {
    assert.throws(
        () =>
            new LocalConnectorIngestionService({
                payloadBuilder: {
                    build() {}
                },
                httpClient: {
                    ingest() {}
                }
            }),
        /requires localConnectorService/
    );
});

test("requires payloadBuilder", () => {
    assert.throws(
        () =>
            new LocalConnectorIngestionService({
                localConnectorService: {
                    normalizeRegisteredWord() {}
                },
                httpClient: {
                    ingest() {}
                }
            }),
        /requires payloadBuilder/
    );
});

test("requires httpClient", () => {
    assert.throws(
        () =>
            new LocalConnectorIngestionService({
                localConnectorService: {
                    normalizeRegisteredWord() {}
                },
                payloadBuilder: {
                    build() {}
                }
            }),
        /requires httpClient/
    );
});

test("Word document is normalized, allowlisted, then sent", async () => {
    const calls = [];

    const normalizedDocument = {
        documentType:
            "support_record",
        sourceType:
            "word",
        source: {
            fileName:
                "record.docx",
            updatedAt:
                "2026-09-09T10:00:00Z"
        },
        extracted: {
            sourceResidentIdentifier: {
                value:
                    "RES-123"
            }
        }
    };

    const payload = {
        sourceResident: {
            identifier: {
                value:
                    "RES-123"
            }
        },
        source: {
            fileName:
                "record.docx",
            updatedAt:
                "2026-09-09T10:00:00Z"
        },
        documentType:
            "support_record",
        sourceType:
            "word"
    };

    const service =
        new LocalConnectorIngestionService({
            localConnectorService: {
                async normalizeRegisteredWord(fileName) {
                    calls.push([
                        "normalizeWord",
                        fileName
                    ]);

                    return normalizedDocument;
                }
            },
            payloadBuilder: {
                build(input) {
                    calls.push([
                        "build",
                        input
                    ]);

                    return payload;
                }
            },
            httpClient: {
                async ingest(input) {
                    calls.push([
                        "ingest",
                        input
                    ]);

                    return {
                        requestId:
                            "request-123",
                        status:
                            "unmatched"
                    };
                }
            }
        });

    const result =
        await service.ingestRegisteredFile(
            "record.docx"
        );

    assert.deepStrictEqual(
        result,
        {
            requestId:
                "request-123",
            status:
                "unmatched"
        }
    );

    assert.deepStrictEqual(
        calls,
        [
            [
                "normalizeWord",
                "record.docx"
            ],
            [
                "build",
                normalizedDocument
            ],
            [
                "ingest",
                payload
            ]
        ]
    );
});

test("Excel document uses Excel normalization", async () => {
    const calls = [];

    const service =
        new LocalConnectorIngestionService({
            localConnectorService: {
                async normalizeRegisteredExcel(fileName) {
                    calls.push([
                        "normalizeExcel",
                        fileName
                    ]);

                    return {
                        documentType:
                            "support_record",
                        sourceType:
                            "excel",
                        source: {
                            fileName,
                            updatedAt:
                                "2026-09-09T10:00:00Z"
                        },
                        extracted: {
                            sourceResidentIdentifier: {
                                value:
                                    "RES-456"
                            }
                        }
                    };
                }
            },
            payloadBuilder: {
                build(input) {
                    calls.push([
                        "build",
                        input.sourceType
                    ]);

                    return {
                        sourceResident: {
                            identifier: {
                                value:
                                    "RES-456"
                            }
                        }
                    };
                }
            },
            httpClient: {
                async ingest(payload) {
                    calls.push([
                        "ingest",
                        payload
                    ]);

                    return {
                        requestId:
                            "request-456",
                        status:
                            "unmatched"
                    };
                }
            }
        });

    await service.ingestRegisteredFile(
        "record.xlsx"
    );

    assert.strictEqual(
        calls[0][0],
        "normalizeExcel"
    );
});

test("unsupported extension fails before HTTP call", async () => {
    let httpCalled = false;

    const service =
        new LocalConnectorIngestionService({
            localConnectorService: {},
            payloadBuilder: {
                build() {
                    throw new Error(
                        "should not build"
                    );
                }
            },
            httpClient: {
                async ingest() {
                    httpCalled = true;
                }
            }
        });

    await assert.rejects(
        () =>
            service.ingestRegisteredFile(
                "record.pdf"
            ),
        /unsupported file type/
    );

    assert.strictEqual(
        httpCalled,
        false
    );
});

test("missing ingestion payload fails before HTTP call", async () => {
    let httpCalled = false;

    const service =
        new LocalConnectorIngestionService({
            localConnectorService: {
                async normalizeRegisteredWord() {
                    return {
                        documentType:
                            "support_record"
                    };
                }
            },
            payloadBuilder: {
                build() {
                    return null;
                }
            },
            httpClient: {
                async ingest() {
                    httpCalled = true;
                }
            }
        });

    await assert.rejects(
        () =>
            service.ingestRegisteredFile(
                "record.docx"
            ),
        /ingestion payload unavailable/
    );

    assert.strictEqual(
        httpCalled,
        false
    );
});

test("does not add client facilityId or residentId", async () => {
    let sentPayload;

    const service =
        new LocalConnectorIngestionService({
            localConnectorService: {
                async normalizeRegisteredWord() {
                    return {
                        facilityId:
                            "client-facility",
                        residentId:
                            "client-resident",
                        documentType:
                            "support_record",
                        sourceType:
                            "word",
                        source: {
                            fileName:
                                "record.docx",
                            updatedAt:
                                "2026-09-09T10:00:00Z"
                        },
                        extracted: {
                            sourceResidentIdentifier: {
                                value:
                                    "RES-123"
                            }
                        }
                    };
                }
            },
            payloadBuilder: {
                build() {
                    return {
                        sourceResident: {
                            identifier: {
                                value:
                                    "RES-123"
                            }
                        }
                    };
                }
            },
            httpClient: {
                async ingest(payload) {
                    sentPayload =
                        payload;

                    return {
                        requestId:
                            "request-789",
                        status:
                            "unmatched"
                    };
                }
            }
        });

    await service.ingestRegisteredFile(
        "record.docx"
    );

    assert.strictEqual(
        Object.hasOwn(
            sentPayload,
            "facilityId"
        ),
        false
    );

    assert.strictEqual(
        Object.hasOwn(
            sentPayload,
            "residentId"
        ),
        false
    );
});
