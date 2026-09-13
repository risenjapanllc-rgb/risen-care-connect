"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const LocalConnectorService = require("./LocalConnectorService");

test("observeRegisteredFile passes only safe file observation to registry", async () => {
  let received;
  const service = new LocalConnectorService({ sourceDocumentRegistry: { observe: async value => { received = value; return { sourceDocumentKey: "doc-key-1" }; } } });
  service._resolveRegisteredFileDetails = async () => ({ filePath: "/secret/facility/支援記録.xlsx", fileName: "支援記録.xlsx", relativePath: "支援記録.xlsx", extension: ".xlsx", size: 123, updatedAt: "2026-09-05T12:00:00.000Z" });
  await service.observeRegisteredFile("支援記録.xlsx");
  assert.deepStrictEqual(received, { relativePath: "支援記録.xlsx", fileName: "支援記録.xlsx", updatedAt: "2026-09-05T12:00:00.000Z", size: 123 });
  assert.ok(!Object.hasOwn(received, "filePath"));
});

test("observeRegisteredFile fails before file resolution when registry is not configured", async () => {
  const service = new LocalConnectorService();
  let resolved = false;
  service._resolveRegisteredFileDetails = async () => { resolved = true; throw new Error("must not run"); };
  await assert.rejects(() => service.observeRegisteredFile("支援記録.xlsx"), /Registry is not configured/);
  assert.strictEqual(resolved, false);
});


test("resolves a registered file by relative path in a nested folder", async () => {
  const service = new LocalConnectorService({
    config: {
      async getAllowedFolder() {
        return "/secret/facility/RISEN CARE取込フォルダ";
      }
    },
    scanner: {
      async scan() {
        return {
          files: [
            {
              fileName: "山田さん.docx",
              relativePath: "個別支援計画/山田さん.docx",
              extension: ".docx",
              size: 123,
              updatedAt: "2026-09-05T12:00:00.000Z"
            }
          ]
        };
      }
    }
  });

  const details =
    await service._resolveRegisteredFileDetails(
      "個別支援計画/山田さん.docx"
    );

  assert.strictEqual(
    details.fileName,
    "山田さん.docx"
  );

  assert.strictEqual(
    details.relativePath,
    "個別支援計画/山田さん.docx"
  );

  assert.strictEqual(
    details.filePath,
    "/secret/facility/RISEN CARE取込フォルダ/個別支援計画/山田さん.docx"
  );
});

test("observeRegisteredFile passes relative path for nested files", async () => {
  let received;

  const service = new LocalConnectorService({
    sourceDocumentRegistry: {
      observe: async value => {
        received = value;
        return {
          sourceDocumentKey: "doc-key-2"
        };
      }
    }
  });

  service._resolveRegisteredFileDetails = async () => ({
    filePath:
      "/secret/facility/RISEN CARE取込フォルダ/個別支援計画/山田さん.docx",
    fileName: "山田さん.docx",
    relativePath: "個別支援計画/山田さん.docx",
    extension: ".docx",
    size: 123,
    updatedAt: "2026-09-05T12:00:00.000Z"
  });

  await service.observeRegisteredFile(
    "個別支援計画/山田さん.docx"
  );

  assert.deepStrictEqual(received, {
    relativePath:
      "個別支援計画/山田さん.docx",
    fileName: "山田さん.docx",
    updatedAt: "2026-09-05T12:00:00.000Z",
    size: 123
  });
});

