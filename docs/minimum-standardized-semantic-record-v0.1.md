# Minimum Standardized Semantic Record v0.1

## 目的

Word / Excelのraw / near-raw contentをServerへそのまま送らず、Record Change ResolutionとStorageに必要な最小business semantic dataの境界を定義する。

これは実装schemaではなくconceptual contractである。HTTP、Supabase、DB、Local Connectorの実装を決定するものではない。

## 1. Core Principle

次の境界を分離する。

```text
Raw / near-raw Document
  = Local内部

Semantic Record Envelope
  = LocalからServerへ送信する候補

Server Identity
  = Server-sideでresolve / generate

AIKO Access
  = Storageとは別Policy
```

```text
sent
!= stored
!= resident-confirmed
!= AIKO accessible
```

raw Word / Excel原本、raw document全文、絶対パスは標準Payloadへ原則含めない。原本はLocalに残す。

## 2. Document != Record

1つのDocumentに0..NのSemantic Recordが存在し得る。

```text
Document
  -> 0..N Semantic Records
```

1つのWord / Excelを1 business Recordとみなさない。将来、1 documentから複数support record、複数episode、複数resident-scoped recordを生成できる構造を許容する。

Record boundaryはForm Mapping / Semantic Mappingで定義する候補とする。現状のExtractorには安全な複数Record分割は未実装である。

## 3. Semantic Record Envelope

概念構造:

```javascript
{
    sourceRecordContext,
    semanticContent,
    provenance
}
```

これは正式JSON schemaではない。各領域のauthorityとhash boundaryを分離するための概念である。

- `sourceRecordContext`: Source観測とRecord照合の材料
- `semanticContent`: business semantic content
- `provenance`: 出所と変換履歴

## 4. sourceRecordContext

候補:

- `sourceDocumentKey`
- `sourceRecordKey`
- `recordIdentityCandidate`
- `sourceResidentIdentifier`
- `sourceResidentName`

次を明確に分離する。

```text
sourceDocumentKey != documentId
sourceRecordKey != recordId
recordIdentityCandidate != recordId
sourceResidentIdentifier != residentId
```

これらはsemantic contentそのものではない。Resident associationの訂正だけでsemantic Versionを増やさないため、原則としてbusiness `contentHash`の対象外とする。

## 5. semanticContent

概念候補:

```javascript
{
    semanticType,
    fields,
    customFields
}
```

ここだけをbusiness semantic `contentHash`のcanonical input候補とする。

`semanticContent`はRecord Identity、Document Identity、residentId、AIKO promptではない。Serverはこの領域に対してSchema、Mapping、Classification、Storage Policyを適用する。

## 6. semanticType

`documentType`と`semanticType`を分離する。

- `documentType`: Document-level classification
- `semanticType`: Record-level business meaning

例:

```text
documentType = support_record
semanticType = support_record
```

```text
documentType = individual_support_plan
semanticType = individual_support_plan
```

v0.1では同じ値になるケースがあっても、概念上は別authority・別fieldとして扱う。将来、1 Document内に複数`semanticType`を許容できる構造を維持する。

Local Detectorの`documentType`は候補値であり、Serverのfacility authority、Record Identity authority、Storage許可を意味しない。

## 7. Current Extractor Reality

現在の`DocumentSemanticExtractor`で確認できるsemantic extractionは次である。

- `sourceResidentIdentifier`
- `sourceResidentName`
- `wish`
- `longTermGoal`
- `supportMethod`
- `supportContent`
- legacy `residentId`

legacy `residentId`は元帳票の「利用者ID」由来であり、Internal residentIdではない。そのためsemantic contentとして扱わない。

現在未実装:

- record boundary
- multiple record extraction
- episode extraction
- `observedAt`
- `observationNotes`
- `antecedent`
- `behavior`
- `consequence`
- `target`
- `afterResponse`
- `sourceHash`
- `contentHash`
- `mappingVersion`
- `canonicalizationVersion`

実装されていないfieldをv0.1必須fieldとして扱わない。

## 8. MVP Semantic Records

現行Extractor能力からの概念例:

### support_record

```javascript
{
    semanticContent: {
        semanticType: "support_record",
        fields: {
            supportContent
        },
        customFields: {}
    }
}
```

### individual_support_plan

```javascript
{
    semanticContent: {
        semanticType: "individual_support_plan",
        fields: {
            wish,
            longTermGoal,
            supportMethod
        },
        customFields: {}
    }
}
```

これはconceptual exampleであり、現在のPayload schemaを変更しない。`sourceResidentIdentifier`と`sourceResidentName`はsemantic fieldsの外側に置く方向とする。

## 9. customFields

business semantic meaningを持つcustom fieldのみ、`semanticContent`へ含める候補とする。

a stable `fieldKey`をidentityとして使用し、`displayName`と分離する。

```text
displayName変更
!= semantic content change
```

