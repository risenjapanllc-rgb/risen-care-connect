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
