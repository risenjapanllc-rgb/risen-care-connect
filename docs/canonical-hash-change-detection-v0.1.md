# RISEN CARE Canonical Hash / Change Detection v0.1

## 1. 目的

既存Word / Excelの変更を安全に検知し、

- 不要な再処理を減らす
- 同一Recordの再送を識別する
- Semantic Contentの変更を検知する
- 読取失敗を削除と誤認しない
- 読取中変更による不整合を避ける

ためのHash / Canonicalization / Change Detection原則を定義する。

## 2. 基本原則

次を分離する。

- sourceHash
- contentHash
- sourceUpdatedAt
- Canonicalization
- Document Observation
- TOCTOU Detection

1つのHashだけで
Document Identity、
Record Identity、
Content Identity、
Deletion判断を行わない。

HashはIdentity Resolutionを補助するものであり、
それ自体をすべてのIdentityとして扱わない。

## 3. sourceHash

sourceHashは
Source Document全体の内容変更を検知するためのHashとする。

対象候補:

- Word原本のbyte content
- Excel原本のbyte content

概念:

same document identity
+
same sourceHash
=
Source Document全体に変更なし候補

same document identity
+
different sourceHash
=
Source Documentに変更あり候補

sourceHashだけでは
どのSemantic Recordが変更されたかを確定しない。

## 4. sourceHashの役割

sourceHashは主に、

- 不要な再抽出の抑制
- 同一Source再読込の検知
- Source変更の一次判定
- Provenance
- 同期追跡

に利用する候補。

sourceHashが変わった場合でも、
すべてのSemantic Recordが
変更されたとは限らない。

## 5. sourceUpdatedAt

sourceUpdatedAtは
File Systemから観測した更新時刻。

Change Detectionの補助情報として使用する。

mtimeだけで
変更確定しない。

例:

same sourceUpdatedAt
+
different sourceHash
=
内容変更として扱う候補

different sourceUpdatedAt
+
same sourceHash
=
実質内容変更なし候補

ただし具体的Policyは
実データ確認後に決定する。

## 6. contentHash

contentHashは
論理RecordのSemantic Contentが
変更されたかを確認するためのHash。

sourceHashとは分離する。

概念:

same resolved sourceRecordKey
+
same contentHash
=
UNCHANGED候補

same resolved sourceRecordKey
+
different contentHash
=
UPDATED候補

contentHashだけで
sourceRecordKeyを生成しない。

## 7. Canonicalization

contentHash生成前に
Semantic Contentを
安定した形式へ変換する。

この処理をCanonicalizationと呼ぶ。

目的は、
意味が変わっていない表現上の差だけで
不要なUPDATED判定が発生することを減らすこと。

ただし正規化しすぎて
実際の変更を失わないことを優先する。

## 8. v0.1 Canonicalization Policy

v0.1では
保守的なCanonicalizationから開始する。

候補:

- 改行コードをLFへ統一
- 文字列末尾の不要な改行を整理
- Field値の前後にある明確な不要空白を整理
- JSON object key順序を安定化
- Semantic Field順序を安定化
- 明確にDate型と判定済みの値を標準形式へ変換
- 明確にDatetime型と判定済みの値を標準形式へ変換
- Number型と確定した値を安定表現へ変換
- Boolean型と確定した値を安定表現へ変換

Data Typeが確定していない文字列を
推測で別型へ変換しない。

## 9. v0.1で原則行わない正規化

次を無条件に行わない。

- 文章内部の空白削除
- 全角 / 半角の自動統一
- 大文字 / 小文字の自動統一
- 漢字 / かな表記の自動統一
- 同義語への置換
- 文章の要約
- AIによる意味正規化
- 誤字と推測した文字の自動修正
- 日付らしい文字列の推測変換
- 数字らしい文字列の推測変換
- Record順序の意味を無条件に無視

意味が変化する可能性があるため、
v0.1では保守的に扱う。

## 10. Whitespace

Field値の前後にある
明確な不要空白は
Canonicalization候補とする。

