"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const StandardMeaningAiProposalGenerator =
    require(
        "./StandardMeaningAiProposalGenerator"
    );

test(
    "returns a validated proposal and preserves authoritative semanticType",
    async () => {
        let receivedBody = null;

        const generator =
            new StandardMeaningAiProposalGenerator({
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
                                                    "new",
                                                entityName:
                                                    "affiliation",
                                                fieldName:
                                                    "code",
                                                displayName:
                                                    "所属コード",
                                                synonyms: [
                                                    "所属コード",
                                                    "所属先コード"
                                                ],
                                                reason:
                                                    "所属先を識別するコード",
                                                confidence:
                                                    "high",
                                                semanticType:
                                                    "wrong-value"
                                            })
                                    })
                        };
                    }
            });

        const result =
            await generator.generate({
                proposedMeaning:
                    "利用者が所属している施設・事業所を識別するコード",

                evidence: {
                    sourceLabel:
                        "(所属コード)"
                },

                semanticType:
                    "recipient_certificate",

                standardMeanings: [
                    {
                        entityName:
                            "user",
                        fieldName:
                            "user_code",
                        displayName:
                            "利用者番号",
                        synonyms: [
                            "利用者コード"
                        ]
                    }
                ]
            });

        assert.equal(
            result.mode,
            "new"
        );

        assert.equal(
            result.entityName,
            "affiliation"
        );

        assert.equal(
            result.fieldName,
            "code"
        );

        assert.equal(
            result.semanticType,
            "recipient_certificate"
        );

        assert.equal(
            result.confidence,
            "high"
        );

        assert.equal(
            receivedBody.model,
            "test-model"
        );
    }
);


test(
    "allows review without inventing a semantic identity",
    async () => {
        const generator =
            new StandardMeaningAiProposalGenerator({
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
                                            entityName:
                                                "",
                                            fieldName:
                                                "",
                                            displayName:
                                                "",
                                            synonyms:
                                                [],
                                            reason:
                                                "意味が曖昧",
                                            confidence:
                                                "low"
                                        })
                                })
                    })
            });

        const result =
            await generator.generate({
                proposedMeaning:
                    "不明な項目",

                semanticType:
                    "recipient_certificate",

                standardMeanings:
                    []
            });

        assert.equal(
            result.mode,
            "review"
        );

        assert.equal(
            result.semanticType,
            "recipient_certificate"
        );
    }
);


test(
    "allows AI to propose semanticType when no authoritative semanticType exists",
    async () => {
        let receivedBody = null;

        const generator =
            new StandardMeaningAiProposalGenerator({
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
                                                    "new",
                                                entityName:
                                                    "hospitalization",
                                                fieldName:
                                                    "current_status",
                                                displayName:
                                                    "入院状況",
                                                synonyms: [
                                                    "入院"
                                                ],
                                                semanticType:
                                                    "support_record",
                                                reason:
                                                    "日勤日誌上の入院状況を表すため",
                                                facilityQuestion:
                                                    "",
                                                confidence:
                                                    "high"
                                            })
                                    })
                        };
                    }
            });

        const result =
            await generator.generate({
                proposedMeaning:
                    "日勤日誌の日付時点で入院中の利用者と、それぞれの入院日および入院先を記録している。",

                evidence: {
                    sourceLabel:
                        "入院"
                },

                allowedSemanticTypes: [
                    "recipient_certificate",
                    "support_record"
                ],

                standardMeanings:
                    []
            });

        assert.equal(
            result.mode,
            "new"
        );

        assert.equal(
            result.semanticType,
            "support_record"
        );

        const userMessage =
            receivedBody.input.find(
                item =>
                    item.role === "user"
            );

        const payload =
            JSON.parse(
                userMessage.content
            );

        assert.equal(
            payload.authoritativeSemanticType,
            undefined
        );
    }
);


test(
    "rejects an AI semanticType outside active projection contracts",
    async () => {
        const generator =
            new StandardMeaningAiProposalGenerator({
                apiKey:
                    "test-key",

                model:
                    "test-model",

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
                                                "new",
                                            entityName:
                                                "hospitalization",
                                            fieldName:
                                                "hospitalization_details",
                                            displayName:
                                                "入院情報",
                                            synonyms: [
                                                "入院"
                                            ],
                                            semanticType:
                                                "hospitalization_record",
                                            reason:
                                                "入院情報を表すため",
                                            facilityQuestion:
                                                "",
                                            confidence:
                                                "medium"
                                        })
                                })
                    })
            });

        await assert.rejects(
            () =>
                generator.generate({
                    proposedMeaning:
                        "日勤日誌の日付時点で入院中の利用者と、それぞれの入院日および入院先を記録している。",

                    evidence: {
                        sourceLabel:
                            "入院"
                    },

                    allowedSemanticTypes: [
                        "recipient_certificate",
                        "support_record"
                    ],

                    standardMeanings:
                        []
                }),

            /semanticType was not an active projection contract/
        );
    }
);
