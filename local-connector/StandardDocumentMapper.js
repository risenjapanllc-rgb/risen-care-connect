"use strict";

const DocumentSemanticExtractor =
    require("./DocumentSemanticExtractor");
const SourceFieldExtractor =
    require("./SourceFieldExtractor");
const SourceMeaningInterpreter =
    require("./SourceMeaningInterpreter");

class StandardDocumentMapper {
    constructor({
        documentSemanticExtractor =
            new DocumentSemanticExtractor(),
        sourceFieldExtractor =
            new SourceFieldExtractor(),
        sourceMeaningInterpreter =
            new SourceMeaningInterpreter()
    } = {}) {
        if (
            !documentSemanticExtractor ||
            typeof documentSemanticExtractor
                .extract !== "function"
        ) {
            throw new Error(
                "StandardDocumentMapper requires documentSemanticExtractor"
            );
        }

        if (
            !sourceFieldExtractor ||
            typeof sourceFieldExtractor
                .extractExcelRows !== "function"
        ) {
            throw new Error(
                "StandardDocumentMapper requires sourceFieldExtractor"
            );
        }

        if (
            !sourceMeaningInterpreter ||
            typeof sourceMeaningInterpreter
                .interpret !== "function"
        ) {
            throw new Error(
                "StandardDocumentMapper requires sourceMeaningInterpreter"
            );
        }

        this.documentSemanticExtractor =
            documentSemanticExtractor;
        this.sourceFieldExtractor =
            sourceFieldExtractor;
        this.sourceMeaningInterpreter =
            sourceMeaningInterpreter;
    }

    map(standardDocument) {
        if (
            !standardDocument ||
            typeof standardDocument !== "object" ||
            Array.isArray(standardDocument)
        ) {
            throw new Error(
                "standard document is required"
            );
        }

        const extracted =
            this.documentSemanticExtractor.extract(
                standardDocument
            );

        const isTabularSource =
            [
                "excel",
                "csv",
                "mysql"
            ].includes(
                standardDocument.sourceType
            );

        if (!isTabularSource) {
            return {
                ...standardDocument,
                extracted
            };
        }

        const sourceFields =
            this.sourceFieldExtractor
                .extractExcelRows(
                    standardDocument.content
                );

        const interpretedSourceFields =
            sourceFields.map(
                record => ({
                    ...record,
                    meanings:
                        this.sourceMeaningInterpreter
                            .interpret(
                                record.fields
                            ).meanings
                })
            );

        return {
            ...standardDocument,
            extracted: {
                ...extracted,
                sourceFields:
                    interpretedSourceFields
            }
        };
    }
}

module.exports =
    StandardDocumentMapper;
