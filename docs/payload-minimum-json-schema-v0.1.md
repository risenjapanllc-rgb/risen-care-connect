# RISEN CARE Payload Minimum JSON Schema v0.1

## 1. 目的

Local Connector / RISEN CARE Connectから
RISEN CARE Server Trust Boundaryへ送信する
最小Payload構造を定義する。

本設計では、

- Local側が観測・抽出した値
- Server側が検証・確定した値

を明確に分離する。

Localから送信された値を
Trusted Dataとして直接扱わない。

## 2. 基本原則

- PayloadはEnvelope + Documents + Recordsを基本とする
- 1ファイル = 1利用者に固定しない
- 1ファイルに複数利用者を許容できる構造とする
- 1ファイルに複数Recordを許容する
- facilityIdはLocal側で最終確定しない
- residentIdはLocal側で最終確定しない
- classificationはLocal側の申告を信頼しない
- roleはLocal側の申告を権限判断に使用しない
- raw content全文を標準Payloadに含めない
- 原本ファイルを標準Payloadに含めない
- PC上の絶対パスを含めない
- 必要最小限のSemantic Dataを送信する
- Provenanceを失わない
- 将来のModule / Field追加に耐えられる構造とする

## 3. Trust Model

Payload受信時点のデータは
Untrusted Inputとして扱う。

概念:

Local Connector
→ Untrusted Payload
→ Server Trust Boundary
→ Connector Verification
→ facilityId Resolution
→ Resident Matching
→ Classification Resolution
→ Storage Policy
→ Trusted Common Data

Local側の値と
Server確定値を同じ意味で扱わない。

## 4. Top-level Envelope

最小Envelope候補:

{
  "protocolVersion": "0.1",
  "connectorId": "...",
  "requestId": "...",
  "sentAt": "...",
  "documents": []
}

各Field:

protocolVersion
- Payload形式のversion
- Localが設定する
- Serverが対応versionか検証する

connectorId
- Connector Identity
- Localが送信する
- 認証そのものではない
- Server登録とCredential検証が必要

requestId
- 送信単位の識別子
- 再送・監査・追跡への利用を想定する

sentAt
- Local側送信時刻
- Server受信時刻とは分離する
- 権限判断の根拠にはしない

documents
- 1回の送信で扱うDocument配列

## 5. Authentication Boundary

Connector Credentialは必要だが、
Payload本文の業務データとは分離する。

具体的な、

- Authorization方式
- token形式
- request signing
- credential rotation

はv0.1では固定しない。

connectorId単独を
認証情報として扱ってはならない。

CredentialをPayloadログや
業務監査ログへ保存しない。

## 6. Document Structure

概念:

{
  "source": {
    "sourceType": "excel",
    "documentType": "support_record",
    "documentTypeConfidence": "high",
    "sourceFile": "支援記録.xlsx",
    "sourceUpdatedAt": "...",
    "sourceHash": "...",
    "standardizedAt": "..."
  },
  "records": []
}

1 Documentに
0..N Recordsを許容できる構造とする。

## 7. Source Metadata

sourceType
- word
- excel
- 将来csv等を追加可能

documentType
- support_record
- individual_support_plan
- assessment
- monitoring
- other
- 将来追加可能

documentTypeConfidence
- 現在のDetector結果を保持する候補
- Server側のTrust判断とは別物

sourceFile
- 安全なファイル識別情報
- 絶対パスは禁止
- ファイル名自体に個人情報が含まれる可能性を考慮する

sourceUpdatedAt
- Source更新時刻
- Local観測値

sourceHash
- 将来の変更検知・重複検知・整合性確認候補
- 生成方式は別途定義する

standardizedAt
- RISEN Standard Document生成時刻

## 8. Record Structure

概念:

{
  "sourceResident": {
    "identifier": "...",
    "name": "..."
  },
  "module": "support",
  "semanticType": "supportContent",
  "value": "...",
  "provenance": {}
}

Recordは
Semantic Dataの最小単位を表現する。

1 Document内で
異なるsourceResidentを持つRecordを許容する。

これにより、
利用者一覧や複数利用者の支援記録等へ
将来対応できる構造とする。

## 9. Source Resident

概念:

{
  "identifier": "...",
  "name": "..."
}

identifier
- sourceResidentIdentifier
- Source側利用者識別値
- public.users.idではない

