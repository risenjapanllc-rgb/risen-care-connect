# Actor-Facility Authorization Model v0.1

## 1. Purpose

この文書は、RISEN CARE における人間の操作主体と施設単位の認可関係を定義する。

目的は、認証済みユーザーをそのまま業務権限として扱わず、resident と操作主体を分離し、Server Trust Boundary が安全に認可判断できる基礎を作ることである。

## 2. Actor and Resident Separation

RISEN CARE では、支援対象となる resident と、システムを操作する human actor を別の主体として扱う。

public.users は resident identity のために使用し、human actor identity として流用しない。

auth.users の role は Supabase Auth の認証上の role であり、RISEN CARE の業務 role または facility permission として直接使用しない。

events.staff_id についても、意味と参照関係が正式に確認されるまでは human actor identity として扱わない。

## 3. Actor Identity

human actor は、認証済み主体と業務上の操作主体を結び付ける概念である。

Actor Identity は少なくとも、認証主体との関連、表示上の識別情報、active 状態を持てる設計とする。

認証主体との関連は Server Trust Boundary が信頼できるサーバー側データから確認し、クライアントの自己申告だけで確定しない。

Actor Identity の具体的なテーブル名、カラム名、認証方式は v0.1 ではまだ確定しない。

## 4. Facility Membership

Facility Membership は、human actor がどの facility に所属または関係しているかを表す。

一人の actor が複数 facility に関係する可能性を許容する。

Facility Membership が存在することだけで、すべての業務操作を許可してはならない。

重要操作の許可には、対象 facility と action に対する明示的な認可判断を必要とする。

Facility Membership の具体的な role 名や permission 構造は後続設計で定義する。

## 5. Action and Permission

Authorization は、actor が facility に所属しているかだけではなく、対象 action を実行してよいかを確認する。

action は業務上の操作単位を表し、Server Trust Boundary が認可判断に使用する。

クライアントから送信された role、permission、facility membership をそのまま信頼してはならない。

Server Trust Boundary は、認証済み actor とサーバー側の信頼できる membership / permission 情報を基に判断する。

具体的な role 名や role と action の対応表は v0.1 では固定しない。

## 6. Default Deny

認証主体、Actor Identity、Facility Membership、対象 action のいずれかを確認できない場合は deny とする。

権限情報が失効している、曖昧である、または対象 facility との関係を確認できない場合も deny とする。

AIやクライアント側の推測によって不足した認可情報を補完してはならない。

## 7. Connector Identity Separation

Connector Identity と human actor identity は別の主体として扱う。

Connector credential は、Connector installation と登録済み facility の関係を確認するために使用する。

Connector credential が有効であることだけを理由に、human actor 向けの管理操作を許可してはならない。

resident の facility assignment、facility correction、権限変更などの人間による重要操作には、別途 authenticated human actor の認可を必要とする。

Local Connector は human actor の role や permission を決定しない。

## 8. Facility Scope

認可対象 facility は、actor のサーバー側 membership と permission の範囲内で確認する。

ユーザーがUIで facility を選択できる場合でも、その選択値自体を認可根拠としてはならない。

複数 facility に所属する actor についても、各 facility ごとに対象 action の認可を確認する。

## 9. Audit

重要な認可判断は、少なくとも actor、action、target facility、target resource、認可結果、実行日時を追跡可能にする。

権限の付与、変更、失効についても、将来監査可能な設計とする。

監査記録に password、token、Connector credential、service_role key などの秘密情報を保存してはならない。

## 10. v0.1 Non-Goals

この文書では以下をまだ決定しない。

- 具体的な actor table 名
- 具体的な facility membership table 名
- role 名
- role と action の対応表
- permission table の具体的な schema
- Supabase RLS policy の具体的な実装
- 認証方式の具体的な実装
- UI の具体的な権限管理画面

これらは既存 RISEN CARE の認証方式と Server Trust Boundary の実装方式を確認した後に確定する。