test("getFolderStatus marks files as new, updated, or unchanged", async () => {
  const observed = [];

  const service = new LocalConnectorService({
    scanner: {
      async scan() {
        return {
          rootFolderName: "RISEN CARE取込フォルダ",
          fileCount: 3,
          files: [
            {
              relativePath:
                "個別支援計画/山田さん.docx",
              fileName: "山田さん.docx",
              extension: ".docx",
              size: 100,
              updatedAt:
                "2026-09-08T09:00:00.000Z"
            },
            {
              relativePath:
                "個別支援計画/佐藤さん.docx",
              fileName: "佐藤さん.docx",
              extension: ".docx",
              size: 200,
              updatedAt:
                "2026-09-08T09:10:00.000Z"
            },
            {
              relativePath:
                "支援記録/2026年9月/山田さん.xlsx",
              fileName: "山田さん.xlsx",
              extension: ".xlsx",
              size: 300,
              updatedAt:
                "2026-09-08T09:20:00.000Z"
            }
          ]
        };
      }
    },

    sourceDocumentRegistry: {
      async observe(observation) {
        observed.push(observation);

        const changeTypes = {
          "個別支援計画/山田さん.docx":
            "new",
          "個別支援計画/佐藤さん.docx":
            "unchanged",
          "支援記録/2026年9月/山田さん.xlsx":
            "updated"
        };

        return {
          sourceDocumentKey:
            "key-" +
            observed.length,
          relativePath:
            observation.relativePath,
          fileName:
            observation.fileName,
          lastObservedUpdatedAt:
            observation.updatedAt,
          lastObservedSize:
            observation.size,
          changeType:
            changeTypes[
              observation.relativePath
            ]
        };
      }
    }
  });

  const result =
    await service.getFolderStatus(
      "/secret/facility/RISEN CARE取込フォルダ"
    );

  assert.deepStrictEqual(
    result.files.map(file => ({
      relativePath: file.relativePath,
      changeType: file.changeType
    })),
    [
      {
        relativePath:
          "個別支援計画/山田さん.docx",
        changeType: "new"
      },
      {
        relativePath:
          "個別支援計画/佐藤さん.docx",
        changeType: "unchanged"
      },
      {
        relativePath:
          "支援記録/2026年9月/山田さん.xlsx",
        changeType: "updated"
      }
    ]
  );

  assert.deepStrictEqual(
    observed.map(file => file.relativePath),
    [
      "個別支援計画/山田さん.docx",
      "個別支援計画/佐藤さん.docx",
      "支援記録/2026年9月/山田さん.xlsx"
    ]
  );
});

test("normalizeRegisteredExcel uses SourceFieldExtractor for facility fields", async () => {
  let receivedDocument = null;

  const service = new LocalConnectorService({
    excelReader: {
      async read() {
        return {
          sheetNames: ["テスト"],
          sheets: [
            {
              sheetName: "テスト",
              rows: [
                ["タイトル", null],
                ["居室番号", "利用者名", "性格"],
                ["201", "テスト利用者", "穏やか"]
              ]
            }
          ]
        };
      }
    },

    sourceFieldExtractor: {
      extractExcelRows(document) {
        receivedDocument = document;

        return [
          {
            sheetName: "テスト",
            rowIndex: 3,
            fields: {
              "居室番号": "201",
              "利用者名": "テスト利用者",
              "性格": "穏やか"
            }
          }
        ];
      },

      extractFieldDefinitions() {
        return [
          {
            sourceFieldKey: "sheet:0:column:0",
            sheetIndex: 0,
            sheetName: "テスト",
            columnIndex: 0,
            headerLabel: "居室番号"
          },
          {
            sourceFieldKey: "sheet:0:column:1",
            sheetIndex: 0,
            sheetName: "テスト",
            columnIndex: 1,
            headerLabel: "利用者名"
          },
          {
            sourceFieldKey: "sheet:0:column:2",
            sheetIndex: 0,
            sheetName: "テスト",
            columnIndex: 2,
            headerLabel: "性格"
          }
        ];
      }
    }
  });

  service._resolveRegisteredFileDetails =
    async () => ({
      filePath: "/test/facility.xlsx",
      fileName: "facility.xlsx",
      relativePath: "facility.xlsx",
      extension: ".xlsx",
      size: 123,
      updatedAt: "2026-09-08T00:00:00.000Z"
    });

  const result =
    await service.normalizeRegisteredExcel(
      "facility.xlsx"
    );

  assert.ok(receivedDocument);

  assert.deepStrictEqual(
    result.extracted.fieldDefinitions,
    [
      {
        sourceFieldKey: "sheet:0:column:0",
        sheetIndex: 0,
        sheetName: "テスト",
        columnIndex: 0,
        headerLabel: "居室番号"
      },
      {
        sourceFieldKey: "sheet:0:column:1",
        sheetIndex: 0,
        sheetName: "テスト",
        columnIndex: 1,
        headerLabel: "利用者名"
      },
      {
        sourceFieldKey: "sheet:0:column:2",
        sheetIndex: 0,
        sheetName: "テスト",
        columnIndex: 2,
        headerLabel: "性格"
      }
    ]
  );

  assert.deepStrictEqual(
    result.extracted.sourceFields,
    [
      {
        sheetName: "テスト",
        rowIndex: 3,
        fields: {
          "居室番号": "201",
          "利用者名": "テスト利用者",
          "性格": "穏やか"
        },
        meanings: {
          personality: "性格",
          communication: null,
          carePrecautions: null,
          preference: null,
          healthCharacteristics: null,
          otherNotes: null
        }
      }
    ]
  );
});

