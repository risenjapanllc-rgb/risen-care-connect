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


## Source Record Identity Rules

### 1. Identityの分離

次のIdentityを別の概念として扱う。

- `sourceDocumentKey`: Source Document系列のLocal observation identity
- `sourceRecordKey`: Source側の論理Recordを継続観測するidentity候補
- `recordIdentityCandidate`: stable source IDがない場合に、同一Recordの可能性を評価する候補情報
- `recordId`: Server-side RISEN Record Identity
- `contentHash`: Record内容の同一性・変更検知候補
- `residentId`: Resident association

```text
sourceRecordKey != recordIdentityCandidate
sourceRecordKey != recordId
sourceRecordKey != contentHash
sourceRecordKey != residentId
```

### 2. Server-side Resolution

`sourceRecordKey`はLocal observationであり、Server authorityではない。client supplied `recordId`は受け入れない。

Serverは、次の情報とserver-side historyを組み合わせて`recordId`をresolveする。

```text
verified facility context
+ verified connector context
+ sourceDocumentKey
+ sourceRecordKeyまたはrecordIdentityCandidate
+ Document context
+ server-side history
```

この情報から決定論的に`recordId`を生成するとは扱わない。duplicate、collision、scope不一致、historyとの矛盾は自動統合せず、CONFLICTまたはreview候補とする。

### 3. Stable Source IDがある場合

Source側にstable record IDが存在する場合、それを`sourceRecordKey`の有力候補として利用する。

ただしstable source ID単独をglobal `recordId`として扱わない。Server側で少なくとも次を確認する。

- duplicate
- collision
- facility scope
- connector scope
- `sourceDocumentKey`
- Document context
- server-side history

Source側stable IDが同じでも、scopeやDocument contextが異なる場合は同一Recordと自動確定しない。

### 4. Stable Source IDがない場合

stable source IDが存在しないWord / Excelでは、複合フィールドから直ちに永続`sourceRecordKey`を生成しない。

次の情報はまず`recordIdentityCandidate`として扱う。

- source resident identity
- record date/time
- record type/category
- stable form context
- explicit source record number
- semantic section
- source-side structural identifier
- Form Mappingで定義されたidentity candidate fields

```text
recordIdentityCandidate != sourceRecordKey
```

候補を組み合わせても一意性が確認できない場合は、CONFLICTまたはreviewとする。

### 5. 永続Record Identityにしない単独情報

次を単独の永続Record Identityにしない。

- row number
- cell address
- paragraph number
- filename
- `contentHash`
- `residentId`
- record date/time
- resident + date/time
- resident + date/time + record type

### 6. Excel Record

- row insert / delete / sortによる位置変更だけではidentityを変更しない
- stable source IDが同じならsame `sourceRecordKey`候補とする
- row copyでstable IDまたは`recordIdentityCandidate`が重複した場合は自動mergeしない
- 1行1recordを前提にしない
- 複数行・複数cell RecordはForm Mappingでrecord boundaryを定義する方向とする

行位置が変わっても、stable source IDまたはServer側で解決済みのidentity候補が同じなら、同じRecord系列として扱う候補とする。位置情報だけが変わったことを理由に新Recordを作らない。

### 7. Word Record

- paragraph numberを永続identityにしない
- 段落追加・並び替えによる位置変更だけではidentityを変更しない
- copyでstable IDまたは`recordIdentityCandidate`が重複した場合は自動mergeしない
- Word内record boundaryはForm Mapping等で明示的に定義する方向とする

stableな識別情報がない場合、段落の位置や近接だけで既存Recordとの同一性を確定しない。

### 8. sourceRecordKeyとcontentHash

```text
same sourceRecordKey + same contentHash
=> UNCHANGED候補

same sourceRecordKey + different contentHash
=> UPDATED / new version候補

different sourceRecordKey + same contentHash
=> 同一Recordとは判断しない
```

`contentHash`だけでmergeしない。contentHashはRecord内容の変更検知候補であり、sourceRecordKeyやrecordIdの代替ではない。

### 9. sourceRecordKey Collision

sourceRecordKeyがcollisionした場合は自動mergeしない。CONFLICTまたはreview候補とする。

具体的なerror code、review状態、再発行方法、既存recordIdへの接続方法はTBDとする。

### 10. sourceRecordKey変更時

`sourceRecordKey`が変更された場合、既存`recordId`へ自動接続しない。

次の可能性があるため、別のServer-side Identity Resolution規則を必要とする。

- Mapping変更
- Source ID変更
- copy
- 新Record
- Document context変更
- collision解消または誤った再利用

### 11. MissingとDelete

```text
missing != delete
```

完全なDocument Observationが成立した場合のみ、Record欠落を`MISSING_CANDIDATE`候補とする。

次の場合はmissingを確定しない。

