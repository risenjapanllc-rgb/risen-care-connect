'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const SourceMeaningInterpreter =
    require('./SourceMeaningInterpreter');

test('施設原本の項目名を保持したままAI理解用の意味を付加する', () => {
    const interpreter =
        new SourceMeaningInterpreter();

    const sourceFields = {
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
    };

    const result =
        interpreter.interpret(sourceFields);

    assert.equal(
        result.sourceFields['利用者名'],
        '辻　幸一'
    );

    assert.equal(
        result.meanings.personality,
        '性格'
    );

    assert.equal(
        result.meanings.communication,
        'コミュニケーションの取り方'
    );

    assert.equal(
        result.meanings.carePrecautions,
        '介護上の注意点'
    );

    assert.equal(
        result.meanings.preference,
        '本人の意向'
    );

    assert.equal(
        result.meanings.healthCharacteristics,
        '障害特性や体調'
    );

    assert.equal(
        result.meanings.otherNotes,
        'その他留意点'
    );
});

test('原本に存在しない項目を勝手に生成しない', () => {
    const interpreter =
        new SourceMeaningInterpreter();

    const result =
        interpreter.interpret({
            '利用者名': 'テスト利用者',
            '性格': '穏やか'
        });

    assert.equal(
        result.sourceFields['利用者名'],
        'テスト利用者'
    );

    assert.equal(
        result.meanings.personality,
        '性格'
    );

    assert.equal(
        result.meanings.preference,
        null
    );

    assert.equal(
        Object.hasOwn(
            result.sourceFields,
            '本人の意向'
        ),
        false
    );
});
