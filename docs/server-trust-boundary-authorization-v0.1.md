# Server Trust Boundary Authorization v0.1

## 1. Purpose

この文書は、RISEN CARE Server Trust Boundary が、施設に関わる重要操作を許可する前に確認すべき最小の認可条件を定義する。

認証済みであることだけを理由に重要操作を許可してはならない。

## 2. Authentication and Authorization

Authentication は、操作主体が誰であるかを確認する。

Authorization は、その操作主体が対象施設に対して対象操作を実行してよいかを確認する。

認証済みであっても、認可されていない操作は拒否する。

## 3. Minimum Authorization Context

認可判定では、少なくとも次の情報を Server Trust Boundary が確認する。

- authenticatedActorId
- targetFacilityId
- action

targetFacilityId は Local Connector やクライアントの自己申告だけで確定してはならない。

## 4. Initial Protected Actions

v0.1 では、少なくとも次の操作を認可対象とする。

- legacy resident facility assignment
- resident facility correction

これらの操作は、許可された主体が許可された施設に対して行う場合のみ実行できる。

## 5. Default Deny

認可条件を確認できない場合は、操作を許可しない。

権限情報が存在しない、失効している、対象施設との関係を確認できない、または action が許可対象として定義されていない場合は deny とする。

認可エラーを推測やAI判断によって補完してはならない。

## 6. Facility Boundary Rules

legacy resident facility assignment では、現在の facility_id が NULL であることを確認し、操作主体が targetFacilityId への割当を行う権限を持つ場合のみ許可する。

resident facility correction では、現在の facility_id と変更後の targetFacilityId を区別して扱う。

異なる施設への訂正を行う場合は、現在の施設と変更後の施設の双方について必要な権限を確認するか、別途定義された cross-facility correction 権限を要求する。

変更後の施設に対する権限だけを理由に、他施設の resident を移動してはならない。

認可契約は、facility_id が NULL の legacy 候補を無制限に閲覧または検索する権限を与えるものではない。

## 7. Authorization Audit

重要操作について、少なくとも authenticatedActorId、action、対象 resident、変更前 facilityId、変更後 facilityId、認可結果、実行日時を追跡可能にする。

拒否された重要操作についても、セキュリティ上必要な範囲で監査可能にする。

監査記録によって秘密情報や credential を保存してはならない。

## 8. Authorization Lifecycle

認可は重要操作の実行時点で有効な権限情報に基づいて判定する。

失効した権限を過去の認可結果や長期間のキャッシュによって継続利用してはならない。

権限の付与、変更、失効そのものについても、将来監査可能な設計とする。

## 9. v0.1 Non-Goals

この文書では以下をまだ決定しない。

- 具体的な role 名
- role と action の具体的な対応表
- 認証方式の具体的な実装
- authorization database schema
- cross-facility correction 権限の具体的な付与方法
- 管理画面の具体的なUI
- Supabase RLS policy の具体的な実装

これらは正式な認証・権限モデルと Server Trust Boundary の実装方式を確認した後に定義する。
