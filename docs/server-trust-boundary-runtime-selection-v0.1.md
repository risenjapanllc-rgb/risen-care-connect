# Server Trust Boundary Runtime Selection v0.1

## 1. Purpose

この文書は、RISEN CARE Server Trust Boundary の実行方式を選定するための比較分析を提供する。

対象は、Trust Boundary が Connector Identity の検証、facilityId の確定、Resident Repository へのアクセス、ResidentMatcher の実行、Supabase への安全なサーバー側アクセスを行う際の、アプリケーションランタイムとしての実行環境の選択である。

クラウド製品の具体的な選定、deployment pipeline、scaling 構成、endpoint の具体的なURL設計は本文書では扱わない。

## 2. Current Constraints

### 2.1 Existing Codebase

- プロジェクトは CommonJS で統一されている。
- package.json で `"type": "commonjs"` が明示されている。
- 現在の開発環境は Node.js v24.18.0 を使用している。

### 2.2 ResidentMatcher Domain Logic

- ResidentMatcher は server-domain/resident/ に pure な domain class として実装済みである。
- node --test による regression test が整備されている。
- ResidentMatcher は以下を前提としている：
  - facilityId は既に Server Trust Boundary が検証・確定済みであること
  - Local Connector からの自己申告値を信頼しないこと
  - ローカル Word / Excel ファイルにアクセスしないこと
  - Supabase credential を含まないこと

### 2.3 Facility-Side vs. Trust Boundary Separation

- Local Connector / RISEN CARE Connect は施設側コンポーネントであり、Server Trust Boundary ではない。
- Local Connector に Supabase service_role key を保存してはならない。
- facilityId / residentId / role / permission のクライアント自己申告を信頼しない。

### 2.4 Authorization and Authentication Separation

- Connector による通常自動取込と human management action は別の認証・認可経路として扱う。
- Connector credential だけで human management action を許可してはならない。
- Supabase Auth JWT と Connector Identity は同一視しない。
- facility_system JWT が実装済みであることは現在の調査では確認できていない。

### 2.5 Existing Server Components

- 既存 RISEN CARE Connect server.js は施設側統合 PoC であり、Server Trust Boundary そのものではない。
- 既存 GAS Backend は現在の AIKO および既存業務処理の役割を維持し、Connector 向け Server Trust Boundary として直接流用しない。

### 2.6 Cloud Platform

- 具体的なクラウド事業者はまだ決定していない。

## 3. Options

### 3.1 Independent Node.js Server

**定義**：

Node.js アプリケーション（Express.js 等）がサーバー側実行環境として実行される方式。

この方式では、Trust Boundary の責任（Connector 検証、facilityId 確定、Repository 呼び出し、Resident Matcher 実行、Supabase サーバー側アクセス）をすべて Node.js アプリケーション内で実装する。

デプロイメント先は VM、container orchestration、またはマネージドコンテナサービスなど、複数の選択肢が可能。本方式は **アプリケーションランタイムとしての Node.js の選択** であり、ホスティング方式の選定ではない。

**実装の例**：

```javascript
// server-domain を直接 require でインポート
const ResidentMatcher = require('./server-domain/resident/ResidentMatcher');

// Express Middleware が facilityId の検証を行い、
// ResidentMatcher に既検証 facilityId を渡す
app.post('/api/match-resident', (req, res) => {
    const verifiedFacilityId = req.locals.facilityId;
    const matcher = new ResidentMatcher();
    const result = matcher.match({
        facilityId: verifiedFacilityId,
        sourceResident: req.body.sourceResident,
        candidates: req.body.candidates
    });
    res.json(result);
});
```

### 3.2 Supabase Edge Functions

**定義**：

Supabase Edge Functions（Deno ランタイム）で Trust Boundary ロジックを実装する方式。

既存の CommonJS 資産（ResidentMatcher 等）を Deno environment で利用する場合、互換性確認や適応方法の検討が必要になる可能性がある。

Supabase との統合は native に近くなるが、Connector Identity の検証、facilityId の確定、secret storage との関係も Supabase 生態系に依存する。

**制約**：

- Deno runtime では CommonJS の直接的なサポートが限定的。
- 既存 server-domain の CommonJS 資産の再利用には conversion overhead がある。
- Edge Function の cold start、メモリ制限、execution timeout の制約がある。

### 3.3 Container-based Serverless

**定義**：

AWS Fargate、Cloud Run など、container ベースの serverless 環境で Node.js アプリケーション を実行する方式。

Independent Node.js Server と同じコード基盤を使用できるが、ホスティング・スケーリング・管理を serverless プラットフォームが提供する。

cold start は Edge Functions より長いが、ランタイムのパフォーマンスは VM に接近し、memory / CPU の制約はより柔軟。

