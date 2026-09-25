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

test('マッピング用の原本項目定義を列位置付きで抽出する', () => {
    const extractor = new SourceFieldExtractor();

    const result = extractor.extractFieldDefinitions({
        sheets: [
            {
                sheetName: '利用者一覧',
                rows: [
                    ['利用者番号', '氏名', '生年月日'],
                    ['A001', 'テスト利用者', '2000-01-01']
                ]
            }
        ]
    });

    assert.deepStrictEqual(result, [
        {
            sourceFieldKey: 'sheet:0:column:0',
            sheetIndex: 0,
            sheetName: '利用者一覧',
            columnIndex: 0,
            headerLabel: '利用者番号'
        },
        {
            sourceFieldKey: 'sheet:0:column:1',
            sheetIndex: 0,
            sheetName: '利用者一覧',
            columnIndex: 1,
            headerLabel: '氏名'
        },
        {
            sourceFieldKey: 'sheet:0:column:2',
            sheetIndex: 0,
            sheetName: '利用者一覧',
            columnIndex: 2,
            headerLabel: '生年月日'
        }
    ]);
});

test('同じ見出し名が複数列にあっても別の原本項目として保持する', () => {
    const extractor = new SourceFieldExtractor();

    const result = extractor.extractFieldDefinitions({
        sheets: [
            {
                sheetName: 'Sheet1',
                rows: [
                    ['氏名', '関係', '氏名'],
                    ['本人', '家族', '家族氏名']
                ]
            }
        ]
    });

    assert.equal(result.length, 3);

    assert.deepStrictEqual(
        result.map(field => ({
            sourceFieldKey: field.sourceFieldKey,
            columnIndex: field.columnIndex,
            headerLabel: field.headerLabel
        })),
        [
            {
                sourceFieldKey: 'sheet:0:column:0',
                columnIndex: 0,
                headerLabel: '氏名'
            },
            {
                sourceFieldKey: 'sheet:0:column:1',
                columnIndex: 1,
                headerLabel: '関係'
            },
            {
                sourceFieldKey: 'sheet:0:column:2',
                columnIndex: 2,
                headerLabel: '氏名'
            }
        ]
    );
});

test('空の見出しセルはマッピング対象の原本項目として追加しない', () => {
    const extractor = new SourceFieldExtractor();

    const result = extractor.extractFieldDefinitions({
        sheets: [
            {
                sheetName: 'Sheet1',
                rows: [
                    ['利用者番号', '', null, '氏名'],
                    ['A001', 'unused', 'unused', 'テスト利用者']
                ]
            }
        ]
    });

    assert.deepStrictEqual(
        result.map(field => field.columnIndex),
        [0, 3]
    );
});

test('複数シートではsheetIndexを含むキーで項目を区別する', () => {
    const extractor = new SourceFieldExtractor();

    const result = extractor.extractFieldDefinitions({
        sheets: [
            {
                sheetName: 'Sheet1',
                rows: [
                    ['氏名', '生年月日'],
                    ['利用者A', '2000-01-01']
                ]
            },
            {
                sheetName: 'Sheet2',
                rows: [
                    ['氏名', '生年月日'],
                    ['利用者B', '2001-01-01']
                ]
            }
        ]
    });

    assert.deepStrictEqual(
        result.map(field => field.sourceFieldKey),
        [
            'sheet:0:column:0',
            'sheet:0:column:1',
            'sheet:1:column:0',
            'sheet:1:column:1'
        ]
    );
});

test('extractSourceEntities keeps duplicate physical rows with distinct sourceEntityKey values', () => {
    const extractor = new SourceFieldExtractor();

    const result = extractor.extractSourceEntities({
        sheets: [
            {
                sheetName: 'Sheet1',
                rows: [
                    ['利用者ID', '氏名'],
                    ['A001', '山田太郎'],
                    ['A001', '山田太郎']
                ]
            }
        ]
    });

    assert.deepStrictEqual(result, [
        {
            sourceEntityKey: 'sheet:0:row:2',
            sheetIndex: 0,
            sheetName: 'Sheet1',
            rowIndex: 2,
            fields: {
                利用者ID: 'A001',
                氏名: '山田太郎'
            },
            valuesBySourceFieldKey: {
                'sheet:0:column:0': 'A001',
                'sheet:0:column:1': '山田太郎'
            }
        },
        {
            sourceEntityKey: 'sheet:0:row:3',
            sheetIndex: 0,
            sheetName: 'Sheet1',
            rowIndex: 3,
            fields: {
                利用者ID: 'A001',
                氏名: '山田太郎'
            },
            valuesBySourceFieldKey: {
                'sheet:0:column:0': 'A001',
                'sheet:0:column:1': '山田太郎'
            }
        }
    ]);
});


test('extractSourceEntities preserves duplicate header columns by sourceFieldKey', () => {
    const extractor = new SourceFieldExtractor();

    const result = extractor.extractSourceEntities({
        sheets: [
            {
                sheetName: 'Sheet1',
                rows: [
                    ['コード', 'コード'],
                    ['A001', 'B001']
                ]
            }
        ]
    });

    assert.strictEqual(result.length, 1);

    assert.deepStrictEqual(
        result[0].valuesBySourceFieldKey,
        {
            'sheet:0:column:0': 'A001',
            'sheet:0:column:1': 'B001'
        }
    );
});

