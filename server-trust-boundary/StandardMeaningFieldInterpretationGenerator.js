"use strict";

class StandardMeaningFieldInterpretationGenerator {
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
            throw new TypeError(
                "Standard Meaning field interpretation generator configuration is invalid"
            );
        }

        this.apiKey =
            apiKey.trim();

        this.model =
            model.trim();

        this.fetchImpl =
            fetchImpl;
    }

    normalizeProposal(
        proposal
    ) {
        if (
            !proposal ||
            typeof proposal !== "object" ||
            Array.isArray(proposal)
        ) {
            throw new Error(
                "Standard Meaning field interpretation response was invalid"
            );
        }

        const mode =
            String(
                proposal.mode || ""
            ).trim();

        if (
            ![
                "interpreted",
                "review"
            ].includes(mode)
        ) {
            throw new Error(
                "Standard Meaning field interpretation mode was invalid"
            );
        }

        const normalized = {
            mode,

            interpretation:
                String(
                    proposal.interpretation || ""
                ).trim(),

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
            mode === "interpreted" &&
            !normalized.interpretation
        ) {
            throw new Error(
                "Standard Meaning field interpretation was empty"
            );
        }

        if (
            mode === "review" &&
            !normalized.facilityQuestion
        ) {
            normalized.facilityQuestion =
                "この項目が何を表すか確認が必要です。分かる範囲で教えてください。";
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

        if (
            normalized.mode ===
                "interpreted" &&
            normalized.confidence ===
                "low"
        ) {
            normalized.mode =
                "review";

            if (
                !normalized
                    .facilityQuestion
            ) {
                normalized
                    .facilityQuestion =
                    "この項目について、原本だけでは判断できない点があります。実際にはどのような場合に記載する項目か、分かる範囲で教えてください。";
            }
        }

        return normalized;
    }

    async generate({
        sourceLabel,
        sourceDocumentName,
        documentType,
        evidence = {}
    } = {}) {
        const normalizedSourceLabel =
            String(
                sourceLabel || ""
            ).trim();

        if (!normalizedSourceLabel) {
            throw new TypeError(
                "Standard Meaning field interpretation input is invalid"
            );
        }

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

                                    content: [
                                        "あなたはRISEN CAREの原本項目解釈支援AIです。",
                                        "この段階ではFormal Meaningを確定してはいけません。",
                                        "entityName、fieldName、semanticType、canonical codeを決めたり返したりしてはいけません。",
                                        "原本の項目名、値、周辺項目、書類名などのEvidenceから、その項目が何を表しているかを自然言語で解釈してください。",
                                        "書類名や周辺項目から分かる時間軸も解釈してください。日報、日勤日誌、本日、当日などの表現がある場合、その項目が発生イベントを記録するのか、その日時点の状態を記録するのかを区別してください。",
                                        "原本がその日時点の状態一覧を表していると判断できる場合は、interpretationに「当日時点で」など時間的な意味を自然に含めてください。",
                                        "Evidenceだけで十分に解釈でき、confidenceがhighまたはmediumの場合だけmode=interpretedにしてください。",
                                        "confidenceがlowの場合、または意味を確定するのに重要な不足情報がある場合は必ずmode=reviewにしてください。",
                                        "mode=reviewでは、施設職員が自然な言葉で答えられる短い質問をfacilityQuestionに返してください。",
                                        "既にEvidenceから分かることを再質問してはいけません。",
                                        "一度にできるだけ1つの不足点だけを質問してください。",
                                        "施設職員にSemanticコードや内部データモデルを考えさせてはいけません。",
                                        "帳票固有の値や個人名をMeaningとして扱ってはいけません。",
                                        "interpretationはFormal Meaning名ではなく、原本項目の自然言語による意味説明です。",
                                        "JSONオブジェクトだけを返してください。"
                                    ].join("\n")
                                },
                                {
                                    role:
                                        "user",

                                    content:
                                        JSON.stringify({
                                            sourceLabel:
                                                normalizedSourceLabel,

                                            sourceDocumentName:
                                                String(
                                                    sourceDocumentName || ""
                                                ).trim(),

                                            documentType:
                                                String(
                                                    documentType || ""
                                                ).trim(),

                                            evidence:
                                                evidence &&
                                                typeof evidence ===
                                                    "object" &&
                                                !Array.isArray(
                                                    evidence
                                                )
                                                    ? evidence
                                                    : {}
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
                `Standard Meaning field interpretation request failed: ${response.status}`
            );
        }

        let responseBody;

        try {
            responseBody =
                JSON.parse(
                    responseText
                );
        } catch {
            throw new Error(
                "Standard Meaning field interpretation response was not JSON"
            );
        }

        let outputText =
            String(
                responseBody?.output_text || ""
            ).trim();

        if (
            !outputText &&
            Array.isArray(
                responseBody?.output
            )
        ) {
            for (
                const outputItem
                of responseBody.output
            ) {
                if (
                    !Array.isArray(
                        outputItem?.content
                    )
                ) {
                    continue;
                }

                for (
                    const contentItem
                    of outputItem.content
                ) {
                    if (
                        contentItem?.type ===
                            "output_text" &&
                        typeof contentItem.text ===
                            "string" &&
                        contentItem.text.trim()
                    ) {
                        outputText =
                            contentItem.text.trim();

                        break;
                    }
                }

                if (outputText) {
                    break;
                }
            }
        }

        if (!outputText) {
            throw new Error(
                "Standard Meaning field interpretation output was empty"
            );
        }

        let proposal;

        try {
            proposal =
                JSON.parse(
                    outputText
                );
        } catch {
            throw new Error(
                "Standard Meaning field interpretation output was invalid"
            );
        }

        return this.normalizeProposal(
            proposal
        );
    }
}

module.exports =
    StandardMeaningFieldInterpretationGenerator;