- scan failure
- read failure
- extract failure
- mapping failure
- TOCTOU
- partial observation
- network failure

物理delete、inactive化、missingからの復帰は、Storage Policyおよび別のDeletion Policyで扱う。

### 12. Facility Custom Form

Form Mappingは将来、少なくとも次を定義できる方向とする。

- record boundary
- stable source ID location if available
- identity candidate fields
- content fields
- source resident identity
- record date/time
- record type
- provenance location
- mapping version

具体的なForm Mapping schema、record boundaryの表現、custom fieldの許可範囲はTBDとする。

### 13. ProvenanceとSource Location

次はProvenance候補として利用できるが、単独の永続identityにはしない。

- row number
- cell address
- paragraph number
- sheet name
- source location

absolute path、Local usernameを含むpath、不要なraw document全文はServerへ送らない。source locationを送る場合のprivacy minimizationと保持期間は別途定義する。

### 14. AIとIdentity Resolution

AIでRecord Identity、dedup、mergeを決定しない。

将来AIを利用する場合も、候補整理やHuman Review補助までとする。identity resolutionそのものは、明示Rule、Server history、Policy、必要に応じたHuman Reviewで扱う。

### 15. Identity Chain

```text
sourceDocumentKey
  ↓
sourceRecordKey / recordIdentityCandidate
  ↓
server-side recordId
  ↓
versionId
```

`sourceDocumentKey`だけで`recordId`を決定しない。`residentId`はこのidentity chainとは別のResident associationである。

Resident Matching前後でDocument IdentityをRecord Identityへ置き換えない。`residentId`をRecord Identityやdedup keyに使用しない。

### 16. v0.1で確定する境界

- `sourceRecordKey`はLocal observationでありServer authorityではない
- stable source IDがある場合は`sourceRecordKey`の有力候補として扱う
- stable source IDがない場合は`recordIdentityCandidate`として扱う
- `recordIdentityCandidate`から直ちに永続`sourceRecordKey`を決定しない
- client supplied `recordId`を受け入れない
- filename、row number、cell address、paragraph number、hash、residentIdを単独identityにしない
- sourceRecordKey collision時に自動mergeしない
- sourceRecordKey変更時に既存recordIdへ自動接続しない
- missingをdeleteと同一視しない
- cross-document / cross-connectorの自動mergeを行わない
- cross-facilityの自動mergeを行わない
- recordId、versionId、idempotency keyの最終仕様は今回決めない
- Payload schemaは今回変更しない
- 原本はLocalに残し、raw document全文をServerへ送らない
- AIでRecord Identity、dedup、mergeを決定しない

### 17. TBD

- sourceRecordKey具体形式
- stable source ID許可形式
- `recordIdentityCandidate` schema
- Form Mapping schema
- record boundary
- sourceRecordKey collision処理
- sourceRecordKey変更時のrecordId再接続
- copy record処理
- missing/delete状態遷移
- Provenance schema
- source location privacy minimization
- Source Record IdentityをPayloadへ追加する時期
- contentHash algorithm / canonicalization version
- recordId / versionIdの生成・保存
- idempotency keyとの関係
- cross-document / cross-connector merge
- Human Review queue
- Storage Policy連携
- TOCTOU observation status / retry

## Record Identity Human Review Rules

### 1. Reviewの責務

Human ReviewはRISEN CARE Human Management側で行う。Connector側では行わない。

Connectorは送信・同期結果を受け取る主体であり、resident identityまたはRecord Identityの最終確認主体ではない。

### 2. reviewItemId

Review対象にはServer生成のopaqueな`reviewItemId`を使用する。

```text
reviewItemId != recordIdentityCandidate
reviewItemId != sourceRecordKey
reviewItemId != recordId
reviewItemId != versionId
reviewItemId != residentId
```

`reviewItemId`はHuman Review作業を追跡するidentityであり、Record Identityそのものではない。

`recordIdentityCandidate`を`reviewItemId`にしない。candidateはPII、source location、構造情報等を含む可能性があり、外部参照identityへ昇格させない。

### 3. Review開始候補

次の場合はRecord Identity Reviewを開始する候補とする。

- stable source IDがなく一意性を安全に解決できない
- sourceRecordKey collisionが発生した
- 1つのcandidateが複数Recordを指す
- Mapping変更後の対応が不明である
- copyによってidentity candidateが重複した
- sourceRecordKey変更後に既存recordIdへ接続できない
- resident associationが`needs_review`である
- Review中に新しいVersion候補が到着し関係が不明である

ただし、次はRecord Identity Reviewより先にObservation failureとして扱う。

- scan failure
- read failure
- extract failure
- partial observation
- TOCTOU
- network failure

観測自体が不完全な場合、Record Identityを推測してReview itemを作成したり、missingを確定したりしない。

### 4. Human Reviewの3操作

