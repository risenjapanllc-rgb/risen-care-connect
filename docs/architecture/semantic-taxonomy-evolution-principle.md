# RISEN CARE Semantic Taxonomy Evolution Principle

## 1. 目的

RISEN CAREのSemantic体系は、帳票や施設ごとに分類名を増やすための仕組みではない。

異なる原本・システム・表現を、
既存の意味体系へ可能な限り統合しながら、
必要に応じてMeaning体系そのものを成長させるための基盤とする。

分類体系は最初から完成形として固定しない。

運用・Evidence・新しい業務領域の蓄積に応じて、

- 変更
- 追加
- 移動
- 統合
- 分割

できることを前提とする。


## 2. 基本階層

RISEN CAREでは、
技術的な処理契約と、
人間が理解する業務分類を分離する。

### semanticType

semanticTypeは、
保存・投影・検証・処理パイプラインを決める
技術的な実行契約を表す。

現在の例:

- recipient_certificate
- support_record

semanticTypeは、
単なる画面上の分類名ではない。

既存のProjection Contractや
Persistence Contractと結び付いているため、
AIが任意に新設してはならない。


### taxonomyCategory

taxonomyCategoryは、
人間がMeaningを整理・探索・理解するための
業務上の大分類を表す。

現時点では設計上の分類レイヤーであり、
Standard Meaning AuthorityのDB項目としては
まだ実装していない。

今後、Meaning IDとは分離した
再編可能な業務分類として導入する。

初期候補は以下とする。

- facility
  - 施設・法人・事業所

- staff
  - 職員・所属・資格・勤務

- user
  - 利用者基本情報・家族・契約等

- daily_record
  - 日誌・支援記録・入院・外泊・外出・面会・受診等

- support_plan
  - 個別支援計画・アセスメント・モニタリング・評価

- billing_contract
  - 契約・利用実績・加算・請求・利用者負担等

- operation_management
  - 会議・委員会・研修・事故・苦情・監査・BCP等


taxonomyCategoryは固定された最終体系ではない。

実運用に応じて、

- 名称変更
- 移動
- 統合
- 分割
- 追加

できるものとする。


## 3. Meaningの粒度

基本的な役割は次のように考える。

- semanticType
  - 技術的な実行契約

- taxonomyCategory
  - 可変な業務上の大分類

- entityName
  - 対象となる概念

- fieldName
  - その概念の具体的な意味項目

- Meaning ID
  - 不変の意味識別子

例:

semanticType:
support_record

taxonomyCategory:
daily_record

entityName:
support_record

fieldName:
hospitalization_information

displayName:
入院情報


「入院」という項目が存在するからといって、

hospitalization_record

のような新しいsemanticTypeを
直ちに作る必要はない。

既存の実行契約で処理できる場合は、
semanticTypeを再利用する。


## 4. 既存体系優先の原則

AIは新しいMeaningやsemanticTypeを作る前に、
必ず既存Semantic体系を確認する。

判断順序は以下とする。

1. 既存Meaningと同義か確認する
2. 既存entityName / fieldNameで表現可能か確認する
3. 既存semanticTypeの実行契約で処理可能か確認する
4. 既存taxonomyCategoryへ所属可能か確認する
5. 既存体系では表現できない場合のみ新規候補を提案する


AIは、

「それらしい新しい名前を作れる」

という理由だけで新しい分類を作ってはならない。


## 5. AI提案とAuthorityを分離する

AIによる分類は提案であり、
正式Authorityではない。

semanticTypeが未確定の場合、
AIはEvidenceと既存Semantic体系を基に
既存の実行契約から候補を選択できる。

既存semanticTypeで処理できない場合、
新しいsemanticTypeを自動作成してはならない。

その場合は、
新しい実行契約が必要である可能性を
管理者レビューとして提示する。

ただし、

- entityName
- fieldName
- semanticType
- Standard Meaning

をAI応答だけで正式確定してはならない。

RISEN管理者の承認によって初めてFormal MeaningとしてAuthority化する。


## 6. 分類体系は成長可能でなければならない

Semantic体系は後から再編できるようにする。

想定する変更には以下を含む。

### taxonomyCategoryの名称変更

例:

daily_record
→
care_record


### taxonomyCategory間の移動

例:

hospitalization

を

daily_record

から

medical_health

へ移動する。

この移動だけであれば、
Meaning IDやsemanticTypeを変更する必要はない。


### 統合

意味が重複している2つのMeaningを、
1つのFormal Meaningへ統合する。


### 分割

運用上1つでは粗すぎるMeaningを、
複数のMeaningへ分割する。


## 7. Meaning IDを安定した識別子とする

分類名そのものをデータの不変IDにしてはならない。

原則として、

Meaning ID

を安定した識別子とする。


以下は管理可能な属性として扱う。

- taxonomyCategory
- entityName
- fieldName
- displayName
- synonyms
- 所属分類

semanticTypeは技術的な実行契約であるため、
単純な分類移動と同じ扱いにはしない。

semanticTypeを変更する場合は、
対応するProjection Contractや
Persistence Contractとの整合性を確認する。


分類体系を変更しても、
過去データとの意味的な連続性を失わない設計とする。


## 8. 変更履歴を保持する

Semantic体系を変更した場合は、

- 旧分類
- 新分類
- 変更理由
- 変更日時
- 承認者
- 統合元
- 統合先
- 移動履歴

などを追跡可能にすることが望ましい。

過去のEvidenceや原本情報は変更しない。


## 9. 原本・EvidenceとMeaningを分離する

原本の事実はそのまま保持する。

AIKOの解釈、
施設職員の補足、
RISEN管理者の補足、
Formal Meaningは別の層として扱う。

分類体系の変更によって、
原本Evidenceを書き換えてはならない。


## 10. RISEN CAREの基本思想

RISEN CAREのSemantic管理は、

「分類を作る仕組み」

ではなく、

「意味体系を育てる仕組み」

とする。


AIがデータを分類するほど、
分類数が無制限に増える構造を避ける。

既存体系の再利用を基本とし、
本当に必要な場合だけ新しいMeaning・分類を追加する。

体系そのものも、
運用とEvidenceの蓄積に合わせて進化できるようにする。
