# RISEN CARE Connect

RISEN CARE Connectは、障害福祉・介護事業所で使用されている外部システムや
MySQLデータベース、CSV、APIなどのデータを、
RISEN CARE標準データモデルへ接続するためのデータ連携基盤です。

RISEN CARE Connectの目的は、
単に外部データを取得することではありません。

施設ごとに異なるデータ構造・項目名・形式を吸収し、
AIKOが検索・分析・回答に利用できる
**信頼できる標準データを生成すること**を目的とします。

---

# Concept

> **施設ごとの違いを吸収し、意味の統一されたデータへ。**

RISEN CARE Connectは、
単なるデータベース接続ツールではありません。

接続先ごとに異なる項目名やデータ構造を
RISEN CARE標準データモデルへマッピングし、

- AI
- API
- Analytics
- Dashboard
- External Systems

から共通利用できる状態へ整えます。

RISEN CARE Connectは施設ごとの差異を吸収し、
AIKOが一貫したデータとして
検索・分析・活用できる環境を提供します。

---

# Core Principle

RISEN CARE Connectの基本原則は、

> **Standardize before Intelligence.**

です。

AIによる分析や推論の前に、
信頼できるデータ構造を構築します。

```text
Facility Data

↓

RISEN CARE Connect

↓

RISEN Standard Data

↓

AIKO

↓

Understanding
```

AIの品質は、
AIモデルだけでは決まりません。

AIが利用するデータの意味・構造・品質が、
回答と分析の品質を支える基盤になります。

---

# Fact, Context and Derived Understanding

> **事実の標準化と、文脈からの理解を分離する。**

RISEN CARE / AIKOでは、

- **Fact（事実）**
- **Context（文脈）**
- **Derived Understanding（文脈から導出された理解）**

を明確に区別します。

これは睡眠、興奮、転倒、食事、排泄など、
特定の分析領域だけに適用される考え方ではありません。

すべてのObservation Intelligenceに共通する
基本原則です。

---

## Fact

Factは、
記録から直接確認できる内容です。

例えば、

```text
23:00 入眠
02:00 大声
06:30 起床
```

という記録が存在する場合、

確認できるFactは、

- 23:00に入眠の記録がある
- 02:00に大声の記録がある
- 06:30に起床の記録がある

ということです。

Factには、
記録に存在しない意味を追加しません。

RISEN CARE Connectは、
これらのFactを標準化し、
元のObservationとの追跡可能性を保持します。

---

## Context

Contextは、
個々のFactを理解するための背景情報です。

Contextには、例えば以下が含まれます。

- 前後のObservation
- 時系列
- 時間帯
- 同日の出来事
- 本人の日常的な状態
- 過去の類似Episode
- 本人固有の行動パターン
- 環境変化
- 支援内容
- その後の状態

同じObservationであっても、
Contextによって意味が異なる場合があります。

そのためAIKOは、
一つの記録だけを切り離して判断するのではなく、
関連するContextを考慮します。

---

## Derived Understanding

Derived Understandingは、
FactとContextを組み合わせることで
合理的に導出される理解です。

Derived Understandingは、
Factではありません。

例えば、

```text
23:00 入眠

02:00 大声

06:30 起床
```

というFactが存在しても、

```text
02:00 途中覚醒
```

と直接記録されていなければ、
途中覚醒をFactとして扱ってはなりません。

「大声」というObservationだけでは、

- 覚醒して発声した
- 半覚醒状態で発声した
- 寝言や夢に伴って発声した

など、
複数の可能性が存在するためです。

---

## Context-aware Understanding

一方でAIKOは、
Factだけを機械的に判定するのではありません。

例えば、

- 本人は通常、睡眠中に大声を出さない
- 過去に夜間の大声と覚醒・離床が関連している
- 大声の直後に職員への呼びかけがある
- その後に再入眠を示す記録がある
- 過去の類似Episodeでは覚醒が確認されている

といったContextが存在する場合、

AIKOは、

> 「02:00頃に途中覚醒していた可能性が高いと推定されます」

と導出することができます。

これは記録されたFactではなく、

**FactとContextから導出された理解**

です。

AIKOは、
Derived Understandingを回答する場合、
必ず推定であることが分かる表現を使用します。

例：

- 「推定されます」
- 「可能性があります」
- 「〜と考えられます」
- 「記録の前後関係から、〜であった可能性が高いと考えられます」

