'use strict';

class SourceMeaningInterpreter {
    interpret(sourceFields = {}) {
        if (
            !sourceFields ||
            typeof sourceFields !== 'object' ||
            Array.isArray(sourceFields)
        ) {
            return {
                sourceFields: {},
                meanings: this.emptyMeanings()
            };
        }

        const fields = {
            ...sourceFields
        };

        return {
            sourceFields: fields,
            meanings: {
                personality:
                    this.findExistingField(
                        fields,
                        ['性格']
                    ),

                communication:
                    this.findExistingField(
                        fields,
                        ['コミュニケーションの取り方']
                    ),

                carePrecautions:
                    this.findExistingField(
                        fields,
                        ['介護上の注意点']
                    ),

                preference:
                    this.findExistingField(
                        fields,
                        ['本人の意向', '本人の希望']
                    ),

                healthCharacteristics:
                    this.findExistingField(
                        fields,
                        ['障害特性や体調']
                    ),

                otherNotes:
                    this.findExistingField(
                        fields,
                        ['その他留意点']
                    )
            }
        };
    }

    findExistingField(fields, candidates) {
        for (const candidate of candidates) {
            if (
                Object.hasOwn(fields, candidate)
            ) {
                return candidate;
            }
        }

        return null;
    }

    emptyMeanings() {
        return {
            personality: null,
            communication: null,
            carePrecautions: null,
            preference: null,
            healthCharacteristics: null,
            otherNotes: null
        };
    }
}

module.exports = SourceMeaningInterpreter;
