'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const SourceFieldExtractor =
    require('./SourceFieldExtractor');

test('Excelの横持ち表を原本の項目名のまま抽出する', () => {
    const extractor =
        new SourceFieldExtractor();

    const result =
        extractor.extractExcelRows({
            sheets: [
                {
                    sheetName: '２階女性',
                    rows: [
                        [
                            '居室番号',
                            '利用者名',
                            '性格',
                            '本人の意向'
                        ],
                        [
                            '201',
                            'テスト利用者',
                            '穏やか',
                            '自分で選びたい'
                        ]
                    ]
                }
            ]
        });

    assert.deepEqual(
        result,
        [
            {
                sheetName: '２階女性',
                rowIndex: 2,
                fields: {
                    '居室番号': '201',
                    '利用者名': 'テスト利用者',
                    '性格': '穏やか',
                    '本人の意向': '自分で選びたい'
                }
            }
        ]
    );
});

test('原本に存在しないRISEN項目を勝手に追加しない', () => {
    const extractor =
        new SourceFieldExtractor();

    const result =
        extractor.extractExcelRows({
            sheets: [
                {
                    sheetName: 'テスト',
                    rows: [
                        ['利用者名', '性格'],
                        ['テスト利用者', '穏やか']
                    ]
                }
            ]
        });

    assert.equal(
        Object.hasOwn(
            result[0].fields,
            '長期目標'
        ),
        false
    );

    assert.equal(
        Object.hasOwn(
            result[0].fields,
            '本人の希望'
        ),
        false
    );
});

test('空行は原本データとして抽出しない', () => {
    const extractor =
        new SourceFieldExtractor();

    const result =
        extractor.extractExcelRows({
            sheets: [
                {
                    sheetName: 'テスト',
                    rows: [
                        ['利用者名', '性格'],
                        ['', ''],
                        ['テスト利用者', '穏やか']
                    ]
                }
            ]
        });

    assert.equal(result.length, 1);
    assert.equal(
        result[0].fields['利用者名'],
        'テスト利用者'
    );
});

test('実原本の横持ち帳票を項目名そのままで利用者単位に抽出する', () => {
    const extractor = new SourceFieldExtractor();

    const result = extractor.extractExcelRows({
        sheetNames: ['２階女性'],
        sheets: [
            {
                sheetName: '２階女性',
                rows: [
                    [
                        '【希望の家グリーンホーム　2階女性　利用者特性について】',
                        null,
                        null,
                        null,
                        null,
                        'Ｒ7・2月'
                    ],
                    [
                        null,
                        '居室番号',
                        '利用者名',
                        '様',
                        '性格',
                        'コミュニケーションの取り方',
                        '介護上の注意点',
                        '本人の意向',
                        '障害特性や体調',
                        'その他留意点'
                    ],
                    [
                        'すみれ通り',
                        '208',
                        '大東　育子',
                        '様',
                        'こだわり強い。',
                        '言語でのコミュニケーション可能。',
                        '移乗時注意。',
                        '元気でいたい。',
                        '脳性まひ',
                        '自傷行為等注意'
                    ],
                    [
                        null,
                        '207',
                        '中嶋　純子',
                        '様',
                        '色々な事が気になる。',
                        '意思伝達装置使用。',
                        '経管栄養実施時注意。',
                        '健康に楽しく過ごしたい。',
                        'ウイルソン病',
                        '家族との関わり'
                    ]
                ]
            }
        ]
    });

    assert.equal(result.length, 2);

    assert.equal(
        result[0].fields['居室番号'],
        '208'
    );

    assert.equal(
        result[0].fields['利用者名'],
        '大東　育子'
    );

    assert.equal(
        result[0].fields['コミュニケーションの取り方'],
        '言語でのコミュニケーション可能。'
    );

    assert.equal(
        result[1].fields['利用者名'],
        '中嶋　純子'
    );

    assert.equal(
        result[1].fields['性格'],
        '色々な事が気になる。'
    );

    assert.equal(
        result[1].fields['本人の意向'],
        '健康に楽しく過ごしたい。'
    );
});

;

test('完全一致する重複行は1件にまとめ、内容が異なる行は残す', () => {
    const extractor = new SourceFieldExtractor();

    const result = extractor.extractExcelRows({
        sheets: [
            {
                sheetName: '男性',
                rows: [
                    ['居室番号', '利用者名', '性格'],
                    ['501', '辻　幸一', '無口で穏やかな性格。'],
                    ['501', '辻　幸一', '無口で穏やかな性格。'],
                    ['502', '別の利用者', '明るい性格。']
                ]
            }
        ]
    });

    assert.equal(result.length, 2);

    assert.deepStrictEqual(result[0].fields, {
        '居室番号': '501',
        '利用者名': '辻　幸一',
        '性格': '無口で穏やかな性格。'
    });

    assert.deepStrictEqual(result[1].fields, {
        '居室番号': '502',
        '利用者名': '別の利用者',
        '性格': '明るい性格。'
    });
});

test('完全な空行には直前の利用者情報を引き継がない', () => {
    const extractor = new SourceFieldExtractor();

    const result = extractor.extractExcelRows({
        sheets: [
            {
                sheetName: '男性',
                rows: [
                    ['居室番号', '利用者名', '性格'],
                    ['501', '辻　幸一', '無口で穏やかな性格。'],
                    [null, null, null],
                    [null, null, null]
                ]
            }
        ]
    });

    assert.equal(result.length, 1);

    assert.deepStrictEqual(result[0].fields, {
        '居室番号': '501',
        '利用者名': '辻　幸一',
        '性格': '無口で穏やかな性格。'
    });
});