第一候補の判断操作は次の3つとする。

- 同じ記録
- 新しい記録
- 判断できない

「判断できない」は正式な状態として扱う。

#### 同じ記録

現在のServer-side identity resolutionにおいて、既存Recordとのassociationを成立させる判断候補とする。

永久・不可逆な同一性確定とはしない。保存成功、Resident Review完了、AIKO利用可能を意味しない。

#### 新しい記録

既存Recordとは別の論理Recordとして扱う判断候補とする。NEW候補であり、新しい`recordId`や`versionId`の具体生成規則は今回決めない。

新しいRecordと判断しても、保存許可やAIKO利用可能を意味しない。

#### 判断できない

`PENDING_REVIEW`または`CONFLICT`を維持する。

- recordIdへ自動接続しない
- AIKO通常利用へ投入しない
- 後続情報、Mapping変更、再Reviewを待つ
- Connector再送だけで`matched`へ昇格しない

### 5. Record Identity ReviewとResident Identity Review

次の2つのReviewを分離する。

```text
Record Identity Review
  = これは同じ論理Recordか

Resident Identity Review
  = どのresidentとのassociationか
```

片方の確定から、もう片方を自動確定しない。

- Recordが同じでもresident associationが未確定になり得る
- resident associationが成立してもRecord IdentityがCONFLICTになり得る
- `residentId`をRecord dedup keyにしない

### 6. Review画面の表示最小化

通常表示の第一候補は次の5項目とする。

- 利用者の確認用表示名
- 記録日時
- 記録種別
- semantic contentの短いpreview
- 出典の安全な表示名

通常表示には次を出さない第一候補とする。

- `residentId`
- `recordId`
- `versionId`
- credential
- facility内部ID
- absolute path
- raw document全文
- `sourceHash` / `contentHash`の生値

### 7. 詳しく確認

必要な権限を持つReviewerに限り、追加情報を表示する二段階UIを候補とする。

- source resident identifier
- 必要な利用者番号
- safe source document name
- sheet / section
- 最小限のsource location
- provenance
- candidate間の差分
- hash一致 / 不一致という比較結果
- observation状態
- review理由

具体UI、表示項目ごとのPII分類、表示権限はTBDとする。

原本はLocalに残す。Serverがraw originalを保持している前提にしない。「原本を確認」を将来実装する場合は、認証・認可されたHuman ManagementとLocal Connector間の別の安全な経路を設計する。

### 8. Review結果と訂正

Human Review結果は訂正可能にする。

少なくとも次をaudit可能にする方向とする。

- previous decision
- corrected decision
- reviewer
- decision time
- correction time
- correction reason
- previous association
- current association
- affected recordId / versionId候補

具体的なaudit schemaはTBDとする。

誤って「同じ記録」とした場合は、成立したassociationを訂正可能にする。誤って「新しい記録」とした場合も、単純mergeや履歴削除をせず、別のServer-side Identity Resolutionとして訂正する。

訂正前の履歴を無条件に消去しない。現在有効なassociationと過去の判断履歴を分離して保持する方向とする。

### 9. Review Queueの保守的dedup

同じpayload再送でreview itemを無制限に増やさない。ただし、`recordIdentityCandidate`の「equivalent」を曖昧な自動判定でreviewItem同一性へ昇格させない。

第一候補は、次がすべて整合し、確実に同一の再送と確認できる場合のみ既存reviewItemへobservationを追加する方式とする。

```text
same authenticated connector context
+ same verified facility scope
+ same sourceDocumentKey
+ same sourceRecordKeyまたは明示的に同一と検証された候補
+ same contentHash
+ compatible Document context
+ compatible observation state
```

同一らしいが確定できない場合は自動統合せず、既存Reviewとの関連候補またはCONFLICTとして扱う。別Recordを誤って統合することより、review itemが一時的に複数になることを優先する。

次だけではreview itemを統合しない。

- `contentHash`単独
- `recordIdentityCandidate`単独
- resident + date/time + type

review queue dedup keyの最終仕様、TTL、状態遷移はTBDとする。

### 10. AIKOとの境界

Review待ちRecordをAIKO通常利用へ自動投入しない。

AIは次を最終決定しない。

- 同じRecord
- 新しいRecord
- merge
- `recordId`
- `versionId`
- resident association

AIを将来利用する場合も、候補整理、差分表示、Review補助までとする。Review queueをAIKOから参照する場合は、Human Authorization、対象facility、action、purpose、Data Classificationを確認する別のServer-side経路が必要である。

### 11. Facility Authorization

Review画面およびReview操作には、少なくとも次のServer-side authorizationを必要とする。

- authenticated human actor
- target facility
- review action
- active membership / permission

client supplied role、permission、facilityを信用しない。cross-facility候補を同じReview画面へ混ぜない。