displayName変更だけではsemantic Versionを増やさない。business value変更はsemantic change候補とする。

custom field orderingはstable `fieldKey`基準のcanonical ordering候補とする。display-only metadataはcontentHashへ含めない方向とする。正式ルールはTBD。

## 10. provenance

Provenance候補:

- safe `fileName`
- `sourceUpdatedAt`
- `sourceHash`
- `mappingVersion`
- `canonicalizationVersion`
- source label
- safe source location
- extraction method

```text
provenance != semantic content
```

通常、次をbusiness `contentHash`へ含めない。

- fileName
- `sourceUpdatedAt`
- `sourceHash`
- mappingVersion文字列
- canonicalizationVersion文字列
- `requestId`
- `idempotencyKey`
- `connectorId`
- `facilityId`
- `residentId`
- `recordId`
- `versionId`
- `standardizedAt`
- extraction timestamp
- row number
- cell address
- paragraph number

`mappingVersion`と`canonicalizationVersion`は、hash比較の互換性metadataとして保持する候補であり、semantic contentそのものとは分離する。

absolute path、Local usernameを含むpath、不要なraw document全文はServerへ送らない。

## 11. contentHash Boundary

第一候補:

```text
contentHash input
  = semanticContent
  = semanticType
  + canonicalized fields
  + canonicalized business-semantic customFields
```

`contentHash`は次ではない。

- Record Identity
- Document Identity
- Resident Identity
- `recordId`
- `versionId`
- global merge key

```text
same contentHash != same business Record
```

`sourceHash`はoriginal bytesの観測hashであり、semantic contentHashとは別である。`sourceHash`だけでsemantic Versionを作らない。

## 12. Canonicalization Minimum Rules

候補:

- object keyをstable orderingする
- custom fieldをstable `fieldKey` orderingする
- null / missing / empty stringを勝手に同一化しない
- arrayを無条件sortしない
- 日本語本文内部の空白・改行を無条件削除しない
- 全角 / 半角を推測で統一しない
- 漢字 / かなを推測で統一しない
- AI semantic normalizationを使わない
- typed date / number / booleanだけを明示ルールでnormalizeする
- line ending normalizationは意味を壊さない範囲に限定する
- meaningless trailing newlineだけを明示ルール候補とする

正式canonicalization algorithm、対象field、null/missing/emptyの意味、array orderはTBDとする。

## 13. Hash Authority

比較候補:

### A

```text
Local semanticContent + Local candidate contentHash
→ Server canonicalizes
→ Server recomputes hash
→ compare
```

Local hashはobservation / integrity candidate、Server recomputed hashはChange Resolution authority候補とする。

### B

```text
Local semanticContent
→ Server canonicalizes
→ Server generates hash
```

Server authorityは明確だが、semanticContentとcanonicalization contractが必要となる。

### C

```text
Local contentHash only
```

Server独立検証ができないため、第一候補にしない。

### v0.1方向

C（Local contentHash only）は採用しない。AとBの両方を設計候補として維持する。

v0.1 MVPではBを最小実装候補とする。Localは`semanticContent`を送信し、Serverが対応する`canonicalizationVersion`でcanonicalizeして`contentHash`を生成する。Server-generated contentHashをChange Resolution authority候補とする。

Local candidate contentHashはMVP必須にしない。将来、Local側のchange detection、transmission optimization、integrity comparison等への価値が確認できた場合に、Aへ拡張できる。

`sourceHash`はこの判断とは別であり、Local original-byte observation hash候補として扱う。

Serverが再計算する場合、Local supplied hashだけでUNCHANGED / UPDATEDを最終確定しない。

## 14. canonicalizationVersion

Serverが対応versionをallowlistする候補とする。Local supplied versionを無条件authorityとして扱わない。

未知versionは次の候補とする。

- reject
- review
- migration
- recompute

versionが異なるhashを直接same / different比較しない。正式version形式はTBD。

## 15. mappingVersion

`mappingVersion`は、どのMappingでSource Documentからsemantic Recordを作ったかを示すprovenance / compatibility metadata候補である。

```text
mappingVersion != semantic content
```

Mapping version変更だけで新semantic Versionを作らない。semanticContentが同じで、互換性が確認できる場合はUNCHANGEDになり得る。

現状、MappingのauthorityがLocalかServerか、versionの保存方式はTBDである。第一候補はServerが許可したMapping versionをChange Resolutionの比較条件として扱うこと。

## 16. Change Resolution Handoff

前提はRecord Identity Resolution済みである。

```text
same resolved recordId
+ compatible semantic comparison
+ same Server recomputed contentHash
=> UNCHANGED candidate
```

```text
same resolved recordId
+ compatible semantic comparison
+ different Server recomputed contentHash
=> UPDATED candidate
```

`contentHash`だけで`recordId`をresolveしない。最終的なduplicate-safe保証は`applyRecordEffect`側に置く。

