'use strict';

class ResidentUnderstanding {
    build(sourceFields = {}) {
        if (
            !sourceFields ||
            typeof sourceFields !== 'object' ||
            Array.isArray(sourceFields)
        ) {
            return this.emptyUnderstanding();
        }

        return {
            person:
                this.findField(
                    sourceFields,
                    ['性格']
                ),

            currentState:
                this.findField(
                    sourceFields,
                    ['障害特性や体調']
                ),

            communication:
                this.findField(
                    sourceFields,
                    ['コミュニケーションの取り方']
                ),

            supportImportant:
                this.findField(
                    sourceFields,
                    ['介護上の注意点']
                ),

            preference:
                this.findField(
                    sourceFields,
                    ['本人の意向', '本人の希望']
                )
        };
    }

    findField(fields, candidates) {
        for (const candidate of candidates) {
            if (
                Object.hasOwn(fields, candidate)
            ) {
                return {
                    sourceField: candidate,
                    value: fields[candidate]
                };
            }
        }

        return null;
    }

    emptyUnderstanding() {
        return {
            person: null,
            currentState: null,
            communication: null,
            supportImportant: null,
            preference: null
        };
    }
}

module.exports = ResidentUnderstanding;
