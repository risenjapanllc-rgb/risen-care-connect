"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SemanticAnalysisGenerator =
    require("./SemanticAnalysisGenerator");


function createResolvedAnalysis() {
    return {
        perspectiveResolution: {
            resolutionMode:
                "resolved",

            perspectiveType:
                "facility_operation",

            subjectScope:
                "multiple_residents",

            temporalScope:
                "as_of_time",

            interpretation:
                "当日時点で施設が把握している入院中利用者の状況",

            confidence:
                "high",

            facilityQuestion:
                ""
        },

        semanticDecomposition: {
            decompositionMode:
                "decomposed",

            sourceScope:
                "multiple_residents",

            facts: [
                {
                    subject: {
                        type:
                            "resident",

                        reference:
                            "source-resident-1"
                    },

                    naturalMeaning:
                        "この利用者の入院開始日",

                    value:
                        "2026-04-18",

                    time: {
                        mode:
                            "event",

                        value:
                            "2026-04-18"
                    },

                    sourceEvidence: {
                        sourceLabel:
                            "入院",

                        sourceValue:
                            "利用者名 4/18 ○○病院"
                    },

                    confidence:
                        "high"
                },

                {
                    subject: {
                        type:
                            "resident",

                        reference:
                            "source-resident-1"
                    },

                    naturalMeaning:
                        "この利用者が入院している病院",

                    value:
                        "○○病院",

                    time: {
                        mode:
                            "as_of_time",

                        value:
                            "2026-04-21"
                    },

                    sourceEvidence: {
                        sourceLabel:
                            "入院",

                        sourceValue:
                            "利用者名 4/18 ○○病院"
                    },

                    confidence:
                        "high"
                }
            ],

            facilityQuestion:
                ""
        }
    };
}


test(
    "generates perspective and decomposed facts from source evidence",
    async () => {
        let receivedBody = null;

        const analysis =
            createResolvedAnalysis();

        const generator =
            new SemanticAnalysisGenerator({
                apiKey:
                    "test-key",

                model:
                    "test-model",

                fetchImpl:
                    async (
                        url,
                        options
                    ) => {
                        assert.equal(
                            url,
                            "https://api.openai.com/v1/responses"
                        );

                        receivedBody =
                            JSON.parse(
                                options.body
                            );

                        return {
                            ok: true,
                            status: 200,

                            text:
                                async () =>
                                    JSON.stringify({
                                        output_text:
                                            JSON.stringify(
                                                analysis
                                            )
                                    })
                        };
                    }
            });

        const result =
            await generator.generate({
                sourceType:
                    "word",

                sourceDocumentName:
                    "日勤日誌.docx",

                documentDate:
                    "2026-04-21",

                sourceLabel:
                    "入院",

                sourceValue:
                    "利用者名 4/18 ○○病院",

                neighboringFields: [
                    "外泊",
                    "外出",
                    "面会",
                    "通院状況"
                ]
            });

        assert.deepStrictEqual(
            result,
            analysis
        );

        assert.equal(
            receivedBody.model,
            "test-model"
        );
    }
);


test(
    "accepts review when perspective or decomposition is uncertain",
    async () => {
        const analysis = {
            perspectiveResolution: {
                resolutionMode:
                    "review",

                perspectiveType:
                    "unknown",

                subjectScope:
                    "unknown",

                temporalScope:
                    "unknown",

                interpretation:
                    "",

                confidence:
                    "low",

                facilityQuestion:
                    "この欄は施設全体の状況ですか、それとも個人ごとの記録ですか？"
            },

            semanticDecomposition: {
                decompositionMode:
                    "review",

                sourceScope:
                    "unknown",

                facts:
                    [],

                facilityQuestion:
                    "記載内容は利用者ごとに分けて扱いますか？"
            }
        };

        const generator =
            new SemanticAnalysisGenerator({
                apiKey:
                    "test-key",

                fetchImpl:
                    async () => ({
                        ok: true,
                        status: 200,

                        text:
                            async () =>
                                JSON.stringify({
                                    output_text:
                                        JSON.stringify(
                                            analysis
                                        )
                                })
                    })
            });

        const result =
            await generator.generate({
                sourceLabel:
                    "入院",

                sourceValue:
                    "記載あり"
            });

        assert.deepStrictEqual(
            result,
            analysis
        );
    }
);


