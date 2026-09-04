# Legacy Resident Facility Migration v0.1

## 1. Purpose

この文書は、public.users.facility_id が NULL の既存利用者を、安全に施設へ帰属させ、通常の facility-scoped な本人照合へ移行するための方針を定義する。

legacy 処理を恒久的な本人検索方式にはしない。

## 2. Core Principle

facility_id が NULL の利用者について、AI・氏名一致・利用者番号一致だけで施設帰属を自動確定してはならない。

施設帰属は、権限を持つ人が確認した結果をもとに確定する。

確認できない場合は NULL のまま保持し、通常の matched として扱わない。

## 3. Migration Scope

v0.1 の移行対象は public.users.facility_id が NULL の既存 users 行とする。

すでに facility_id が設定されている users 行は、初回の legacy 移行対象外とする。

ただし、この移行処理によって設定された facility_id の訂正は、監査と訂正の対象に含める。

## 4. Responsibility Boundary

Local Connector は施設帰属を決定しない。

ResidentMatcher は legacy 利用者の施設帰属を決定しない。

Resident Repository は legacy 利用者の施設帰属を決定しない。

施設帰属の確認は、認証・認可された管理経路を通じて人が行う。

Server Trust Boundary は、確認操作を行う主体と対象施設を検証する。

## 5. Migration Flow

legacy 利用者の施設帰属移行は、次の順序で行う。

1. facility_id が NULL の対象を移行対象として識別する。
2. 認証・認可された管理者が利用者情報を確認する。
3. 帰属施設を確認できた場合のみ facility_id を設定する。
4. 確認できない場合は facility_id を NULL のまま保持する。
5. 更新結果と確認操作を監査可能な形で記録する。
6. facility_id 設定後は legacy 経路ではなく通常の facility-scoped な本人照合を使用する。

## 6. Human Confirmation

施設帰属の確認は、利用者番号や氏名など複数の確認材料を参照して人が行う。

確認材料が不足している場合、推測によって施設帰属を確定してはならない。

AI は確認材料の整理を支援してもよいが、施設帰属の最終判断を行わない。

## 7. Audit and Correction

施設帰属を更新した操作について、少なくとも対象利用者、変更前の施設、変更後の施設、確認した主体、確認日時を後から追跡できるようにする。

誤った施設帰属が判明した場合に、訂正履歴を残したうえで修正できる設計とする。

過去の確認結果を上書きして履歴を失う方式にはしない。

## 8. Return to Normal Flow

facility_id が安全に設定された利用者は、以後 legacy 候補として扱わない。

通常の Resident Repository は、Trust Boundary で確認済み facilityId と user_code を使った facility-scoped な候補取得へ戻す。

ResidentMatcher は通常ルールに従って matched / needs_review / unmatched を判定する。

## 9. v0.1 Non-Goals

この文書では以下をまだ決定しない。

- 管理画面の具体的なUI
- Supabase update implementation
- 監査テーブルの具体的なスキーマ
- legacy 対象を自動的に施設へ割り当てるロジック
- fuzzy matching
- AIによる施設帰属判定
- facility_id + user_code のDB制約変更

これらは Trust Boundary、認可方式、Repository 実装の責任境界を確認した後に扱う。
