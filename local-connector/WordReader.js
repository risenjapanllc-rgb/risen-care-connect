const mammoth = require('mammoth');

class WordReader {
    async read(filePath) {
        if (
            typeof filePath !== 'string' ||
            filePath.trim() === ''
        ) {
            throw new Error(
                'Wordファイルが指定されていません'
            );
        }

        const result =
            await mammoth.extractRawText({
                path: filePath
            });

        return {
            text: result.value,
            messages: result.messages
        };
    }
}

module.exports = WordReader;
