# RISEN CARE Record Identity / Idempotency v0.1

## 1. 目的

既存Word / Excelを施設職員が通常どおり編集しながら、
RISEN CAREへ繰り返し同期しても、

- 二重登録しない
- 新規Recordを識別する
- 既存Recordの変更を識別する
- Record消失を即削除しない
- 誤った利用者への紐付けを避ける
- 変更履歴と出所を追跡できる

ためのIdentity / Idempotency原則を定義する。

## 2. 基本原則

次の概念を分離する。

- Document Identity
- Source Record Identity
- Content Identity
- Server-side Record Identity
- Version Identity
- Resident Identity

1つのHashやファイル名だけで
すべてのIdentityを表現しない。

Local ConnectorのIdentity情報を
Server側の最終Identityとして無条件に信頼しない。

## 3. 想定する現場変更

既存Word / Excelでは、

- 行追加
- 行削除
- 行並び替え
- セル移動
- 文言修正
- 段落追加
- 同一ファイル名での継続更新
- ファイル名変更
- ファイルコピー
- 帳票形式変更

等が発生し得る。

したがって、

行番号
セル位置
段落番号
ファイル名
内容Hash

のいずれか1つだけを
永続Identityとして使用しない。

## 4. Identity Layers

概念:

Document
  -> documentKey

Logical Record
  -> sourceRecordKey

Record Content
  -> contentHash

Server Record
  -> recordId

Record Version
  -> versionId

Resident
  -> residentId

それぞれ役割を分離する。

## 5. Document Identity

documentKeyは
同じSource Document系列を追跡するための識別子候補。

ただしファイル名だけを
documentKeyとしない。

将来候補:

- connectorId
- sourceType
- safe source relative identity
- Local生成Document Identity
- registration metadata

絶対パスをServerへ送信しない。

ファイル名変更・移動・コピーを
どう扱うかは別途Policy化する。

## Document Identity Rules

### 1. Source Document IdentityとServer Document Identity

`sourceDocumentKey`とServer-side `documentId`は分離する。

`sourceDocumentKey`は、Local ConnectorがSource Documentを継続観測するためのLocal observation identityとする。

`documentId`は、Server側で生成・管理・resolveするRISEN内部Document Identityとする。

`sourceDocumentKey`をServer authorityとして単独利用しない。client supplied `documentId`は受け入れない。

### 2. Trusted Observation Lookup Scope

次の3値はdocumentIdの決定論的な生成式ではなく、Server-side Document Identityをlookup・resolveするためのtrusted observation scopeとする。

```text
verified facilityId
+ verified connectorId
+ validated sourceDocumentKey
```

Serverは、このscopeとserver-side document historyを使って既存の`documentId`との関連を解決する。3値から決定論的に`documentId`を生成するとは扱わない。

`verified facilityId`はConnector Trustがregistrationから確定した値、`verified connectorId`は同じTrust結果に含まれる値、`validated sourceDocumentKey`はLocal observationとして受け取り形式・scope・historyを確認した値である。

### 3. sourceDocumentKeyの生成と保存

`sourceDocumentKey`はLocal Connectorが生成・永続化することを第一候補とする。

具体的な形式、UUID採用、Local registryの保存方式、registryのsecurity、backup、復元方式はTBDとする。

Local registryでは、必要に応じて次のLocal-only observation metadataを管理できる。

- sourceDocumentKey
- Local pathまたはrelative path
- file IDの観測値
- fileName
- size
- mtime
- sourceHash
- firstSeenAt / lastSeenAt

これらのLocal pathや内部metadataを、そのままServerへ送信しない。

### 4. sourceDocumentKeyに直接使わない値

次を単独で`sourceDocumentKey`にしない。

- filename
- absolute path
- relativePath
- mtime
- sourceHash
- contentHash
- residentId

absolute pathはServerへ送らない。relativePathもPIIや施設内部構造を含む可能性があるため、v0.1ではLocal-only observation metadataの第一候補とする。

filenameはrename、copy、delete後のrecreate、同名置換、別業務Documentを区別できない。

`sourceHash`はLocalが読んだ原本Word / Excel byteの観測hash候補であり、`contentHash`はcanonical semantic contentの同一性hash候補である。どちらもDocument Identityそのものではない。

原本をServerへ送らないため、Serverが`sourceHash`を原本byteから独立再計算できるとは仮定しない。Hashは暗号化、認証、権限、匿名化の代替ではない。

