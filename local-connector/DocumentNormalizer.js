class DocumentNormalizer {
    normalize({
        sourceType,
        fileName,
        updatedAt = null,
        document,
        documentType
    } = {}) {
        if (
            typeof sourceType !== 'string' ||
            sourceType.trim() === ''
        ) {
            throw new Error(
                'sourceTypeが指定されていません'
            );
        }

        if (
            typeof fileName !== 'string' ||
            fileName.trim() === ''
        ) {
            throw new Error(
                'fileNameが指定されていません'
            );
        }

        if (
            !documentType ||
            typeof documentType.type !== 'string'
        ) {
            throw new Error(
                'documentTypeが指定されていません'
            );
        }

        return {
            sourceType:
                sourceType.trim(),

            documentType:
                documentType.type,

            documentTypeConfidence:
                documentType.confidence || 'low',

            source: {
                fileName:
                    fileName.trim(),
                updatedAt:
                    updatedAt || null
            },

            content:
                this.buildContent(
                    sourceType,
                    document
                ),

            extracted: {},

            standardizedAt:
                new Date().toISOString()
        };
    }

    buildContent(sourceType, document = {}) {
        if (sourceType === 'word') {
            return {
                text:
                    typeof document.text === 'string'
                        ? document.text
                        : ''
            };
        }

        if (sourceType === 'excel') {
            return {
                sheetNames:
                    Array.isArray(document.sheetNames)
                        ? document.sheetNames
                        : [],

                sheets:
                    Array.isArray(document.sheets)
                        ? document.sheets
                        : []
            };
        }

        return {
            raw:
                document || {}
        };
    }
}

module.exports = DocumentNormalizer;
