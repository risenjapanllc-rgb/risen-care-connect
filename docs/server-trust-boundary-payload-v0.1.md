# RISEN CARE Server Trust Boundary Payload v0.1

## 1. 目的

Local Connector / RISEN CARE Connectから
RISEN CARE Server Trust Boundaryへ送信するデータの
基本構造と安全境界を定義する。

本設計では次の3つを明確に分離する。

1. Serverへ送信してよい情報
2. RISEN CAREへ保存してよい情報
3. AIKOが利用してよい情報

送信可能であることは、
保存可能またはAIKO利用可能であることを意味しない。

## 2. 基本原則

- 必要最小限の情報のみ送信する
- facilityIdをClient側の自己申告だけで確定しない
- residentIdをLocal Connectorで最終確定しない
- Connector CredentialをServer側で検証する
- Server側登録情報からfacilityIdを確定する
- Resident Matcherを経てresidentIdを確定する
- 絶対ファイルパスを送信しない
- Supabase service_role keyを施設PCへ配置しない
- 原本ファイルをv0.1の標準Payloadに含めない
- raw content全文をv0.1の標準Payloadに含めない
- Module追加に対応できるPayload構造とする
- 保存境界とAIKO利用境界を分離する

## 3. Three Boundaries

### Boundary 1: Transmission

Local側からServerへ送信してよいかを判断する。

対象候補:

- Connector認証情報
- request metadata
- source metadata
- Source Resident Identity
- 抽出済みSemantic Data
- Domain情報

### Boundary 2: Storage

Server側で検証・変換した情報を
RISEN CARE / Supabaseへ保存してよいかを判断する。

Transmissionを通過したデータを
無条件に保存しない。

### Boundary 3: AIKO Access

保存済み情報のうち、
今回のAIKO処理で利用してよい情報だけを選択する。

RISEN CAREに保存されている
=
AIKOが利用可能

とはしない。

## 4. Payload Structure

Payloadは巨大な固定schema一つではなく、
Envelope + Domain Recordsを基本とする。

概念例:

Envelope
- protocolVersion
- connectorId
- requestId
- sentAt
- source
- sourceResident
- records

records
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
- future modules

Module一覧は閉じた固定一覧としない。

## 5. Envelope

Envelopeは送信単位に共通する情報を持つ。

候補:

- protocolVersion
- connectorId
- requestId
- sentAt

Connector Credentialは必要になるが、
具体的なHTTP認証方式やPayload内配置は
v0.1では固定しない。

Credentialをログへ記録してはならない。

## 6. Facility Identity

ClientがfacilityIdを送信する設計を
将来採用する場合でも、
その値を権限判断の根拠として信頼しない。

Server Trust Boundaryは、

connectorId
+
Connector Credential
+
Server側Connector登録

を検証し、
Server側登録情報からfacilityIdを確定する。

確定したfacilityIdを
Resident Matcherおよび保存境界で使用する。

## 7. Source Metadata

送信候補:

- sourceType
- documentType
- documentTypeConfidence
- sourceFile
- sourceUpdatedAt
- sourceHash
- standardizedAt

sourceFileはファイル名等の安全な識別情報とし、
PC上の絶対パスを送信しない。

sourceHashは
変更検知・重複検知・追跡等への利用を想定する。

## 8. Source Resident Identity

送信候補:

- sourceResidentIdentifier
- sourceResidentName

将来候補:

- sourceResidentKana
- sourceBirthDate

これらはSource Identityであり、
内部residentIdではない。

Local Connectorのlegacy residentIdを
Supabase resident_idとして扱ってはならない。

## 9. Resident Matching

Server側でfacilityIdを確定した後、
Resident Matcherを実行する。

結果:

### matched

- residentId = public.users.id
- 通常のDomain処理へ進める

### needs_review

- residentId = null
- 候補を確定値として扱わない
- 安全保留する

### unmatched

