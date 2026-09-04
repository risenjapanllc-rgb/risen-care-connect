# RISEN CARE Resident Core Schema v0.1

## 1. 目的

RISEN CAREにおける利用者Identityの最小構造と、
Word / Excel等から取得したSource Identityを
安全に内部Residentへ接続するための基本原則を定義する。

v0.1では新しい利用者マスタを作成せず、
既存のSupabase public.usersを
RISEN CARE内部の確定Residentとして扱う。

この文書は設計方針であり、
Supabase migrationを直ちに実施するものではない。

## 2. 基本原則

- public.users.idを内部residentIdとして扱う
- sourceResidentIdentifierとresidentIdを混同しない
- facilityIdはServer Trust Boundaryで確定する
- Local ConnectorはresidentIdを最終確定しない
- Resident Matcherのみで自動確定条件を評価する
- 候補と確定Residentを明確に分離する
- needs_reviewを正式な安全保留状態として扱う
- unmatchedデータを無条件に破棄しない
- 人による確認結果を将来監査可能にする
- AIKOは未確定データを確定Resident情報として扱わない

## 3. Internal Resident Identity

RISEN CARE内部で確定したResidentは、
既存のpublic.usersを基準とする。

主な既存項目:

- id
- user_code
- name
- kana
- birth_date
- gender
- facility_id
- active
- source_system
- source_record_id
- updated_at

内部residentId:

residentId = public.users.id

public.users.idはUUIDであり、
元帳票に記載された「利用者ID」等とは区別する。

## 4. Source Resident Identity

Word / Excel等から取得した利用者識別情報を
Source Resident Identityとして扱う。

最小候補:

- sourceResidentIdentifier
- sourceResidentName

将来的な補助候補:

- sourceResidentKana
- sourceBirthDate
- sourceGender
- sourceSystem
- sourceDocument

Source Identityは
内部Residentの確定値ではない。

## 5. Facility Boundary

Local ConnectorはfacilityIdを最終確定しない。

基本フロー:

Connector Identity
→ RISEN CARE Server Trust Boundary
→ Connector Credential検証
→ Connector登録確認
→ facilityId確定
→ Resident Matcher

Resident Matcherは
Server側で確定したfacilityIdを使用する。

リクエスト内で自己申告されたfacilityIdだけを根拠として
Residentを確定してはならない。

## 6. Resident Match Result

Resident Matcherの基本statusは
次の3種類とする。

### matched

意味:

十分な条件で内部Residentを確定できた状態。

結果:

- status = matched
- residentId = public.users.id
- matchMethodを保持可能

### needs_review

意味:

候補は存在するが、
安全に自動確定できない状態。

結果:

- status = needs_review
- residentId = null
- candidatesを確定値とは分離して保持可能

candidateのUUIDを
residentIdへ自動設定してはならない。

### unmatched

意味:

安全に対応づけられるResidentが見つからない状態。

結果:

- status = unmatched
- residentId = null

データを無条件に破棄せず、
後から確認・登録・Mappingできる余地を残す。

## 7. Match Method

v0.1の基本候補:

### facility_user_code

将来的な基本方式。

Server側で確定したfacilityId
+
sourceResidentIdentifier
+
public.users.user_code

による完全一致。

条件を満たした場合、
matched候補とする。

### legacy_user_code_name

既存データでpublic.users.facility_idが
未運用またはnullの場合の移行用方式。

user_code
+
name

が一致しても、
v0.1では自動確定せず
needs_reviewを基本とする。

### user_code_name_mismatch

user_codeは一致するが
nameが一致しない場合。

needs_reviewとする。

### name

名前だけが一致した場合。

needs_reviewとし、
名前だけで自動確定しない。

## 8. Match Result Example

matched例:

status = matched
residentId = <public.users.id UUID>
matchMethod = facility_user_code

needs_review例:

status = needs_review
residentId = null
matchMethod = legacy_user_code_name
candidates = [...]

unmatched例:

status = unmatched
residentId = null
matchMethod = null
candidates = []

## 9. Human Review

needs_reviewやunmatchedについて、
将来的に人が確認できる仕組みを持つ。

監査情報候補:

- reviewedBy
- reviewedAt
- reviewDecision
- reviewReason

人が候補を選択した場合も、
その事実を記録できる構造を目指す。

AIによる推定と
人による確定を区別する。

## 10. Explicit Resident Mapping

人が一度確認したSource IdentityとResidentの関係を
将来再利用できるようにする。

これはAIの暗黙的な学習ではなく、
明示的なMappingとして管理することを基本とする。

概念候補:

- facilityId
- sourceSystem
- sourceResidentIdentifier
- residentId
- active
- confirmedBy
- confirmedAt
- validFrom
- validTo

Mappingは監査・無効化・変更が可能な構造を目指す。

Mappingが存在する場合でも、
施設境界とMappingのactive状態をServer側で確認する。

## 11. Existing public.usersとの関係

v0.1では既存public.usersを置き換えない。

現在のschemaではuser_codeがuniqueであるため、
将来の複数施設運用では
facility_id + user_code等のIdentity設計を
再検討する可能性がある。

ただしv0.1では
既存unique constraintを変更しない。

既存同期処理でfacility_idが十分に設定されていないケースも
考慮し、
legacyデータを自動確定しない。

## 12. AIKO利用境界

AIKOが通常のResident情報として利用できるのは、
原則としてresidentIdが確定したデータとする。

needs_review / unmatchedのデータを
別Residentの情報へ自動的に混在させない。

未確定データを管理画面等で確認可能にする場合も、
通常のResident情報とは表示・処理を分離する。

## 13. Provenance

Resident Matchingについても
可能な範囲で根拠を追跡できるようにする。

将来候補:

- sourceDocument
- sourceResidentIdentifier
- sourceResidentName
- matchMethod
- matchedAt
- mappingId
- matcherVersion

これにより、
なぜそのResidentへ接続されたかを
後から確認できる構造を目指す。

## 14. v0.1で固定しないこと

- 新規Supabase tableの詳細schema
- public.users migration
- user_code unique constraint変更
- Resident Matcherの実装言語
- Connector認証方式
- review UI
- Mapping tableの最終schema
- kana / birth_date等を使った高度な自動照合
- confidence scoreによる自動確定

## 15. 次の設計・実装課題

1. Server Trust Boundaryへの送信payload
2. Resident Matcher request / response schema
3. Explicit Resident Mappingの保存方式
4. Human Review workflow
5. public.usersの将来multi-facility Identity設計
6. provenance保存方式
7. AIKOへの確定データ提供境界
