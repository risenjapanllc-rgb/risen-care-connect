# RISEN CARE Module Data Classification v0.1

## 1. 目的

RISEN CARE Common Data Modelで扱う情報について、
保存可否とAIKO利用可否を安全に判断するための
基本的なData Classificationを定義する。

本設計ではModule単位のDefault Policyを基本とし、
必要なFieldだけField Overrideできる構造を目指す。

この分類はアクセス許可そのものではない。
最終的なアクセス可否はServer側Policyで判断する。

## 2. 基本原則

- Module単位でDefault Classificationを持つ
- 必要なFieldのみ個別Overrideできる
- 保存可能とAIKO利用可能を分離する
- AIKO自身にアクセス権限を判断させない
- Server側でアクセス可否を決定する
- facility境界を必ず適用する
- resident境界を必ず適用する
- roleとpurposeを考慮する
- facility policyを考慮できる構造とする
- 最小権限・必要最小限の情報提供を基本とする
- 将来のModule追加に対応できる構造とする

## 3. Classification Levels

v0.1では技術・運用上の分類として
次の4段階を候補とする。

### C1: Standard

通常の業務データ。

適切なfacility / resident / role境界の中で
利用可能な候補。

### C2: Controlled

業務上必要だが、
目的や役割による制御が必要な情報。

### C3: Sensitive

家族・連絡先・契約等を含む
慎重な取扱いが必要な情報。

AIKO利用には明示的なPolicy判断を必要とする。

### C4: Highly Sensitive

医療・特に機微性の高い個人情報等を含む
強い制御が必要な情報。

保存されていることだけを理由に
AIKOへ提供しない。

## 4. ClassificationとAccessの分離

Classificationは
データの取扱い判断に使う属性であり、
アクセス許可そのものではない。

概念:

Classification
+
facility
+
authenticated user
+
role
+
resident
+
purpose
+
facility policy
=
Server-side Access Decision

C1であっても
facility境界やrole条件を満たさなければ
アクセスを許可しない。

## 5. Module Default Policy

初期候補を次のように整理する。

### Resident

Default Classification:

C2 Controlled

利用者基本情報を含むため、
通常業務で必要でも無制限には扱わない。

### Support

Default Classification:

C2 Controlled

AIKOの主要利用候補だが、
facility / resident / role / purpose境界を適用する。

### Assessment

Default Classification:

C2 Controlled

AIKOの支援検討候補。

本人情報や背景情報を含む可能性があるため、
必要範囲に限定する。

### Plan

Default Classification:

C2 Controlled

AIKOの主要利用候補。

目標・本人意向・支援方法等を対象とする。

### Monitoring

Default Classification:

C2 Controlled

時系列比較や振り返りで
AIKO利用候補となる。

### Family / Related Person

Default Classification:

C3 Sensitive

氏名・関係性・連絡情報等を含む可能性がある。

AIKOへの提供は
目的とFieldを限定する。

### Emergency

Default Classification:

C3 Sensitive

緊急時には重要だが、
通常のAIKO支援分析で
連絡先詳細が必要とは限らない。

### Medical

Default Classification:

C4 Highly Sensitive

医療・服薬等を含む可能性がある。

AIKO利用は
明示的な目的・役割・Policy判断を必要とする。

### Contract

Default Classification:

C3 Sensitive

契約・資格・制度利用情報等を含む可能性がある。

### Service / Attendance

Default Classification:

C2 Controlled

サービス利用・実績情報。

支援分析や将来の請求処理で利用される可能性がある。

### Billing

Default Classification:

C3 Sensitive

請求・加算・金額等の業務情報。

支援目的のAIKOでは
原則としてDefault利用対象にしない。

### Incident

Default Classification:

C3 Sensitive

事故・ヒヤリハット等。

支援改善に利用価値がある一方、
内容により慎重な取扱いが必要。

## 6. Field Override

Module Defaultより
強い制御または異なる取扱いが必要なFieldは
個別Overrideできる構造を目指す。

例:

Emergency
- emergencyContactExists: C2候補
- contactName: C3
- phoneNumber: C3
- address: C3

Medical
- hasMedicationInformation: C3候補
- medicationName: C4
- dosage: C4
- medicalNotes: C4

Billing
- billingStatus: C2候補
- amount: C3
- detailedClaimData: C3

Field Overrideは原則として
Default Classificationより強い分類に使用する。

Default Classificationより弱い分類へのOverrideは
例外として扱い、
Server-side Policy、
適切な管理権限、
監査可能性を必要とする。

ClientまたはAIKOが独自判断で
Classificationを弱めてはならない。

## 7. AIKO Usage Classes

Data Classificationとは別に、
AIKO利用方針を持てる構造を検討する。

候補:

### AIKO_DEFAULT

通常の許可された支援目的で
AIKO利用候補。

### AIKO_PURPOSE_RESTRICTED

特定purposeの場合のみ利用候補。

### AIKO_ROLE_RESTRICTED

特定roleの場合のみ利用候補。

### AIKO_EXCLUDED

通常のAIKO処理には提供しない。

AIKO Usage Classだけで
アクセスを許可しない。

最終判断はServer側Policyで行う。

## 8. Initial AIKO Direction

初期方針候補:

Support
→ AIKO_DEFAULT候補

Assessment
→ AIKO_DEFAULT候補

Plan
→ AIKO_DEFAULT候補

Monitoring
→ AIKO_DEFAULT候補

Family / Related Person
→ AIKO_PURPOSE_RESTRICTED候補

Emergency
→ AIKO_PURPOSE_RESTRICTED候補

Medical
→ AIKO_PURPOSE_RESTRICTED候補

Contract
→ AIKO_PURPOSE_RESTRICTEDまたはAIKO_EXCLUDED候補

Service / Attendance
→ purposeに応じて利用候補

Billing
→ 支援AIKOではAIKO_EXCLUDEDを基本候補

Incident
→ AIKO_PURPOSE_RESTRICTED候補

これらはv0.1の設計候補であり、
実施設運用・権限・利用目的を確認して確定する。

## 9. Purpose

AIKO Access Policyでは
利用目的を明示的に扱える構造を目指す。

将来候補:

- support_review
- support_planning
- monitoring
- handover
- emergency_support
- medical_support
- incident_review
- billing_support
- management_review

purpose名と詳細定義は
v0.1では固定しない。

## 10. Role

アクセス判断では
認証済み利用者のroleを考慮する。

将来候補:

- support_staff
- service_manager
- medical_staff
- billing_staff
- facility_admin

既存RISEN CAREの認証・role設計との整合を確認してから
正式なrole名を決定する。

Clientが自己申告したroleだけを
権限判断の根拠として使用しない。

## 11. Facility Policy

施設ごとに利用Moduleや
AIKO利用範囲が異なる可能性がある。

そのためServer側で
Facility Policyを持てる構造を検討する。

例:

Facility A
- Support: enabled
- Medical AIKO: disabled
- Billing AIKO: disabled

Facility B
- Support: enabled
- Emergency AIKO: purpose restricted
- Medical AIKO: authorized roles only

Client側設定だけで
Facility Policyを上書きできないようにする。

## 12. Data Minimization

AIKOへ提供する場合も、
許可されたModule全体を常に渡すのではなく、
目的に必要なFieldへ限定する。

例:

緊急支援の有無確認で
emergencyContactExistsが必要でも、
通常はphoneNumberまで
AIKOへ提供する必要がない場合がある。

AIKOへ全データを渡してから
不要情報をAIKO自身に無視させる設計を基本としない。

## 13. Provenance and Classification

Semantic Dataだけでなく、
必要に応じてProvenanceにも
適切な取扱いを適用する。

sourceFile等が
利用者名や機微情報を含む可能性も考慮する。

ファイル名だから安全とは決めつけない。

PC上の絶対パスは
外部へ露出しない原則を維持する。

## 14. Audit

将来的にAccess Decisionについて
次を監査可能にすることを検討する。

- facilityId
- authenticatedUserId
- role
- residentId
- module
- field
- purpose
- classification
- decision
- timestamp

AIKOへ実際に提供した範囲についても
必要な監査設計を検討する。

不要な機微情報そのものを
監査ログへ複製しない。

## 15. Legal and Operational Review

このClassificationは
RISEN CARE内部の技術・運用設計の初期モデルである。

法令上の最終分類や
各施設の個人情報保護運用を
この文書だけで確定するものではない。

本番運用前に、
適用される法令・契約・施設規程・運用要件等との
整合を確認する。

## 16. Versioning

Module ClassificationとField Overrideは
将来変更されることを前提とする。

変更時には
過去Policyとの関係を追跡できる構造を検討する。

候補:

- policyVersion
- validFrom
- validTo
- active
- changedBy
- changedAt

## 17. v0.1で固定しないこと

- 法令上の最終データ分類
- 詳細role一覧
- 詳細purpose一覧
- 全FieldのClassification
- AIKOの最終アクセス権限
- Facility PolicyのDB schema
- Policy管理UI
- retention期間
- 暗号化方式の詳細
- Supabase RLSの具体的Policy

## 18. 次の設計・実装課題

1. Payload最小JSON Schema
2. Storage Policy
3. AIKO Access Policy
4. Facility Policy Model
5. Audit Event Model
6. Resident Matcher request / response
7. sourceHash / change detection
8. Server Trust Boundary実装方式