- residentId = null
- 安全保留する
- 後から確認・登録・Mappingできる余地を残す

## 10. Domain Records

recordsは業務領域ごとに分離する。

例:

support
- supportContent

plan
- wish
- longTermGoal
- supportMethod

将来的に:

family
emergency
medical
contract
service
billing
incident

同じSemantic Fieldでも
documentTypeやProvenanceを失わない構造を目指す。

## 11. Raw Content Boundary

Word / Excelから抽出したraw contentには
個人情報・機微情報が広く含まれる可能性がある。

そのためv0.1では、
raw content全文を標準Payloadとして
Serverへ送信しないことを基本とする。

必要になった場合は、

- 利用目的
- 必要範囲
- 権限
- 保存期間
- 監査
- AIKO利用可否

を別途設計してから扱う。

## 12. Storage Policy

Server Trust Boundaryは
受信した情報を無条件にSupabaseへ保存しない。

保存判断では将来的に次を考慮する。

- facility
- module
- data type
- resident match status
- source provenance
- server-side policy
- retention policy

needs_review / unmatchedデータは
確定Residentデータと分離して扱う。

## 13. AIKO Access Boundary

AIKOへの情報提供は
Storage Policyとは独立して判断する。

将来的な判断要素候補:

- facilityId
- authenticated user
- role
- residentId
- module
- purpose
- data sensitivity
- facility policy

AIKOが必要と判断しただけで
アクセス権限を拡大してはならない。

アクセス可否はServer側で決定する。

## 14. Sensitive Modules

特に次のModuleは
AIKO利用範囲を慎重に制御する。

- Family / Related Person
- Emergency
- Medical
- Contract
- Billing

例:

緊急連絡先をRISEN CAREに保存していても、
通常の支援振り返りで
電話番号そのものをAIKOへ提供する必要はない場合がある。

## 15. AIKO Retrieval

基本概念:

Supabase / Common Data Model
→ Server-side Access Policy
→ Authorized Retrieval
→ AIKO

AIKOへ全データを渡してから
AIKO自身に選別させる構造を基本としない。

Server側で許可された情報だけを
AIKOへ提供する。

## 16. Audit

将来的に次の監査情報を検討する。

- connectorId
- requestId
- facilityId
- residentId
- module
- action
- result
- timestamp

AIKOについても将来的に、

- 誰が利用したか
- どのResidentを対象にしたか
- どのModuleへアクセスしたか
- 何の目的だったか

を追跡できる構造を検討する。

Credentialや不要な機微情報を
監査ログへ保存しない。

## 17. Example Conceptual Payload

概念例:

{
  protocolVersion,
  connectorId,
  requestId,
  sentAt,
  source: {
    sourceType,
    documentType,
    sourceFile,
    sourceUpdatedAt,
    sourceHash
  },
  sourceResident: {
    identifier,
    name
  },
  records: [
    {
      module,
      semanticType,
      value,
      provenance
    }
  ]
}

これは概念モデルであり、
v0.1時点の確定API schemaではない。

facilityIdやresidentIdを
Local側の確定値としてPayloadへ埋め込むことを前提としない。

## 18. Versioning

PayloadにはprotocolVersionを持たせ、
将来の追加変更に対応できる構造を目指す。

新しいModuleやFieldを追加しても、
既存Connectorを可能な限り破壊しない。

Server側では
未知Field / 未知Moduleの扱いを
明示的に定義する。

## 19. v0.1で固定しないこと

- HTTP endpoint
- Connector Credential方式
- token形式
- request signing方式
- 詳細JSON Schema
- Supabase保存table
- retention期間
- AIKO role定義
- 全Moduleの送信可否
- raw contentの将来利用方式

## 20. 次の設計・実装課題

1. Payload最小JSON Schema
2. Resident Matcher request / response
3. sourceHash生成と変更検知
4. Storage Policy
5. AIKO Access Policy
6. Module別Data Classification
7. Audit Event Model
8. Connector認証方式
