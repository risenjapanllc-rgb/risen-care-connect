# Server Trust Boundary Deployment v0.1

## 1. Purpose

この文書は、RISEN CARE Server Trust Boundary の配置責任とシステム境界を定義する。

目的は、施設側コンポーネント、既存 GAS Backend、Supabase、AIKO と Server Trust Boundary の役割を分離し、認証・施設境界・resident matching・保存判断を安全に実行できる配置を明確にすることである。

具体的なクラウドサービス、ホスティング製品、デプロイ方式は v0.1 ではまだ決定しない。

## 2. Deployment Principle

RISEN CARE Server Trust Boundary は、施設PC上の Local Connector または RISEN CARE Connect の内部に置かない。

Server Trust Boundary は RISEN CARE 側が管理するサーバー実行環境に配置し、施設側から HTTPS でアクセスする構成を基本とする。

施設側から送信された facilityId、residentId、role、permission などを、その値だけで信頼してはならない。

## 3. Facility-Side Components

Local Connector は、許可されたローカルフォルダから Word / Excel を読み取り、安全な抽出と標準化を行う施設側コンポーネントである。

RISEN CARE Connect は、施設側の既存システムやデータソースとの統合を担当する。

Local Connector と RISEN CARE Connect は facility authority、resident authority、human authorization authority を持たない。

施設側コンポーネントに Supabase service_role key を保存してはならない。

## 4. Server-Side Trust Boundary

RISEN CARE Server Trust Boundary は、RISEN CARE 側で管理される信頼境界である。

少なくとも次の責任を持つ。

- Connector Identity の検証
- Connector と facility の登録関係の確認
- facilityId の確定
- human actor authorization の検証
- payload validation
- Resident Repository の呼び出し
- ResidentMatcher の実行
- Storage Policy に基づく保存可否の判断
- Supabase への安全なサーバー側アクセス

Server Trust Boundary は、Local Connector が自己申告した施設情報や resident identity を最終的な信頼情報として扱わない。

## 5. Existing Components

既存の RISEN CARE Connect server.js は施設側統合 PoC として扱い、v0.1 では Server Trust Boundary そのものとして扱わない。

既存 GAS Backend は現在の AIKO および既存業務処理の役割を維持し、Connector 向け Server Trust Boundary として直接流用しない。

既存コンポーネントの役割変更は、認証、認可、tenant boundary、secret management を含む別途の設計確認なしに行わない。

## 6. Ingestion and Human Management Paths

Connector による通常の自動データ取込と、人間による重要な管理操作は別の認証・認可経路として扱う。

自動データ取込では、Connector Identity と Connector credential を検証し、サーバー側の登録関係から facilityId を確定する。

通常の自動データ取込に human actor のログインを常時必須とはしない。

resident の facility assignment、facility correction、権限変更などの人間による重要操作では、authenticated human actor と対象 action の authorization を別途確認する。

Connector credential だけで human management action を許可してはならない。

## 7. Supabase and Secret Boundary

Supabase への privileged access は RISEN CARE 側の信頼されたサーバー実行環境に限定する。

Supabase service_role key、Connector credential のサーバー側検証情報、その他の秘密情報を施設側コードやブラウザへ公開してはならない。

秘密情報はログ、監査記録、通常の API response に含めない。

具体的な secret storage、credential hashing、rotation、revocation の方式は後続設計で確定する。

## 8. Failure and Default Deny

Connector Identity、facility 登録関係、必要な human authorization、payload validity のうち、その処理に必要な条件を確認できない場合は処理を許可しない。

facilityId または residentId をクライアント側の推測で補完しない。

Trust Boundary が利用できない場合に、施設側から Supabase へ privileged access する迂回経路を設けない。

## 9. v0.1 Non-Goals

この文書では以下をまだ決定しない。

- クラウド事業者またはホスティング製品
- Node.js、Edge Functions などの具体的な実行方式
- API endpoint の具体的な URL
- Connector credential の具体的な認証方式
- secret storage の具体的な製品または方式
- deployment pipeline
- scaling 構成

これらは Server Trust Boundary の責任境界を維持した上で、後続の技術選定で決定する。
