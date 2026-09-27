'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const SemanticCandidateResolver =
    require('./SemanticCandidateResolver');

test(
    'exact/synonymと許可済みcontextを同一Source Fieldの共通signalとして解決できる',
    () => {
        const SemanticCandidateSignalAdapter =
            require('./SemanticCandidateSignalAdapter');

        const signals =
            SemanticCandidateSignalAdapter.fromSourceFieldCandidates({
                sourceFieldKey: 'column_4',
                suggestedMeaning:
                    'recipient_certificate.certificate_number',
                contextualMeaning:
                    'recipient_certificate.certificate_number',
                contextualMeaningAllowed: true
            });

        assert.deepStrictEqual(
            signals,
            [
                {
                    sourceFieldKey: 'column_4',
                    semanticTarget:
                        'recipient_certificate.certificate_number',
                    resolverKind: 'exact_synonym',
                    reason: 'standard field suggestion'
                },
                {
                    sourceFieldKey: 'column_4',
                    semanticTarget:
                        'recipient_certificate.certificate_number',
                    resolverKind: 'context',
                    reason: 'allowed contextual candidate'
                }
            ]
        );

        const result =
            new SemanticCandidateResolver().resolve(signals);

        assert.equal(result.status, 'candidate');
        assert.equal(result.candidates.length, 1);
        assert.equal(
            result.candidates[0].semanticTarget,
            'recipient_certificate.certificate_number'
        );
        assert.equal(
            result.candidates[0].supportingSignals.length,
            2
        );
    }
);

test(
    'contract不許可のcontext候補は共通signalへ入れない',
    () => {
        const SemanticCandidateSignalAdapter =
            require('./SemanticCandidateSignalAdapter');

        const signals =
            SemanticCandidateSignalAdapter.fromSourceFieldCandidates({
                sourceFieldKey: 'column_4',
                suggestedMeaning:
                    'recipient_certificate.certificate_number',
                contextualMeaning:
                    'user.name',
                contextualMeaningAllowed: false
            });

        assert.deepStrictEqual(
            signals,
            [
                {
                    sourceFieldKey: 'column_4',
                    semanticTarget:
                        'recipient_certificate.certificate_number',
                    resolverKind: 'exact_synonym',
                    reason: 'standard field suggestion'
                }
            ]
        );
    }
);

test(
    '異なる許可済み候補は一方を選ばずconflictとして保持する',
    () => {
        const SemanticCandidateSignalAdapter =
            require('./SemanticCandidateSignalAdapter');

        const signals =
            SemanticCandidateSignalAdapter.fromSourceFieldCandidates({
                sourceFieldKey: 'column_4',
                suggestedMeaning:
                    'recipient_certificate.certificate_number',
                contextualMeaning:
                    'user.user_code',
                contextualMeaningAllowed: true
            });

        const result =
            new SemanticCandidateResolver().resolve(signals);

        assert.equal(result.status, 'conflict');
        assert.deepStrictEqual(
            result.candidates.map(
                candidate => candidate.semanticTarget
            ),
            [
                'recipient_certificate.certificate_number',
                'user.user_code'
            ]
        );
    }
);

test(
    '同一Signal Adapter実装をBrowser境界にも公開できる',
    () => {
        const fs = require('node:fs');
        const path = require('node:path');

        const source =
            fs.readFileSync(
                path.join(
                    __dirname,
                    'SemanticCandidateSignalAdapter.js'
                ),
                'utf8'
            );

        assert.match(
            source,
            /typeof\s+window\s*!==\s*["']undefined["'][\s\S]*window\.RisenSemanticCandidateSignalAdapter\s*=\s*SemanticCandidateSignalAdapter/,
            'NodeとBrowserで別々のSemantic Candidate Signal Adapter実装を持ってはならない'
        );
    }
);