**制約**：

- セッション状態を memory に保持できない（stateless 要求）。
- startup time により短い request では不利。

## 4. Comparison Matrix

| 比較軸 | Independent Node.js Server | Supabase Edge Functions | Container-based Serverless |
|--------|----------------------------|--------------------------|--------------------------|
| **Connector Identity検証** | Server application で完全制御 | Supabase client library使用 | Server application で完全制御 |
| **facilityId確定** | Trust Boundary middleware で検証 | Edge Function で検証；Supabase auth と連携 | Trust Boundary middleware で検証 |
| **human actor auth/authz** | Server app の認証 middleware で実装；Supabase Auth JWT または別方式 | Supabase Auth 統合；RLS と policy で実装 | Server app の認証 middleware で実装；Supabase Auth JWT または別方式 |
| **facility boundary** | Server application の authorization logic で分離 | Supabase RLS policy で分離；同時に application logic で検証 | Server application の authorization logic で分離 |
| **ResidentMatcher再利用性** | CommonJS asset として直接 require 可能；最高 | 互換性確認・適応検討が必要な可能性；conversion overhead | CommonJS asset として直接 require 可能；最高 |
| **CommonJS/Node.js資産互換性** | 既存 package.json、dependencies 再利用可能；registry で検証済み | Deno 環境への対応には、既存 CommonJS 資産の確認・適応が必要になる可能性がある；build/test pipeline の追加検証や調整が必要になる可能性がある | 既存 package.json、dependencies 再利用可能；registry で検証済み |
| **Supabase privileged access隔離** | Privileged credential を信頼できる backend 環境に限定；施設PC に置かない | Privileged credential を Edge Function 実行環境に限定；施設 client から分離 | Privileged credential を信頼できる backend 環境に限定；施設PC に置かない |
| **Secret Management** | Backend環境への安全な secret injection で管理；deployment system による注入 | Supabase secret 管理；Edge Function 実行環境でのアクセス | Backend環境への安全な secret injection で管理；deployment system による注入 |
| **Audit Trail** | Application logic で explicitly ログ記録；audit table に記録 | Supabase audit log + application event log；dual logging | Application logic で explicitly ログ記録；audit table に記録 |
| **Testing** | node --test を継続利用；既存 test suite 再利用；mock/stub 活用 | Deno test または jest；既存 test suite の移植・適応が必要になる可能性がある | node --test を継続利用；既存 test suite 再利用；mock/stub 活用 |
| **Deployment/Operations** | VM / Container orchestration / managed container など複数の選択肢から段階的に選定可能 | Supabase プラットフォームに依存；deployment は簡潔だが vendor lock-in のリスクがある | Container image を基本単位とし、CI/CD パイプライン対応；auto-scaling 機能 |
| **Future AIKO Integration** | Trust Boundary ロジックと AIKO 呼び出し経路を明確に分離可能 | Supabase RLS + AIKO API を同時に考慮する必要があり、設計複雑性が増加する可能性がある | Trust Boundary ロジックと AIKO 呼び出し経路を明確に分離可能 |
| **Vendor Lock-in / Portability** | Node.js 標準技術；他のプラットフォームへのポータビリティ高い | Supabase Edge Functions に密接に依存；他プラットフォームへの移行コスト高い | Node.js 標準技術；他のプラットフォームへのポータビリティ高い |

## 5. Recommended Direction

### 5.1 First Priority: Independent Node.js Server

**推奨方針**：

**Independent Node.js Server** を v0.1 の第一候補として選定する。これはアプリケーションランタイムとしての Node.js の選択であり、将来の hosting 方式の選定を制限しない。

**根拠**：

1. **CommonJS 資産の最大再利用**
   - 既存 ResidentMatcher、server-domain の pure domain logic を、conversion なしに CommonJS として直接 require 可能。
   - 既存 node --test 回帰 test suite を再利用。
   - package.json の dependencies を継続利用；npm registry との互換性検証済み。

2. **Server Trust Boundary の概念実装に最適**
   - Trust Boundary 責任（Connector 検証→facilityId 確定→ResidentMatcher 実行→Supabase アクセス）を、Node.js Express middleware + application logic として明示的に実装。
   - Connector credential、human actor auth/authz、authorization decision を Server application で **完全制御**。
   - facilityId 確定後の ResidentMatcher 呼び出しフローを明確に設計可能。

3. **Supabase Privileged Access の安全な隔離**
   - Supabase privileged credential（service_role key 等）を信頼できる Server Trust Boundary 実行環境でのみ管理；施設 PC に配置されない。
   - Connector 側は public API のみを呼び出し；Supabase privileged operation は Server Trust Boundary 内で隔離。
   - 具体的な credential 形式、secret storage 製品は後続設計で決定。

