# RISEN CARE Storage Policy v0.1

## 1. 目的

RISEN CAREが
Local Connector / Connectから受信したデータについて、

- 何を保存してよいか
- どの状態で保存するか
- 誰のデータとして確定してよいか
- 確定できないデータをどう扱うか
- 人による誤確認をどう訂正するか
- AIKOが後から安全に利用できる状態をどう作るか

の基本原則を定義する。

## 2. 基本原則

次を分離する。

- 受信した
- 保存してよい
- Residentへ紐づけてよい
- AIKOが利用してよい

これらを同じ意味として扱わない。

received
!=
storable
!=
resident-confirmed
!=
AIKO-accessible

## 3. Storage States

概念上、
少なくとも次の状態を区別する。

CONFIRMED
- Resident Identityが確認済み
- Storage Policyを満たす
- 正式なResident Dataとして保存候補

PENDING_REVIEW
- Resident Identityが未確定
- 人による確認が必要
- 正式なResident Dataへ混ぜない

CONFLICT
- Identity候補が複数
- Mapping等に矛盾
- 自動確定しない

REJECTED
- Payload validation失敗
- Trust Boundary条件未達
- 保存対象外
- 必要なら最小Audit Metadataのみ

## 4. CONFIRMED

CONFIRMEDにできるのは、
少なくとも次を満たす場合とする。

- Connector verification済み
- facilityId確定済み
- Payload validation成功
- Resident Matchingがmatched
- Record Identity Resolutionが安全に成立
- Classification / Module Policyを満たす
- Storage Policyを満たす

matchedであっても、
すべてのFieldを無条件に保存しない。

## 5. PENDING_REVIEW

次の場合は
PENDING_REVIEW候補とする。

- Resident Matchingがneeds_review
- Resident Matchingがunmatched
- 人による確認が必要
- Source Identityが不十分
- 本人候補はあるが確定できない

PENDING_REVIEWを
public.users.idへ無理に紐づけない。

正式なResident Recordへ
無条件に保存しない。

## 6. CONFLICT

次の場合は
CONFLICT候補とする。

- 複数Resident候補が存在
- sourceRecordKey候補が競合
- Mapping結果が矛盾
- 同じSource Identityが複数Recordを主張
- 人の確認結果と既存Mappingが矛盾

CONFLICTを
AIやRuleだけで無理に解消しない。

Human Reviewへ渡す。

## 7. REJECTED

次の場合は
REJECTED候補とする。

- Connector authentication失敗
- facility boundary不成立
- Payload malformed
- protocolVersion非対応
- 必須Field不足
- Storage対象外
- Policy違反

REJECTED Dataを
正式なResident Dataとして保存しない。

必要な場合のみ、
個人情報を最小化した
Audit Metadataを保持する。

## 8. Resident Confirmation Principle

Resident Identityが曖昧な場合、
AIKO / Serverは勝手に確定しない。

概念:

AIKOが候補を探す
-> 候補を整理する
-> 人に提示する
-> 人が確認する
-> 確定する

AIは
候補提示を支援できる。

最終確認が必要なケースでは
人が選ぶ。

## 9. Resident Confirmation UI

v0.1の通常表示候補:

- 氏名
- 所属施設名
- 所属
- 性別

情報を詰め込みすぎない。

候補例:

山田 太郎
○○福祉園 | 生活介護A | 男性

## 10. 詳しく確認

通常画面では
追加の本人確認情報を隠しておく。

「詳しく確認」等の操作で
必要な場合のみ表示する。

v0.1詳細候補:

- 生年月日
- 利用者番号

施設から必要性が確認された場合、
追加情報を表示できる構造を目指す。

## 11. Facility Custom Confirmation Fields

施設ごとに
本人確認で有用な情報が異なる可能性がある。

将来候補:

- 棟
- ユニット
- 部屋番号
- サービス種別
- その他施設固有Field

ただし施設要望だけを理由に
無制限に通常表示へ追加しない。

原則として、
追加情報は詳細確認側へ配置する。

本人確認に必要な範囲へ
Data Minimizationを行う。

## 12. Confirmation InformationとIdentityの分離

氏名、
所属施設名、
所属、
性別、
生年月日等は
人による確認材料として利用できる。

しかし、
表示情報のどれか1つだけで
Internal Resident Identityを確定しない。

Server側のresidentIdは
Resident Matcherと確認結果によって管理する。

## 13. 該当者なし / わからない

確認UIでは、
人に無理な選択を要求しない。

少なくとも将来、

- 該当者なし
- わからない

を選択できる構造を目指す。

「わからない」を選んだDataは
正式Residentへ無理に紐づけない。

## 14. Human Error Principle

人による確認も
常に正しいとは仮定しない。

重要原則:

人が確認した
!=
永久に変更不能

誤確認が判明した場合に
安全に訂正できる構造を持つ。

## 15. Correction

誤ったResidentへ
Recordを紐づけた場合、
後から訂正できるようにする。

概念:

previous resident association
-> correction
-> current resident association

元の履歴を
無条件に消去しない。

## 16. Correction History

将来、
少なくとも次を追跡できる構造を検討する。

- previousResidentId
- newResidentId
- correctedAt
- correctedBy
- correctionReason
- sourceRecordIdentity
- reviewContext

誰が、
いつ、
何から何へ変更したかを
確認できるようにする。

## 17. Current Association

AIKOや通常業務では、
原則として
現在の有効なResident Associationを使用する。