name
- sourceResidentName
- Matching補助情報
- nameだけで自動確定しない

将来候補:

- kana
- birthDate
- sourceSystem

Source Resident情報は
Internal Resident Identityとは分離する。

## 10. Internal Resident Identity

Local Payloadでは
internal residentIdを確定値として送信することを
基本としない。

Server Trust Boundaryで、

facilityId確定
→ Resident Matcher
→ matched

となった場合のみ、

residentId = public.users.id

としてTrusted Data側へ設定する。

needs_review / unmatchedでは、

residentId = null

を維持する。

## 11. Module

moduleは
Common Data Modelの業務領域を表す。

初期候補:

- resident
- support
- assessment
- plan
- monitoring
- family
- emergency
- medical
- contract
- service
- billing
- incident

Module一覧は
将来拡張可能とする。

未知ModuleをServerが
無条件に保存・AIKO利用してはならない。

## 12. Semantic Type

semanticTypeは
Module内の意味的Fieldを表す。

例:

support
- supportContent

plan
- wish
- longTermGoal
- supportMethod

semanticTypeは
表示名とは分離した安定keyを目指す。

施設独自Fieldについては
Facility Custom Field / Semantic Mapping設計と連携する。

## 13. Value

valueは抽出済みSemantic Valueを保持する。

v0.1では
文字列中心の実装から開始できるが、
将来的にData Typeを持てる構造を検討する。

候補:

- string
- number
- boolean
- date
- datetime
- code
- structured object

raw document全文を
valueとして格納することを基本としない。

## 14. Provenance

各Recordは
値の出所を追跡できる構造を目指す。

将来候補:

{
  "sourceLabel": "支援内容",
  "sourceLocation": "...",
  "extractionMethod": "exact_label",
  "mappingVersion": "...",
  "extractorVersion": "..."
}

v0.1では
すべてを必須にしない。

ただしSemantic Valueだけを保存して
出所が完全に分からなくなる構造は避ける。

絶対ファイルパスを
Provenanceへ含めない。

## 15. Multiple Residents

Payload Schemaは
1 Document = 1 Residentを前提としない。

例:

支援記録.xlsx

Record 1
- sourceResidentIdentifier: A001
- module: support
- supportContent: ...

Record 2
- sourceResidentIdentifier: A001
- module: support
- supportContent: ...

Record 3
- sourceResidentIdentifier: B002
- module: support
- supportContent: ...

v0.1のExtractor実装は
単純なDocumentから開始してよい。

Schemaの拡張余地と
初期実装範囲を分離する。

## 16. Multiple Records

同一Residentについても
1 Documentに複数Recordを許容する。

例:

- 複数日の支援記録
- 複数Episode
- 複数Monitoring項目
- 複数Service実績
- 複数Family Relationship

配列順だけを
Record Identityとして使用しない。

将来的にrecordIdまたは
Source Record Keyを検討する。

## 17. Facility Identity

facilityIdは
Local Connectorが確定する値ではない。

LocalがfacilityId相当の値を
将来Payloadへ含める場合でも、
Server側の権限判断では信頼しない。

Serverは、

connectorId
+
Connector Credential
+
Server-side Connector Registration

からfacilityIdを確定する。

## 18. Classification Boundary

Local Connectorが送信したclassificationを
Server側Access Decisionの根拠として信頼しない。

Classificationは原則としてServer側で、

- module
- semanticType
- Module Default Policy
- Field Override
- Facility Policy

等から解決する。

ClientまたはAIKOが
独自判断でClassificationを弱めてはならない。

## 19. Role and Purpose Boundary

roleは認証済みServer-side Identityから取得する。

Client自己申告roleだけで
アクセスを許可しない。

purposeはAIKO Access Policyで
利用する候補だが、
purpose自己申告だけで権限を拡大しない。

## 20. Trusted Server-side Data

Server Trust Boundary通過後は、
Payloadとは別にTrusted Contextを構築する。

概念:

{
  "facilityId": "...",
  "residentId": "...",
  "matchStatus": "matched",
  "matchMethod": "...",
  "classification": "C2",
  "serverReceivedAt": "...",
  "policyVersion": "..."
}

このTrusted Contextは
Local Payloadの自己申告値を
単純コピーしたものではない。

Server側検証・照合・Policy判断の結果として生成する。