4. **Audit と Testing**
   - node --test の既存 test suite を継続利用；新しい Trust Boundary test を追加。
   - audit log を application logic で explicitly 記録；監査可能性が明確。

5. **将来の AIKO 統合**
   - Trust Boundary ロジックと AIKO assistant への呼び出し経路を分離し、段階的に統合可能。

### 5.2 Alternative: Container-based Serverless Deployment

**位置付け**：

Independent Node.js Server の実装と検証が完了した後、hosting/deployment 方式として container-based serverless（AWS Fargate、Cloud Run など）への配置は選択肢として残す。

**重要な区別**：

- **Application Runtime**：Node.js（Trust Boundary ロジック実装）
- **Deployment / Hosting**：VM、Container orchestration、Managed serverless など複数選択肢

この文書は application runtime の選択を扱うもので、hosting 方式の決定ではない。

**将来の構成例**：

```
Node.js Trust Boundary Application
  → Container image でパッケージ
  → Fargate / Cloud Run などの serverless platform にデプロイ
  → Connector からの request に応答
```

- Trust Boundary ロジックのコード基盤は変わらない。
- Development/testing では独立した Node.js server として実行；production では container platform にデプロイという段階的な進化が可能。

### 5.3 Not First Choice for v0.1: Supabase Edge Functions

**v0.1 段階における課題**：

1. **CommonJS 資産の互換性**
   - 既存 server-domain 資産（ResidentMatcher 等）を Deno environment で利用する場合、CommonJS 互換性の確認・適応が必要になる可能性がある。
   - 既存 Node.js test suite（node --test）を Deno environment で実行する際に、追加の検証・移植が必要になる可能性がある。

2. **Supabase Ecosystem への依存**
   - Connector Identity validation、Supabase auth JWT、RLS policy、secret management がすべて Supabase 生態系に統合される。
   - 設計決定が Supabase の仕様・変更に依存。

3. **Trust Boundary 責任の分散**
   - facilityId 検証ロジックが Edge Function ＋ RLS policy ＋ auth system に分散される可能性。
   - 責任境界が複数レイヤーに分散；coherent なセキュリティレビューが困難になる可能性。

4. **Authorization Design の複雑性**
   - authorization decision を RLS policy で実装する場合、application-level authorization logic との重複・矛盾が生じる設計リスク。
   - 将来的な authorization モデル変更時に、policy の version 管理・テストが複雑になる可能性。

5. **Development Velocity**
   - Deno environment でのテスト・開発 workflow は既存 Node.js workflow と異なるため、チームの学習・適応期間が必要。

**将来の部分利用の可能性**：

v0.1 では Independent Node.js Server を優先するが、将来的に Supabase に密接な処理（例：real-time subscription、Supabase auth との deep integration）については、Edge Functions の併用を検討する余地を残す。

## 6. Why Not Reuse Existing Connect server.js

既存の RISEN CARE Connect server.js が施設側 PoC server として存在するが、Server Trust Boundary として流用しない理由：

1. **施設側 PoC**
   - 既存 server.js は施設側の統合（Local Connector からのデータ取得、表示、user interaction）を目的とした PoC。
   - Server Trust Boundary としての実装ではない。

2. **認証・認可モデルの相違**
   - 既存 server.js は施設内 local interaction を想定；human actor authentication、facility boundary、Supabase privileged access の分離を前提としない。
   - 既存の role / permission 構造は local facility 内部の UI authorization に過ぎない可能性がある。

3. **Connector Identity Validation の不在**
   - 既存 server.js は Connector から送られた facilityId、resident information をそのまま扱う可能性。
   - Server Trust Boundary では Connector credential の検証、登録関係の確認、facilityId 確定を必須とする。

4. **Secret Boundary の相違**
   - 既存 server.js が施設 PC で実行される場合、Supabase credential の管理が異なる。
   - Server Trust Boundary では Supabase service_role key を施設 PC に配置しない。

5. **責任混在の回避**
   - 既存 server.js を流用すると、施設側 PoC の責任と Server Trust Boundary の責任が混在する。
   - これにより audit trail、security boundary、future maintenance が複雑化。

**方針**：

新たに Server Trust Boundary として独立した Node.js server application を設計・実装する。
既存 RISEN CARE Connect server.js との連携は、別途 API contract として定義する（future work）。

## 7. Authentication Boundary

### 7.1 Connector Identity Verification Path

**フロー**：

```
Local Connector
  → HTTP request (connectorId + connectorCredential)
  → Server Trust Boundary
    → Connector credential lookup (Supabase)
    → active status check
    → facility mapping check
  → facilityId 確定
  → source resident data processing
  → ResidentMatcher
  → storage decision
```