### 5. Windows file ID / filesystem identity

Windows file IDやfilesystem identityは、Localでの再発見、rename、folder moveの検出を補助する候補とする。

次の理由から、単独の永続identityやServer authorityにはしない。

- Volumeやfilesystemを跨ぐと安定しない可能性がある
- copyでは別file IDになる
- delete後のrecreateでは別file IDになる
- network/shared folderではSMB serverやfilesystem依存になる
- backup、同期、移行、再登録で変化する可能性がある

Connector再起動後も安定させる主たる手段はLocal registryの永続化とし、file IDは補助情報として扱う。

### 6. File Operation Rules

| 操作 | 第一候補 | 注意 |
|---|---|---|
| same file / rescan | same sourceDocumentKey | Local registryが同じObservationを再発見し、Server contextも整合する場合 |
| same file / content update | same sourceDocumentKey | 変更はsourceHash / contentHashと将来のVersion側で扱う |
| rename | TBD | 安全に継続観測できる場合のみsame候補。filenameだけでは判断しない |
| folder内move | TBD | 安全に継続観測できる場合のみsame候補。filesystem境界を跨ぐ場合は特にTBD |
| copy | new sourceDocumentKey | 内容同一でも新しいLocal observationとして扱う第一候補 |
| delete → recreate | new sourceDocumentKey | 同名・同内容・同mtimeでも旧Document系列に自動接続しない |
| same-name replacement | newまたはCONFLICT | 自動接続しない。file ID、history、完全観測を確認して別途判断 |
| Connector restart | same sourceDocumentKey | Local registryが維持されている場合 |
| Connector reinstall | TBD | registry復元、再登録、再発行の方式が未確定 |
| same facility / different connector | TBD | v0.1ではcross-connector automatic mergeを行わない |
| different facility | new scope | cross-facility automatic mergeを禁止する |
| network/shared folder | TBD | file ID、同時編集、SMB、接続断、複数Connectorの扱いが未確定 |

### 7. sourceDocumentKey Collision

同じ`sourceDocumentKey`を複数Documentまたは複数scopeが主張した場合、自動mergeしない。

次を確認する。

- verified connector context
- verified facility scope
- sourceDocumentKeyの形式・長さ
- server-side document history
- file ID、path、hash等のLocal observation
- Document context

解消できない場合は`CONFLICT`またはserver-side review候補とする。具体的なerror、review、再発行、既存Documentとの接続方法はTBDとする。

推測困難なopaque値にすることは推奨するが、推測困難性は認証や認可の代わりではない。

### 8. documentIdのscopeとcross-connector境界

Server-side `documentId`は、少なくとも次のscopeとhistoryに基づいてresolveする。

```text
verified facilityId
+ verified connectorId
+ validated sourceDocumentKey
+ server-side document history
```

このscopeをglobal keyとして公開しない。client supplied `documentId`を採用しない。

同じfacilityの別PC・別Connectorが同じ共有ファイルを読む場合も、v0.1ではcross-connector automatic mergeを行わない。同じ物理Documentの二重観測か別Documentか、Connectorごとの履歴をどう統合するかが未確定だからである。

異なるfacilityでは、同じ`sourceHash`または`contentHash`でもDocumentを統合しない。

```text
same hash != same facility data
```

### 9. Network / Shared Folder

network/shared folderのidentity resolutionはTBDとする。

少なくとも次を考慮する。

- SMB serverごとのfile ID仕様
- 接続断と再接続
- 同時編集とlock
- rename / move通知
- mtime精度
- cache
- read中の置換
- 複数Connectorの同時scan
- share権限変更

Local側でsourceDocumentKeyを永続化し、`stat before -> read -> sourceHash -> stat after`を候補とする。不完全な観測を正常Documentとして確定しない。

### 10. TOCTOU / Document Observation

Document identity判定の前に、Source Documentを正常かつ十分に観測できたかを評価する。

```text
stat before
→ read
→ sourceHash
→ stat after
→ observation status
```

読取中にsize、mtime、file ID等が変化した場合、またはreadが部分成功・失敗した場合は、正常同期として確定しない。

候補statusは次のとおりとするが、名称はTBDとする。

- COMPLETE
- PARTIAL
- FAILED
- CHANGED_DURING_READ

