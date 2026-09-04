# RISEN CARE Facility Identity / Connector Trust v0.1

## 1. 目的

Local Connectorから送られるデータが、
どの施設に属するものかを安全に確定するための基本方針を定義する。

facilityIdを施設PCからの自己申告だけで確定しない。

## 2. 現在の状態

既存RISEN CAREにはfacility_idを保持する列や処理が存在する。

一方、現時点で以下は完成済みとは確認できていない。

- 正式な施設マスター
- Connectorと施設の登録関係
- Connector認証
- 認証情報からfacility_idを確定する仕組み
- facility_idを基準とした完全なテナント境界

そのため、これらが既に存在する前提では実装しない。

## 3. 基本原則

Local ConnectorはfacilityIdを最終確定しない。

RISEN CARE側は、
事前に登録されたConnector Identityと施設の関係を検証し、
信頼できるfacilityIdを確定する。

施設PCにはSupabase service_role等の
強いサーバー資格情報を保存しない。

## 4. 基本フロー

Word / Excel
→ Local Connector
→ Connector Identity
→ RISEN CARE Connect / Backend Trust Boundary
→ Connector登録情報を検証
→ facilityId確定
→ Resident Matcher
→ residentId確定
→ Supabase

## 5. Connector Identity

各Local Connector installationには、
施設を直接意味しない一意なConnector Identityを割り当てる。

例:

- connectorId: opaque identifier
- connectorCredential: Connector認証用資格情報
- active: Connectorが現在有効か
- registeredAt: 登録日時

connectorIdそのものを認証の証明として扱わない。

### 5.1 Connector Identityの単位

Connector Identityは施設単位ではなく、
Local Connector installation単位とする。

基本関係:

- 1 facility : N connectors
- 1 connector : 1 installation
- 1 connector : 1 facility

同一施設で複数PCを利用する場合、
各Local Connector installationに別々のconnectorIdを割り当てる。

connectorIdはPCのハードウェア固有IDそのものではない。

再インストールや再登録時には、
必要に応じて新しいConnector Identityを発行できるものとする。

これにより、特定PCのConnectorだけを停止・失効できるようにする。

## 6. Facilityとの関連

RISEN CARE側で次の関係を管理する。

connectorId
→ facilityId

この関連は施設PC側の申告ではなく、
RISEN CARE側の登録情報を正とする。

Connectorが別施設へ変更される場合も、
RISEN CARE側の管理された操作として行う。

### 6.1 Connector初回登録

v0.1では、認証済みの施設管理者が
Connector登録を開始する方式を基本候補とする。

基本フロー:

施設管理者
→ RISEN CARE側でConnector追加を開始
→ 一回限り・短時間有効な登録コードを発行
→ 対象PCのLocal Connectorで登録コードを入力
→ RISEN CARE Backendで登録コードを検証
→ Backend側の登録情報からfacilityIdを確定
→ connectorId / Connector Credentialを発行
→ Connectorを有効化

登録コードにfacilityIdを自己申告させ、
その値だけを信用する方式にはしない。

登録コードの具体的な形式、有効時間、
認証方式はv0.1では確定しない。

将来的には施設ポリシーに応じて、
RISEN側の追加承認を必要とする運用も検討できる。

## 7. 認証・秘密情報の原則

- Supabase service_role keyをLocal Connectorへ配布しない
- facilityIdだけを送信して認証済みとは扱わない
- connectorIdだけでも認証済みとは扱わない
- Connector資格情報はログへ出力しない
- Connector資格情報は平文でDB保存しない方向とする
- 資格情報の失効・再発行を可能にする
- 通信はHTTPSを前提とする

具体的な認証方式はv0.1では確定しない。

### 7.1 Connector Credential

Connector認証では、
connectorIdとConnector Credentialを分離する。

- connectorId: Connectorを識別するための値
- Connector Credential: Connector本人性を検証するための秘密情報

connectorIdだけでは認証を成立させない。

RISEN CARE BackendはCredentialを検証した後、
Connectorがactiveであることを確認し、
サーバー側の登録関係からfacilityIdを確定する。

Credentialそのものをログへ出力しない。

サーバー側ではCredentialを平文保存せず、
検証に必要な安全な形式で保持する方向とする。

施設PC側でも平文設定ファイルへの保存を避け、
OSが提供する安全な資格情報保存機構を優先する。

Credentialの具体的な形式、
ハッシュ方式、保存方式、ローテーション方式は
実装調査後に決定する。

### 7.2 失効

Connector単位でCredentialを失効できるものとする。

特定Connectorを失効しても、
同一施設の他Connectorには影響させない。

PC紛失、交換、再インストール等の場合に、
旧Connectorを停止し、新しいConnectorを登録できるようにする。

### 7.3 Connect / Backend Trust Boundary

v0.1では、
facilityIdを最終確定する責務を
RISEN CARE Backend側に置く。

Local Connectorの責務:

- 許可されたWord / Excelを読み取る
- 必要な情報を抽出・標準化する
- Connector認証に必要な情報を安全に送る
- facilityIdを最終確定しない

RISEN CARE Connectの責務:

- Local Connectorからのデータを安全に中継する
- 必要な形式へ変換する
- クライアント側のfacilityIdを信頼して最終確定しない

RISEN CARE Backendの責務:

- Connector Credentialを検証する
- Connectorがactiveであることを確認する
- サーバー側のConnector登録情報を参照する
- 登録関係からfacilityIdを確定する
- 確定済みfacilityIdだけを後続処理へ渡す

リクエスト本文やLocal Connectorの設定に含まれる
facilityIdだけを根拠として施設を確定しない。

このTrust Boundaryは目標設計であり、
現時点で既存Backendに実装済みであることを意味しない。

## 8. Resident Matcherとの境界

Resident Matcherへ渡すfacilityIdは、
Connector Trust Boundaryで確定済みの値だけを使用する。

入力例:

facilityId
sourceResidentIdentifier
sourceResidentName

Local Connectorが抽出したsourceResidentIdentifierを
直接public.users.idとして扱わない。

## 9. 将来のFacilityモデル

将来的には次のようなFacility Identityを検討する。

- id
- organization_id
- code
- name
- active
- created_at
- updated_at

ただし既存DBとの整合性確認前に
本番テーブルや制約を追加しない。

## 10. v0.1で実施しないこと

- 本番Supabase migration
- 既存public.users制約の変更
- service_role keyのLocal Connector搭載
- facilityIdの自己申告による自動確定
- Connector認証方式の拙速な固定
- 既存RISEN CARE認証方式の置き換え

## 11. 次の実装前確認事項

v0.1ではConnector Trustの基本原則を定義した。

実装前に以下を具体化する。

1. Connector登録APIと管理画面の責務
2. Connector Credentialの具体的な形式・保存・検証方式
3. ConnectからBackendへの通信方式
4. Resident Matcher APIの具体的なrequest / response schema
5. Connector停止・失効・再登録の管理操作
6. Facilityモデルと既存DBの整合性
7. 監査ログとCredentialローテーション方針