**責任**：

- Connector から送られた connectorId、connectorCredential は **最初は信頼しない**。
- Server Trust Boundary は Supabase 内の connector registry から connectorId を確認。
- credential の検証（hash comparison 等）は Server backend で実施。

### 7.2 Human Actor Authentication Path

**フロー**：

```
Authenticated Human Actor (Web UI / Client)
  → Server Trust Boundary
    → Supabase Auth JWT validation OR other auth method
    → Actor Identity lookup
    → Facility Membership confirmation
    → Action authorization check
  → management action execution (resident facility assignment 等)
  → audit log
```

**責任**：

- Human actor の authentication は Independent Supabase Auth JWT またはそれに代替する方式。
- Authorization は actor、target facility、target action の三者確認。
- Actor identity と Connector identity は分離。

### 7.3 Separation of Concerns

- Connector 認証と human actor 認証は独立した verification chain。
- Connector credential だけで human management action を許可しない。
- Supabase Auth JWT の role はユーザー認証の段階に限定；業務 role とは別。

## 8. Supabase / Secret Boundary

### 8.1 Privileged Credential Management

**原則**：

- Supabase privileged credential（service_role key 等）は **Server Trust Boundary 実行環境だけ** で管理。
- 施設 PC（Local Connector、RISEN CARE Connect）に配置しない。
- 秘密情報は deployment system によって Server application に安全に inject；ローカル環境設定ファイルを git に commit しない。
- 具体的な credential 形式（service_role key、API key、JWT 等）、secret storage 製品（HashiCorp Vault、AWS Secrets Manager、Supabase vault 等）は後続設計で決定。

### 8.2 Resident Repository Access

**フロー**：

```
Server Trust Boundary (Node.js)
  → Verified facilityId
  → Resident Repository call (privileged server-side Supabase access)
  → Candidate list 取得
  → ResidentMatcher に渡す
  → Storage decision
```

**特徴**：

- Repository call は Server Trust Boundary 内部のみ。
- Local Connector は Resident Repository を直接呼び出さない。

### 8.3 Audit Log

**要件**：

- 重要操作（Connector 検証、facilityId 確定、resident matching 結果、storage decision）を audit table に記録。
- Audit log には認証情報、credential、service_role key を含めない。

**実装イメージ**：

```javascript
// Server Trust Boundary
const auditLog = {
  timestamp: new Date(),
  connectorId: verifiedConnectorId,
  facilityId: verifiedFacilityId,
  sourceResidentIdentifier: "...",
  matchResult: { status, matchMethod, residentId },
  storageDecision: "confirmed" // or "pending_review", "conflict", "rejected"
  // Note: credential, service_role key, secret information は含めない
};
await supabase.from('audit_logs').insert(auditLog);
```

## 9. Decision Deferred

以下の項目は Server Trust Boundary runtime 選定の後に決定する。

1. **クラウド事業者**
   - AWS, GCP, Azure などの具体的な選定；または on-premises VM。

2. **ホスティング方式**
   - Independent Node.js Server を選択した場合、VM、container orchestration（Kubernetes 等）、managed container（Fargate、Cloud Run 等）の選択。

3. **Connector Credential 認証方式**
   - Hash-based、mTLS、JWT signature 等の具体的な実装。

4. **Human Actor Authentication 方式**
   - Supabase Auth か、別途の OAuth2 / OIDC provider か。

5. **Secret Storage**
   - HashiCorp Vault、AWS Secrets Manager、Supabase vault 等の具体的な選択。

6. **API Endpoint 設計**
   - `/api/verify-and-match` などの具体的な URL、request/response schema。

7. **Deployment Pipeline**
   - CI/CD パイプラインの構成、環境分離（dev/staging/prod）、version management。

8. **Scaling / Monitoring**
   - Load balancer 設定、auto-scaling policy、logging aggregation。

## 10. Next Step

1. **Independent Node.js Server の概念 PoC**
   - Express.js + Middleware pattern で Trust Boundary を実装。
   - 既存 ResidentMatcher、test suite を integrate。
   - Connector 認証フロー、facilityId 確定ロジックを実装。

2. **API Contract 定義**
   - Local Connector → Trust Boundary のリクエスト/レスポンス schema。
   - Trust Boundary の error response、exception handling。

3. **Audit Log Schema**
   - Supabase 内の audit table 設計。
   - 監査可能性要件の確認。

4. **Security Boundary Test**
   - Connector credential 検証のテスト。
   - facilityId 確定ロジックのテスト。
   - Supabase service_role access の isolation verification。

5. **Cloud Platform Selection**
   - Runtime selection 決定後、具体的なホスティング先、deployment 方式を確定。

---

**版** v0.1
**作成日** 2026-09-04
