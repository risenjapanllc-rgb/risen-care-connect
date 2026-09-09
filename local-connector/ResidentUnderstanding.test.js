'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const ResidentUnderstanding =
    require('./ResidentUnderstanding');

test('原本全体から利用者の現在状況を5領域に構造化する', () => {
    const understanding =
        new ResidentUnderstanding();

    const result =
        understanding.build({
            '居室番号': '501',
            '利用者名': '辻　幸一',
            '性格': '無口で穏やかな性格。',
            'コミュニケーションの取り方':
                '話し言葉でのコミュニケーション可能。',
            '介護上の注意点':
                '立位を取る際には介助を行う。',
            '本人の意向':
                '家族との交流を持ちたい',
            '障害特性や体調':
                '短期記憶障害',
            'その他留意点':
                '体重増加に注意。'
        });

    assert.deepStrictEqual(
        result.person,
        {
            sourceField: '性格',
            value: '無口で穏やかな性格。'
        }
    );

    assert.deepStrictEqual(
        result.currentState,
        {
            sourceField: '障害特性や体調',
            value: '短期記憶障害'
        }
    );

    assert.deepStrictEqual(
        result.communication,
        {
            sourceField: 'コミュニケーションの取り方',
            value: '話し言葉でのコミュニケーション可能。'
        }
    );

    assert.deepStrictEqual(
        result.supportImportant,
        {
            sourceField: '介護上の注意点',
            value: '立位を取る際には介助を行う。'
        }
    );

    assert.deepStrictEqual(
        result.preference,
        {
            sourceField: '本人の意向',
            value: '家族との交流を持ちたい'
        }
    );
});

test('存在しない原本項目を推測して生成しない', () => {
    const understanding =
        new ResidentUnderstanding();

    const result =
        understanding.build({
            '利用者名': 'テスト利用者',
            '性格': '穏やか'
        });

    assert.deepStrictEqual(
        result.person,
        {
            sourceField: '性格',
            value: '穏やか'
        }
    );

    assert.equal(
        result.currentState,
        null
    );

    assert.equal(
        result.communication,
        null
    );

    assert.equal(
        result.supportImportant,
        null
    );

    assert.equal(
        result.preference,
        null
    );
});