訂正前の誤ったAssociationを
現在の正しいDataとして
継続利用しない。

ただし履歴・監査目的では
過去Associationを保持できる構造を目指す。

## 18. Explicit Resident Mapping

人が確認したSource Identityと
Residentの対応関係を
将来Explicit Mappingとして保持できる構造を目指す。

例:

source resident identifier
+
facility context
->
residentId

ただし、
一度確認されたMappingも
永久固定とはしない。

訂正、
無効化、
再確認ができる構造を目指す。

## 19. Reuse of Human Confirmation

過去に人が確認したMappingは
将来の候補絞り込みに利用できる。

ただし、
既存Mappingがあることだけを理由に
すべての将来Recordを
無条件に自動確定しない。

Facility変更、
Source変更、
Mapping変更、
矛盾等を検知した場合は
再確認できる構造を持つ。

人による訂正によって
旧Mappingが無効になった場合、
その旧Mappingを
将来の自動確定や候補優先の根拠として
再利用しない。

Current Mappingと
Historical / Invalid Mappingを分離する。

Resident Associationの訂正だけを理由に
元のSource Recordを
新しい別Recordとして作り直さない。

## 20. Sensitive Modules

Resident Identityがmatchedでも、
次のModuleは
保存範囲を別途制御する。

例:

- Family
- Emergency
- Medical
- Billing
- Contract
- Incident

matched
!=
all fields storable

とする。

Module Classification、
Field Override、
Facility Policyを適用する。

## 21. Data Minimization

必要だから受信したDataでも、
すべてを永続保存するとは限らない。

保存前に、

- 業務上必要か
- AIKO利用に必要か
- 法令 / 契約上必要か
- Auditに必要か
- 一時保持で足りるか

を区別する。

Raw Document全文を
標準的にSupabaseへ保存しない。

## 22. Pending Data Minimization

PENDING_REVIEWには
本人確認に必要な範囲の
最小限Dataを保持する。

候補:

- safe source metadata
- source resident identifier
- source resident name
- document type
- semantic type
- confirmation用Field
- provenance
- receivedAt

不要なRaw Contentを
無条件に保持しない。

具体的保持Fieldは
Module / Classificationごとに別途定義する。

## 23. Pending Data Access

PENDING_REVIEW Dataは
通常AIKO検索対象へ無条件に含めない。

確認権限を持つ人が
Review UIから確認することを基本とする。

通常利用者が
他ResidentのPending Dataを閲覧できないようにする。

## 24. Promotion

PENDING_REVIEWから
CONFIRMEDへ移行する場合、

- Human Confirmation
- facility boundary
- residentId
- Record Identity
- Classification
- Storage Policy

を再確認する。

単にUIで候補をクリックしたことだけで
すべてのDataを無条件に昇格しない。

## 25. Reversal

CONFIRMED後でも、
誤確認が判明した場合は
安全に戻せる構造を目指す。

概念:

CONFIRMED
-> correction detected
-> association review
-> corrected association
-> history retained

必要に応じて
関連Recordの再評価を行う。

## 26. AIKO Accessとの分離

Storage Policyを満たして保存されたDataでも、
AIKOが利用できるとは限らない。

Storage Boundary
と
AIKO Access Boundary
を分離する。

例:

Medical Data
- Storage: 条件付き保存
- AIKO: Purpose / Role制限

Billing Data
- Storage: 業務上保存
- AIKO: 通常支援AIから除外候補

## 27. Facility Policy

施設ごとに
表示項目や運用差を許容する。

ただし、
Facility Policyによって
RISEN CAREの安全原則を弱めない。

施設ごとに変更可能な候補:

- 確認UIの追加Field
- Review担当Role
- Module利用
- Retention
- Workflow

変更不可またはServer管理候補:

- facility boundary
- Connector authentication
- residentId authority
- access control最低基準
- auditability
- correction history
- sensitive data protection

## 28. Audit

将来、
次のEventを追跡できる構造を目指す。

- received
- matched
- review_requested
- confirmed
- corrected
- mapping_changed
- conflict_detected
- rejected
- promoted

Audit Eventへ
不要なRaw Personal Dataを
無条件に含めない。

## 29. Failure Handling

次の場合、
正式Resident Dataへの保存を急がない。

- Resident Matching不明
- Review未完了
- Mapping矛盾
- Record Identity conflict
- Classification不明
- Payload不完全
- Document Observation不完全

不明な場合は
推測して確定するより
PENDING_REVIEW / CONFLICT / REJECTEDを優先する。

## 30. Server Trust Boundary Responsibility

Server側は、

- Connector verification
- facilityId resolution
- Resident Matching
- Review result validation
- Record Identity Resolution
- Classification Resolution
- Storage State決定
- Correction管理
- Audit

を担当する。

Client / Local Connectorの自己申告だけで
CONFIRMEDへ昇格しない。

## 31. v0.1で固定しないこと

- 実テーブル名
- Pending専用Table構造
- Review UI最終Design
- Confirmation Field最終一覧
- correction approval workflow
- 二重確認が必要なModule
- retention期間
- deletion方式
- explicit mapping table schema
- Audit table schema
- Facility Custom Field設定UI

## 32. 次の設計課題

- AIKO Access Policy
- Resident Matcher request / response
- Explicit Resident Mapping
- Record Version Model
- Missing / Deletion Policy
- Facility / Form Mapping
- Audit Event Model
- Server Trust Boundary実装