---

## Resident-specific Context

AIKOは、
一般的なルールだけで利用者の状態を判断しません。

同じObservationでも、
利用者によって意味が異なる可能性があります。

そのためAIKOは、

```text
Current Observation

↓

Previous / Next Observation

↓

Resident History

↓

Similar Episodes

↓

Individual Pattern

↓

Current Context

↓

Derived Understanding
```

という考え方を基本とします。

一般的な傾向だけではなく、
本人について継続的に蓄積されたObservationから確認できる
個別の傾向をContextとして利用します。

---

## Alternative Interpretations

一つのObservationから
複数の合理的な解釈が存在する場合、

AIKOは一つの解釈だけを
Factとして採用しません。

例えば睡眠中の「大声」について、

```text
Interpretation A
覚醒して発声した

Interpretation B
半覚醒状態で発声した

Interpretation C
睡眠中の寝言・夢に伴う発声だった
```

という複数の可能性があります。

十分なContextがない場合は、

> 「大声の記録はありますが、覚醒していたかは確認できません」

と回答します。

一方、
本人固有のContextや前後のObservationから、
特定の可能性を支持するEvidenceが存在する場合は、

> 「途中覚醒していた可能性が高いと推定されます」

のように、
推定であることを明示して回答します。

---

## Confidence

Derived Understandingには、
その理解を支えるEvidenceの強さを持たせます。

### HIGH

複数のFact、
前後関係、
本人固有の過去パターンが一致している。

### MEDIUM

前後関係から合理的に推定できるが、
直接確認されたFactは存在しない。

### LOW

可能性は存在するが、
判断に必要なContextが不足している。

Confidenceは、
Factそのものの確実性を表すものではありません。

あくまで、

**Derived Understandingを支えるEvidenceの強さ**

を表します。

---

## Evidence

Derived Understandingには、
必ず根拠となったObservationを紐付けます。

例：

```text
Derived Understanding

02:00頃に途中覚醒していた可能性が高い

Confidence

HIGH

Evidence

- 23:00 入眠
- 02:00 大声
- 02:03 職員への呼びかけ
- 02:15 再入眠
- 過去の類似Episode
```

これにより職員は、

**AIKOが何を根拠としてその理解を導いたのか**

を確認できます。

---

## Fact and Inference Boundary

RISEN CARE / AIKOでは、
FactとInferenceの境界を保持します。

```text
Observation

↓

Fact

↓

Context

↓

Derived Understanding

↓

Evidence + Confidence

↓

Answer
```

重要なのは、

**「推定すること」と「事実を作ること」は異なる**

という点です。

AIKOは、
根拠のない内容を生成してはなりません。

一方で、
記録に直接書かれていないという理由だけで、
合理的に導出できる理解をすべて放棄するものでもありません。

AIKOは、

**Factを保持しながら、
Contextから可能性を導き、
その根拠と不確実性を明示します。**

---

## Principle

> **AIKO derives understanding from facts and context.**
>
> **It never presents derived understanding as fact.**

AIKOは、
事実と文脈から理解を導出します。

ただし、
導出した理解を事実として扱いません。

AIKOの役割は、
記録に書かれている内容だけを繰り返すことではありません。

また、
根拠のない推測を行うことでもありません。

**事実を保持し、文脈を読み、
根拠を示しながら可能性を導き出すこと。**

これをRISEN CARE / AIKOにおける
Context-aware Intelligenceの基本原則とします。

---

# Architecture

RISEN CARE Connectは、
施設システムとAIKOの間に位置します。

```text
Facility Systems
(MySQL / CSV / API)

        │
        ▼

RISEN CARE Connect

- Data Acquisition
- Column Mapping
- Standardization
- Validation
- Quality Check

        │
        ▼

RISEN CARE Standard Data

        │
        ▼

AIKO

- Search
- Summary
- Aggregation
- Comparison
- Trend Analysis
- Pattern Analysis
- Context-derived Understanding
- Evidence-based Answer
- Recommendation Support
```

---

# Basic Flow

RISEN CARE Connectの基本処理フローは以下です。

```text
1. データソース接続

↓

2. テーブル / データセット選択

↓

3. カラム取得

↓

4. RISEN CARE標準項目へのマッピング

↓

5. マッピング設定保存

↓

6. データ検証

↓

7. 品質チェック

↓

8. RISEN CARE標準データ生成

↓

9. データ同期

↓

10. AIKOによる検索・分析・回答・提案
```

