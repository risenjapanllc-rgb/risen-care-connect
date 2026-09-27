'use strict';

class SemanticCandidateSignalAdapter {
    static fromSourceFieldCandidates({
        sourceFieldKey,
        suggestedMeaning,
        contextualMeaning,
        contextualMeaningAllowed
    } = {}) {
        const signals = [];

        if (suggestedMeaning) {
            signals.push({
                sourceFieldKey,
                semanticTarget: suggestedMeaning,
                resolverKind: 'exact_synonym',
                reason: 'standard field suggestion'
            });
        }

        if (
            contextualMeaning &&
            contextualMeaningAllowed === true
        ) {
            signals.push({
                sourceFieldKey,
                semanticTarget: contextualMeaning,
                resolverKind: 'context',
                reason: 'allowed contextual candidate'
            });
        }

        return signals;
    }
}

if (
    typeof module !== "undefined" &&
    module.exports
) {
    module.exports =
        SemanticCandidateSignalAdapter;
}

if (
    typeof window !== "undefined"
) {
    window.RisenSemanticCandidateSignalAdapter =
        SemanticCandidateSignalAdapter;
}
