'use strict';

/**
 * 読み取った文書内容から、
 * 支援文書の種類を判定する。
 *
 * 重要:
 * - ファイル形式そのものでは判定しない
 * - 単一の特徴だけで断定しない
 * - 複数の特徴をスコア化する
 * - 分からない場合は unknown を返す
 */
class DocumentTypeDetector {

    detect(document = {}) {
        const texts =
            this.collectTexts(document);

        const normalizedTexts =
            texts.map(text =>
                this.normalize(text)
            );

        const result =
            this.scoreIndividualSupportPlan(
                normalizedTexts
            );

        if (result.score < 4) {
            return {
                type: 'unknown',
                label: '未確定',
                confidence: 'low',
                score: result.score,
                matchedSignals:
                    result.matchedSignals
            };
        }

        return {
            type: result.type,
            label: result.label,
            confidence:
                result.score >= 7
                    ? 'high'
                    : 'medium',
            score: result.score,
            matchedSignals:
                result.matchedSignals
        };
    }

    collectTexts(document) {
        const texts = [];

        if (Array.isArray(document.sheetNames)) {
            texts.push(
                ...document.sheetNames
            );
        }

        if (Array.isArray(document.sheets)) {
            document.sheets.forEach(sheet => {
                if (sheet?.sheetName) {
                    texts.push(
                        sheet.sheetName
                    );
                }

                if (!Array.isArray(sheet?.rows)) {
                    return;
                }

                sheet.rows.forEach(row => {
                    if (!Array.isArray(row)) {
                        return;
                    }

                    row.forEach(cell => {
                        if (
                            cell !== null &&
                            cell !== undefined &&
                            String(cell).trim() !== ''
                        ) {
                            texts.push(
                                String(cell)
                            );
                        }
                    });
                });
            });
        }

        return texts;
    }

    scoreIndividualSupportPlan(texts) {
        const signals = [
            {
                name: '個別支援計画',
                weight: 4
            },
            {
                name: '本人の希望',
                weight: 2
            },
            {
                name: '長期目標',
                weight: 2
            },
            {
                name: '支援内容',
                weight: 2
            }
        ];

        let score = 0;
        const matchedSignals = [];

        signals.forEach(signal => {
            const normalizedName =
                this.normalize(signal.name);

            const matched =
                texts.some(text =>
                    text.includes(
                        normalizedName
                    )
                );

            if (!matched) {
                return;
            }

            score += signal.weight;

            matchedSignals.push({
                signal: signal.name,
                weight: signal.weight
            });
        });

        return {
            type: 'individual_support_plan',
            label: '個別支援計画',
            score,
            matchedSignals
        };
    }

    normalize(value) {
        return String(value || '')
            .normalize('NFKC')
            .toLowerCase()
            .replace(/[\s　_\-()（）]/g, '');
    }
}

module.exports = DocumentTypeDetector;
