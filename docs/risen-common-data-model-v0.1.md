# RISEN CARE Common Data Model v0.1

## 1. 目的

施設ごとのWord / Excel / CSV / 将来のAPIデータを、
既存の運用を壊さず、
RISEN CAREで共通に扱える意味構造へ変換する。

特定の帳票形式へ施設を合わせるのではなく、
施設ごとの表現をRISEN CAREの共通的な意味へ接続する。

## 2. 基本原則

- 既存のWord / Excel等をできる限りそのまま利用できる
- Coreと各業務Moduleを分離する
- 標準項目と施設独自項目を分離する
- すべての施設にすべてのModuleを必須としない
- 項目の追加・変更・廃止を前提とする
- 過去データとの互換性を守る
- 元データの出所を追跡できるようにする
- AIKOが利用できる情報は目的・役割・権限に応じて制御する
- Local ConnectorがresidentIdやfacilityIdを自己判断で確定しない

## 3. Core

各Moduleから共通して参照できる基盤情報をCoreとする。

主な候補:

- facilityId
- residentId
- sourceResidentIdentifier
- sourceResidentName
- sourceType
- documentType
- sourceFile
- sourceUpdatedAt
- sourceHash
- createdAt
- updatedAt

facilityIdとresidentIdは、
それぞれ定義されたTrust / Matching処理で確定された値を使用する。

## 4. Standard Modules

RISEN CAREは業務領域をModuleとして追加可能にする。

初期の標準領域候補:

- Resident
- Support
- Assessment
- Plan
- Monitoring
- Family / Related Person
- Emergency
- Medical
- Contract
- Service / Attendance
- Billing
- Incident

Moduleは段階的に実装できるものとし、
未使用Moduleが他Moduleの利用を妨げない構造を目指す。

Standard Modulesの一覧は閉じた固定一覧とせず、
施設ニーズや制度変更に応じて
新しいModuleを追加できる構造とする。

利用者と各Moduleの情報は必ずしも1対1ではない。
家族・緊急連絡先・支援記録・契約・サービス実績・請求等について、
1人の利用者に複数件存在できることを前提とする。

## 5. Facility Custom Fields

施設固有の項目をStandard項目へ無理に変換しない。

施設独自項目には将来的に次のような定義を持てるようにする。

- fieldKey
- displayName
- dataType
- module
- required
- active
- version

fieldKeyは安定した内部識別子として扱い、
表示名の変更と分離する。

独自項目を削除する場合も、
過去データとの関係を維持するため
原則として物理削除よりinactiveを優先する。

## 6. Semantic Mapping

施設ごとの表現とRISEN Standardの意味を分離する。

基本レイヤー:

RISEN Standard
→ Facility Mapping
→ Document / Form Mapping
→ Facility Custom Field

例:

施設A「保護者」
→ Related Person

施設B「キーパーソン」
→ Related Person

施設C「成年後見人」
→ Related Person
→ relationshipType = guardian

帳票表現が異なっても、
同じ意味として扱える構造を目指す。

## 7. Versioning

データモデルは将来変更されることを前提とする。

基本原則:

- fieldKeyは可能な限り安定させる
- displayNameは変更可能とする
- 項目廃止はinactiveを基本とする
- 必要に応じてvalidFrom / validToを持てるようにする
- 定義変更によって過去データを無条件に上書きしない
- 制度改定や施設運用変更に対応できる構造を目指す

## 8. Source / Provenance

RISEN Standardへ変換した情報について、
可能な範囲で元データとの関係を追跡できるようにする。

例:

- sourceType
- sourceFile
- sourceUpdatedAt
- sourceHash
- sourceLabel
- extractionMethod

元のWord / Excel等はLocal側に保持することを基本とし、
必要性と安全性を確認せず原本全体をSupabaseへ同期しない。

## 9. AIKO利用境界

Common Data Modelに情報が存在することと、
AIKOがその情報へアクセスできることを分離する。

特に次の情報は権限・利用目的を考慮する。

- 家族・関係者情報
- 緊急連絡先
- 医療・服薬情報
- 契約情報
- 請求情報

将来的に役割・Module・施設ポリシー等を基準として
アクセス範囲を制御できる構造を検討する。

## 10. 実装順序

基本候補:

1. Resident Core
2. Support / Assessment / Plan / Monitoring
3. Family / Emergency
4. Medical
5. Contract / Service
6. Billing
7. Incident
8. Facility Custom Fields拡張

ただし施設ニーズに応じて順序を変更できるものとする。

## 11. v0.1で固定しないこと

- 全Moduleの詳細DB schema
- 請求制度の具体的ロジック
- 全施設共通の必須項目
- Custom Fieldの最終仕様
- AIKOの最終アクセス権限モデル
- 既存Supabase schemaの即時変更
- 既存Word / Excel様式の強制変更

## 12. 次の設計・実装課題

1. Resident Coreの最小schema
2. RISEN Standard Documentとの接続
3. Module識別方法
4. Custom Field定義との接続
5. Semantic Mappingの保存方式
6. Supabaseへ同期する情報とLocalに残す情報の境界
7. schema / mapping versionの管理方法