### 12. 状態と保存・利用の分離

```text
matched != stored != reviewed != AIKO accessible
```

「同じ記録」は現在のidentity resolution上のassociation候補であり、保存成功を意味しない。「新しい記録」はNEW候補であり、保存許可を意味しない。「判断できない」はPENDING_REVIEWまたはCONFLICTとして保存・処理する候補であり、通常のAIKOデータへ投入しない。

### 13. v0.1で確定する境界

- Human ReviewはRISEN CARE Human Management側で行う
- Connector側でRecord IdentityやResident Identityを最終確認しない
- `reviewItemId`はServer生成のopaqueなReview作業identityとする
- `reviewItemId`をRecord IdentityやResident Identityとして扱わない
- `recordIdentityCandidate`をreviewItemIdにしない
- stable source IDがない場合は一意性未確認のcandidateとしてReviewへ回す
- Observation failureはRecord Identity Reviewより先に扱う
- 「同じ記録」「新しい記録」「判断できない」を正式な操作候補とする
- Review結果は訂正可能とする
- Record Identity ReviewとResident Identity Reviewを分離する
- 通常表示は最小PIIにする
- 原本はLocalに残し、raw document全文をServerへ送らない
- review queue dedupは保守的に扱う
- `needs_review`をAIKO通常利用へ自動投入しない
- cross-facility候補を混ぜない
- `matched`、stored、reviewed、AIKO accessibleを同一視しない

### 14. TBD

- `reviewItemId`具体形式
- review queue schema / storage
- review queue dedup key
- review状態遷移
- review期限 / TTL
- correction権限
- audit event schema
- `recordId` / `versionId`の具体処理
- Human Authorization action mapping
- source location privacy minimization
- Local原本確認経路
- review中Version到着時の処理
- Storage Policy具体連携
- AIKO review queue access
- retry / idempotencyとの統合
- cross-document / cross-connector policy

## Idempotency / Retry Identity Rules

### 1. Identityの分離

次のIdentityを同一概念として扱わない。

- `requestId`: 1回の通信attemptを追跡するcorrelation identity候補
- `idempotencyKey`: 同一ingestion operationの再実行を識別するidentity候補
- `ingestionId`: Server-side ingestion operation identity候補
- `sourceDocumentKey`: Local Source Document observation identity
- `sourceRecordKey`: Local Source Record observation identity候補
- `recordIdentityCandidate`: stable source IDなしの場合のRecord identity評価材料
- `contentHash`: canonical semantic Record content identity候補
- `sourceHash`: Local original bytes observation hash候補
- `recordId`: Server-side RISEN Record Identity
- `versionId`: Server-side Record Version Identity
- `reviewItemId`: Human Review operation identity
- `residentId`: Resident association

```text
requestId != idempotencyKey
idempotencyKey != sourceRecordKey
idempotencyKey != contentHash
ingestionId != recordId
contentHash != recordId
reviewItemId != idempotencyKey
```

### 2. Delivery Model

exactly-once deliveryは保証しない。

第一候補は次の組み合わせとする。

```text
at-least-once delivery
+ server-side idempotent processing
+ business identity / change detection
```

このモデルは、idempotency state永続化、原子的な競合制御、Storage transaction、retry時の既存結果再利用が実装されて初めて成立する。NetworkやHTTP transportが一度だけ配送することは前提にしない。

### 3. requestId

`requestId`は1回の通信attemptを追跡するcorrelation identity候補とする。

同一ingestion operationのretryでも、各HTTP attemptで新しい`requestId`を使用できる。`requestId`単独でdedupしない。

具体的な生成方式、再利用可否、外部公開、保存期間はTBDとする。

### 4. idempotencyKey

`idempotencyKey`は同一ingestion operationのretryを識別する候補であり、業務Record identityではない。

第一候補として、Connectorがoperation開始時に生成し、同じoperationのretryでのみ再利用する。新しいscan / 新しいobservationは新しいoperation候補であり、原則として新しい`idempotencyKey`候補とする。

具体的な生成方式、形式、TTL、Local永続化方式はTBDとする。

### 5. ingestionId

`ingestionId`はServer-side ingestion operation identity候補とする。

第一候補:

- Serverが生成する
- 同じ有効な`idempotencyKey`のretryでは同じ`ingestionId`を再利用する候補とする
- `recordId`、`versionId`、`reviewItemId`とは別概念とする
- Connector responseへ返すかはConnector Response ContractのTBDを維持する

### 6. Idempotency Scope

client supplied `facilityId`をauthorityにしない。

少なくとも次のServer-side scope内で`idempotencyKey`を解釈することを第一候補とする。

```text
verified facility context
+ verified connector context
+ idempotencyKey
```

cross-facility dedupは禁止する。cross-connector automatic mergeも行わない。endpoint、operation type、protocol version等をscopeへ含めるかはTBDとする。