---

# Responsibility

RISEN CARE ConnectとAIKOは、
責務を明確に分離します。

## RISEN CARE Connect

RISEN CARE Connectは、
施設ごとのデータ構造や項目名の違いを吸収し、
信頼できるRISEN CARE標準データを生成します。

担当範囲：

- データ取得
- データソース接続
- テーブル取得
- カラム取得
- カラムマッピング
- データ型変換
- データ標準化
- データ検証
- 品質チェック
- 標準データ生成
- データ同期

RISEN CARE Connectは、
記録内容の分析・推論・提案を行いません。

ConnectにAI的な推測を持ち込まず、
データを可能な限り事実に忠実な状態で標準化します。

---

## AIKO

AIKOは、
RISEN CARE Connectによって標準化されたデータを利用する
Evidence-Based Analytics AIです。

担当範囲：

- 情報検索
- 記録検索
- 要約
- 集計
- 比較
- 時系列分析
- 傾向分析
- パターン分析
- Context分析
- Derived Understanding
- Evidence生成
- Confidence評価
- 回答生成
- 通知
- 事前対応支援
- 提案

AIKOは、
施設固有のデータ構造を直接解釈しません。

RISEN CARE標準データを根拠として分析します。

---

# Responsibility Boundary

```text
Facility System

↓

RISEN CARE Connect
「Factを信頼できる標準データにする」

↓

RISEN CARE Standard Data

↓

AIKO
「FactとContextから理解を導く」

↓

Derived Understanding
「推定として保持する」

↓

Evidence + Confidence

↓

Professional Judgment
「人が意味を確認し、最終判断する」
```

この責務境界を維持することを、
RISEN CAREの重要な設計原則とします。

---

# Data Standardization

施設ごとに、
データベース設計や命名規則は異なります。

例えば、

```text
id
record_no
user_no
client_id
memo
note
writer
staff
created
record_date
```

など、
同じ意味でも名称は統一されていません。

RISEN CARE Connectでは、
施設側のデータベースそのものを変更しません。

施設側データの

> **「意味」**

をRISEN CARE標準データモデルへ対応付けます。

```text
Facility Column

↓

Mapping

↓

RISEN Standard Field
```

---

# ID Naming Rules

RISEN CARE標準データモデルでは、
意味の分からない単独の `id` は原則使用しません。

識別対象が分かる名称を使用します。

例：

```text
resident_id
staff_id
support_record_id
facility_id
service_record_id
observation_id
```

施設側で、

```text
id
```

というカラムが使用されている場合、

RISEN CARE Connectが自動的に意味を決めつけてはなりません。

利用者または設定情報によって意味を確認した上で、
適切な標準項目へマッピングします。

---

# Observation Principle

RISEN CAREでは、
Observationを重要な情報源として扱います。

Connectの役割は、
Observationを解釈して結論を出すことではありません。

可能な限り、

- 何が記録されたか
- いつ記録されたか
- 誰についての記録か
- 誰が記録したか
- どの種類の記録か
- 原文は何か

を保持します。

```text
Source Record

↓

Standardized Observation

↓

AIKO Analytics
```

元データへの追跡可能性を維持することを重視します。

---

# Data Quality

RISEN CARE Connectは、
AIKOへデータを渡す前に品質を確認します。

主な確認対象：

- 必須項目
- データ型
- 日付形式
- ID整合性
- NULL
- 重複
- マッピング状態
- 未定義項目
- 不正値
- 参照整合性

品質上の問題があるデータについては、
可能な限り状態を明示します。

AIKOが不完全なデータを
完全なデータとして扱わないためです。

---

# Traceability

RISEN CARE Connectでは、
標準化後も元データを追跡できることを重視します。

可能な限り、

```text
RISEN Standard Data

↓

Source System

↓

Source Table

↓

Source Record

↓

Source Column
```

まで確認できる構造を維持します。

これはAIKOの
Evidence-Based Answerを支える重要な基盤です。

---

# AIKO Integration

AIKOはRISEN CARE標準データを利用して、

```text
Question

↓

Query Intent

↓

Analytics Engine

↓

Context Builder

↓

Derived Understanding

↓

Evidence Builder

↓

Confidence

↓

LLM

↓

Explainable Answer
```

