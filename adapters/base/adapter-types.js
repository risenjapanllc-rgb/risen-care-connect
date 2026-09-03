'use strict';

function createTableInfo({
    name,
    displayName = name,
    sourceType = 'unknown'
} = {}) {
    return {
        name: String(name || ''),
        displayName: String(displayName || name || ''),
        sourceType: String(sourceType || 'unknown')
    };
}

function createColumnInfo({
    name,
    displayName = name,
    dataType = '',
    nullable = true,
    primaryKey = false
} = {}) {
    return {
        name: String(name || ''),
        displayName: String(displayName || name || ''),
        dataType: String(dataType || ''),
        nullable: Boolean(nullable),
        primaryKey: Boolean(primaryKey)
    };
}

function createSampleRow(record = {}) {
    return {
        ...record
    };
}

function createConnectionResult({
    success = false,
    message = '',
    metadata = {}
} = {}) {
    return {
        success: Boolean(success),
        message: String(message || ''),
        metadata: metadata || {}
    };
}

module.exports = {
    createTableInfo,
    createColumnInfo,
    createSampleRow,
    createConnectionResult
};
