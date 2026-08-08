# RISEN CARE Connect

RISEN CARE Connectは、障害福祉事業所で使用されている外部システムや
MySQLデータベースとRISEN CAREを接続するためのデータ連携基盤です。

## コンセプト

単なるデータベース接続ツールではなく、接続先ごとに異なる項目名やデータ構造を
「RISEN CARE標準データモデル」へマッピングし、AI・API・画面で
共通利用できる状態に整えます。

RISEN CARE Connectは、施設ごとの違いを吸収し、AIKOが一貫したデータとして
検索・分析・活用できる環境を提供します。

## 基本フロー

1. データベース接続
2. テーブル選択
3. カラム取得
4. RISEN CARE標準項目へのマッピング
5. マッピング設定保存
6. データ同期
7. AIによる検索・通知・提案

## データ標準化の考え方

施設ごとにデータベース設計や命名規則は異なります。

例えば、

- `id`
- `record_no`
- `memo`
- `writer`

など、同じ意味でも名称は統一されていません。

RISEN CARE Connectでは、施設側のデータを変更するのではなく、
データの「意味」を標準化します。

### ID命名規則

標準データモデルでは、単独の `id` は使用しません。

必ず識別対象が分かる名称を使用します。

例

- resident_id
- staff_id
- support_record_id
- facility_id

施設側で `id` が使用されている場合は、自動的に判断せず、
利用者が意味を確認したうえで標準項目へマッピングします。

## AIKOとの役割分担

RISEN CARE Connectは、施設ごとの差異を吸収し、
標準化されたデータを提供します。

AIKOは、その標準化されたデータを利用して、

- 情報検索
- 記録分析
- 通知
- 提案
- 将来的な意思決定支援

を行います。

## 初期対応領域

介護保険よりも先に、障害福祉領域を標準対応します。

主な対象情報

- 利用者基本情報
- 受給者証情報
- 連絡先
- 緊急連絡先
- 契約情報
- サービス提供記録
- 支援記録
- バイタル情報

## Development Workflow

Before ending development:

1. git status
2. git add .
3. git commit
4. git push

GitHub is the source of recovery.

Local files should never be the only source of truth.