### 7. Same Key / Same Input

同じ`idempotencyKey`と同一operation inputが安全に確認できる場合、同じingestion operationのretry候補とする。

- 既存processing stateを再利用する
- 既存resultを再利用する
- 既存`ingestionId`を再利用する候補とする
- Storageを二重実行しない
- Review itemを無制限に増殖させない

同一性を安全に確認できない場合は、既存結果を無条件に返さない。

### 8. Same Key / Different Input

```text
same idempotencyKey + different operation input
```

では、次を行わない。

- silent overwrite
- silent merge
- 既存operation結果の異なるinputへの流用

第一候補は`CONFLICT`またはrejectとする。

この検出に`contentHash`単独を使わない。`contentHash`は業務Recordのsemantic content identity候補であり、ingestion request identityではない。

将来、同一keyに対応するinput比較のため`idempotencyPayloadFingerprint`のような独立比較値が必要になる可能性がある。ただし名称、形式、計算対象、canonicalization、algorithm、保存期間はTBDとする。

```text
idempotencyPayloadFingerprint != contentHash
```

### 9. Different Key / Same Payload

異なる`idempotencyKey`で同じpayloadが到着した場合、transport / ingestion operationとしては別operation候補とする。自動的に同じ`ingestionId`へ統合しない。

ただしbusiness identity / change detection側で次が確認できれば、`UNCHANGED`候補とする。

```text
same sourceDocumentKey
+ same sourceRecordKey
+ same contentHash
+ compatible trusted context / history
```

`contentHash`単独でmergeしない。

### 10. Retry条件

network断、timeout、response loss、server処理途中failureでは、同一operationであることが分かる場合、同じ`idempotencyKey`を再利用する第一候補とする。`requestId`はattemptごとに別でもよい。

Connector restart / PC restart後もretry continuityを維持するには、未完了operationの`idempotencyKey`と送信状態をLocal側で安全に永続化する仕組みが必要になる可能性がある。outbox、queue、暗号化、復旧方式はTBDとする。

### 11. Concurrent Duplicate

同じscopeと同じ`idempotencyKey`の並行requestは、Server側で原子的に扱う必要がある。

第一候補:

1. 1つのingestion operationだけを開始する
2. 他のrequestは既存のprocessing stateまたはresultへ接続する
3. Storage、Record Identity、Review作成を二重実行しない

具体的なDB lock、unique constraint、transaction、advisory lock等はTBDとする。

### 12. Processing State

将来のServer-side idempotency processing stateとして、少なくとも次を概念候補とする。

- RECEIVED
- PROCESSING
- COMPLETED
- FAILED_RETRYABLE
- FAILED_FINAL
- CONFLICT

正式enum、遷移、TTL、completed result retentionはTBDとする。

```text
idempotency processing state
!=
Storage state
!=
Review state
```

### 13. Business Identityとの関係

次の判定はidempotency retryそのものではない。

```text
same sourceRecordKey + same contentHash
=> UNCHANGED候補

same sourceRecordKey + different contentHash
=> UPDATED / new version候補

different sourceRecordKey + same contentHash
=> 同じRecordとは判断しない
```

同じSource Recordの新しいscan / observationは、新しいingestion operationになり得る。新しいoperationであっても、business identity側では`UNCHANGED`候補になり得る。

### 14. sourceHash / contentHash

`sourceHash`はLocal original bytesの観測hash、`contentHash`はcanonical semantic Record contentのhash候補として分離する。

- different `sourceHash` + same `contentHash`: original bytesは変化したがsemantic contentは同じ候補
- same `sourceHash` + different `contentHash`: Extractor、Mapping、Canonicalization version変更、不整合等を疑う

いずれも自動的に同一operationや同一Recordとはしない。

Serverはraw originalを受け取らないため、`sourceHash`を原本byteから独立再計算できない。現在のPayloadはcanonical semantic contentも十分に送っていないため、`contentHash`をServerで再計算可能とは断定しない。

Hashは認証、暗号化、匿名化ではない。

### 15. sourceUpdatedAt

`sourceUpdatedAt`単独でretry、Record identity、Version identity、content changeを決めない。

Excelを開いて保存しただけでmtimeや`sourceHash`が変化しても、semantic contentが同じなら`UNCHANGED`候補になり得る。mtimeだけでVersionを作らない。

### 16. Human Review

`reviewItemId`と`idempotencyKey`を分離する。

- 同一operation retryでは新しいreviewItemを無制限に作らない
- 同じkeyでもinputが異なればsilent mergeしない
- 曖昧な`recordIdentityCandidate`をidempotencyだけで同一Reviewへ統合しない
- review中の新しいscanは新しいingestion operationになり得る
- review完了後の旧operation retryは、同じkeyなら既存operation resultを参照する候補
- Human Review訂正後は過去decisionを復活させず、現在有効なServer-side decision/historyを参照する

