"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SourceEvidenceLocatorContract =
    require("./SourceEvidenceLocatorContract");


test(
    "accepts Word source locator",
    () => {
        const locator = {
            sourceType:
                "word",

            documentReference:
                "日勤日誌.docx",

            location: {
                tableIndex:
                    2,

                rowIndex:
                    0,

                sourceFieldKey:
                    "word:table:2:row:0"
            },

            rawEvidence:
                "入院欄の原文"
        };

        assert.deepStrictEqual(
            SourceEvidenceLocatorContract
                .validate(
                    locator
                ),
            {
                status:
                    "valid",

                sourceEvidenceLocator:
                    locator
            }
        );
    }
);


test(
    "accepts Excel or CSV tabular locator",
    () => {
        for (const sourceType of [
            "excel",
            "csv"
        ]) {
            const locator = {
                sourceType,

                documentReference:
                    "sample.xlsx",

                location: {
                    sheetName:
                        "利用者情報",

                    rowIndex:
                        12,

                    columnKey:
                        "hospital"
                },

                rawEvidence:
                    "○○病院"
            };

            assert.equal(
                SourceEvidenceLocatorContract
                    .validate(
                        locator
                    )
                    .status,
                "valid"
            );
        }
    }
);


test(
    "accepts voice transcript locator",
    () => {
        const locator = {
            sourceType:
                "voice",

            documentReference:
                "voice-recording-1",

            location: {
                segmentIndex:
                    0,

                startMs:
                    18200,

                endMs:
                    21600
            },

            rawEvidence:
                "昼食は半分でした。",

            contextEvidence:
                "利用者Aさん、今朝37.8度。昼食は半分でした。"
        };

        assert.equal(
            SourceEvidenceLocatorContract
                .validate(
                    locator
                )
                .status,
            "valid"
        );
    }
);


test(
    "rejects legacy voice transcript coordinates",
    () => {
        const locator = {
            sourceType:
                "voice",

            documentReference:
                "voice-recording-legacy",

            location: {
                transcriptStart:
                    18.2,

                transcriptEnd:
                    21.6
            },

            rawEvidence:
                "昼食は半分でした。"
        };

        assert.equal(
            SourceEvidenceLocatorContract
                .validate(
                    locator
                )
                .status,
            "invalid"
        );
    }
);


test(
    "rejects invalid trusted voice segment coordinates",
    () => {
        for (const location of [
            {
                segmentIndex:
                    -1,
                startMs:
                    0,
                endMs:
                    1000
            },
            {
                segmentIndex:
                    0.5,
                startMs:
                    0,
                endMs:
                    1000
            },
            {
                segmentIndex:
                    0,
                startMs:
                    -1,
                endMs:
                    1000
            },
            {
                segmentIndex:
                    0,
                startMs:
                    2000,
                endMs:
                    1000
            },
            {
                segmentIndex:
                    0,
                startMs:
                    0,
                endMs:
                    1000,
                transcriptStart:
                    0
            }
        ]) {
            assert.equal(
                SourceEvidenceLocatorContract
                    .validate({
                        sourceType:
                            "voice",

                        documentReference:
                            "voice-recording-invalid",

                        location,

                        rawEvidence:
                            "test"
                    })
                    .status,
                "invalid"
            );
        }
    }
);


test(
    "preserves original evidence without normalization",
    () => {
        const rawEvidence =
            "  原文\nそのまま  ";

        const locator = {
            sourceType:
                "word",

            documentReference:
                "sample.docx",

            location: {
                sourceFieldKey:
                    "word:table:1:row:2"
            },

            rawEvidence
        };

        const result =
            SourceEvidenceLocatorContract
                .validate(
                    locator
                );

        assert.strictEqual(
            result
                .sourceEvidenceLocator
                .rawEvidence,
            rawEvidence
        );
    }
);


test(
    "rejects unsupported source type",
    () => {
        const locator = {
            sourceType:
                "unknown-source",

            documentReference:
                "sample",

            location:
                {},

            rawEvidence:
                "value"
        };

        assert.equal(
            SourceEvidenceLocatorContract
                .validate(
                    locator
                )
                .status,
            "invalid"
        );
    }
);


test(
    "rejects missing source location",
    () => {
        const locator = {
            sourceType:
                "word",

            documentReference:
                "sample.docx",

            rawEvidence:
                "value"
        };

        assert.equal(
            SourceEvidenceLocatorContract
                .validate(
                    locator
                )
                .status,
            "invalid"
        );
    }
);


test(
    "rejects empty raw evidence",
    () => {
        const locator = {
            sourceType:
                "voice",

            documentReference:
                "voice-1",

            location: {
                segmentIndex:
                    0,

                startMs:
                    0,

                endMs:
                    1000
            },

            rawEvidence:
                ""
        };

        assert.equal(
            SourceEvidenceLocatorContract
                .validate(
                    locator
                )
                .status,
            "invalid"
        );
    }
);


test(
    "rejects Formal Meaning identifiers",
    () => {
        for (const forbidden of [
            {
                semanticType:
                    "support_record"
            },

            {
                entityName:
                    "resident"
            },

            {
                fieldName:
                    "temperature"
            },

            {
                canonicalCode:
                    "resident.temperature"
            }
        ]) {
            const locator = {
                sourceType:
                    "word",

                documentReference:
                    "sample.docx",

                location: {
                    sourceFieldKey:
                        "word:table:1:row:1"
                },

                rawEvidence:
                    "37.8度",

                ...forbidden
            };

            assert.equal(
                SourceEvidenceLocatorContract
                    .validate(
                        locator
                    )
                    .status,
                "invalid"
            );
        }
    }
);


test(
    "rejects non-object locator",
    () => {
        for (const value of [
            null,
            undefined,
            [],
            "locator",
            123
        ]) {
            assert.deepStrictEqual(
                SourceEvidenceLocatorContract
                    .validate(
                        value
                    ),
                {
                    status:
                        "invalid"
                }
            );
        }
    }
);
