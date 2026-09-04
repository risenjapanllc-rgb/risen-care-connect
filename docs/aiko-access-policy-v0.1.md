# AIKO Access Policy v0.1

## 1. 目的

AIKOがRISEN CAREに保存された情報を利用する際の
基本的なAccess Policyを定義する。

重要原則:

保存されている
!=
AIKOが利用してよい

AIKOは、
保存されているResident Dataを
無条件にすべて参照しない。

質問、
利用目的、
利用者権限、
対象Resident、
必要な期間、
Module Classification、
Facility Policy

に応じて、
必要な情報だけを参照する。

## 2. AIKOの基本的な役割

AIKOは支援者に代わって
最終判断を行うものではない。

AIKOの主な役割:

- 必要な情報を探す
- 関係する情報を集める
- 整理する
- 関連づける
- 時系列で比較する
- 変化を確認しやすくする
- 振り返り材料を提示する

人が担うこと:

- 本人を見る
- 背景を考える
- チームで話し合う
- 評価する
- 支援方法を決める
- 最終判断する

基本:

AIKO = 探す・整理する
Human = 考える・判断する

## 3. Access Boundary

次を分離する。

- Dataが存在する
- Dataが保存されている
- Userが閲覧権限を持つ
- AIKOが現在の目的で利用できる

これらは同じではない。

AIKO Accessは
Server-side Policyによって決定する。

ClientやAIKO自身が
Access範囲を自由に拡張しない。

## 4. Access Mode

v0.1では、
少なくとも次のAccess Modeを概念上区別する。

- NORMAL_SUPPORT
- EMERGENCY

Access Modeは
Data Access Policy上の区分である。

Access Modeを
UIのタブ構成と同一視しない。

## 5. NORMAL_SUPPORT

NORMAL_SUPPORTは
日常的な支援相談、
振り返り、
支援計画との比較、
変化確認等を想定する。

基本参照Module候補:

- Support
- Assessment
- Plan
- Monitoring

例:

「最近の支援状況を整理して」

「最近変わったことはある？」

「個別支援計画と最近の記録を比較して」

「前回モニタリング以降の変化を確認したい」

## 6. NORMAL_SUPPORTでも全部読まない

Support、
Assessment、
Plan、
Monitoringであっても、
全Dataを無条件にAIKOへ渡さない。

質問に応じて、

- 対象Resident
- Semantic Type
- 期間
- Document Type
- Record
- 必要なField

を絞る。

例:

「最近の様子」

であれば、
必要性がない限り
過去の全期間をAIKOへ渡さない。

## 7. Resident Boundary

通常のResident支援相談では、
確認済みresidentIdを基準として
Dataを取得する。

PENDING_REVIEW、
未確定Resident Association、
無効化された旧Mappingに基づくDataを
通常のAIKO分析へ混ぜない。

Resident Associationが訂正された場合、
現在有効なAssociationを使用する。

## 8. Storage Boundaryとの分離

Storage Policyによって
CONFIRMEDとして保存可能でも、
AIKO Accessが自動的に許可されるわけではない。

Storage Decision
と
AIKO Access Decision
を分離する。

## 9. Sensitive Module

次のModuleは
NORMAL_SUPPORTへ無条件に含めない。

例:

- Family
- Emergency
- Medical
- Billing
- Contract
- Incident

必要性、
User Role、
Purpose、
Facility Policy、
Classification

に応じて
追加Accessを判断する。

## 10. Medical Data

Medical Dataは
特に慎重に扱う。

通常の支援相談だからという理由だけで
Medical Data全体をAIKOへ渡さない。

支援上Medical Dataが必要な場合でも、

- 利用目的
- User権限
- 必要なField
- 必要な期間

を確認し、
必要最小限を取得する。

AIKOは
診断や医療上の最終判断を代替しない。

## 11. Family Data

Family Dataを
通常支援の基本Accessへ
無条件に含めない。

家族との連絡、
家族から得た支援上必要な情報等を
利用する場合は、
Purposeと権限に応じて
必要な情報だけを取得する。

