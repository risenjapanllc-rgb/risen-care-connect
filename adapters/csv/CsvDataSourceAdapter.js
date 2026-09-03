'use strict';

const BaseDataSourceAdapter = require('../base/BaseDataSourceAdapter');
const {
    createTableInfo,
    createColumnInfo,
    createSampleRow,
    createConnectionResult
} = require('../base/adapter-types');

const RESIDENT_BASIC_INFO_FIELDS = [
    {
        key: 'resident_id',
        label: '利用者ID',
        required: true,
        synonyms: ['利用者id', '利用者番号', '顧客id', 'user_id', 'resident_id']
    },
    {
        key: 'full_name',
        label: '氏名',
        required: true,
        synonyms: ['氏名', '名前', '利用者名', 'name', 'full_name']
    },
    {
        key: 'kana_name',
        label: 'フリガナ',
        required: false,
        synonyms: ['フリガナ', 'ふりがな', 'カナ', 'kana', 'name_kana']
    },
    {
        key: 'birth_date',
        label: '生年月日',
        required: true,
        synonyms: ['生年月日', '誕生日', 'birth_date', 'birthday', 'dob']
    },
    {
        key: 'gender',
        label: '性別',
        required: false,
        synonyms: ['性別', 'gender', 'sex']
    },
    {
        key: 'address',
        label: '住所',
        required: false,
        synonyms: ['住所', '所在地', 'address']
    },
    {
        key: 'postal_code',
        label: '郵便番号',
        required: false,
        synonyms: ['郵便番号', '郵便', 'zip', 'zipcode', 'postcode', 'postalcode', '郵便番号(住所)']
    },
    {
        key: 'phone_number',
        label: '電話番号',
        required: false,
        synonyms: ['電話番号', 'tel', 'phone', 'phone_number']
    }
];

const SUPPORT_RECORD_FIELDS = [
    {
        key: 'record_id',
        label: '記録ID',
        required: false,
        synonyms: [
            '記録ID',
            'ID',
            'record_id',
            'recordid'
        ]
    },
    {
        key: 'record_datetime',
        label: '記録日時',
        required: true,
        synonyms: [
            '記録日時',
            '日時',
            'event_datetime',
            'datetime',
            'date_time'
        ]
    },
    {
        key: 'resident_name',
        label: '利用者名',
        required: true,
        synonyms: [
            '利用者名',
            '氏名',
            '名前',
            'resident_name',
            'name'
        ]
    },
    {
        key: 'staff_name',
        label: '記録者',
        required: false,
        synonyms: [
            '記録者',
            '記入者',
            '担当者',
            '職員名',
            'staff_name',
            'author'
        ]
    },
    {
        key: 'record_type',
        label: '記録種別',
        required: false,
        synonyms: [
            '記録種別',
            '種類',
            '種別',
            '区分',
            'record_type',
            'category'
        ]
    },
    {
        key: 'support_content',
        label: '支援内容',
        required: false,
        synonyms: [
            '支援内容',
            '処遇内容',
            '対応内容',
            'support_content'
        ]
    },
    {
        key: 'record_detail',
        label: '記録内容',
        required: false,
        synonyms: [
            '記録内容',
            '詳細',
            '詳細2',
            '内容',
            '本文',
            'memo',
            'description'
        ]
    },
    {
        key: 'behavior_type',
        label: '行動分類',
        required: false,
        synonyms: [
            '行動分類',
            '行動',
            '行動詳細',
            'behavior',
            'behavior_type'
        ]
    },
    {
        key: 'created_at',
        label: '作成日時',
        required: false,
        synonyms: [
            '作成日時',
            '登録日時',
            'created_at',
            'createdat'
        ]
    }
];

class CsvDataSourceAdapter extends BaseDataSourceAdapter {
    constructor(config = {}) {
        super(config || {});
        this.parsed = null;
    }

    getStandardFields(dataType = "resident_basic_info") {
        if (dataType === "support_record") {
            return SUPPORT_RECORD_FIELDS;
        }

        return RESIDENT_BASIC_INFO_FIELDS;
    }

    resolveCsvText(config = {}) {
        const effectiveConfig = {
            ...(this.config || {}),
            ...(config || {})
        };

        return String(effectiveConfig.csvText || '');
    }

