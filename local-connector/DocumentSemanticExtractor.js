class DocumentSemanticExtractor {
    extract(standardDocument = {}) {
        if (
            !standardDocument ||
            typeof standardDocument !== 'object'
        ) {
            throw new Error(
                '標準文書が指定されていません'
            );
        }

        const lines =
            this.collectLines(
                standardDocument
            );

        return {
            wish:
                this.findValueAfterLabel(
                    lines,
                    '本人の希望'
                )
        };
    }

    collectLines(standardDocument) {
        if (
            standardDocument.sourceType === 'word'
        ) {
            return this.collectWordLines(
                standardDocument.content
            );
        }

        if (
            standardDocument.sourceType === 'excel'
        ) {
            return this.collectExcelLines(
                standardDocument.content
            );
        }

        return [];
    }

    collectWordLines(content = {}) {
        if (
            typeof content.text !== 'string'
        ) {
            return [];
        }

        return content.text
            .split(/\r?\n/)
            .map(value => value.trim())
            .filter(Boolean);
    }

    collectExcelLines(content = {}) {
        const lines = [];

        for (
            const sheet of
            content.sheets || []
        ) {
            for (
                const row of
                sheet.rows || []
            ) {
                for (const cell of row) {
                    if (
                        cell === null ||
                        cell === undefined
                    ) {
                        continue;
                    }

                    const value =
                        String(cell).trim();

                    if (value !== '') {
                        lines.push(value);
                    }
                }
            }
        }

        return lines;
    }

    findValueAfterLabel(
        lines,
        label
    ) {
        const index =
            lines.findIndex(
                value =>
                    value === label
            );

        if (
            index === -1 ||
            index + 1 >= lines.length
        ) {
            return null;
        }

        return {
            value:
                lines[index + 1],
            sourceLabel:
                label
        };
    }
}

module.exports = DocumentSemanticExtractor;