Record Identity Human Review Rulesのconservative dedup方針を維持する。

### 17. Storage

```text
matched != stored != reviewed != AIKO accessible
```

idempotency processing successはStorage successを意味しない。Storage成功後にresponse lossが発生しても、retryで二重Storage effectを発生させない設計が必要である。

### 18. Mapping / Canonicalization Version

Mapping version変更やCanonicalization version変更は単純retryとして扱わない。新operationまたは再評価候補とする。

旧`contentHash`と新`contentHash`をversion違いを無視して直接比較しない。migration、recompute、旧履歴との接続方針はTBDとする。

### 19. Connector Reinstall

Connector reinstall後のidempotency continuity、Local registry復元、`sourceDocumentKey` rebind、unfinished operation復旧はTBDとする。

reinstall後に同じDocumentを観測しただけで、旧ingestion operationのretryとは判断しない。

### 20. AIKO

idempotency処理からAIKO利用可否を決めない。

`UNCHANGED`、`UPDATED`、`COMPLETED`等のingestion結果だけでAIKO accessibleとはしない。Storage Policy、Review、Resident association、AIKO Access Policyを別途通す。

AIでidentity、dedup、merge、Record Version、Resident associationを最終決定しない。

### 21. v0.1で確定する境界

- `requestId`、`idempotencyKey`、`ingestionId`、Document / Record / Version / Review / Resident identityを分離する
- exactly-once deliveryを保証しない
- at-least-once delivery + server-side idempotent processing + business identity/change detectionを第一候補とする
- `requestId`単独でdedupしない
- 同一operationのretryでは同じ`idempotencyKey`を再利用する候補とする
- 新しいscan / observationは新しいoperation候補とする
- same key / different inputはCONFLICTまたはreject候補とする
- different key / same payloadは別operationとして扱い、business identity側でUNCHANGEDを評価する
- cross-facility dedupを行わない
- cross-connector automatic mergeを行わない
- `residentId`をdedup keyにしない
- `sourceHash`、`contentHash`、`sourceUpdatedAt`を単独でidempotency authorityにしない
- Hashは認証・暗号化・匿名化ではない
- Human Review itemをretryで無制限に増やさない
- 曖昧な候補を保守的dedupで自動統合しない
- Storage state、Review state、AIKO access stateをidempotency stateから分離する
- raw originalをServerへ送る前提にしない

### 22. TBD

- `idempotencyKey`具体形式
- key生成algorithm
- Local側保存方式、outbox、queue、復旧
- TTL / retention
- scopeへendpoint / operation type / protocol versionを含めるか
- `idempotencyPayloadFingerprint`の名称、形式、計算対象、canonicalization、algorithm、保存期間
- `ingestionId`形式と外部公開
- processing state正式enumと状態遷移
- concurrent lock、unique constraint、DB transaction
- retryable / final error分類
- HTTP status mapping
- completed result retention
- failed operation retry policy
- Review queueとの永続化連携
- Storage transaction
- Mapping / Canonicalization version変更時のmigration / recompute
- Connector reinstall recovery
- cross-document / cross-connector policy
- status polling

## Server-side Idempotency Repository Contract

### 1. Repositoryの位置付け

Idempotency Repositoryは、次のRepositoryと分離する。

```text
Idempotency Repository
!= Storage Repository
!= Record Repository
!= Resident Repository
!= Human Review Repository
```

Idempotency RepositoryはRecord Identity、Resident Identity、Human Review decision、Storage Policyを決定しない。

### 2. 最小責務

Idempotency Repositoryは次を担当する。

- verified scope内のidempotency operationを管理する
- 同一scope + `idempotencyKey`の処理開始権をatomicにclaimする
- same keyのinput一致 / 不一致を扱う
- processing stateを管理する
- processing ownershipを管理する
- stale ownerによるcomplete / failを拒否する
- retry時に既存operation stateとsafeなresult referenceを返す
- credential、raw payload、raw Word / Excel、不要なPIIを保持・返却しない

### 3. 禁止する責務

Idempotency Repositoryは次を行わない。

- client facilityIdからfacilityを決定する
- Connector credentialを受け取る
- raw payloadを保存する
- Resident Matchingを行う
- Record Identity resolutionを行う
- Human Review decisionを行う
- Storage Policyを決定する
- AIによるidentity / dedup推論を行う
- `recordId`、`versionId`、`residentId`をclaim identityとして利用する

### 4. Atomic Claim

次の分離操作だけで排他を保証してはならない。

```text
findByKey()
  ↓
not found
  ↓
insert()
```

Request A/Bが同時到着すると、両方が未存在と判断してbusiness processingを開始するrace conditionが発生する。

