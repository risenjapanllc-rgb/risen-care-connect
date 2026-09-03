'use strict';

/**
 * CSV全体の構造から「何のデータか」を判定する。
 *
 * 重要:
 * - 特定施設のCSV形式に依存しない
 * - 単一ヘッダーだけで断定しない
 * - 複数項目の組み合わせから判定する
 * - 分からない場合は unknown を返す
 */
class CsvDataTypeDetector {

    detect(metadata = {}) {
        const headers = Array.isArray(metadata?.columns)
            ? metadata.columns
                .map(column => String(column?.name || '').trim())
                .filter(Boolean)
            : [];

        const normalizedHeaders =
            headers.map(header => this.normalize(header));

        const candidates = [
            this.scoreResidentBasicInfo(normalizedHeaders),
            this.scoreSupportRecord(normalizedHeaders)
        ];

        candidates.sort((a, b) => b.score - a.score);

        const best = candidates[0];

        if (!best || best.score < 4) {
            return {
                type: 'unknown',
                label: '未確定',
                confidence: 'low',
                score: best?.score || 0,
                matchedSignals: best?.matchedSignals || [],
                headers
            };
        }

        return {
            type: best.type,
            label: best.label,
            confidence:
                best.score >= 7
                    ? 'high'
                    : 'medium',
            score: best.score,
            matchedSignals: best.matchedSignals,
            headers
        };
    }

    scoreResidentBasicInfo(headers) {
        return this.score({
            type: 'resident_basic_info',
            label: '利用者基本情報',
            headers,
            signals: [
                {
                    names: [
                        '利用者番号',
                        '利用者id',
                        'residentid'
                    ],
                    weight: 3
                },
                {
                    names: [
                        '利用者名',
                        '氏名',
                        '名前'
                    ],
                    weight: 2
                },
                {
                    names: [
                        'フリガナ',
                        'ふりがな',
                        'カナ'
                    ],
                    weight: 2
                },
                {
                    names: [
                        '生年月日',
                        '誕生日'
                    ],
                    weight: 3
                },
                {
                    names: [
                        '性別'
                    ],
                    weight: 1
                },
                {
                    names: [
                        '住所',
                        '所在地'
                    ],
                    weight: 2
                },
                {
                    names: [
                        '郵便番号',
                        '郵便番号住所'
                    ],
                    weight: 1
                },
                {
                    names: [
                        '電話番号'
                    ],
                    weight: 1
                }
            ]
        });
    }

    scoreSupportRecord(headers) {
        return this.score({
            type: 'support_record',
            label: '支援記録',
            headers,
            signals: [
                {
                    names: [
                        '日時',
                        '記録日時'
                    ],
                    weight: 2
                },
                {
                    names: [
                        '氏名',
                        '利用者名'
                    ],
                    weight: 1
                },
                {
                    names: [
                        '記入者',
                        '記録者',
                        '担当者'
                    ],
                    weight: 2
                },
                {
                    names: [
                        '種類',
                        '記録種別',
                        '区分'
                    ],
                    weight: 2
                },
                {
                    names: [
                        '処遇内容',
                        '支援内容'
                    ],
                    weight: 2
                },
                {
                    names: [
                        '詳細',
                        '詳細2'
                    ],
                    weight: 1
                },
                {
                    names: [
                        '行動'
                    ],
                    weight: 1
                },
                {
                    names: [
                        '作成日時'
                    ],
                    weight: 1
                }
            ]
        });
    }

    score({
        type,
        label,
        headers,
        signals
    }) {
        let score = 0;
        const matchedSignals = [];

        signals.forEach(signal => {
            const matched =
                signal.names.find(name =>
                    headers.includes(
                        this.normalize(name)
                    )
                );

            if (!matched) {
                return;
            }

            score += signal.weight;

            matchedSignals.push({
                header: matched,
                weight: signal.weight
            });
        });

        return {
            type,
            label,
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

module.exports = CsvDataTypeDetector;
