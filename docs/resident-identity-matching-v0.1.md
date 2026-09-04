# RISEN CARE Resident Identity / Matching v0.1

## 1. 目的

施設文書上の利用者識別情報と、RISEN CARE内部の利用者IDを明確に区別する。

施設文書に記載された「利用者ID」「利用者番号」等を、
Supabase public.users.id と直接同一視しない。

## 2. 識別子の基本原則

- sourceResidentIdentifier: 施設文書に記載された利用者識別子
- sourceResidentName: 施設文書に記載された利用者名
- residentId: Resident Matcherによる照合後に確定する public.users.id

## 3. 基本フロー

Word / Excel
→ Local Connector
→ sourceResidentIdentifier / sourceResidentName
→ RISEN CARE Connect
→ RISEN CARE BackendでConnector Trustを検証
→ Backend側の登録情報からfacilityId確定
→ RISEN CARE Backend Resident Matcher
→ Supabase public.users
→ residentId確定

Local ConnectorはresidentIdを推測・確定しない。

## 4. Resident Matcher v0.1 照合ルール

### 4.1 第一優先

facility_id + user_code が完全一致する場合:

- status: matched
- method: facility_user_code
- residentId: public.users.id

### 4.2 移行期間の既存データ

users.facility_id が未設定で、user_code + name が一致する場合:

- status: needs_review
- method: legacy_user_code_name
- 自動確定しない

### 4.3 user_code は一致するが氏名が一致しない場合

- status: needs_review
- method: user_code_name_mismatch
- 自動確定しない

### 4.4 氏名だけ一致する場合

- status: needs_review
- method: name
- 氏名だけでは自動確定しない

### 4.5 候補が存在しない場合

- status: unmatched
- residentId: null

### 4.6 Resident Matcher API契約

Resident Matcherへ渡すfacilityIdは、
Connector Trust Boundaryで確定済みの値だけを使用する。

入力:

- facilityId: Backend側で確定済みの施設ID
- sourceResidentIdentifier: 施設文書由来の識別子
- sourceResidentName: 施設文書由来の利用者名

照合結果は次の3状態とする。

- matched
- needs_review
- unmatched

matchedの場合のみresidentIdを確定する。

needs_reviewでは候補が存在してもresidentIdはnullとし、
候補情報はcandidatesへ分離する。

unmatchedの場合もresidentIdはnullとする。

Local Connectorまたはリクエスト本文から
自己申告されたfacilityIdだけを根拠に
Resident Matcherを実行しない。

## 5. 安全原則

「候補があること」と「本人であることが確定したこと」を区別する。

曖昧な照合結果をAIやシステムが自動確定しない。

現在のLocal Connectorに互換性のため残っているresidentIdを、
Supabaseのresident_idとして直接保存してはならない。

## 6. 将来の識別方針

将来的な利用者識別の基本単位は、
facility_id + user_code とする。

異なる施設で同じ利用者番号が使用される可能性を考慮し、
user_code単独の一意性には永続的に依存しない。

既存public.usersのUNIQUE制約変更や、
既存usersへのfacility_id移行はv0.1では実施しない。

## Resident Matcher Minimum I/O Contract

v0.1では、Resident MatcherはServer Trust Boundaryが確定したfacilityIdと、帳票から得たsourceResidentを入力として扱う。

facilityIdはLocal Connectorの自己申告値を信用しない。

Outputは次の3状態とする。

- matched: 安全に本人を確定できた状態。top-level residentIdにpublic.users.idを返す。
- needs_review: 候補はあるが人の確認が必要な状態。top-level residentIdはnullとする。
- unmatched: 一致候補がない状態。residentIdはnullとする。

sourceResident.identifierは帳票側の利用者番号等であり、public.users.idではない。
sourceResident.nameもSource側で観測された氏名であり、Internal Resident Identityそのものではない。

候補ResidentのIDをcandidatesに含める場合でも、候補であることを本人確定として扱わない。

初期Matching Rule:

- Server verified facility_id + user_code exact -> matched候補
- users.facility_idがNULL + user_code exact + name exact -> needs_review
- user_code exact + name mismatch -> needs_review
- name only match -> needs_review
- no candidate -> unmatched

現在の移行状態ではuser_code一致だけを理由として無条件にmatchedへしない。

needs_reviewでは人が最終確認できる構造とし、「この人」「該当者なし」「わからない」を将来の確認選択肢とする。

Human Confirmationも永久に正しいとは仮定せず、訂正・無効化・再確認可能なExplicit Resident Mappingとして扱う方向とする。

無効化された旧Mappingを将来の自動確定や候補優先の根拠として再利用しない。
