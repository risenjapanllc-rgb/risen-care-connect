"use strict";

const SemanticAnalysisContract =
    require(
        "../server-domain/semantic/SemanticAnalysisContract"
    );

const SourceEvidenceLocatorContract =
    require(
        "../server-domain/semantic/SourceEvidenceLocatorContract"
    );


class SemanticAnalysisGenerator {
    constructor({
        apiKey,
        model = "gpt-6-luna",
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof apiKey !==
                "string" ||
            !apiKey.trim() ||
            typeof model !==
                "string" ||
            !model.trim() ||
            typeof fetchImpl !==
                "function"
        ) {
            throw new TypeError(
                "Semantic Analysis generator configuration is invalid"
            );
        }

        this.apiKey =
            apiKey.trim();

        this.model =
            model.trim();

        this.fetchImpl =
            fetchImpl;
    }


    extractOutputText(
        responseBody
    ) {
        let outputText =
            String(
                responseBody
                    ?.output_text ||
                ""
            ).trim();

        if (
            outputText
        ) {
            return outputText;
        }

        if (
            !Array.isArray(
                responseBody
                    ?.output
            )
        ) {
            return "";
        }

        for (
            const outputItem
            of responseBody.output
        ) {
            if (
                !Array.isArray(
                    outputItem
                        ?.content
                )
            ) {
                continue;
            }

            for (
                const contentItem
                of outputItem.content
            ) {
                if (
                    contentItem
                        ?.type ===
                        "output_text" &&
                    typeof contentItem
                        .text ===
                        "string" &&
                    contentItem
                        .text
                        .trim()
                ) {
                    return contentItem
                        .text
                        .trim();
                }
            }
        }

        return "";
    }


    validateAnalysis(
        analysis
    ) {
        const result =
            SemanticAnalysisContract
                .validate(
                    analysis
                );

        if (
            result.status !==
                "valid"
        ) {
            throw new Error(
                "Semantic Analysis response was invalid"
            );
        }

        return result
            .semanticAnalysis;
    }