家族の電話番号等を
支援相談と無関係に
AIKOへ渡さない。

## 12. Emergency Data

Emergency Dataは
NORMAL_SUPPORTと分離する。

緊急時に必要となり得る例:

- 緊急連絡情報
- 緊急対応上必要なMedical情報
- 注意事項
- 施設が定める緊急対応情報

ただし、
Emergency Dataであることを理由に
全Sensitive Dataを無条件に取得しない。

## 13. EMERGENCY Mode

EMERGENCYは、
緊急対応に必要な情報へ
迅速かつ安全にAccessするための
Policy上のModeとする。

概念:

Emergency situation
->
User / Context verification
->
EMERGENCY Access Policy
->
必要な情報だけ取得
->
人の対応を支援

## 14. Emergency Accessの安全原則

緊急時であっても、

- facility boundary
- authenticated user
- role
- resident context
- purpose
- classification
- server-side policy

を無視しない。

ただし、
緊急時に通常業務と同じ操作量を
要求することが安全とは限らない。

具体的なEmergency Workflowは
実際の施設運用を確認して
別途設計する。

## 15. AIKOによるMode自動切替

v0.1では、
AIKOが質問文だけを根拠に
EMERGENCYへ自由に切り替え、
Sensitive Dataを自動取得する仕様を
確定しない。

将来候補:

- Userによる明示操作
- AIKOがEmergency Accessを提案
- 権限確認後に切替
- Facility PolicyによるWorkflow

具体方式は未確定とする。

## 16. UIを固定しない

Access Modeの設計と
UI Designを分離する。

将来UI候補:

- Google検索型の一画面
- NORMAL_SUPPORT / EMERGENCYのタブ
- 一画面 + 緊急情報確認ボタン
- AIKOとの会話から必要時に追加確認
- その他の施設向けUI

v0.1では
どの方式にも固定しない。

## 17. UI変更可能性

施設ヒアリング、
実証利用、
職員の操作性、
誤操作、
緊急時の運用

を確認しながら、
UIは変更可能とする。

UI変更だけを理由に
Server-side Access Boundaryを
作り直す必要がない構造を目指す。

## 18. Progressive Disclosure

Sensitive Informationを
最初から大量表示しない。

通常は
必要な情報だけ表示し、
必要な場合に
追加情報へAccessする方式を
候補とする。

本人確認UIの
「詳しく確認」と同様に、
情報量と安全性の両方を考慮する。

## 19. User Role

AIKO Accessは
AIKO自身がUser Roleを自己判断しない。

Serverが確認した
Authenticated User / Roleを使用する。

Clientから送られたRole文字列だけを
Access根拠にしない。

## 20. Purpose

Purposeは
AIKO Access判断の一要素とする。

例:

- 日常支援
- 支援計画作成
- モニタリング
- 緊急対応
- 家族連絡
- 医療連携

ただし、
ClientがPurposeを指定しただけで
Access権限を拡張しない。

Purpose
+
Role
+
Resident Context
+
Classification
+
Facility Policy

等をServer側で評価する。

## 21. Data Minimization

AIKOへ渡すDataは
現在の目的に必要な範囲へ絞る。

原則:

必要なResidentだけ
必要なModuleだけ
必要なFieldだけ
必要な期間だけ

を目指す。

「使うかもしれない」
という理由だけで
全DataをAIKO Contextへ投入しない。

## 22. Raw Document

Word / Excel等の
Raw Document全文を
AIKOへ常時渡すことを標準としない。

RISEN Standard、
Semantic Records、
Provenance等から
必要な情報を取得することを基本候補とする。

Raw Contentが必要な場合のAccessは
別途Policy対象とする。

## 23. Provenance

AIKOが情報を整理する場合、
可能な範囲で
情報の出所を追跡できる構造を維持する。

例:

- source document
- source record
- document type
- source updated time
- extraction / mapping information

AIKOの要約だけが
唯一の根拠にならないようにする。

## 24. AIKO OutputとSource Dataの分離

AIKOが生成した、

- 要約
- 比較
- 気づき候補
- 関連候補
- 振り返り材料