## 21. Storage Boundary

保存対象は、

Untrusted Payload
=
そのままSupabase保存

とはしない。

Server側で、

- Connector検証
- facilityId確定
- Resident Matching
- Module / Field検証
- Classification Resolution
- Storage Policy

を通した後に
保存可否を判断する。

needs_review / unmatchedは
確定Residentデータと分離する。

## 22. AIKO Boundary

Supabaseへ保存された情報を
そのまま全件AIKOへ提供しない。

AIKO利用時には、

- authenticated user
- facilityId
- residentId
- role
- purpose
- module
- semanticType
- classification
- Facility Policy

等をServer側で評価する。

許可された最小限のFieldだけを
AIKOへ提供する。

## 23. Minimum Required Fields

v0.1 Payloadで
最小必須候補とする。

Envelope:
- protocolVersion
- connectorId
- requestId
- sentAt
- documents

Document:
- source.sourceType
- source.documentType
- source.sourceFile
- source.sourceUpdatedAt
- records

Record:
- module
- semanticType
- value

Resident-scoped Record:
- sourceResident.identifier または sourceResident.name

Residentに直接ひも付かないRecordを
将来扱う場合は、
Module Policyで明示的に許可する。

Resident-scoped Recordで
Source Resident Identityを取得できない場合は、
確定Residentデータとして無条件に保存せず、
別途Policyに従って安全に扱う。

## 24. Optional Fields

初期Optional候補:

- documentTypeConfidence
- sourceHash
- standardizedAt
- sourceResident.name
- provenance.sourceLabel
- provenance.sourceLocation
- provenance.extractionMethod
- provenance.mappingVersion
- provenance.extractorVersion

Optionalであることと
重要でないことは同義ではない。

実装成熟に伴い
Requiredへ変更する可能性がある。

## 25. Example Minimum Payload

{
  "protocolVersion": "0.1",
  "connectorId": "connector-example",
  "requestId": "request-example",
  "sentAt": "2026-09-04T10:00:00+09:00",
  "documents": [
    {
      "source": {
        "sourceType": "excel",
        "documentType": "support_record",
        "sourceFile": "支援記録.xlsx",
        "sourceUpdatedAt": "2026-09-04T09:30:00+09:00"
      },
      "records": [
        {
          "sourceResident": {
            "identifier": "A001",
            "name": "例示利用者"
          },
          "module": "support",
          "semanticType": "supportContent",
          "value": "例示データ",
          "provenance": {
            "sourceLabel": "支援内容"
          }
        }
      ]
    }
  ]
}

この値は説明用であり、
実在利用者情報ではない。

## 26. Explicitly Excluded from Standard Payload

v0.1の標準Payloadから
原則除外する。

- PC上の絶対ファイルパス
- 参照フォルダ全体情報
- Word / Excel原本
- raw content全文
- Supabase service_role key
- DB password
- 不要なConnector Credential複製
- Localが確定したと主張するresidentId
- Localが確定したと主張するfacilityId
- Localが弱めたclassification
- Local自己申告roleを権限確定値として扱う情報

## 27. Validation

Server側では少なくとも、

- protocolVersion
- Payload size
- documents count
- records count
- Field length
- allowed sourceType
- known / allowed module
- known / allowed semanticType
- value type
- malformed input

等を検証する。

未知値を
無条件に保存するFail-open設計を避ける。

具体的上限値は
実データ確認後に決定する。

## 28. Versioning

protocolVersionを使用して
Payload互換性を管理する。

将来Field追加時は
既存Connectorを可能な限り破壊しない。

破壊的変更が必要な場合は
明示的なversion変更を行う。

Server側は
対応していないversionを
黙って別versionとして解釈しない。

## 29. v0.1で固定しないこと

- HTTP endpoint
- JSON Schema Draft version
- Credential方式
- request signing
- Payload size上限
- records件数上限
- 詳細Data Type
- recordId形式
- Source Record Key形式
- Facility Custom Fieldの最終表現
- Supabase table schema
- Storage Policy詳細
- AIKO Access Policy詳細

## 30. 次の設計・実装課題

1. Resident Matcher request / response
2. Storage Policy
3. AIKO Access Policy
4. sourceHash / change detection
5. Record Identity / idempotency
6. Facility Custom Field Payload
7. Audit Event Model
8. Server Trust Boundary実装方式