    async validateConnection(config = {}) {
        try {
            const csvText = this.resolveCsvText(config);
            const parsed = this.parseCsv(csvText);

            return createConnectionResult({
                success: parsed.headers.length > 0,
                message: parsed.headers.length > 0
                    ? 'CSVの読み込みに成功しました'
                    : 'CSVヘッダーを確認できませんでした',
                metadata: {
                    sourceType: 'csv',
                    rowCount: parsed.rows.length,
                    headerCount: parsed.headers.length
                }
            });
        } catch (error) {
            return createConnectionResult({
                success: false,
                message: 'CSVの読み込みに失敗しました',
                metadata: {
                    sourceType: 'csv',
                    error: error.message || ''
                }
            });
        }
    }

    async connect(config = {}) {
        const csvText = this.resolveCsvText(config);
        this.parsed = this.parseCsv(csvText);
        this.connection = {
            sourceType: 'csv'
        };

        return this.connection;
    }

    async disconnect() {
        this.parsed = null;
        this.connection = null;
    }

    async getTables(config = {}) {
        await this.getOrCreateConnection(config);

        return [
            createTableInfo({
                name: 'resident_basic_info_csv',
                displayName: '利用者基本情報',
                sourceType: 'csv'
            })
        ];
    }

    async getColumns(_tableName, config = {}) {
        await this.getOrCreateConnection(config);

        return this.parsed.headers.map(header => {
            const values = this.parsed.rows
                .map(row => row[header])
                .filter(value => String(value || '').trim() !== '');

            return createColumnInfo({
                name: header,
                displayName: header,
                dataType: this.inferDataType(values),
                nullable: true,
                primaryKey: false
            });
        });
    }

    async getSampleRows(_tableName, limit = 3, config = {}) {
        await this.getOrCreateConnection(config);

        const safeLimit = Math.max(1, Number(limit) || 3);

        return this.parsed.rows
            .slice(0, safeLimit)
            .map(row => createSampleRow(row));
    }

    async buildMetadata(config = {}) {
        const tables = await this.getTables(config);
        const table = tables[0];
        const columns = await this.getColumns(table.name, config);
        const sampleRows = await this.getSampleRows(table.name, 3, config);

        return {
            sourceType: 'csv',
            table,
            columns,
            sampleRows,
            rowCount: this.parsed.rows.length,
            standardFields:
                this.getStandardFields(
                    config.dataType || "resident_basic_info"
                )
        };
    }

    buildMapping(metadata, answers = {}) {
        const headerNames = Array.isArray(metadata?.columns)
            ? metadata.columns.map(column => column.name)
            : [];
        const sampleRows = Array.isArray(metadata?.sampleRows)
            ? metadata.sampleRows
            : [];

        const standardFields =
            Array.isArray(metadata?.standardFields)
                ? metadata.standardFields
                : RESIDENT_BASIC_INFO_FIELDS;

        const mappingItems = standardFields.map(field => {
            const rawAnswer = answers[field.key];

            const answerHeaders =
                Array.isArray(rawAnswer)
                    ? rawAnswer
                        .map(value => String(value || '').trim())
                        .filter(value =>
                            value &&
                            headerNames.includes(value)
                        )
                    : [];

            const answerHeader =
                !Array.isArray(rawAnswer)
                    ? String(rawAnswer || '').trim()
                    : '';

            if (
                field.key === 'record_detail' &&
                answerHeaders.length > 0
            ) {
                return {
                    fieldKey: field.key,
                    fieldLabel: field.label,
                    standardFieldLabel: field.label,
                    required: field.required,
                    csvHeaders: answerHeaders,
                    csvHeader: answerHeaders[0],
                    sourceHeaders: answerHeaders,
                    sourceHeader: answerHeaders[0],
                    confidence: 'manual'
                };
            }

            if (answerHeader && headerNames.includes(answerHeader)) {
                return {
                    fieldKey: field.key,
                    fieldLabel: field.label,
                    standardFieldLabel: field.label,
                    required: field.required,
                    csvHeader: answerHeader,
                    sourceHeader: answerHeader,
                    confidence: 'manual'
                };
            }

            const resolvedByHeader = this.resolveBestHeader(field, headerNames);

            if (resolvedByHeader.sourceHeader) {
                return {
                    fieldKey: field.key,
                    fieldLabel: field.label,
                    standardFieldLabel: field.label,
                    required: field.required,
                    csvHeader: resolvedByHeader.sourceHeader,
                    sourceHeader: resolvedByHeader.sourceHeader,
                    confidence: 'auto'
                };
            }

            const valueHintCandidates = this.resolveValueHintCandidates(
                field,
                headerNames,
                sampleRows
            );
            const candidates = this.mergeUniqueCandidates([
                ...(Array.isArray(resolvedByHeader.candidates) ? resolvedByHeader.candidates : []),
                ...valueHintCandidates
            ]);

            return {
                fieldKey: field.key,
                fieldLabel: field.label,
                standardFieldLabel: field.label,
                required: field.required,
                csvHeader: null,
                sourceHeader: null,
                confidence: candidates.length > 0 ? 'ambiguous' : 'unmapped',
                candidates
            };
        });

        return {
            items: mappingItems
        };
    }