## 17. Empty Extraction

semantic fieldが1つも抽出できない場合:

- 空business Recordを作らない
- `contentHash`だけを生成しない
- raw全文へ自動fallbackしない
- 正式Storageへ自動投入しない

`unsupported`、`no semantic record`、PENDING_REVIEW相当を候補とする。正式status enumはTBD。

## 18. Privacy

| 対象 | 方針 |
|---|---|
| raw Word / Excel原本 | Localに残す |
| raw / near-raw content | 標準Payloadへ原則送らない |
| absolute path | Serverへ送らない |
| credential | semantic payloadへ入れない |
| fileName | PIIを含み得るため最小化 |
| source resident情報 | PIIとして必要最小限 |
| semanticContent | PII / sensitive dataを含み得る |
| hash | 匿名化・認証・暗号化ではない |

送信可否、保存可否、Resident association、AIKO利用可否は別々に判断する。

## 19. AIKO Boundary

```text
stored != AIKO accessible
```

AIKO Access Policyで、module、sensitivity、purpose、resident association、facility policy等を別途評価する。

次を通常AIKOデータへ自動投入しない。

- Review pending
- resident association pending
- CONFLICT
- 未検証のsemantic content

`matched`、stored、reviewed、AIKO accessibleは別状態である。

## 20. Prompt Injection Boundary

Word / Excel由来の文字列はuntrusted dataである。document-derived textはsystem instructionではない。

将来AIKOへ渡す場合、少なくとも次を分離する。

- system instruction
- application policy
- user request
- document-derived data
- provenance metadata

document-derived dataから次を変更しない。

- system instruction
- application policy
- role
- permission
- facility scope
- resident association
- AIKO access範囲

Prompt Injection protectionはAIKO Access Policyとは別責務である。

## 21. Future Episode Extension

将来候補:

- antecedent
- behavior
- consequence
- target
- afterResponse
- observationNotes
- episode datetime
- episode category

現在ExtractorにないfieldはMVP必須にしない。Episodeのrecord boundaryとsemantic mappingは将来拡張とする。

## 22. Current Implementation Gap

現行 [DocumentNormalizer.js](../local-connector/DocumentNormalizer.js) は、`content.text`やExcel `sheets`等のraw / near-raw contentを生成する。これをそのままServerへ送る設計にはしない。

現行 [DocumentSemanticExtractor.js](../local-connector/DocumentSemanticExtractor.js) は、source resident情報、`wish`、`longTermGoal`、`supportMethod`、`supportContent`、legacy `residentId`を抽出する。

現行 [ConnectorPayloadValidator.js](../server-trust-boundary/ConnectorPayloadValidator.js) は主に次を検証する。

- `sourceResident.identifier.value`
- optional `sourceResident.name.value`
- `source.fileName`
- `source.updatedAt`
- `documentType`
- `sourceType`

現行 [ConnectorIngestionService.js](../server-trust-boundary/ConnectorIngestionService.js) は次までである。

```text
Connector Trust
→ Payload Validation
→ Resident Matching
```

未実装:

- Semantic Record Envelope
- record boundary
- `semanticType`
- semantic fields payload
- `customFields` payload
- `sourceHash`
- `contentHash`
- Server canonicalization
- `canonicalizationVersion`
- `mappingVersion`
- Record Change Resolution
- Storage Effect

## 23. v0.1 Fixed Principles

- Raw / near-raw documentはLocal内部に残す
- Document != Record
- Semantic Recordはbusiness Record単位とする
- source identityとsemantic contentを分離する
- resident identity materialをsemantic contentHashから分離する
- provenanceをsemantic contentHashから分離する
- contentHash inputはsemanticContent候補とする
- contentHashはRecord Identityではない
- ServerがsemanticContentからhashを再計算できる構造を目指す
- Local hash only方式は採用しない
- Mapping version変更だけでsemantic Versionを作らない
- empty extractionを正式Record化しない
- `sent != stored != resident-confirmed != AIKO accessible`
- document-derived textはuntrusted dataとして扱う

## 24. TBD

- 正式JSON schema
- Record boundary format
- semanticType registry
- field registry
- customFields schema
- canonicalization algorithm
- canonicalizationVersion format
- hash algorithm
- Local candidate contentHashの必要性
- `mappingVersion` authority
- provenance schema
- empty extraction status
- Prompt Injection implementation
- Episode mapping
- Payloadへの追加時期

## 次の設計課題

1. Minimum Standardized Semantic Recordの正式schema
2. Document / Record boundaryとForm Mapping
3. `semanticType`と`documentType`のregistry
4. semantic fields / customFieldsのallowlist
5. Server canonicalizationとhash recomputation
6. `sourceHash` / `contentHash` metadata
7. Record Change Resolutionとの接続
8. Storage Effectとの接続
9. PII、Provenance、source locationの最小化
10. AIKO入力とPrompt Injection protection