を
元のSource Dataそのものとして扱わない。

AIKO Generated Dataと
Source / Confirmed Dataを分離する。

## 25. Correction Impact

Resident Associationや
Source Recordが訂正された場合、
訂正前Dataを根拠にした
AIKO Derived Outputが
現在も有効とは限らない。

将来、

- stale
- invalidated
- needs_recalculation

等を区別できる構造を検討する。

訂正済みの誤Dataを
AIKOが現在の正しい情報として
継続利用しない。

Resident Associationが訂正された場合、
訂正前のResidentの
現在のAIKO検索結果、
要約、
比較、
関連候補等から
誤って紐づいていたDataを
継続利用しない。

必要に応じて、
影響を受けたAIKO Derived Outputを
無効化または再評価する。

訂正後のResidentについても、
訂正されたSource Dataを
新しい別Source Recordとして複製せず、
現在有効なAssociationに基づいて
必要なAIKO処理を再評価する。

## 26. Facility Policy

施設ごとに
AIKOの利用範囲を調整できる構造を目指す。

変更候補:

- 利用可能Module
- Role別Access
- Emergency Workflow
- 追加確認
- UI
- Purpose
- 表示Field

ただし、
Facility Policyによって
RISEN CAREの最低安全基準を
弱めない。

## 27. AIKO Usage Class

Module Classificationとは別に、
AIKO利用上の区分を持つ。

概念候補:

AIKO_DEFAULT
- 通常支援で利用候補

PURPOSE_RESTRICTED
- 特定Purposeでのみ利用候補

ROLE_RESTRICTED
- 特定Roleでのみ利用候補

EXCLUDED
- AIKO通常利用から除外

Classification
と
AIKO Usage Class
を同一視しない。

## 28. 初期方向性

v0.1の初期方向性:

Support
- NORMAL_SUPPORT基本候補

Assessment
- NORMAL_SUPPORT基本候補

Plan
- NORMAL_SUPPORT基本候補

Monitoring
- NORMAL_SUPPORT基本候補

Family
- PURPOSE_RESTRICTED候補

Emergency
- EMERGENCY中心

Medical
- PURPOSE_RESTRICTED / ROLE_RESTRICTED候補

Billing
- 通常支援AIKOからEXCLUDED候補

Contract
- PURPOSE_RESTRICTED候補

Incident
- PURPOSE / ROLE制御候補

これは最終固定ではなく、
施設運用と安全性を確認して更新する。

## 29. Fail Safe

Access判断が不明な場合、
AIKOへDataを広く渡す方向へ
自動的に倒さない。

不明な場合は、

- Accessしない
- 追加確認する
- Userへ必要な操作を求める
- Human Reviewへ渡す

等を優先する。

## 30. Audit

将来、
Sensitive DataへのAIKO Accessについて
必要なAuditを検討する。

候補:

- who
- when
- resident
- purpose
- module
- access decision
- policy version

Auditへ
不要なRaw Personal Dataを
無条件に記録しない。

## 31. Server Trust Boundary Responsibility

AIKO Accessの最終判断は
RISEN CARE Server Trust Boundary側で行う。

Server側の責務候補:

- authenticated user確認
- facility boundary確認
- resident context確認
- role確認
- purpose評価
- classification評価
- Facility Policy適用
- AIKO Usage Class適用
- Data Minimization
- Access Decision
- Audit

AIKO自身を
Access Authorityにしない。

## 32. v0.1で固定しないこと

- AIKO画面構成
- Google検索型かタブ型か
- Emergency Buttonの有無
- Mode切替UI
- Mode自動判定方式
- Role最終一覧
- Purpose最終一覧
- Field単位Access Rule
- Emergency Workflow
- Audit Table
- Derived Output Table
- Raw Content Access方式
- LLM Providerへの最終送信方式

## 33. 次の設計課題

- Resident Matcher request / response
- Explicit Resident Mapping
- Record Version Model
- Missing / Deletion Policy
- Facility / Form Mapping
- Audit Event Model
- AIKO Retrieval Policy
- Emergency Workflow
- Server Trust Boundary実装