retry回数、backoff、skip、次回scan、missingとの関係はTBDとする。完全なDocument Observationがない場合、Record欠落を削除や`MISSING_CANDIDATE`と解釈しない。

### 11. Resident Identity / Storageとの分離

Document IdentityとResident Identityを分離する。

- Resident Matching前後で`documentId`を変更しない
- `residentId`をDocument Identityやdedup keyにしない
- sourceRecordKeyとresidentIdを同じidentityとして扱わない
- `matched`を保存成功とみなさない

```text
same document
!=
storage success
!=
resident matched
!=
AIKO accessible
```

`matched`は現在のserver-side matching contract上のresident associationであり、Storage Policy、Record Identity Resolution、Classification、Retentionを通過した保存成功とは別である。

### 12. Connector Responseとの分離

Document IdentityとConnector Response identifierを分離する。

Connector Responseは次の最小形を第一候補とする。

```javascript
{
  requestId,
  status
}
```

`documentId`をConnectorへ返すかはTBDとする。返す場合も、`requestId`、idempotency key、`ingestionId`、`operationId`、`residentId`とは別概念のserver-side identifierとして扱う。

### 13. v0.1の境界

v0.1では次を確定する。

- `sourceDocumentKey`とserver-side `documentId`を分離する
- sourceDocumentKeyはLocal observation identityとする
- documentIdはServer側で生成・管理・resolveする
- `verified facilityId + verified connectorId + validated sourceDocumentKey`はlookup scopeであり、決定論的な生成式ではない
- client supplied documentIdを受け入れない
- absolute pathをServerへ送らない
- filename、mtime、sourceHash、contentHash、residentIdを単独のDocument Identityにしない
- sourceHashとcontentHashを分離する
- Windows file IDを補助情報に限定する
- cross-connector automatic mergeを行わない
- cross-facility automatic mergeを禁止する
- TOCTOU不完全観測を正常Documentとして確定しない
- 原本はLocalに残し、raw document全文をServerへ送らない
- AIでDocument Identityを判定しない

### 14. TBD

- sourceDocumentKey具体形式
- UUID採用
- Local registry保存方式、security、backup、復元
- Connector reinstall時のregistry復元・再登録・再発行
- rename / folder move detection
- Windows file ID取得方式とfilesystem差異
- network/shared folder identity
- sourceDocumentKey collision処理
- sourceHash algorithm / version / 対象byte
- contentHash canonical input / version
- documentId生成・保存・scope・TTL
- cross-connector future merge
- same-name replacementの再接続可否
- delete → recreateの再接続可否
- TOCTOU observation status、retry回数、backoff
- missing / delete policy
- Payload identity field追加時期
- Connector ResponseへのdocumentId / ingestionId / operationId公開


## 6. Source Record Identity

sourceRecordKeyは
Source Document内の論理Recordを識別するためのkey。

例:

支援記録:
- source resident identifier
- record date/time
- source-side record number
- record category

Service実績:
- source resident identifier
- service date
- service type
- source-side stable identifier

Family:
- source resident identifier
- relationship type
- source-side stable identifier

帳票ごとに
安定して取得できるFieldが異なるため、
単一の固定ルールにはしない。

Document / Form Mappingと連携できる構造を目指す。

## 7. Position Information

行番号、
セル位置、
段落番号等は
Provenanceとして有用である。

しかし原則として
それ単独をsourceRecordKeyにしない。

行追加や並び替えによって
同じRecordの位置が変化するためである。

## 8. Content Hash

contentHashは
Record内容が変化したかを確認するために使用する。

Identityそのものとは分離する。

概念:

same sourceRecordKey
+
same contentHash
=
同一内容の再送候補

same sourceRecordKey
+
different contentHash
=
既存Record更新候補

contentHash生成前に
どのSemantic Fieldを
どの順序・形式で正規化するかを定義する必要がある。

Hash algorithmは別途定義する。

## 9. Source File Hash

sourceHashは
Source Document全体の変更検知に使用する候補。

例:

same documentKey
+
same sourceHash
=
Document全体に変更なし候補

same documentKey
+
different sourceHash
=
Document内に何らかの変更あり候補

ただしsourceHashだけでは、

- どのRecordが変更されたか
- 新規Recordか
- 既存Record更新か
- Recordが消えたか

を確定できない。

## 10. Source Updated At

sourceUpdatedAtは
変更検知の補助情報として使用する。

