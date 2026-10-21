"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const StandardMeaningFieldInterpretationGenerator =
    require(
        "./StandardMeaningFieldInterpretationGenerator"
    );


test(
    "interprets source evidence without requiring proposedMeaning or semanticType",
    async () => {
        let receivedBody = null;

        const generator =
            new StandardMeaningFieldInterpretationGenerator({
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
                                            JSON.stringify({
                                                mode:
                                                    "interpreted",

                                                interpretation:
                                                    "現在入院中または入院に関する利用者情報を記録する項目",

                                                reason:
                                                    "原本項目名と値、周辺項目から入院情報欄と判断できる",

                                                facilityQuestion:
                                                    "",

                                                confidence:
                                                    "high",

                                                entityName:
                                                    "must-not-leak",

                                                fieldName:
                                                    "must-not-leak",

                                                semanticType:
                                                    "must-not-leak"
                                            })
                                    })
                        };
                    }
            });

        const result =
            await generator.generate({
                sourceLabel:
                    "入院",

                sourceDocumentName:
                    "日勤日誌.docx",

                documentType:
                    "unknown",

                evidence: {
                    sampleValues: [
                        "入院日と病院名を含む記録"
                    ],

                    neighboringFields: [
                        "外泊",
                        "外出",
                        "面会",
                        "通院状況"
                    ]
                }
            });

        assert.deepStrictEqual(
            result,
            {
                mode:
                    "interpreted",

                interpretation:
                    "現在入院中または入院に関する利用者情報を記録する項目",

                reason:
                    "原本項目名と値、周辺項目から入院情報欄と判断できる",

                facilityQuestion:
                    "",

                confidence:
                    "high"
            }
        );

        assert.equal(
            receivedBody.model,
            "test-model"
        );
    }
);


test(
    "returns review with a natural-language facility question when evidence is insufficient",
    async () => {
        const generator =
            new StandardMeaningFieldInterpretationGenerator({
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
                                        JSON.stringify({
                                            mode:
                                                "review",

                                            interpretation:
                                                "",

                                            reason:
                                                "当日の発生記録か現在状態かを区別できない",

                                            facilityQuestion:
                                                "この欄は、その日に入院した方だけでなく、現在入院中の方も記載しますか？",

                                            confidence:
                                                "low"
                                        })
                                })
                    })
            });

        const result =
            await generator.generate({
                sourceLabel:
                    "入院",

                sourceDocumentName:
                    "日勤日誌.docx",

                documentType:
                    "unknown",

                evidence: {
                    sampleValues: [
                        "入院日と病院名を含む記録"
                    ]
                }
            });

        assert.equal(
            result.mode,
            "review"
        );

        assert.equal(
            result.interpretation,
            ""
        );

        assert.equal(
            result.facilityQuestion,
            "この欄は、その日に入院した方だけでなく、現在入院中の方も記載しますか？"
        );

        assert.equal(
            result.confidence,
            "low"
        );

        assert.equal(
            Object.hasOwn(
                result,
                "entityName"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                result,
                "fieldName"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                result,
                "semanticType"
            ),
            false
        );
    }
);


test(
    "reads output_text from Responses API message content",
    async () => {
        const generator =
            new StandardMeaningFieldInterpretationGenerator({
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
                                                        JSON.stringify({
                                                            mode:
                                                                "interpreted",

                                                            interpretation:
                                                                "入院に関する利用者情報を記録する項目",

                                                            reason:
                                                                "原本Evidenceから判断できる",

                                                            facilityQuestion:
                                                                "",

                                                            confidence:
                                                                "high"
                                                        })
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

                evidence: {
                    sampleValues: [
                        "入院記録"
                    ]
                }
            });

        assert.equal(
            result.mode,
            "interpreted"
        );

        assert.equal(
            result.interpretation,
            "入院に関する利用者情報を記録する項目"
        );

        assert.equal(
            result.confidence,
            "high"
        );
    }
);


test(
    "converts low-confidence interpretation into facility review",
    async () => {
        const generator =
            new StandardMeaningFieldInterpretationGenerator({
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
                                        JSON.stringify({
                                            mode:
                                                "interpreted",

                                            interpretation:
                                                "入院している利用者について、入院日と病院名を記録する項目です。",

                                            reason:
                                                "",

                                            facilityQuestion:
                                                "",

                                            confidence:
                                                "low"
                                        })
                                })
                    })
            });

        const result =
            await generator.generate({
                sourceLabel:
                    "入院"
            });

        assert.equal(
            result.mode,
            "review"
        );

        assert.equal(
            result.confidence,
            "low"
        );

        assert.equal(
            typeof result.facilityQuestion,
            "string"
        );

        assert.ok(
            result.facilityQuestion.trim()
        );
    }
);


test(
    "includes previous interpretation when reanalyzing a field",
    async () => {
        let receivedBody = null;

        const generator =
            new StandardMeaningFieldInterpretationGenerator({
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
                                            JSON.stringify({
                                                mode:
                                                    "interpreted",

                                                interpretation:
                                                    "当日時点で入院中の利用者情報を記録する項目",

                                                reason:
                                                    "前回解釈をEvidenceと照合して再評価した",

                                                facilityQuestion:
                                                    "",

                                                confidence:
                                                    "high"
                                            })
                                    })
                        };
                    }
            });

        await generator.generate({
            sourceLabel:
                "入院",

            sourceDocumentName:
                "日勤日誌.docx",

            documentType:
                "daily_log",

            evidence: {
                sampleValues: [
                    "入院日と病院名"
                ],

                neighboringFields: [
                    "外泊",
                    "通院"
                ]
            },

            previousInterpretation:
                "入院に関する利用者情報を記録する項目"
        });

        const userMessage =
            receivedBody.input.find(
                item =>
                    item.role === "user"
            );

        assert.ok(
            userMessage
        );

        const userPayload =
            JSON.parse(
                userMessage.content
            );

        assert.equal(
            userPayload.previousInterpretation,
            "入院に関する利用者情報を記録する項目"
        );

        const systemMessage =
            receivedBody.input.find(
                item =>
                    item.role === "system"
            );

        assert.match(
            systemMessage.content,
            /前回の解釈/
        );

        assert.match(
            systemMessage.content,
            /再評価/
        );
    }
);
