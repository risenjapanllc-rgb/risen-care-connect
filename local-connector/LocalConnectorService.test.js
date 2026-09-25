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

      extractSourceEntities() {
        return [
          {
            sourceEntityKey: "sheet:0:row:3",
            sheetIndex: 0,
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
    result.extracted.sourceEntities,
    [
      {
        sourceEntityKey: "sheet:0:row:3",
        sheetIndex: 0,
        sheetName: "テスト",
        rowIndex: 3,
        fields: {
          "居室番号": "201",
          "利用者名": "テスト利用者",
          "性格": "穏やか"
        }
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
    csvIntakeInspector: {
      async inspect() {
        return {
          rows: [
            ["項目A", "項目B", "項目C"],
            ["値1", "値2", "値3"]
          ],
          headerCandidate: {
            rowIndex: 0,
            columnCount: 3,
            confidence: "candidate"
          }
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

      extractSourceEntities() {
        return [
          {
            sourceEntityKey: "sheet:0:row:2",
            sheetIndex: 0,
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
    result.extracted.sourceEntities,
    [
      {
        sourceEntityKey: "sheet:0:row:2",
        sheetIndex: 0,
        sheetName: "CSV",
        rowIndex: 2,
        fields: {
          "項目A": "値1",
          "項目B": "値2",
          "項目C": "値3"
        }
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

test("resolveSourceSnapshot resolves the current tabular source only when opaque identity and snapshot match", async () => {
  const service = new LocalConnectorService({
    sourceDocumentRegistry: {
      async findBySourceDocumentKey(sourceDocumentKey) {
        assert.strictEqual(
          sourceDocumentKey,
          "opaque-doc-key-1"
        );

        return {
          sourceDocumentKey:
            "opaque-doc-key-1",
          relativePath:
            "台帳/利用者.csv",
          relativePathLookupKey:
            "lookup-key",
          fileName:
            "利用者.csv",
          firstSeenAt:
            "2026-09-15T00:00:00.000Z",
          lastSeenAt:
            "2026-09-15T00:00:00.000Z",
          lastObservedUpdatedAt:
            "2026-09-15T01:00:00.000Z",
          lastObservedSize:
            123
        };
      }
    }
  });

  service._resolveRegisteredFileDetails =
    async relativePath => {
      assert.strictEqual(
        relativePath,
        "台帳/利用者.csv"
      );

      return {
        filePath:
          "/secret/inbox/台帳/利用者.csv",
        fileName:
          "利用者.csv",
        relativePath:
          "台帳/利用者.csv",
        extension:
          ".csv",
        size:
          123,
        updatedAt:
          "2026-09-15T01:00:00.000Z"
      };
    };

  service.normalizeRegisteredCsv =
    async relativePath => {
      assert.strictEqual(
        relativePath,
        "台帳/利用者.csv"
      );

      return {
        sourceType:
          "csv",
        extracted: {
          sourceEntities: [
            {
              sourceEntityKey:
                "sheet:0:row:2",
              valuesBySourceFieldKey: {
                "sheet:0:column:0":
                  "resident-code"
              }
            }
          ]
        }
      };
    };

  const result =
    await service.resolveSourceSnapshot({
      sourceDocumentKey:
        "opaque-doc-key-1",
      sourceUpdatedAt:
        "2026-09-15T01:00:00.000Z",
      sourceSize:
        123
    });

  assert.strictEqual(
    result.sourceDocumentKey,
    "opaque-doc-key-1"
  );
  assert.strictEqual(
    result.sourceUpdatedAt,
    "2026-09-15T01:00:00.000Z"
  );
  assert.strictEqual(
    result.sourceSize,
    123
  );
  assert.strictEqual(
    result.analysis.extracted
      .sourceEntities.length,
    1
  );
});

test("resolveSourceSnapshot fails closed when the current file snapshot changed", async () => {
  const service = new LocalConnectorService({
    sourceDocumentRegistry: {
      async findBySourceDocumentKey() {
        return {
          sourceDocumentKey:
            "opaque-doc-key-1",
          relativePath:
            "台帳/利用者.csv",
          relativePathLookupKey:
            "lookup-key",
          fileName:
            "利用者.csv",
          firstSeenAt:
            "2026-09-15T00:00:00.000Z",
          lastSeenAt:
            "2026-09-15T00:00:00.000Z",
          lastObservedUpdatedAt:
            "2026-09-15T01:00:00.000Z",
          lastObservedSize:
            123
        };
      }
    }
  });

  service._resolveRegisteredFileDetails =
    async () => ({
      filePath:
        "/secret/inbox/台帳/利用者.csv",
      fileName:
        "利用者.csv",
      relativePath:
        "台帳/利用者.csv",
      extension:
        ".csv",
      size:
        124,
      updatedAt:
        "2026-09-15T01:01:00.000Z"
    });

  let normalized = false;

  service.normalizeRegisteredCsv =
    async () => {
      normalized = true;
      throw new Error(
        "must not normalize stale snapshot"
      );
    };

  await assert.rejects(
    () =>
      service.resolveSourceSnapshot({
        sourceDocumentKey:
          "opaque-doc-key-1",
        sourceUpdatedAt:
          "2026-09-15T01:00:00.000Z",
        sourceSize:
          123
      }),
    error =>
      error?.code ===
      "source_snapshot_changed"
  );

  assert.strictEqual(
    normalized,
    false
  );
});

test("resolveSourceSnapshot does not resolve a file for an unknown opaque sourceDocumentKey", async () => {
  const service = new LocalConnectorService({
    sourceDocumentRegistry: {
      async findBySourceDocumentKey() {
        return null;
      }
    }
  });

  let resolved = false;

  service._resolveRegisteredFileDetails =
    async () => {
      resolved = true;
      throw new Error(
        "must not resolve unknown identity"
      );
    };

  await assert.rejects(
    () =>
      service.resolveSourceSnapshot({
        sourceDocumentKey:
          "opaque-doc-key-missing",
        sourceUpdatedAt:
          "2026-09-15T01:00:00.000Z",
        sourceSize:
          123
      }),
    error =>
      error?.code ===
      "source_document_not_found"
  );

  assert.strictEqual(
    resolved,
    false
  );
});

test(
  "normalizeRegisteredCsv reuses inspected rows and confirmed header without rereading CSV",
  async () => {
    const rows = [
      ["施設名", "たんぽぽ会"],
      [
        "利用者番号",
        "氏名",
        "利用日"
      ],
      [
        "A001",
        "山田太郎",
        "2026-09-01"
      ]
    ];

    let inspectedFilePath = null;
    let csvReaderCalled = false;
    const extractorCalls = [];

    const service =
      new LocalConnectorService({
        csvIntakeInspector: {
          async inspect(filePath) {
            inspectedFilePath = filePath;

            return {
              rows,
              headerCandidate: {
                rowIndex: 1,
                columnCount: 3,
                confidence: "candidate"
              }
            };
          }
        },

        csvReader: {
          async read() {
            csvReaderCalled = true;

            throw new Error(
              "normalizeRegisteredCsv must not reread CSV"
            );
          }
        },

        sourceFieldExtractor: {
          extractExcelRows(
            document,
            options
          ) {
            extractorCalls.push({
              method:
                "extractExcelRows",
              document,
              options
            });

            return [];
          },

          extractFieldDefinitions(
            document,
            options
          ) {
            extractorCalls.push({
              method:
                "extractFieldDefinitions",
              document,
              options
            });

            return [];
          },

          extractSourceEntities(
            document,
            options
          ) {
            extractorCalls.push({
              method:
                "extractSourceEntities",
              document,
              options
            });

            return [];
          }
        }
      });

    service._resolveRegisteredFileDetails =
      async () => ({
        filePath:
          "/test/facility.csv",
        fileName:
          "facility.csv",
        relativePath:
          "facility.csv",
        extension:
          ".csv",
        size: 123,
        updatedAt:
          "2026-09-11T00:00:00.000Z"
      });

    await service.normalizeRegisteredCsv(
      "facility.csv"
    );

    assert.strictEqual(
      inspectedFilePath,
      "/test/facility.csv"
    );

    assert.strictEqual(
      csvReaderCalled,
      false
    );

    assert.strictEqual(
      extractorCalls.length,
      3
    );

    for (
      const call of extractorCalls
    ) {
      assert.deepStrictEqual(
        call.document,
        {
          sheetNames: ["csv"],
          sheets: [
            {
              sheetName: "csv",
              rows
            }
          ]
        }
      );

      assert.deepStrictEqual(
        call.options,
        {
          headerRowIndex: 1
        }
      );
    }
  }
);

test(
  "normalizeRegisteredCsv fails closed when inspected header is unresolved",
  async () => {
    let extractorCalled = false;

    const service =
      new LocalConnectorService({
        csvIntakeInspector: {
          async inspect() {
            return {
              rows: [
                ["施設名", "たんぽぽ会"],
                [
                  "利用者番号",
                  "氏名",
                  "利用日"
                ],
                [
                  "A001",
                  "山田太郎",
                  "2026-09-01"
                ]
              ],
              headerCandidate: null
            };
          }
        },

        sourceFieldExtractor: {
          extractExcelRows() {
            extractorCalled = true;
            return [];
          },

          extractFieldDefinitions() {
            extractorCalled = true;
            return [];
          },

          extractSourceEntities() {
            extractorCalled = true;
            return [];
          }
        }
      });

    service._resolveRegisteredFileDetails =
      async () => ({
        filePath:
          "/test/facility.csv",
        fileName:
          "facility.csv",
        relativePath:
          "facility.csv",
        extension:
          ".csv",
        size: 123,
        updatedAt:
          "2026-09-11T00:00:00.000Z"
      });

    await assert.rejects(
      () =>
        service.normalizeRegisteredCsv(
          "facility.csv"
        ),
      error =>
        error instanceof Error &&
        error.message ===
          "csv_header_unresolved"
    );

    assert.strictEqual(
      extractorCalled,
      false
    );
  }
);

test(
  "normalizeRegisteredCsv fails closed when inspected header is outside parsed rows",
  async () => {
    let extractorCalled = false;

    const service =
      new LocalConnectorService({
        csvIntakeInspector: {
          async inspect() {
            return {
              rows: [
                ["項目A", "項目B"],
                ["値1", "値2"]
              ],
              headerCandidate: {
                rowIndex: 2,
                columnCount: 2,
                confidence: "candidate"
              }
            };
          }
        },

        sourceFieldExtractor: {
          extractExcelRows() {
            extractorCalled = true;
            return [];
          },

          extractFieldDefinitions() {
            extractorCalled = true;
            return [];
          },

          extractSourceEntities() {
            extractorCalled = true;
            return [];
          }
        }
      });

    service._resolveRegisteredFileDetails =
      async () => ({
        filePath:
          "/test/facility.csv",
        fileName:
          "facility.csv",
        relativePath:
          "facility.csv",
        extension:
          ".csv",
        size: 123,
        updatedAt:
          "2026-09-11T00:00:00.000Z"
      });

    await assert.rejects(
      () =>
        service.normalizeRegisteredCsv(
          "facility.csv"
        ),
      error =>
        error instanceof Error &&
        error.message ===
          "csv_header_unresolved"
    );

    assert.strictEqual(
      extractorCalled,
      false
    );
  }
);