ただし文章内部の空白は
意味を持つ可能性があるため、
無条件に削除しない。

複数空白を1空白へ変換する処理も
v0.1では標準動作にしない。

## 11. Newline

OSやReader差による
CRLF / LF等は
LFへ統一する候補とする。

ただし文章中の段落構造そのものを
無条件に削除しない。

連続改行を1つへまとめる処理は
v0.1では標準動作にしない。

## 12. Date / Datetime

Date / Datetimeは
Data Typeが明確に確定している場合のみ
Canonical形式へ変換する。

例候補:

Date:
YYYY-MM-DD

Datetime:
ISO 8601

Timezoneが不明な値へ
推測でTimezoneを付与しない。

表示文字列だけから
日付型を推測して変換する処理は
別途Mapping / Type Policyで定義する。

## 13. Number

Number型と確定した値のみ
安定した数値表現へ変換する。

例えば、

1
1.0

を同一とみなすかは
Field Data Typeと業務意味に依存する。

利用者番号、
郵便番号、
電話番号等を
Numberとして扱わない。

先頭0を
推測で削除しない。

## 14. Boolean

Boolean型と確定したFieldのみ
true / false等の
安定表現へ変換する。

「有」「無」
「あり」「なし」
「○」「×」

等をBooleanへ変換する場合は
Facility / Form Mapping側で
明示的に定義する。

## 15. Object Canonicalization

Structured ObjectをHash対象とする場合、
Object key順序によるHash差を避ける。

概念:

{
  "a": 1,
  "b": 2
}

と

{
  "b": 2,
  "a": 1
}

が同一Semantic Contentなら、
同じCanonical Representationになるようにする。

ただしArray順序は
意味を持つ可能性があるため
無条件にsortしない。

## 16. Array Canonicalization

Arrayの順序が
業務上意味を持つ場合は保持する。

例:

- 時系列Record
- 支援手順
- 優先順位
- 緊急連絡順位

順序に意味がないことが
Schema / Mappingで明確な場合のみ、
将来的なCanonicalization Policyを検討する。

v0.1では
Arrayを無条件にsortしない。

## 17. Hash Input

contentHashは
Raw Document全文ではなく、
対象RecordのCanonical Semantic Contentから
生成することを基本とする。

概念:

{
  "module": "support",
  "semanticType": "supportContent",
  "value": "..."
}

必要に応じて
Record Schemaに応じた複数Fieldを
Canonical Representationへ含める。

Provenanceのうち、

- sourceLocation
- row number
- cell position
- extractedAt

等の変更しやすい情報を
Semantic contentHashへ無条件に含めない。

## 18. Identity FieldとContent Field

sourceRecordKey生成に使用するFieldと、
contentHash生成に使用するFieldを
概念上分離する。

Identity Field例:

- source-side stable record ID
- source resident identifier
- record date/time
- record category

Content Field例:

- supportContent
- supportMethod
- observation
- notes

ただし具体的な区分は
Document / Form Mappingで定義する。

Identity Fieldが変更された場合の扱いは
単純なUPDATEDとは限らず、
NEW / CONFLICT候補になる可能性がある。

## 19. Hash Algorithm

v0.1の候補として
SHA-256等の標準的な暗号学的Hashを想定する。

ただし本書では
最終algorithmを固定しない。

Hash値は
暗号化ではない。

個人情報を含む入力について、
Hash化しただけで
匿名化されたとみなさない。

## 20. Hash Version

Canonicalization方式が変わると
同じSemantic Contentでも
Hashが変わる可能性がある。

そのため将来、

- hashAlgorithm
- canonicalizationVersion
- hashVersion

等を追跡できる構造を検討する。

Hash値だけを保存して
生成方式が不明になる構造を避ける。

## 21. Document Observation

Missing判定を行う前に、
今回のSource Documentを
正常かつ十分に観測できたかを評価する。

概念候補:

COMPLETE
- 正常に読取・抽出できた

PARTIAL
- 一部のみ処理できた