test(
    "reads output_text from Responses API message content",
    async () => {
        const analysis =
            createResolvedAnalysis();

        const generator =
            new SemanticAnalysisGenerator({
                apiKey:
                    "test-key",

                fetchImpl:
                    async () => ({
                        ok: true,
                        status: 200,

                        text:
                            async () =>
                                JSON.stringify({
                                    output: [
                                        {
                                            type:
                                                "reasoning",

                                            content:
                                                []
                                        },

                                        {
                                            type:
                                                "message",

                                            content: [
                                                {
                                                    type:
                                                        "output_text",

                                                    text:
                                                        JSON.stringify(
                                                            analysis
                                                        )
                                                }
                                            ]
                                        }
                                    ]
                                })
                    })
            });

        const result =
            await generator.generate({
                sourceLabel:
                    "入院",

                sourceValue:
                    "利用者名 4/18 ○○病院"
            });

        assert.deepStrictEqual(
            result,
            analysis
        );
    }
);


test(
    "rejects AI output that attempts to assign Formal Meaning",
    async () => {
        const analysis =
            createResolvedAnalysis();

        analysis
            .semanticDecomposition
            .facts[0]
            .semanticType =
                "hospitalization";

        const generator =
            new SemanticAnalysisGenerator({
                apiKey:
                    "test-key",

                fetchImpl:
                    async () => ({
                        ok: true,
                        status: 200,

                        text:
                            async () =>
                                JSON.stringify({
                                    output_text:
                                        JSON.stringify(
                                            analysis
                                        )
                                })
                    })
            });

        await assert.rejects(
            () =>
                generator.generate({
                    sourceLabel:
                        "入院",

                    sourceValue:
                        "利用者名 4/18 ○○病院"
                }),
            /Semantic Analysis response was invalid/
        );
    }
);


test(
    "rejects invalid generator input",
    async () => {
        const generator =
            new SemanticAnalysisGenerator({
                apiKey:
                    "test-key",

                fetchImpl:
                    async () => {
                        throw new Error(
                            "must not call fetch"
                        );
                    }
            });

        await assert.rejects(
            () =>
                generator.generate({
                    sourceLabel:
                        ""
                }),
            TypeError
        );
    }
);


test(
    "attaches trusted source evidence locator to every decomposed fact",
    async () => {
        const analysis =
            createResolvedAnalysis();

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
                "利用者A 4/18 ○○病院"
        };

        const generator =
            new SemanticAnalysisGenerator({
                apiKey:
                    "test-key",

                fetchImpl:
                    async () => ({
                        ok: true,
                        status: 200,

                        text:
                            async () =>
                                JSON.stringify({
                                    output_text:
                                        JSON.stringify(
                                            analysis
                                        )
                                })
                    })
            });

        const result =
            await generator.generate({
                sourceLabel:
                    "入院",

                sourceValue:
                    "利用者A 4/18 ○○病院",

                sourceEvidenceLocator:
                    locator
            });

        assert.ok(
            result
                .semanticDecomposition
                .facts
                .length >
                0
        );

        for (
            const fact
            of result
                .semanticDecomposition
                .facts
        ) {
            assert.deepStrictEqual(
                fact
                    .sourceEvidenceLocator,
                locator
            );
        }
    }
);


test(
    "rejects invalid trusted source evidence locator before AI request",
    async () => {
        let fetchCalled =
            false;

        const generator =
            new SemanticAnalysisGenerator({
                apiKey:
                    "test-key",

                fetchImpl:
                    async () => {
                        fetchCalled =
                            true;

                        throw new Error(
                            "must not call fetch"
                        );
                    }
            });

        await assert.rejects(
            () =>
                generator.generate({
                    sourceLabel:
                        "入院",

                    sourceValue:
                        "value",

                    sourceEvidenceLocator: {
                        sourceType:
                            "invented",

                        documentReference:
                            "source",

                        location:
                            {},

                        rawEvidence:
                            "value"
                    }
                }),
            TypeError
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);


test(
    "rejects AI supplied source evidence locator",
    async () => {
        const analysis =
            createResolvedAnalysis();

        analysis
            .semanticDecomposition
            .facts[0]
            .sourceEvidenceLocator = {
                sourceType:
                    "word",

                documentReference:
                    "AI-invented.docx",

                location: {
                    sourceFieldKey:
                        "invented"
                },

                rawEvidence:
                    "invented"
            };

        const generator =
            new SemanticAnalysisGenerator({
                apiKey:
                    "test-key",

                fetchImpl:
                    async () => ({
                        ok: true,
                        status: 200,

                        text:
                            async () =>
                                JSON.stringify({
                                    output_text:
                                        JSON.stringify(
                                            analysis
                                        )
                                })
                    })
            });

        await assert.rejects(
            () =>
                generator.generate({
                    sourceLabel:
                        "入院",

                    sourceValue:
                        "value"
                }),
            /AI supplied source evidence locator/
        );
    }
);
