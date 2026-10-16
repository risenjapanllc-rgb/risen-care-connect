"use strict";

class DocumentSemanticTargetQueryRepository {
    async list({
        semanticType
    } = {}) {
        if (
            typeof semanticType !== "string" ||
            !semanticType.trim()
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "DocumentSemanticTargetQueryRepository.list is not implemented"
        );
    }
}

module.exports =
    DocumentSemanticTargetQueryRepository;