そのため、lookupとcreate / claim競合をRepository内でatomicに扱う`claimOperation(...)`を第一候補とする。同じscope + `idempotencyKey`に対してbusiness processing開始権を得られるworkerは最大1つとする。

### 5. v0.1最小Method候補

```text
claimOperation(...)
completeOperation(...)
failOperation(...)
```

状態照会が必要な場合のみ`getOperation(...)`を追加候補とする。ownership renewalが必要な場合のみ`renewClaim(...)`を将来候補とする。正式なmethod名はTBDとする。

### 6. Claim Input

```javascript
{
    verifiedFacilityId,
    verifiedConnectorId,
    idempotencyKey,
    inputFingerprint
}
```

`verifiedFacilityId`と`verifiedConnectorId`はTrust Boundaryで確認済みの値だけを使用する。client supplied facilityIdをauthorityにしない。

Repositoryへraw credential、raw payload、residentId、recordIdを渡さない。`inputFingerprint`はidempotency専用の比較値候補であり、`contentHash`とは分離する。

```text
inputFingerprint != contentHash
```

`inputFingerprint`の名称、algorithm、canonicalization、対象field、生成場所、保存形式はTBDとする。Repositoryはfingerprintの業務的意味を推論せず、同じscope + keyの一致 / 不一致を安全に扱う。

### 7. Claim Output

```javascript
{
    outcome,
    ingestionId,
    processingState,
    ownership,
    resultReference,
    retryability
}
```

`outcome`の概念候補:

- NEW_CLAIMED
- EXISTING_PROCESSING
- EXISTING_COMPLETED
- EXISTING_FAILED_RETRYABLE
- EXISTING_FAILED_FINAL
- CONFLICT

正式なenum、field名、ownership情報の公開範囲はTBDとする。

### 8. ingestionId

`ingestionId`はServer-side ingestion operation identity候補である。

第一候補は、atomic claimとoperation identityを安全に結び付けやすいため、Repositoryがclaim成功時に生成または確定する方式とする。ただしServiceが事前生成して渡す案も排除せず、具体方式はTBDとする。

同じ有効なoperation retryでは同じ`ingestionId`を参照する候補とする。

```text
ingestionId != recordId
ingestionId != versionId
ingestionId != reviewItemId
```

Connector responseへの公開はConnector Response ContractのTBDを維持する。

### 9. Idempotency Scope

第一候補:

```text
verified facility context
+ verified connector context
+ idempotencyKey
```

cross-facility dedupとcross-connector automatic mergeは行わない。endpoint、operation type、protocol versionをscopeへ含めるかはTBDとする。

### 10. Same Keyの扱い

#### same key + same input

同一operationと安全に確認できる場合は既存operationを参照する。

- PROCESSING相当なら新しいbusiness processingを開始しない
- COMPLETED相当なら既存resultを再利用する候補
- 既存`ingestionId`、state、resultReferenceを参照する候補
- Storageを二重実行しない
- Review itemを無制限に増殖させない

#### same key + different fingerprint

既存operationを上書きしない。

- silent overwrite禁止
- silent merge禁止
- 異なるinputへ既存resultを流用しない
- `CONFLICT`またはreject候補とする

この検出に`contentHash`単独を使用しない。

### 11. Processing Ownership

Contract上、次を保証する。

- 1 operationに同時に有効なprocessing ownerは最大1つ
- ownershipを失ったworkerはcomplete / failできない
- takeover後、古いownerは結果を書き込めない

実現手段の第一候補は、lease、ownershipToken、generation、fencing token、compare-and-setの組み合わせである。ただし、v0.1 Contractでこれらすべての具体実装を必須固定しない。

### 12. Stale Worker / ABA

次のケースを防止できる必要がある。

```text
Worker A claim
→ A停止
→ ownership timeout / takeover
→ Worker Bが新しいownership取得
→ B complete
→ A復帰
→ Aの古いcomplete
```

状態名PROCESSINGだけの比較ではABA問題を防げない可能性がある。`completeOperation(...)`と`failOperation(...)`では、現在のownership token、generationまたはfencing相当値、expected stateを検証する方向とする。

### 13. Complete / Fail

概念上、次を受ける候補とする。

```javascript
{
    ingestionId,
    currentOwnershipProof,
    expectedProcessingState,
    resultReference
}
```

`failOperation(...)`では、safe failure classificationとretryabilityを扱う候補とする。

Repositoryはcallerが現在のownerであることをcompare-and-setで確認し、stale ownerからのcomplete / failを拒否する。credential、raw payload、stack、dependency error detailは保存・返却しない。

### 14. Processing State

概念候補:

- RECEIVED
- PROCESSING
- COMPLETED
- FAILED_RETRYABLE
- FAILED_FINAL
- CONFLICT

正式enum、状態遷移、TTL、completed result retentionはTBDとする。