という流れで回答を生成します。

LLMだけで分析結果を作るのではありません。

Connectはこの処理の前段として、

```text
Raw Data

↓

Validated Data

↓

Reliable Standard Data
```

を担当します。

---

# Initial Supported Domain

初期段階では、
介護保険領域より先に
障害福祉領域への標準対応を進めます。

主な対象情報：

- 利用者基本情報
- 受給者証情報
- 連絡先
- 緊急連絡先
- 契約情報
- サービス提供記録
- 支援記録
- ケース記録
- バイタル情報
- 面談記録
- 家族情報
- 職員情報
- 事業所情報

今後、
RISEN CARE標準データモデルを拡張することで
対応領域を広げます。

---

# Supported Data Sources

RISEN CARE Connectは、
特定のデータベース製品に依存しない構成を目指します。

初期対応：

- MySQL
- CSV

将来的な対応：

- REST API
- PostgreSQL
- Salesforce
- Other Databases
- Other Cloud Services

接続方法が異なっても、
最終的にはRISEN CARE標準データモデルへ変換します。

---

# Design Principles

RISEN CARE Connect / AIKOは、
以下の原則に従います。

1. Standardize before Intelligence.
2. Evidence First.
3. Preserve source data.
4. Preserve Observation.
5. Standardize meaning, not facility systems.
6. Separate Fact from Derived Understanding.
7. Do not add unsupported meaning to Fact.
8. Use Context when deriving understanding.
9. Consider resident-specific Context.
10. Keep Derived Understanding explainable.
11. Attach Evidence to derived conclusions.
12. Express uncertainty explicitly.
13. Keep data traceable to its source.
14. Validate before synchronization.
15. Make data quality visible.
16. Absorb facility differences in Connect.
17. Keep analytics and reasoning in AIKO.
18. Keep Connect deterministic where possible.
19. Support professional judgment rather than replace it.
20. Build for future data-source independence.

---

# What Connect Does Not Do

RISEN CARE Connectは、
以下を担当しません。

- 利用者状態の分析
- 傾向分析
- パターン分析
- 原因推定
- 文脈推定
- Derived Understanding生成
- AI回答生成
- ケア提案
- 意思決定

これらはAIKO、
または人による専門的判断の責務です。

---

# Development Policy

新しいConnect機能を追加する際は、
以下を確認します。

1. この処理はConnectの責務か。
2. データ標準化に必要な処理か。
3. 元データに存在しない意味をFactへ追加していないか。
4. AIKO側の分析責務と混在していないか。
5. 元データまで追跡可能か。
6. データ品質を確認できるか。
7. 特定施設だけに依存する実装になっていないか。
8. RISEN CARE標準データモデルとして再利用可能か。

---

# Development Workflow

GitHubを、
開発コードの復旧可能な基準点として使用します。

ローカルファイルだけを
唯一のソースとして開発しないことを原則とします。

開発終了時は以下を確認します。

```bash
git status
git add .
git commit -m "変更内容"
git push
```

重要な実装単位では、
作業途中でもコミットを作成します。

推奨単位：

```text
Design

↓

Implementation

↓

Test

↓

Commit

↓

Push
```

GitHub上の履歴から、
安定した状態へ復旧できる開発運用を維持します。

---

# Repository

```text
risen-care-connect/

├── README.md
├── server.js
├── package.json
├── index.html
├── connection.html
├── mapping.html
├── table-mapping.html
├── validation.html
│
├── js/
│
└── docs/
```

---

# Relationship with RISEN CARE

```text
Facility Systems

↓

RISEN CARE Connect

↓

RISEN CARE Standard Data

↓

RISEN CARE
Observation Intelligence

↓

AIKO
Evidence-Based Analytics AI

↓

Fact + Context

↓

Derived Understanding

↓

Explainable Intelligence

↓

Professional Judgment

↓

Better Care
```

RISEN CARE Connectは、
AIそのものではありません。

**AIが信頼できるFactとContextから考えられる環境をつくるための基盤です。**

---

# RISEN CARE Connect

> **From Different Data to Shared Meaning.**

施設ごとに異なるデータを、

共通して理解できるデータへ。

そして、

そのデータをAIKOによる
根拠ある理解へつなげます。

Powered by **RISEN**