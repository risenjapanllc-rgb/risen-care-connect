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
→ facilityIdを接続・認証コンテキストから付与
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