```text
idempotency processing state
!= Storage state
!= Record Identity state
!= Human Review state
!= AIKO access state
```

### 15. Result Reference

response bodyそのものを無制限にRepositoryへ保存する方式を第一候補にしない。Server-sideのsafeな`resultReference`を保持する方向とする。

`resultReference`は次を含まない。

- credential
- raw payload
- raw document
- stack
- 不要なPII

`resultReference`がどのRepositoryまたはStorageを指すかはTBDとする。過去のtransport resultと現在有効なbusiness stateを分離し、Human Review訂正後に古いdecisionを復活させない。

### 16. RetryとCrash Recovery

- PROCESSING中のretryは新しいbusiness processingを開始しない
- COMPLETED後のretryはStorageをblindに再実行しない
- FAILED_RETRYABLEは安全なownership再取得後のretry候補
- FAILED_FINALは無制限retryしない
- response loss時は既存operationまたはresultReferenceを参照する候補
- claim後・business processing前crashはownership recovery候補
- Storage前crashはbusiness operation側のretry安全性も確認する

business Storage成功後、idempotency completion保存前にcrashした場合、Idempotency Repositoryだけでは二重business effectを完全には防げない。この場合のblind Storage retryは禁止し、Storage Effect Idempotency、Transaction、Recoveryの別contractを必要とする。

### 17. Storage Transactionとの関係

次の案を比較対象とする。

- A. Idempotencyとbusiness Storageのtransaction coordination
- B. business Storage自体をidempotent化する
- C. outbox / operation logでrecoveryする
- D. A〜Cの組み合わせ

第一候補の設計目標は次とする。

```text
at-least-once delivery
+ idempotent processing
+ duplicate-safe business effect
```

具体的なDB / Supabase transaction方式、Storage key、outbox schemaはTBDとする。

### 18. Human Reviewとの境界

Idempotency Repositoryは`reviewItemId`を生成せず、Human Review decisionを保持しない。

同一operation retryでReview itemを増殖させないため、business result referenceとの関連を持てる候補とする。ただし、次を維持する。

```text
reviewItemId != idempotencyKey
```

曖昧なRecord candidateをidempotencyだけで同一Reviewへ統合しない。Human Review訂正後の旧retryでは、過去decisionを復活させず、現在有効なbusiness stateを参照する。

### 19. Connector Revocation

Trust verificationはIdempotency Repositoryより前の境界である。revoked Connectorからの新しいretryは、Repositoryに到達する前にdeniedとなる第一候補とする。

既存operationのcleanup、内部recovery、失効後のprocessing継続可否はTBDとする。

### 20. Repositoryが返さない情報

- credential
- raw payload
- raw Word / Excel content
- Supabase service_role
- facility secret
- unnecessary PII
- client asserted facility authority
- internal stack / error detail

### 21. Current Implementationとの差分

現在は次が未実装である。

- Idempotency Repository
- `idempotencyKey`
- `ingestionId`
- `inputFingerprint`
- atomic claim
- processing ownership
- lease / generation / fencing
- processing state persistence
- completion / failure compare-and-set
- retry result reuse
- Storage transaction / recovery
- outbox / operation log

現在の`ConnectorIngestionService`はTrust → Payload Validation → Resident Matchingまでを担当するが、Idempotency Repositoryを呼び出す契約はない。`ResidentRepository`はresident候補取得のRepositoryであり、Idempotency Repositoryとは別責務である。

### 22. v0.1で確定する原則

- Idempotency RepositoryをStorage、Record、Resident、Human Review Repositoryから分離する
- lookupとclaim競合をatomicに扱う
- 同一scope + keyで有効なprocessing ownerは最大1つ
- stale ownerによるcomplete / failを拒否する
- verified facility / connector contextをscopeに使う
- same key + different inputはCONFLICTまたはreject候補
- same key + same inputは既存operation参照候補
- raw credential、raw payload、不要なPIIを保持しない
- Record Identity、Resident Identity、Human Review decisionを決定しない
- exactly-once deliveryを保証しない
- duplicate-safe business effectを設計目標とする
- Storage state、Review state、AIKO access stateを分離する

### 23. TBD

- method正式名
- outcome / processing state正式enum
- `idempotencyKey`形式、生成、保存、TTL
- inputFingerprintの名称、algorithm、対象、canonicalization、保存
- `ingestionId`形式、生成主体、外部公開
- ownership token、lease、generation、fencing方式
- takeover条件、timeout、renew方式
- completion / failureのcompare-and-set詳細
- DB lock、unique constraint、transaction方式
- Storage Effect Idempotency
- outbox / operation log
- retryable / final error分類
- completed result retention
- expired key reuse、cleanup race
- connector revocation後のinternal recovery
- Human Reviewとのresult reference永続化
- status polling
- audit event schema

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
