# RISEN Standard Document → Common Data Model Mapping v0.1

## 1. 目的

Local ConnectorがWord / Excel等から生成する
RISEN Standard Documentと、
RISEN CARE Common Data Modelの関係を定義する。

この文書では、
Local Connectorが抽出した値をそのまま内部確定値として扱わず、
Source Identity・Provenance・Semantic Data・Internal Identityを分離する。

## 2. 基本原則

- sourceResidentIdentifierとresidentIdを別物として扱う
- Local ConnectorはfacilityIdを最終確定しない
- Local ConnectorはSupabase内部residentIdを最終確定しない
- facilityIdはServer Trust Boundaryで確定する
- residentIdはResident Matcherを経て確定する
- 元データの出所を可能な限り追跡できるようにする
- AIKOが提示する情報は可能な範囲で根拠へ遡れる構造を目指す
- 抽出値と人が確認した確定値を将来的に区別できる構造を目指す

## 3. 全体フロー

Word / Excel
→ Local Connector
→ Reader
→ Document Type Detection
→ Document Normalization
→ Semantic Extraction
→ RISEN Standard Document
→ RISEN CARE Connect
→ RISEN CARE Server Trust Boundary
→ facilityId確定
→ Resident Matcher
→ residentId確定
→ Common Data Model
→ Supabase
→ AIKO

## 4. Identity Mapping

### 4.1 sourceResidentIdentifier

RISEN Standard Document:

- sourceResidentIdentifier

意味:

元帳票に記載された利用者番号・利用者ID等。

Common Data Model上では
Source Identityとして扱う。

この値をSupabase public.users.idとして直接保存してはならない。

### 4.2 sourceResidentName

RISEN Standard Document:

- sourceResidentName

意味:

元帳票に記載された利用者名。

Resident Matcherの補助情報として使用できるが、
名前だけで自動的にresidentIdを確定しない。

### 4.3 residentId

residentIdは
RISEN CARE内部で利用する利用者Identityを意味する。

Local Connectorが抽出した
「利用者ID」等をresidentIdとして最終確定してはならない。

基本フロー:

sourceResidentIdentifier
+ sourceResidentName
+ Server側で確定したfacilityId
→ Resident Matcher
→ public.users
→ residentId

matchedの場合のみresidentIdを確定する。

needs_review / unmatchedの場合は
residentIdをnullのまま扱える構造とする。

## 5. Provenance Mapping

現在のRISEN Standard Documentから
次の情報をProvenanceとして扱う。

- sourceType
- documentType
- documentTypeConfidence
- source.fileName
- source.updatedAt
- standardizedAt

将来的な候補:

- sourceHash
- sourceLabel
- sourceLocation
- extractionMethod
- mappingVersion
- extractorVersion

元ファイルの絶対パスは
外部データモデルへ露出しない。

## 6. Semantic Mapping

現在抽出できている主なSemantic Fieldと
Common Data Model上の候補を次のように整理する。

### wish

意味:

本人の希望。

候補Module:

- Assessment
- Plan

documentTypeや出所を保持し、
単純にPlan専用フィールドへ固定しない。

### longTermGoal

意味:

長期目標。

候補Module:

- Plan

### supportMethod

意味:

計画された支援方法。

候補Module:

- Plan

### supportContent

意味:

実際に記録された支援内容。

候補Module:

- Support

Plan上の支援方法と
実施記録上の支援内容を同一フィールドとして扱わない。

## 7. Document Context

同じSemantic Fieldでも、
元のdocumentTypeによって意味や役割が異なる場合がある。

例:

「本人の希望」

Assessment文書
→ アセスメント時点の本人意向

Individual Support Plan
→ 計画策定時に記載された本人意向

この差を失わないため、
Semantic ValueだけでなくDocument Contextを保持する。

## 8. Provenance付きValue

将来的には、
Semantic Value単体ではなく
次のような情報と関連づけられる構造を目指す。

例:

value
sourceDocument
sourceLabel
sourceLocation
extractionMethod
mappingVersion
extractorVersion

これによりAIKOが情報を提示した際、
元資料や抽出根拠を確認できるようにする。

## 9. AIKOへの接続

AIKOはCommon Data Model上の情報を利用する。

ただし、

RISEN CAREに保存されている
=
AIKOが常にアクセスできる

とはしない。

AIKOの検索・提示対象は、
facilityId・residentId・Module・役割・利用目的等に基づき
Server側で制御する。

AIKOは元帳票から抽出された情報について、
可能な範囲で出所を提示できる構造を目指す。

## 10. LocalとServerの責務分離

### Local Connector

- 許可されたフォルダのみ参照
- Word / Excel等を読み取る
- documentTypeを推定する
- RISEN Standard Documentへ標準化する
- sourceResidentIdentifier等を抽出する
- facilityIdを最終確定しない
- residentIdを最終確定しない

### RISEN CARE Server Trust Boundary

- Connector Identityを検証する
- Connector登録情報からfacilityIdを確定する
- Resident Matcherを実行する
- residentIdを確定する
- 権限・Module・利用目的を検証する
- Supabaseへの保存境界を管理する

## 11. 既存residentIdフィールドの扱い

現在のDocumentSemanticExtractorには
互換性上residentIdが存在する。

このresidentIdは
元帳票の「利用者ID」由来であり、
RISEN CARE内部residentIdと同一とは保証されない。

v0.1では即時削除しない。

今後はsourceResidentIdentifierへ移行し、
内部residentIdとの混同が起きないことを確認した上で
legacy residentIdの廃止を検討する。

## 12. v0.1で固定しないこと

- Common Data Modelの詳細DB schema
- Supabase migration
- Resident Matcher実装
- Connector認証方式
- provenance用テーブル構造
- AIKOの最終権限モデル
- 全Semantic FieldのModule分類
- 自動確定のconfidence仕様

## 13. 次の設計・実装課題

1. Resident Core最小schema
2. Server Trust Boundaryへの送信payload
3. Resident Matcher request / response
4. sourceHashによる変更検知
5. provenance保存方式
6. extractionMethod / mappingVersion管理
7. Localに残すraw contentとServerへ送る情報の境界