FAILED
- 正常に処理できなかった

CHANGED_DURING_READ
- 読取中変更を検出した

これらの名称は
v0.1では最終固定しない。

## 22. Missing判定との関係

MISSING_CANDIDATE判定は
Document Observationが
十分に完全である場合のみ行う。

PARTIAL
FAILED
CHANGED_DURING_READ

等の場合、
Recordが見つからないことだけを理由に
MISSING_CANDIDATEへ変更しない。

Observation failure
!=
Record deletion

とする。

## 23. TOCTOU

Source Fileは
読取処理中にも変更される可能性がある。

将来候補:

stat before
-> read
-> calculate hash
-> stat after

before / afterで、

- size
- mtime
- その他安全なmetadata

等を比較する。

読取中変更が疑われる場合は
正常同期として確定しない。

## 24. Retry / Skip

CHANGED_DURING_READ等を検出した場合、

- limited retry
- skip
- next scanで再試行

等を検討する。

無限retryしない。

編集中ファイルを
無理に同期完了扱いしない。

具体的retry回数や待機時間は
実装時に決定する。

## 25. Change Detection Flow

概念:

scan
-> safe metadata
-> observation start
-> stat before
-> source read
-> sourceHash
-> stat after
-> observation evaluation

変更なし候補:
same trusted document context
+
same sourceHash
-> extraction skip candidate

変更あり候補:
same trusted document context
+
different sourceHash
-> semantic extraction
-> canonicalization
-> contentHash
-> Payload
-> Server Trust Boundary
-> Record Identity Resolution
-> NEW / UNCHANGED / UPDATED / CONFLICT

Missing評価:
complete document observation
+
previous record not observed
-> MISSING_CANDIDATE candidate

## 26. Local Connector Responsibility

Local Connectorは将来、

- safe file metadata取得
- sourceUpdatedAt取得
- sourceHash生成
- Semantic Extraction
- Canonicalization
- contentHash候補生成
- Document Observation情報生成
- TOCTOU検知

を担当できる。

ただしHash結果だけで、

- facilityId
- residentId
- recordId
- deletion
- classification

を最終確定しない。

## 27. Server Trust Boundary Responsibility

Server側は、

- Connector verification
- facilityId resolution
- Payload validation
- Hash metadata validation
- Resident Matching
- Record Identity Resolution
- Idempotency判定
- Storage Policy
- Missing判定
- Version管理

を担当する。

LocalのHash値を
権限判断の根拠として使用しない。

## 28. Provenance

将来追跡候補:

- sourceHash
- sourceUpdatedAt
- contentHash
- hashAlgorithm
- canonicalizationVersion
- documentObservation
- observedAt
- extractorVersion
- mappingVersion

絶対パスや
不要なRaw Contentを
Provenanceへ含めない。

## 29. Security / Privacy

Hashは
Access Controlの代替ではない。

Hash値を持っていることを
認証や認可の証明に使用しない。

機微な値のHashについても
入力空間が小さい場合などは
推測可能性がある。

したがって、
Hash値も必要性に応じて
適切に管理する。

## 30. Failure Handling

次の場合は
変更なしと推測して処理を継続しない。

- Source read failure
- Hash calculation failure
- Canonicalization failure
- Extraction failure
- Mapping failure
- TOCTOU detection
- malformed data

Fail-openではなく、
安全側に保留・再試行・reviewできる構造を目指す。

## 31. v0.1で固定しないこと

- 最終Hash algorithm
- Canonical JSON仕様
- Unicode normalization方式
- Date parser
- Number parser
- Boolean mapping
- sourceHash保存期間
- contentHash保存期間
- Observation status最終名称
- retry回数
- retry interval
- Large File streaming方式
- Hash計算性能最適化

## 32. 次の設計課題

- Storage Policy
- AIKO Access Policy
- Resident Matcher request / response
- Record Version Model
- Missing / Deletion Policy
- Facility / Form Mapping
- Audit Event Model
- Server Trust Boundary実装
