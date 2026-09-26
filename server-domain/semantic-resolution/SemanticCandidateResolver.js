'use strict';

class SemanticCandidateResolver {
    resolve(signals = []) {
        const sourceFieldKeys =
            new Set(
                signals
                    .map(signal =>
                        typeof signal?.sourceFieldKey === 'string'
                            ? signal.sourceFieldKey.trim()
                            : ''
                    )
                    .filter(Boolean)
            );

        if (sourceFieldKeys.size > 1) {
            return {
                status: 'invalid_scope',
                candidates: []
            };
        }

        const candidatesByTarget =
            new Map();

        for (const signal of signals) {
            const semanticTarget =
                typeof signal?.semanticTarget === 'string'
                    ? signal.semanticTarget.trim()
                    : '';

            if (!semanticTarget) {
                continue;
            }

            if (
                !candidatesByTarget.has(
                    semanticTarget
                )
            ) {
                candidatesByTarget.set(
                    semanticTarget,
                    {
                        semanticTarget,
                        supportingSignals: []
                    }
                );
            }

            candidatesByTarget
                .get(semanticTarget)
                .supportingSignals
                .push({
                    resolverKind:
                        signal.resolverKind,
                    reason:
                        signal.reason
                });
        }

        const candidates =
            [...candidatesByTarget.values()];

        return {
            status:
                candidates.length === 0
                    ? 'unresolved'
                    : candidates.length > 1
                        ? 'conflict'
                        : 'candidate',
            candidates
        };
    }
}

if (
    typeof module !== "undefined" &&
    module.exports
) {
    module.exports =
        SemanticCandidateResolver;
}

if (
    typeof window !== "undefined"
) {
    window.RisenSemanticCandidateResolver =
        SemanticCandidateResolver;
}
