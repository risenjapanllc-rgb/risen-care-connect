# RISEN CARE Connect データ標準化原則

## 目的

RISEN CARE Connect は、施設ごとに異なるデータ構造を
AIKO が理解・検索・分析しやすい標準データへ変換するためのデータ基盤である。

標準化の目的は施設のデータを変更することではなく、
データの意味を統一し、AIが一貫して扱える環境を提供することにある。

---

## ID命名規則

標準データモデルでは単独の `id` は使用しない。

すべてのIDは識別対象が分かる名称とする。

例

- resident_id
- staff_id
- facility_id
- support_record_id
- service_id

---

## 施設側データの取り扱い

施設側データでは `id` のような曖昧な名称が使用されている場合がある。

この場合、自動的に標準項目へ割り当てない。

必ず意味を確認し、適切な標準項目へ分類する。

例

施設側

id

↓

分類

- support_record_id
- resident_id
- staff_id
- facility_id
- 内部管理ID
- マッピング対象外

---

## AIKOとの役割分担

RISEN CARE Connect は
データの「意味」を標準化する。

AIKO は
標準化されたデータを利用して検索・分析・推論を行う。

施設ごとの命名差異をAIKOに吸収させるのではなく、
Connect側で意味を整理することで、
AIKOが安定して動作できる環境を提供する。
