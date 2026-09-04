# Resident Repository Contract v0.1

## 1. Purpose

Resident Repository は、RISEN CARE Server Trust Boundary で確認済みの facilityId と、文書から抽出された source resident identifier を受け取り、ResidentMatcher が本人照合に使用する候補を取得する。

Repository 自身は本人を確定しない。

## 2. Trust Boundary

facilityId は Local Connector やクライアントの自己申告値を信用してはならない。
Server Trust Boundary が Connector Identity と登録関係を検証して確定した facilityId のみを入力として使用する。

Local Connector から Resident Repository を直接呼び出してはならない。

## 3. Minimum Input

Repository の最小入力は次の2項目とする。

- verified facilityId
- sourceResidentIdentifier

sourceResidentName は候補取得条件ではなく、ResidentMatcher による確認材料として扱う。

## 4. Minimum Candidate Output

ResidentMatcher へ渡す候補は、原則として次の最小フィールドに限定する。

- id: public.users.id
- facilityId: public.users.facility_id
- userCode: public.users.user_code
- name: public.users.name
- gender: 必要な場合のみ
- affiliation: 確認画面で必要な場合のみ

Repository は候補を返すだけであり、matched / needs_review / unmatched を決定しない。

## 5. Current Candidate Lookup

通常候補は、Trust Boundary で確認済みの facilityId と userCode の完全一致を基本とする。

将来の基本キーは facility_id + user_code とする。

現行スキーマの user_code グローバル unique 制約を、v0.1 の段階で変更しない。

## 6. Legacy Candidate Lookup

移行期間中は facility_id が NULL の既存 users 行が存在し得る。

legacy 候補は sourceResidentIdentifier と user_code の完全一致を候補取得の入口とするが、facility_id が確認できないため Repository だけで本人確定してはならない。

legacy 候補は ResidentMatcher へ渡し、氏名一致等を確認しても needs_review とする。

legacy 候補に対して residentId を自動確定してはならない。

legacy 検索は移行用の例外経路であり、恒久的な本人照合方式にしない。

facility_id が NULL の全 users を通常運用で無制限に横断検索してはならない。
legacy 候補の検索範囲を安全に限定できない場合は候補を返さず、移行または人による確認へ回す。
具体的な legacy 検索範囲の限定方法は v0.1 Repository 実装前に別途決定する。

## 7. Prohibited Responsibilities

Resident Repository は次を行わない。

- facilityId の自己決定
- Local Connector の facilityId の信用
- fuzzy name matching
- AI による本人推定
- matched の決定
- 人による確認の代替
- ローカル Word / Excel へのアクセス
- service_role credential の施設PCへの配置

## 8. Responsibility Separation

Local Connector: source resident 情報を抽出する。

Server Trust Boundary: Connector を検証し、facilityId を確定する。

Resident Repository: 確認済み facilityId と source identifier を使って候補を取得する。

ResidentMatcher: 候補と source resident 情報を比較し、matched / needs_review / unmatched を判定する。

Supabase: users.id の型、参照整合性、永続データを管理する。

## 9. v0.1 Non-Goals

この契約では以下をまだ決定しない。

- Supabase client implementation
- service_role の具体的な保管方式
- UUID validation implementation
- name-only matching
- fuzzy matching
- facility_id + user_code のDB制約変更
- legacy users の移行手順

これらは Trust Boundary と Repository 実装の責任が確定した後に扱う。