mtimeだけを
Record Identityや変更確定の唯一の根拠にしない。

ファイルコピーやツール動作等により
時刻だけが変化する可能性を考慮する。

## 11. Server-side Record Identity

recordIdは
RISEN CARE Server側で管理する
内部Record Identityとする。

Local Connectorが
recordIdを新規確定しない。

概念:

recordId
- Server-generated internal ID
- Common Data Model内RecordのIdentity

既存Recordとの対応は
Server側Identity Resolutionによって判断する。

## 12. Version Identity

Record内容が変更された場合、
同じrecordIdの新しいVersionとして
扱える構造を目指す。

概念:

recordId
  -> versionId 1
  -> versionId 2
  -> versionId 3

過去内容を
無条件に上書きして消さない設計を検討する。

特にBilling、
Contract、
Incident等では
監査可能性を重視する。

## 13. Resident Identityとの分離

sourceRecordKeyに
sourceResidentIdentifierが含まれていても、
それはinternal residentIdではない。

Server Trust Boundaryで、

connector verification
-> facilityId
-> Resident Matcher
-> residentId

を確定する。

Record Identity Resolutionと
Resident Identity Resolutionを
同一処理として混同しない。

## 14. Idempotency States

Server側で少なくとも
次の状態を区別できる構造を目指す。

NEW
- 未知の論理Record
- 新規登録候補

UNCHANGED
- 同一Record
- 同一内容
- 再送または変更なし候補

UPDATED
- 同一Record
- 内容変更あり
- 新Version候補

MISSING_CANDIDATE
- 前回存在したRecordが
  今回Sourceから確認できない
- 即削除しない

CONFLICT
- 同一Identity候補が複数存在する
- Identity判定が曖昧
- 自動確定しない

## 15. NEW

NEW判定は
単にcontentHashが新しいことだけを
根拠にしない。

sourceRecordKey、
Document context、
Resident Matching結果等を
Server側で評価する。

## 16. UNCHANGED

概念:

same trusted document context
+
same resolved sourceRecordKey
+
same contentHash

の場合、
UNCHANGED候補とする。

同じPayloadが再送されても
新規Recordを増やさない。

requestIdは送信単位の追跡用であり、
業務Record Identityそのものではない。

## 17. UPDATED

概念:

same trusted document context
+
same resolved sourceRecordKey
+
different contentHash

の場合、
UPDATED候補とする。

更新時は、

- previous version
- new version
- detectedAt
- provenance

を将来追跡できる構造を目指す。

## 18. MISSING_CANDIDATE

SourceからRecordが見えなくなった場合でも
即削除しない。

理由:

- 一時的なファイル編集
- 行移動
- Sheet変更
- Mapping変更
- Extractor不具合
- 一時的な読取失敗
- ファイル差し替え

等があり得る。

したがって、

missing
!=
deleted

とする。

Server側では
MISSING_CANDIDATEとして扱う。

ただしMISSING_CANDIDATE判定は、
今回のSource Documentを
正常かつ十分に観測できたことを前提とする。

例えば、

- scan失敗
- read失敗
- extract失敗
- Mapping不成立
- 読取中変更
- 部分的なPayload
- 同期処理の中断

等がある場合は、
Recordが見つからないことだけを理由に
MISSING_CANDIDATEへ変更しない。

Document Observationが不完全な場合は、
Missing判定そのものを保留する。

## 19. Deletion

物理削除を
通常同期の自動処理にしない。

将来候補:

- active / inactive
- missingSince
- lastSeenAt
- deletionConfirmedAt
- deletionReason
- confirmedBy

必要に応じて
人による確認または明示的Policyを使用する。

Billing / Contract / Incident等では
履歴保持要件を別途検討する。

## 20. CONFLICT

次の場合は
CONFLICT候補とする。

- 同一sourceRecordKey候補が複数存在
- sourceRecordKey生成に必要なField不足
- 同一Identityに複数Resident候補
- Document Mapping変更でIdentityが曖昧
- CopyされたSourceが同一Identityを主張

CONFLICT時は
無理に自動統合しない。

候補情報を保持し、
Server PolicyまたはHuman Reviewへ渡す。

## 21. Multiple Residents

1 Documentに複数Residentが存在する場合、
各RecordのsourceResidentを使用する。

ただしsourceResidentは
Internal Resident Identityではない。

Recordを確定Residentへ保存する前に
Resident Matcherを通す。