test("getConnectorId delegates to LocalConnectorConfig", async () => {
  const service =
    new LocalConnectorService({
      config: {
        async getConnectorId() {
          return "connector-test-001";
        }
      }
    });

  const connectorId =
    await service.getConnectorId();

  assert.strictEqual(
    connectorId,
    "connector-test-001"
  );
});

test("normalizeRegisteredCsv uses SourceFieldExtractor for facility fields", async () => {
  let receivedDocument = null;

  const service = new LocalConnectorService({
    csvReader: {
      async read() {
        return {
          sheetNames: ["CSV"],
          sheets: [
            {
              sheetName: "CSV",
              rows: [
                ["項目A", "項目B", "項目C"],
                ["値1", "値2", "値3"]
              ]
            }
          ]
        };
      }
    },

    sourceFieldExtractor: {
      extractExcelRows(document) {
        receivedDocument = document;

        return [
          {
            sheetName: "CSV",
            rowIndex: 2,
            fields: {
              "項目A": "値1",
              "項目B": "値2",
              "項目C": "値3"
            }
          }
        ];
      },

      extractFieldDefinitions() {
        return [
          {
            sourceFieldKey: "sheet:0:column:0",
            sheetIndex: 0,
            sheetName: "CSV",
            columnIndex: 0,
            headerLabel: "項目A"
          },
          {
            sourceFieldKey: "sheet:0:column:1",
            sheetIndex: 0,
            sheetName: "CSV",
            columnIndex: 1,
            headerLabel: "項目B"
          },
          {
            sourceFieldKey: "sheet:0:column:2",
            sheetIndex: 0,
            sheetName: "CSV",
            columnIndex: 2,
            headerLabel: "項目C"
          }
        ];
      }
    }
  });

  service._resolveRegisteredFileDetails =
    async () => ({
      filePath: "/test/facility.csv",
      fileName: "facility.csv",
      relativePath: "facility.csv",
      extension: ".csv",
      size: 123,
      updatedAt: "2026-09-11T00:00:00.000Z"
    });

  const result =
    await service.normalizeRegisteredCsv(
      "facility.csv"
    );

  assert.ok(receivedDocument);

  assert.deepStrictEqual(
    result.extracted.fieldDefinitions,
    [
      {
        sourceFieldKey: "sheet:0:column:0",
        sheetIndex: 0,
        sheetName: "CSV",
        columnIndex: 0,
        headerLabel: "項目A"
      },
      {
        sourceFieldKey: "sheet:0:column:1",
        sheetIndex: 0,
        sheetName: "CSV",
        columnIndex: 1,
        headerLabel: "項目B"
      },
      {
        sourceFieldKey: "sheet:0:column:2",
        sheetIndex: 0,
        sheetName: "CSV",
        columnIndex: 2,
        headerLabel: "項目C"
      }
    ]
  );

  assert.deepStrictEqual(
    result.extracted.sourceFields,
    [
      {
        sheetName: "CSV",
        rowIndex: 2,
        fields: {
          "項目A": "値1",
          "項目B": "値2",
          "項目C": "値3"
        },
        meanings: {
          personality: null,
          communication: null,
          carePrecautions: null,
          preference: null,
          healthCharacteristics: null,
          otherNotes: null
        }
      }
    ]
  );
});
