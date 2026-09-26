'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const SemanticCandidateResolver =
    require('./SemanticCandidateResolver');

test('同じStandard Meaning候補を統合し、根拠を保持する', () => {
    const resolver = new SemanticCandidateResolver();

    const result = resolver.resolve([
        {
            semanticTarget: 'user.name',
            resolverKind: 'exact_synonym',
            reason: 'header matched'
        },
        {
            semanticTarget: 'user.name',
            resolverKind: 'context',
            reason: 'context supported'
        }
    ]);

    assert.equal(result.status, 'candidate');
    assert.equal(result.candidates.length, 1);
    assert.equal(
        result.candidates[0].semanticTarget,
        'user.name'
    );
    assert.equal(
        result.candidates[0].supportingSignals.length,
        2
    );
});

test('異なるStandard Meaning候補を勝手に決定しない', () => {
    const resolver = new SemanticCandidateResolver();

    const result = resolver.resolve([
        {
            semanticTarget: 'user.name',
            resolverKind: 'exact_synonym',
            reason: 'header matched'
        },
        {
            semanticTarget: 'support_record.staff_name',
            resolverKind: 'context',
            reason: 'context supported'
        }
    ]);

    assert.equal(result.status, 'conflict');
    assert.equal(result.candidates.length, 2);
});

test('有効なStandard Meaning候補がない場合はunresolvedとして保持する', () => {
    const resolver = new SemanticCandidateResolver();

    const result = resolver.resolve([
        {
            semanticTarget: '',
            resolverKind: 'context',
            reason: 'meaning could not be established'
        }
    ]);

    assert.equal(result.status, 'unresolved');
    assert.deepStrictEqual(result.candidates, []);
});


test('候補がない場合はunresolvedにする', () => {
    const resolver = new SemanticCandidateResolver();

    const result = resolver.resolve([]);

    assert.equal(result.status, 'unresolved');
    assert.deepStrictEqual(result.candidates, []);
});

test('異なるSource Fieldのsignalを同じ解決対象として混在させない', () => {
    const resolver = new SemanticCandidateResolver();

    const result = resolver.resolve([
        {
            sourceFieldKey: 'resident-name',
            semanticTarget: 'user.name',
            resolverKind: 'exact_synonym',
            reason: 'header matched'
        },
        {
            sourceFieldKey: 'staff-name',
            semanticTarget: 'user.name',
            resolverKind: 'context',
            reason: 'context supported'
        }
    ]);

    assert.equal(result.status, 'invalid_scope');
    assert.deepStrictEqual(result.candidates, []);
});

