"use strict";

class StandardMeaningAiProposalGenerator {
    constructor({
        apiKey,
        model = "gpt-6-luna",
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof apiKey !== "string" ||
            !apiKey.trim() ||
            typeof model !== "string" ||
            !model.trim() ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "StandardMeaningAiProposalGenerator requires OpenAI configuration"
            );
        }

        this.apiKey =
            apiKey.trim();

        this.model =
            model.trim();

        this.fetchImpl =
            fetchImpl;
    }

    extractText(body) {
        if (
            body &&
            typeof body === "object" &&
            !Array.isArray(body) &&
            typeof body.output_text === "string" &&
            body.output_text.trim()
        ) {
            return body.output_text.trim();
        }

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            !Array.isArray(body.output)
        ) {
            return "";
        }

        for (const item of body.output) {
            if (
                !item ||
                typeof item !== "object" ||
                Array.isArray(item) ||
                !Array.isArray(item.content)
            ) {
                continue;
            }

            for (const content of item.content) {
                if (
                    content &&
                    typeof content === "object" &&
                    !Array.isArray(content) &&
                    content.type === "output_text" &&
                    typeof content.text === "string" &&
                    content.text.trim()
                ) {
                    return content.text.trim();
                }
            }
        }

        return "";
    }

    validateProposal(
        proposal,
        authoritativeSemanticType
    ) {
        if (
            !proposal ||
            typeof proposal !== "object" ||
            Array.isArray(proposal)
        ) {
            throw new Error(
                "Standard Meaning AI proposal was invalid"
            );
        }

        const mode =
            String(
                proposal.mode || ""
            ).trim();

        if (
            ![
                "existing",
                "new",
                "review"
            ].includes(mode)
        ) {
            throw new Error(
                "Standard Meaning AI proposal mode was invalid"
            );
        }

        const normalized = {
            mode,
            entityName:
                String(
                    proposal.entityName || ""
                ).trim(),
            fieldName:
                String(
                    proposal.fieldName || ""
                ).trim(),
            displayName:
                String(
                    proposal.displayName || ""
                ).trim(),
            synonyms:
                Array.isArray(
                    proposal.synonyms
                )
                    ? proposal.synonyms
                        .filter(
                            value =>
                                typeof value ===
                                "string" &&
                                value.trim()
                        )
                        .map(
                            value =>
                                value.trim()
                        )
                    : [],
            semanticType:
                authoritativeSemanticType,
            reason:
                String(
                    proposal.reason || ""
                ).trim(),
            facilityQuestion:
                String(
                    proposal.facilityQuestion || ""
                ).trim(),
            confidence:
                String(
                    proposal.confidence || ""
                ).trim()
        };

        if (
            mode === "review" &&
            !normalized.facilityQuestion
        ) {
            normalized.facilityQuestion =
                "この項目が何を表すか確認が必要です。分かる範囲で教えてください。";
        }

        if (mode !== "review") {
            if (
                !normalized.entityName ||
                !normalized.fieldName ||
                !normalized.displayName
            ) {
                throw new Error(
                    "Standard Meaning AI proposal identity was incomplete"
                );
            }
        }

        if (
            ![
                "high",
                "medium",
                "low"
            ].includes(
                normalized.confidence
            )
        ) {
            normalized.confidence =
                "low";
        }

        return normalized;
    }

    async generate({
        proposedMeaning,
        evidence = {},
        semanticType,
        standardMeanings = []
    } = {}) {
        const normalizedProposedMeaning =
            String(
                proposedMeaning || ""
            ).trim();

        const normalizedSemanticType =
            String(
                semanticType || ""
            ).trim();

        if (
            !normalizedProposedMeaning ||
            !normalizedSemanticType ||
            !Array.isArray(
                standardMeanings
            )
        ) {
            throw new TypeError(
                "Standard Meaning AI proposal input is invalid"
            );
        }

        const existingMeanings =
            standardMeanings
                .filter(
                    item =>
                        item &&
                        typeof item ===
                            "object" &&
                        !Array.isArray(
                            item
                        )
                )
                .map(
                    item => ({
                        entityName:
                            String(
                                item.entityName ||
                                item.entity_name ||
                                ""
                            ).trim(),
                        fieldName:
                            String(
                                item.fieldName ||
                                item.field_name ||
                                ""
                            ).trim(),
                        displayName:
                            String(
                                item.displayName ||
                                item.display_name ||
                                ""
                            ).trim(),
                        synonyms:
                            Array.isArray(
                                item.synonyms
                            )
                                ? item.synonyms
                                : []
                    })
                )
                .filter(
                    item =>
                        item.entityName &&
                        item.fieldName &&
                        item.displayName
                );

        const response =
            await this.fetchImpl(
                "https://api.openai.com/v1/responses",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${this.apiKey}`
                    },

                    body:
                        JSON.stringify({
                            model:
                                this.model,

                            input: [
                                {
                                    role:
                                        "system",

                                    content:
                                        [
                                            "あなたはRISEN CAREのStandard Meaning設計支援AIです。",
                                            "正式Authorityを勝手に確定してはいけません。",
                                            "既存Standard Meaningを最優先で再利用してください。",
                                            "同義の既存Meaningがある場合はmode=existingにしてください。",
                                            "既存に無い場合だけmode=newを提案してください。",
                                            "判断が曖昧ならmode=reviewにしてください。",
                                            "semanticTypeは入力済みのAuthority値なので変更・推測してはいけません。",
                                            "帳票固有の値そのものをMeaning名にしてはいけません。",
                                            "10000や20000のようなコード値が増えても再利用できる意味構造を提案してください。",
                                            "reasonはRISEN管理者向けの判断理由です。",
                                            "facilityQuestionは施設職員向けの短く平易な確認文です。",
                                            "mode=reviewの場合は、施設職員が専門用語なしで答えられるfacilityQuestionを必ず返してください。",
                                            "facilityQuestionでは、proposedMeaningやevidenceから既に明らかな情報を再質問しないでください。",
                                            "誰の・何の・いつから・何を意味するか等のうち、既に明らかな要素は質問せず、Meaning確定に必要な不足情報だけを尋ねてください。",
                                            "facilityQuestionは一度にできるだけ1つの不足点だけを質問してください。",
                                            "facilityQuestionにはentityName、fieldName、semanticType、canonical codeなどのFormal Meaning内部情報を含めないでください。",
                                            "modeがreview以外の場合、facilityQuestionは空文字で構いません。",
                                            "JSONオブジェクトだけを返してください。",
                                            "キーは mode, entityName, fieldName, displayName, synonyms, reason, facilityQuestion, confidence。",
                                            "confidenceはhigh, medium, lowのいずれか。"
                                        ].join("\n")
                                },
                                {
                                    role:
                                        "user",

                                    content:
                                        JSON.stringify({
                                            proposedMeaning:
                                                normalizedProposedMeaning,

                                            evidence,

                                            authoritativeSemanticType:
                                                normalizedSemanticType,

                                            existingStandardMeanings:
                                                existingMeanings
                                        })
                                }
                            ]
                        })
                }
            );

        const responseText =
            await response.text();

        if (!response.ok) {
            throw new Error(
                `OpenAI Standard Meaning proposal failed: ${response.status} ${responseText}`
            );
        }

        let body;

        try {
            body =
                JSON.parse(
                    responseText
                );
        } catch {
            throw new Error(
                "OpenAI Standard Meaning proposal response was not valid JSON"
            );
        }

        const text =
            this.extractText(
                body
            );

        if (!text) {
            throw new Error(
                "OpenAI Standard Meaning proposal text was not returned"
            );
        }

        let proposal;

        try {
            proposal =
                JSON.parse(
                    text
                );
        } catch {
            throw new Error(
                "Standard Meaning AI proposal was not valid JSON"
            );
        }

        return this.validateProposal(
            proposal,
            normalizedSemanticType
        );
    }
}

module.exports =
    StandardMeaningAiProposalGenerator;
