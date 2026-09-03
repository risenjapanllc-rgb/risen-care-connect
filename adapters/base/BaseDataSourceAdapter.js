'use strict';

const {
    createConnectionResult
} = require('./adapter-types');

class BaseDataSourceAdapter {
    constructor(config = {}) {
        this.config = config || {};
        this.connection = null;
    }

    async validateConnection(config = this.config) {
        throw new Error(
            'validateConnection() must be implemented by a Data Source Adapter'
        );
    }

    async connect(config = this.config) {
        throw new Error(
            'connect() must be implemented by a Data Source Adapter'
        );
    }

    async disconnect() {
        if (this.connection && typeof this.connection.end === 'function') {
            try {
                await this.connection.end();
            } catch (error) {
                // 既存の接続終了エラーを握りつぶし、後続処理に影響を与えない
            }
        }

        this.connection = null;
    }

    async getTables() {
        throw new Error(
            'getTables() must be implemented by a Data Source Adapter'
        );
    }

    async getColumns(tableName) {
        throw new Error(
            'getColumns() must be implemented by a Data Source Adapter'
        );
    }

    async getSampleRows(tableName, limit = 1) {
        throw new Error(
            'getSampleRows() must be implemented by a Data Source Adapter'
        );
    }

    getCapabilities() {
        return {
            sourceType: 'base',
            supportsConnectionValidation: false,
            supportsTableDiscovery: false,
            supportsColumnDiscovery: false,
            supportsSampleRows: false,
            supportsMetadataNormalization: false
        };
    }

    createConnectionResult(success, message, metadata = {}) {
        return createConnectionResult({
            success,
            message,
            metadata
        });
    }
}

module.exports = BaseDataSourceAdapter;