    async generate({
        sourceType,
        sourceDocumentName,
        documentDate,
        sourceLabel,
        sourceValue,
        neighboringFields = [],
        evidence = {},
        sourceEvidenceLocator
    } = {}) {
        const normalizedSourceLabel =
            String(
                sourceLabel ||
                ""
            ).trim();

        if (
            !normalizedSourceLabel
        ) {
            throw new TypeError(
                "Semantic Analysis input is invalid"
            );
        }

        let trustedSourceEvidenceLocator =
            null;

        if (
            sourceEvidenceLocator !==
                undefined
        ) {
            const locatorResult =
                SourceEvidenceLocatorContract
                    .validate(
                        sourceEvidenceLocator
                    );

            if (
                locatorResult.status !==
                    "valid"
            ) {
                throw new TypeError(
                    "Semantic Analysis source evidence locator is invalid"
                );
            }

            trustedSourceEvidenceLocator =
                locatorResult
                    .sourceEvidenceLocator;
        }

        const normalizedInput = {
            sourceType:
                String(
                    sourceType ||
                        ""
                ).trim(),

            sourceDocumentName:
                String(
                    sourceDocumentName ||
                        ""
                ).trim(),

            documentDate:
                String(
                    documentDate ||
                        ""
                ).trim(),

            sourceLabel:
                normalizedSourceLabel,

            sourceValue:
                String(
                    sourceValue ||
                        ""
                ),

            neighboringFields:
                Array.isArray(
                    neighboringFields
                )
                    ? neighboringFields
                        .map(
                            (value) =>
                                String(
                                    value ||
                                        ""
                                ).trim()
                        )
                        .filter(Boolean)
                    : [],

            evidence:
                evidence &&
                typeof evidence ===
                    "object" &&
                !Array.isArray(
                    evidence
                )
                    ? evidence
                    : {}
        };

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
                                        "あなたはRISEN CAREのSemantic Analysis支援AIです。",
                                        "原本Evidenceを失わず、まず情報の視点を解釈し、その後、Evidenceから明確に分解できる独立事実だけを抽出してください。",
                                        "",
                                        "この段階ではFormal Meaningを確定してはいけません。",
                                        "entityName、fieldName、semanticType、canonicalCodeなどRISEN内部のFormal Meaning識別子を返してはいけません。",
                                        "",
                                        "perspectiveResolutionでは原本項目全体の視点を判断してください。",
                                        "分解後の個別factの主体と、原本項目全体の視点を混同してはいけません。",
                                        "例えば日勤日誌で複数利用者の入院状況を職員間共有している欄は、個々のfactの主体がresidentでも、原本項目全体のperspectiveTypeはfacility_operationになり得ます。",
                                        "- perspectiveTypeは必ず facility_operation / resident / document / medical_coordination / mixed / unknown のいずれか",
                                        "- subjectScopeは必ず single_resident / multiple_residents / facility / mixed / unknown のいずれか",
                                        "- temporalScopeは必ず as_of_time / event / period / future / mixed / unknown のいずれか",
                                        "- interpretation: 原本情報が何を表すかを自然言語で説明",
                                        "- confidence: high / medium / low",
                                        "日報・日勤日誌など当日の状態を共有する欄では、欄全体のtemporalScopeと、欄内に含まれる個別の日付factのtime.modeを分けて考えてください。",
                                        "欄全体が当日時点の状態一覧であればtemporalScope=as_of_time、個別の入院日等はfact側でtime.mode=eventにできます。",
                                        "",
                                        "semanticDecompositionでは、原本から独立した事実として十分に読み取れるものだけをfactsへ分解してください。",
                                        "一つの欄や一つの発話に複数利用者・複数事実が含まれる場合、それぞれを別のfactとして表現できます。",
                                        "帳票全体としての意味と、利用者ごとの個別事実は両立します。どちらか一方に潰してはいけません。",
                                        "",
                                        "各factはFormal Meaningではなく、自然言語ベースの中間表現です。",
                                        "必ず1 fact = 1独立事実としてください。日付と病院名を一つのvalueオブジェクトへまとめてはいけません。",
                                        "subjectは必ず {type, reference} とし、typeは resident / facility / staff / document / unknown のいずれかにしてください。",
                                        "subject.referenceは原本Evidence内で識別できる主体を文字列で示してください。",
                                        "naturalMeaningはその1事実だけの意味を自然言語で記述してください。",
                                        "naturalMeaningは必ずそのfactのvalueが何を表しているかと一致させてください。",
                                        "例えばvalueが病院名ならnaturalMeaningも病院名について説明し、単に「入院欄に記載されている」のような別の事実を説明してはいけません。",
                                        "valueは必ず文字列にしてください。オブジェクトや配列にしてはいけません。",
                                        "timeは必ず {mode, value} とし、modeは as_of_time / event / period / future / unknown のいずれかにしてください。",
                                        "sourceEvidenceは必ず {sourceLabel, sourceValue} の1オブジェクトとしてください。配列にしてはいけません。",
                                        "confidenceは各factに必ず high / medium / low のいずれかを入れてください。",
                                        "sourceScopeは必ず single_resident / multiple_residents / facility / mixed / unknown のいずれかにしてください。",
                                        "",
                                        "Evidenceにない個人、日付、病院名、出来事を推測して作ってはいけません。",
                                        "日付が存在しても、その日付が入院日、退院日、記録日など何を意味するかEvidenceから確定できない場合、勝手に意味を補ってはいけません。",
                                        "例えば原本が「利用者A 4/18 ○○病院」であるだけなら、「4/18という日付が記載されている」とすることはできますが、「入院日は4/18」と断定してはいけません。",
                                        "意味が未確定の日付はtime.mode=unknownとして保持できます。",
                                        "安全に確定できる事実はfactsとして保持したまま、不明な意味だけを施設へ確認できます。",
                                        "不明点がMeaning判断に影響する場合はdecompositionMode=reviewとし、facilityQuestionでは不足している意味だけを自然言語で確認してください。",
                                        "同じ欄・同じ位置・同じ構造で繰り返される値の意味が不明な場合、各レコードについて個別に質問してはいけません。",
                                        "その場合は「この欄で利用者名の次に記載される日付は何を表しますか？」のように、欄構造の意味を一度だけ確認してください。",
                                        "reviewだからといって、安全に抽出済みのfactsを捨てる必要はありません。",
                                        "Evidenceから主体を個別識別できない場合、勝手に仮の利用者へ分解してはいけません。",
                                        "重要な不足情報がある場合はreviewにしてください。",
                                        "reviewでは施設職員が自然な言葉で答えられる短い質問をfacilityQuestionに返してください。",
                                        "Semanticコードや内部データモデルについて施設職員へ質問してはいけません。",
                                        "",
                                        "JSONオブジェクトだけを返してください。",
                                        "",
                                        "出力形:",
                                        "{",
                                        '  "perspectiveResolution": {',
                                        '    "resolutionMode": "resolved|review",',
                                        '    "perspectiveType": "...",',
                                        '    "subjectScope": "...",',
                                        '    "temporalScope": "...",',
                                        '    "interpretation": "...",',
                                        '    "confidence": "high|medium|low",',
                                        '    "facilityQuestion": ""',
                                        "  },",
                                        '  "semanticDecomposition": {',
                                        '    "decompositionMode": "decomposed|review",',
                                        '    "sourceScope": "...",',
                                        '    "facts": [],',
                                        '    "facilityQuestion": ""',
                                        "  }",
                                        "}"
                                    ].join(
                                        "\n"
                                    )
                                },

                                {
                                    role:
                                        "user",

                                    content:
                                        JSON.stringify(
                                            normalizedInput
                                        )
                                }
                            ]
                        })
                }
            );

        const responseText =
            await response.text();

        if (
            !response.ok
        ) {
            throw new Error(
                `Semantic Analysis request failed: ${response.status}`
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
                "Semantic Analysis response was not JSON"
            );
        }

        const outputText =
            this.extractOutputText(
                responseBody
            );

        if (
            !outputText
        ) {
            throw new Error(
                "Semantic Analysis output was empty"
            );
        }

        let analysis;

        try {
            analysis =
                JSON.parse(
                    outputText
                );
        } catch {
            throw new Error(
                "Semantic Analysis output was invalid"
            );
        }

        const aiFacts =
            analysis
                ?.semanticDecomposition
                ?.facts;

        if (
            Array.isArray(
                aiFacts
            ) &&
            aiFacts.some(
                (fact) =>
                    fact &&
                    typeof fact ===
                        "object" &&
                    !Array.isArray(
                        fact
                    ) &&
                    Object.prototype
                        .hasOwnProperty.call(
                            fact,
                            "sourceEvidenceLocator"
                        )
            )
        ) {
            throw new Error(
                "AI supplied source evidence locator"
            );
        }

        const validatedAnalysis =
            this.validateAnalysis(
                analysis
            );

        if (
            !trustedSourceEvidenceLocator
        ) {
            return validatedAnalysis;
        }

        const analysisWithTrustedLocator = {
            ...validatedAnalysis,

            semanticDecomposition: {
                ...validatedAnalysis
                    .semanticDecomposition,

                facts:
                    validatedAnalysis
                        .semanticDecomposition
                        .facts
                        .map(
                            (fact) => ({
                                ...fact,

                                sourceEvidenceLocator:
                                    trustedSourceEvidenceLocator
                            })
                        )
            }
        };

        return this.validateAnalysis(
            analysisWithTrustedLocator
        );
    }
}


module.exports =
    SemanticAnalysisGenerator;
