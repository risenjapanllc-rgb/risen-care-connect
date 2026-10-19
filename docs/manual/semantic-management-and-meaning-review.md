# Semantic管理とMeaning審査

## 1. 基本方針

RISEN CAREでは、施設職員にSemanticコードや内部データ構造を判断させない。

施設職員の役割は、
「その項目が実際には何を意味しているのか」を
自然な言葉で説明・補足することである。

Standard Meaningの設計・承認は、
Semantic管理側で行う。

基本原則：

> 施設職員は意味を説明する。
> Standard Meaningを設計・承認するのはSemantic管理側。

---

## 2. 施設側：Semantic自動整理

施設では「Semantic自動整理」画面を使用する。

CSV・Excel・Word等の原本をRISEN CAREが解析し、
既存のStandard Meaningとの対応を自動判定する。

### 施設職員が行うこと

- 対象書類を選択する
- RISEN CAREによるSemantic解析結果を確認する
- 意味が曖昧な項目について、必要に応じて自然言語で補足する
- RISENから質問が表示された場合、分かる範囲で回答する

### 施設職員が行わないこと

以下を施設職員に判断・入力させない。

- entityName
- fieldName
- semanticType
- Semanticコード
- Standard Meaningの新規設計

---

## 3. RISEN CARE側：Semantic管理

「Semantic管理」は、
Standard Meaningに関するMeaning審査を行うための管理機能である。

通常のシステム管理とは役割を分ける。

### Semantic管理で扱うもの

主に、新しいStandard Meaning候補が発生した場合に審査する。

既存Meaningに明確に一致する項目については、
原則としてSemantic管理者による個別審査を必要としない。

---

## 4. Meaning審査の基本フロー

1. 原本をSemantic自動整理で解析する
2. 既存Meaningとの一致をAIが判定する
3. 意味が曖昧な場合は施設へ自然言語で確認する
4. 施設職員が自然言語で補足する
5. AIが補足内容とEvidenceを含めて再判定する
6. 既存Meaningに一致する場合は既存Meaningへ対応する
7. 新しい意味が必要な場合のみMeaning審査へ送る
8. Semantic管理権限を持つ者が最終判断する

---

## 5. Meaning審査の判断

Semantic管理画面では、
技術的な内部コードを直接操作することを中心としない。

AIが以下の情報を整理して提示する。

- 原本項目名
- 原本値
- 周辺項目
- 施設からの補足
- AIによる意味の解釈
- 既存Meaningとの類似候補
- 新規Meaning候補
- 信頼度
- Evidence

管理者の主な判断は以下とする。

- 承認
- 既存Meaningへ統合
- 保留

内部のentityName、fieldName、semanticType等は
必要に応じて詳細情報として確認できるようにする。

---

## 6. 権限

Meaning審査は一般職員には行わせない。

将来的には通常の管理者権限とは別に、
「Semantic管理権限」を設けることを想定する。

想定する役割：

- 一般職員
  - 自然言語による補足・回答

- 施設管理者
  - 施設内の情報・運用内容の確認

- Semantic管理者
  - Standard Meaningの審査・承認

- システム管理者
  - アカウント、権限、システム設定等の管理

Semantic管理者とシステム管理者は、
必ずしも同一人物である必要はない。

---

## 7. 実例

### 原本

項目名：

「入社日」

### RISEN CARE初期判定

「入社日」という名称だけでは意味を確定できないため未決定。

### 施設への確認

施設職員が自然言語で補足：

「この事業所を利用し始めた日です」

### AI再判定

原本の「入社日」は雇用上の入社日ではなく、
事業所の利用開始日を意味すると判定。

既存の「事業所利用年数」とは別の概念であるため、
新しいMeaning候補として提示。

### Meaning審査

表示名：

事業所利用開始日

正式Meaning：

recipient_certificate.facility_usage_start_date

### 結果

Semantic管理で承認後、
施設側では以下のように表示される。

- 登録済み
- 事業所利用開始日
- recipient_certificate.facility_usage_start_date

---

## 8. 将来の理想フロー

最終的には以下を目指す。

原本読取
→ 既存Meaning自動照合
→ 不明な場合のみ施設へ質問
→ AI再判定
→ 既存Meaningなら自動確定
→ 新規MeaningだけSemantic管理でMeaning審査

Semantic管理画面は日常的に常時操作する画面ではなく、
新しいMeaning候補や判断が必要な案件を扱う
「Meaning審査キュー」として位置付ける。
