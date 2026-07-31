# RISEN CARE Connect データモデル設計原則

## ID命名規則

RISEN CARE標準では、単独の `id` は採用しない。

必ず識別対象が分かる名称を使用する。

例

- resident_id
- staff_id
- support_record_id
- facility_id
- service_id

## 施設側DBの id

施設DBでは `id` という名称が使われている場合がある。

この `id` は意味が不明なため、自動判定しない。

利用者が必ず分類する。

候補例

- 記録ID
- 利用者ID
- 職員ID
- 施設ID
- 内部管理ID
- マッピング対象外

## AIマッピングルール

AIは

- resident_id
- staff_id
- record_date

など意味が明確な項目のみ自動提案する。

単独の `id` は自動確定しない。