test(
    'extractFieldDefinitions uses an explicitly confirmed header row when provided',
    () => {
        const extractor =
            new SourceFieldExtractor();

        const document = {
            sheets: [
                {
                    sheetName: 'CSV',
                    rows: [
                        [
                            '施設名',
                            'たんぽぽ会'
                        ],
                        [
                            '利用者番号',
                            '氏名',
                            '利用日',
                            'サービス'
                        ],
                        [
                            'A001',
                            '山田太郎',
                            '2026-09-01',
                            '生活介護'
                        ]
                    ]
                }
            ]
        };

        const result =
            extractor.extractFieldDefinitions(
                document,
                {
                    headerRowIndex: 1
                }
            );

        assert.deepStrictEqual(
            result,
            [
                {
                    sourceFieldKey:
                        'sheet:0:column:0',
                    sheetIndex: 0,
                    sheetName: 'CSV',
                    columnIndex: 0,
                    headerLabel:
                        '利用者番号'
                },
                {
                    sourceFieldKey:
                        'sheet:0:column:1',
                    sheetIndex: 0,
                    sheetName: 'CSV',
                    columnIndex: 1,
                    headerLabel:
                        '氏名'
                },
                {
                    sourceFieldKey:
                        'sheet:0:column:2',
                    sheetIndex: 0,
                    sheetName: 'CSV',
                    columnIndex: 2,
                    headerLabel:
                        '利用日'
                },
                {
                    sourceFieldKey:
                        'sheet:0:column:3',
                    sheetIndex: 0,
                    sheetName: 'CSV',
                    columnIndex: 3,
                    headerLabel:
                        'サービス'
                }
            ]
        );
    }
);

test(
    'extractSourceEntities uses an explicitly confirmed header row when provided',
    () => {
        const extractor =
            new SourceFieldExtractor();

        const document = {
            sheets: [
                {
                    sheetName: 'CSV',
                    rows: [
                        ['施設名', 'たんぽぽ会'],
                        ['利用者番号', '氏名', '利用日'],
                        ['A001', '山田太郎', '2026-09-01']
                    ]
                }
            ]
        };

        const result =
            extractor.extractSourceEntities(
                document,
                {
                    headerRowIndex: 1
                }
            );

        assert.deepStrictEqual(
            result,
            [
                {
                    sourceEntityKey:
                        'sheet:0:row:3',
                    sheetIndex: 0,
                    sheetName: 'CSV',
                    rowIndex: 3,
                    fields: {
                        利用者番号: 'A001',
                        氏名: '山田太郎',
                        利用日: '2026-09-01'
                    },
                    valuesBySourceFieldKey: {
                        'sheet:0:column:0':
                            'A001',
                        'sheet:0:column:1':
                            '山田太郎',
                        'sheet:0:column:2':
                            '2026-09-01'
                    }
                }
            ]
        );
    }
);

test(
    'extractExcelRows uses an explicitly confirmed header row when provided',
    () => {
        const extractor =
            new SourceFieldExtractor();

        const document = {
            sheets: [
                {
                    sheetName: 'CSV',
                    rows: [
                        ['施設名', 'たんぽぽ会'],
                        ['利用者番号', '氏名', '利用日'],
                        ['A001', '山田太郎', '2026-09-01']
                    ]
                }
            ]
        };

        const result =
            extractor.extractExcelRows(
                document,
                {
                    headerRowIndex: 1
                }
            );

        assert.deepStrictEqual(
            result,
            [
                {
                    sheetName: 'CSV',
                    rowIndex: 3,
                    fields: {
                        利用者番号: 'A001',
                        氏名: '山田太郎',
                        利用日: '2026-09-01'
                    }
                }
            ]
        );
    }
);

test(
    'explicit out-of-range header row does not fall back to heuristic detection',
    () => {
        const extractor =
            new SourceFieldExtractor();

        const document = {
            sheets: [
                {
                    sheetName: 'CSV',
                    rows: [
                        ['利用者番号', '氏名'],
                        ['A001', '山田太郎']
                    ]
                }
            ]
        };

        assert.deepStrictEqual(
            extractor.extractFieldDefinitions(
                document,
                {
                    headerRowIndex: 99
                }
            ),
            []
        );

        assert.deepStrictEqual(
            extractor.extractSourceEntities(
                document,
                {
                    headerRowIndex: 99
                }
            ),
            []
        );

        assert.deepStrictEqual(
            extractor.extractExcelRows(
                document,
                {
                    headerRowIndex: 99
                }
            ),
            []
        );
    }
);

test(
    'omitted header row preserves heuristic detection',
    () => {
        const extractor =
            new SourceFieldExtractor();

        const document = {
            sheets: [
                {
                    sheetName: 'CSV',
                    rows: [
                        ['利用者番号', '氏名'],
                        ['A001', '山田太郎']
                    ]
                }
            ]
        };

        assert.deepStrictEqual(
            extractor.extractFieldDefinitions(
                document
            ).map(field => field.headerLabel),
            [
                '利用者番号',
                '氏名'
            ]
        );
    }
);

test(
    'invalid explicit header row does not fall back to heuristic detection',
    () => {
        const extractor =
            new SourceFieldExtractor();

        const rows = [
            ['利用者番号', '氏名'],
            ['A001', '山田太郎']
        ];

        for (
            const headerRowIndex of [
                -1,
                1.5,
                '1',
                null
            ]
        ) {
            assert.strictEqual(
                extractor.resolveHeaderRowIndex(
                    rows,
                    {
                        headerRowIndex
                    }
                ),
                -1,
                `headerRowIndex=${String(
                    headerRowIndex
                )}`
            );
        }
    }
);