    buildValidation(metadata, mapping) {
        const headerOptions = Array.isArray(metadata?.columns)
            ? metadata.columns.map(column => column.name)
            : [];

        const items = Array.isArray(mapping?.items)
            ? mapping.items
            : [];

        const getCsvHeader = item => {
            return item?.csvHeader || item?.sourceHeader || null;
        };

        const getStandardLabel = item => {
            return item?.standardFieldLabel || item?.fieldLabel || '';
        };

        const missingRequired = items.filter(item => {
            return item.required && !getCsvHeader(item);
        });

        const usedHeaders = new Map();

        items.forEach(item => {
            const csvHeader = getCsvHeader(item);

            if (!csvHeader) {
                return;
            }

            const current = usedHeaders.get(csvHeader) || [];
            current.push(getStandardLabel(item));
            usedHeaders.set(csvHeader, current);
        });

        const duplicateAssignments = Array.from(usedHeaders.entries())
            .filter(([, fields]) => fields.length > 1)
            .map(([header, fields]) => ({
                header,
                fields
            }));

        const needsReview = items.filter(item => {
            const requiredMissing = item.required && !getCsvHeader(item);
            const ambiguous = item.confidence === 'ambiguous';

            return requiredMissing || ambiguous;
        });

        const questions = needsReview.map(item => ({
            fieldKey: item.fieldKey,
            fieldLabel: getStandardLabel(item),
            required: item.required,
            multiSelect:
                item.fieldKey === 'record_detail',
            choices:
                Array.isArray(item.candidates) &&
                item.candidates.length > 0
                    ? item.candidates
                    : headerOptions
        }));

        return {
            completion: missingRequired.length === 0,
            missingRequired,
            duplicateAssignments,
            questions
        };
    }

    parseCsv(csvText) {
        const text = String(csvText || '').replace(/^\uFEFF/, '');

        if (!text.trim()) {
            throw new Error('CSVが空です');
        }

        const rows = [];
        let current = '';
        let currentRow = [];
        let inQuotes = false;

        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }

                continue;
            }

            if (char === ',' && !inQuotes) {
                currentRow.push(current);
                current = '';
                continue;
            }

            if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') {
                    i += 1;
                }

                currentRow.push(current);
                rows.push(currentRow);
                current = '';
                currentRow = [];
                continue;
            }

            current += char;
        }

        if (current.length > 0 || currentRow.length > 0) {
            currentRow.push(current);
            rows.push(currentRow);
        }

        const normalizedRows = rows
            .filter(row => row.some(cell => String(cell || '').trim() !== ''))
            .map(row => row.map(cell => String(cell || '').trim()));

        if (normalizedRows.length < 2) {
            throw new Error('ヘッダー行とデータ行が必要です');
        }

        const headers = normalizedRows[0];

        const records = normalizedRows.slice(1).map(row => {
            const record = {};

            headers.forEach((header, index) => {
                record[header] = row[index] || '';
            });

            return record;
        });

        return {
            headers,
            rows: records
        };
    }

    inferDataType(values) {
        if (!Array.isArray(values) || values.length === 0) {
            return 'string';
        }

        const filtered = values.filter(value => String(value || '').trim() !== '');

        if (filtered.length === 0) {
            return 'string';
        }

        const allDate = filtered.every(value => /^(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}$/.test(String(value)));

        if (allDate) {
            return 'date';
        }

        const allNumber = filtered.every(value => /^-?\d+(\.\d+)?$/.test(String(value)));

        if (allNumber) {
            return 'number';
        }

        return 'string';
    }

    normalizeText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[\s_\-（）()]/g, '');
    }

    resolveBestHeader(field, headers) {
        const safeHeaders = Array.isArray(headers) ? headers : [];
        const label = String(field?.label || '').trim();
        const normalizedLabel = this.normalizeText(label);
        const synonyms = Array.isArray(field?.synonyms)
            ? field.synonyms.map(value => String(value || '').trim()).filter(Boolean)
            : [];
        const normalizedSynonyms = synonyms.map(value => this.normalizeText(value));

        const exact = safeHeaders.filter(header => header === label);

        if (exact.length === 1) {
            return {
                sourceHeader: exact[0],
                candidates: exact
            };
        }

        if (exact.length > 1) {
            return {
                sourceHeader: null,
                candidates: exact
            };
        }

        const normalized = safeHeaders.filter(header => {
            return this.normalizeText(header) === normalizedLabel;
        });

        if (normalized.length === 1) {
            return {
                sourceHeader: normalized[0],
                candidates: normalized
            };
        }

        if (normalized.length > 1) {
            return {
                sourceHeader: null,
                candidates: normalized
            };
        }

        const synonymExact = safeHeaders.filter(header => synonyms.includes(header));
        const synonymNormalized = safeHeaders.filter(header => {
            return normalizedSynonyms.includes(this.normalizeText(header));
        });
        const synonymCandidates = this.mergeUniqueCandidates([
            ...synonymExact,
            ...synonymNormalized
        ]);

        if (synonymCandidates.length === 1) {
            return {
                sourceHeader: synonymCandidates[0],
                candidates: synonymCandidates
            };
        }

        if (synonymCandidates.length > 1) {
            return {
                sourceHeader: null,
                candidates: synonymCandidates
            };
        }

        return {
            sourceHeader: null,
            candidates: []
        };
    }

    resolveValueHintCandidates(field, headers, sampleRows) {
        const safeHeaders = Array.isArray(headers) ? headers : [];
        const safeRows = Array.isArray(sampleRows) ? sampleRows : [];

        if (safeHeaders.length === 0 || safeRows.length === 0) {
            return [];
        }

        const scoredHeaders = safeHeaders
            .map(header => {
                const values = safeRows
                    .map(row => String(row?.[header] || '').trim())
                    .filter(Boolean)
                    .slice(0, 3);

                if (values.length === 0) {
                    return {
                        header,
                        score: 0,
                        ratio: 0,
                        sampleCount: 0
                    };
                }

                const score = values.reduce((count, value) => {
                    return count + (this.matchesFieldValuePattern(field.key, value) ? 1 : 0);
                }, 0);

                return {
                    header,
                    score,
                    ratio: score / values.length,
                    sampleCount: values.length
                };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }

                if (b.ratio !== a.ratio) {
                    return b.ratio - a.ratio;
                }

                return a.header.localeCompare(b.header, 'ja');
            });

        return scoredHeaders
            .filter(item => this.isReliableValueHint(item))
            .map(item => item.header);
    }

    isReliableValueHint(item) {
        if (!item || item.sampleCount <= 0) {
            return false;
        }

        if (item.sampleCount >= 2) {
            return item.score >= 2 || item.ratio >= 0.67;
        }

        return item.score >= 1;
    }

    matchesFieldValuePattern(fieldKey, value) {
        const text = String(value || '').trim();

        if (!text) {
            return false;
        }

        const digits = text.replace(/\D/g, '');

        switch (fieldKey) {
        case 'birth_date':
            return /^(?:19|20)\d{2}[-/.年]\d{1,2}(?:[-/.月]\d{1,2})?日?$/.test(text);
        case 'gender': {
            const normalized = this.normalizeText(text);
            return ['男', '女', '男性', '女性', 'male', 'female', 'm', 'f'].includes(normalized);
        }
        case 'postal_code':
            return /^\d{3}-?\d{4}$/.test(text);
        case 'phone_number':
            return /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/.test(digits) && digits.length >= 10 && digits.length <= 11;
        case 'kana_name':
            return /^[\u30A0-\u30FF\u3040-\u309F\s　]+$/.test(text) && text.length >= 2;
        case 'address':
            return /(都|道|府|県|市|区|町|村|丁目|番地)/.test(text) && text.length >= 6;
        default:
            return false;
        }
    }

    mergeUniqueCandidates(candidates) {
        const seen = new Set();
        const merged = [];

        candidates.forEach(candidate => {
            const header = String(candidate || '').trim();

            if (!header || seen.has(header)) {
                return;
            }

            seen.add(header);
            merged.push(header);
        });

        return merged;
    }

    async getOrCreateConnection(config = {}) {
        if (this.connection && this.parsed) {
            return this.connection;
        }

        return this.connect(config);
    }

    getCapabilities() {
        return {
            sourceType: 'csv',
            supportsConnectionValidation: true,
            supportsTableDiscovery: true,
            supportsColumnDiscovery: true,
            supportsSampleRows: true,
            supportsMetadataNormalization: true
        };
    }
}

module.exports = CsvDataSourceAdapter;