Resident Matchingが
needs_review / unmatchedの場合、
確定Resident Recordとして
無条件に登録しない。

## 22. Word Documents

Wordでは
安定したSource Record Keyが
存在しない場合がある。

その場合、

- semantic section
- source label
- date/time
- resident source identity
- nearby structural context
- explicit facility mapping

等の組み合わせを検討する。

段落番号だけを
永続Identityにしない。

曖昧な場合は
自動確定よりCONFLICT / reviewを優先する。

## 23. Excel Documents

Excelでは
行単位Recordが比較的明確な場合がある。

ただし行番号だけを
永続Identityにしない。

可能なら、

- Source側ID列
- 利用者識別値
- 日付
- Record種別
- その他業務key

等を組み合わせる。

施設ごとの帳票差異は
Document / Form Mappingで吸収する。

## 24. Explicit Source Record ID

施設帳票に
既存の安定Record IDが存在する場合は
有力なsourceRecordKey候補とする。

ただしServer側では、

- facility boundary
- connector context
- document context
- duplicate
- malformed value

を検証する。

Source ID単独を
グローバルなServer recordIdとして扱わない。

## 25. Idempotency Key

HTTP request単位のIdempotencyと
業務Record単位のIdempotencyを分離する。

Request Idempotency:
- requestId
- 同一送信の再試行制御候補

Record Idempotency:
- trusted document context
- resolved sourceRecordKey
- contentHash

両者を同じkeyにしない。

## 26. Change Detection Flow

概念:

Local scan
-> sourceHash comparison
-> changed document candidate
-> extract records
-> resolve sourceRecordKey
-> calculate contentHash
-> send Payload
-> Server Trust Boundary
-> facilityId
-> Resident Matcher
-> Record Identity Resolution
-> NEW / UNCHANGED / UPDATED / MISSING_CANDIDATE / CONFLICT
-> Storage Policy

## 27. Local Connector Responsibility

Local Connectorは、

- Sourceを読む
- Safe metadataを取得する
- Semantic Dataを抽出する
- sourceHash候補を生成する
- sourceRecordKey候補を生成する
- contentHash候補を生成する
- Payloadを送る

ことを担当できる。

ただし、

- facilityId最終確定
- residentId最終確定
- Server recordId最終確定
- classification最終確定
- deletion最終確定

は行わない。

## 28. Server Trust Boundary Responsibility

Server側は、

- Connector検証
- facilityId確定
- Payload validation
- Resident Matching
- sourceRecordKey validation / resolution
- Record Identity Resolution
- Classification Resolution
- Storage Policy
- Version管理
- Conflict handling

を担当する。

Localから送られたIdentity候補を
無条件にTrusted Identityへ昇格しない。

## 29. Provenance

Identity判定後も
Sourceとの関係を追跡できるようにする。

将来候補:

- connectorId
- documentKey
- sourceFile
- sourceHash
- sourceRecordKey
- contentHash
- sourceUpdatedAt
- sourceLocation
- extractionMethod
- mappingVersion
- extractorVersion
- firstSeenAt
- lastSeenAt

絶対パスを
Server側Provenanceへ送信しない。

## 30. TOCTOU

Local Connectorが
File metadata取得後に
Source Fileが変更される可能性を考慮する。

将来、

stat
-> read
-> hash
-> stat

等によって
読取中変更を検出し、

変更された場合は
retryまたはskipする設計を検討する。

不整合な内容を
正常同期として確定しない。

## 31. Fail-safe Principle

Identity判定に十分な情報がない場合、

推測して統合する
より
review / conflictとして保持する

ことを優先する。

特にResident、
Billing、
Medical、
Emergency、
Incident等では
誤統合を避ける。

## 32. v0.1で固定しないこと

- documentKey最終生成方式
- sourceRecordKey最終生成方式
- Hash algorithm
- Canonicalization方式
- recordId形式
- versionId形式
- DB table schema
- Missing判定までの時間
- 削除確認フロー
- Conflict Review UI
- Mapping変更時のMigration
- Copy / Rename検知方式

## 33. 次の設計課題

- Canonical Hash / Change Detection
- Storage Policy
- AIKO Access Policy
- Resident Matcher request / response
- Explicit Resident Mapping
- Record Version Model
- Missing / Deletion Policy
- Conflict Review
- Audit Event Model
- Server Trust Boundary実装
