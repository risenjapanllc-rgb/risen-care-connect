const express = require('express');

const app = express();

const HOST = '127.0.0.1';
const PORT = Number(
    process.env.RISEN_LOCAL_CONNECTOR_PORT || 4310
);

app.use(express.json({
    limit: '1mb'
}));

app.get('/health', (req, res) => {
    return res.json({
        success: true,
        service: 'RISEN CARE Local Connector',
        status: 'ready'
    });
});

app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: '指定されたLocal Connector APIが見つかりません'
    });
});

if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(
            `RISEN CARE Local Connector 起動 http://${HOST}:${PORT}`
        );
    });
}

module.exports = app;
