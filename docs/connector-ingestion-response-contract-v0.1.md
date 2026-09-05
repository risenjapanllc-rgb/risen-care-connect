# RISEN CARE Connector Ingestion Response Contract v0.1

## 1. 目的

この文書は、Facility-side ConnectorがServer Trust Boundaryへデータを送信した後に受け取る外部responseについて、次の境界を定義する。

- Connectorが送信結果として知る必要がある情報
- Connectorへ返さなくてよい情報
- 認証済みHuman Management経路だけで扱う情報
- matching結果、同期識別子、retry、idempotency、status pollingの関係

Connectorの責務は、許可されたデータの送信・同期である。Connectorはresident identityの最終確認UIや、Human Managementの認可主体ではない。

この文書はresponseの設計契約であり、HTTP server、Express、Supabase、Local Connector、review queue、DB schemaの実装を行わない。

## 2. 基本原則

- Connectorは送信・同期の結果だけを受け取る
- Connectorはresident identityの最終確認UIを担当しない
- `needs_review`の候補確認は将来の認証済みHuman Management経路で扱う
- Connector credentialとhuman actor authorizationを混ぜない
- `public.users.id`のような内部`residentId`は、必要性が確認できるまでConnectorへ返さない
- `candidates`一覧はv0.1ではConnectorへ返さないことを第一候補とする
- client supplied `residentId`をresponse authorityに使わない
- `verifiedContext`、`facilityId`、`registrationContext`、credential、token、secretをresponseへ出さない
- internal repository、Supabase、stack、dependency detailsをresponseへ出さない
- responseはstatusごとの明示的allowlistで構築する
- `needs_review`と`unmatched`はHTTP障害ではなくdomain resultである
- Word / Excel由来の値をresponse authorityにしない
- AI推論でresponse内容を補完しない
- responseに不要な個人情報を追加しない
- 不明な状態や処理失敗はfail-closedで表現する

## 3. Connectorの責務

Connectorは次の責務を持つ。

- Local側で抽出・標準化したpayloadを送信する
- Connector credentialを安全にtransportへ渡す
- requestの相関を維持する
- responseのdomain statusを受け取る
- `matched`、`needs_review`、`unmatched`、`denied`、`invalid`、`error`に応じて同期状態を管理する
- retry可能性が別途定義された場合にだけ再送する
- 将来server-side同期識別子が提供された場合、その値を同期追跡に利用する

Connectorは、responseに含まれない情報を推測して補完してはならない。

## 4. Connectorの非責務

Connectorは次を行わない。

- resident identityの最終確認
- `needs_review`候補の選択
- `needs_review`を`matched`へ変換
- client supplied `residentId`の採用
- `facilityId`や`verifiedContext`の生成
- responseの`residentId`をfacility authorityとして扱う
- Human Management用の認証・認可
- candidate一覧の保持または表示
- AIによる本人推定
- Storage Policyの判断
- Supabaseへの直接接続
- Connector credentialをhuman actor credentialとして使用
- server error messageやstackの解釈

## 5. Responseの3分類

### 5.1 Connectorが知る情報

Connectorが同期処理を継続するため、v0.1では次を知ればよい。

- `requestId`またはcorrelation用の識別子
- domain `status`
- `errorCode`（denied / invalid / error等、外部公開を許可したものに限る）
- 将来採用を決めた場合のserver-side同期識別子

最小responseは、業務上必要な結果状態だけを返す。

### 5.2 Connectorが知らなくてよい情報

次は通常の同期処理に不要であり、v0.1では返さない第一候補とする。

- `facilityId`
- `verifiedContext`
- `registrationContext`
- `residentId`
- `candidates`
- `matchMethod`
- Repository内部の候補情報
- Supabaseのtable、query、URL、key、内部エラー
- credential、token、password、secret
- stack、exception object、dependency error message
- raw payload、raw document、raw content
- classification、role、permissionのserver内部判断

### 5.3 Human Managementだけで扱う情報

将来の認証済みHuman Management経路で、必要な権限を確認した人にだけ提供する。

- `needs_review`の候補一覧
- 候補residentの確認用情報
- resident identityの最終選択
- `residentId`とHuman Confirmationの関連
- review理由、候補比較、conflict details
- facility assignment、facility correction
- Explicit Resident Mappingの作成・訂正・無効化

Connectorへこの情報を返して、施設側UIで確定させる構造にはしない。

## 6. v0.1の第一候補response

### 6.1 成功したdomain result

```javascript
// matched
{
    requestId,
    status: "matched"
}

// needs_review
{
    requestId,
    status: "needs_review"
}

// unmatched
{
    requestId,
    status: "unmatched"
}
```

`requestId`は相関用識別子であり、facility、resident、credentialを表す値にしない。

### 6.2 Trust / validation / processing failure

```javascript
// denied / invalid / error
{
    requestId,
    status,
    errorCode
}
```

`status`は`denied`、`invalid`、`error`の明示的なdomain statusに限定する。`errorCode`は外部契約として許可された安定keyだけを返し、内部エラーメッセージを返さない。

### 6.3 返さない第一候補

v0.1の第一候補responseには次を含めない。

- `residentId`
- `candidates`
- `matchMethod`
- `facilityId`
- `verifiedContext`
- `registrationContext`
- raw payload
- credentialまたはcredential由来の値

`matchMethod`は内部診断やHuman Managementのreview理由として将来利用できる可能性があるが、Connector同期には不要なため外部responseから除外する方向を優先する。

## 7. matched response

`matched`は、現在のserver-side matching contractに基づいてresidentとの関連付けが成立したdomain resultである。

Connectorが知るべき情報は、対象requestの処理が`matched`として完了したことだけである。

Connectorへ`residentId`を返す必要性は、同期処理、再送、downstream API、データ保持の要否を確認したうえで別途判断する。内部IDが必要になった場合でも、Connectorの権限やfacility authorityを拡大しない設計が必要である。

v0.1では、内部`residentId`を返さず、`{ requestId, status: "matched" }`を第一候補とする。

`matched`であることは、Connectorがfacilityまたはresident identityのauthorityを持つことを意味しない。

## 8. needs_review response

`needs_review`は、候補が存在する、またはSource Identityが不十分であるが、Serverがresident identityを安全に確定できない状態である。

Connectorへ返す第一候補は次のとおりとする。

```javascript
{
    requestId,
    status: "needs_review"
}
```

次を必ず満たす。

- `residentId`は返さない
- `candidates`は返さない
- Connector側で候補選択をさせない
- Connector側で`matched`へ昇格させない
- AI推論で候補を確定しない
- Human Managementの認証・認可経路へreviewを分離する

将来はserver-side review queueをHuman Management UIから参照し、許可されたactorが候補情報を確認する方向を候補とする。review queue、candidate表示、確認結果の保存は別設計で定義する。

`needs_review`はHTTP failureやcredential failureを意味しない。Connectorは送信処理自体と、server-side review待ちを別の同期状態として管理できる構造を持つ。

## 9. unmatched response

`unmatched`は、Server Trust Boundaryが処理を実行し、現在の照合条件では一致候補を確定できなかったdomain resultである。

```javascript
{
    requestId,
    status: "unmatched"
}
```

`unmatched`では、次を行わない。

- `residentId`の補完
- `candidates`の返却
- name-onlyやAIによる自動確定
- Connector側でのfacility変更
- server障害としての無制限retry

再同期、Mapping、Human Managementによる確認、後続のreview処理をどう扱うかはStorage PolicyとIdempotency設計に従う。

`unmatched`はHTTP 5xxと同義ではない。HTTP statusの最終値はHTTP Adapter Contract側のTBDを維持する。

## 10. denied / invalid / error response

### 10.1 denied

Connector Trustが成立しない、credentialが拒否された、または認証境界で処理を許可できない場合のdomain resultである。

```javascript
{
    requestId,
    status: "denied",
    errorCode
}
```

登録状態、facility、credentialの有効性を細かく外部へ知らせない。401 / 403の最終mappingはHTTP Adapter ContractのTBDであり、この文書では確定しない。

### 10.2 invalid

Payloadがmalformed、必須Field不足、型不正、allowlist違反などで処理対象として受理できない場合のdomain resultである。

```javascript
{
    requestId,
    status: "invalid",
    errorCode
}
```

Connectorはpayloadを修正できる可能性があるが、errorCodeから内部schemaや個人情報を推測できる詳細を返さない。

### 10.3 error

Dependency unavailable、予期しないserver-side failure、timeout等により結果を確定できない場合のdomain resultである。

```javascript
{
    requestId,
    status: "error",
    errorCode
}
```

error responseにはstack、exception object、dependency message、Repository情報、Supabase情報を含めない。retry可否やbackoffはerrorCodeごとに後続設計で定義する。

## 11. residentIdを返さない理由

`residentId`は通常、`public.users.id`のようなRISEN CARE内部のidentityである。Connectorへ返すと、次のリスクがある。

- Local側のsource identifierとInternal Identityが混同される
- Connectorがresident identityのauthorityを持つと誤解される
- facility境界を越えた推測や参照の手掛かりになる
- ログ、cache、設定、再送データへ内部IDが複製される
- client supplied `residentId`との混同や上書きが起きる
- Human Managementだけで扱うべきreviewやmappingがConnectorへ流出する

そのためv0.1では、同期完了を示すstatusとrequestIdだけを返す第一候補とする。

将来、Connectorが再同期やstatus確認のためserver-side identifierを必要とする場合は、内部resident identityと分離した同期用identifierを検討する。

## 12. candidatesを返さない理由

`candidates`にはresidentの内部ID、氏名、所属、性別、その他の個人情報が含まれる可能性がある。Connectorへ返すと、送信・同期に不要な個人情報がfacility-sideへ複製される。

また、候補一覧をConnectorへ返すと、Connector側が候補を選択し、本人確定を代替する設計へ流れやすい。

v0.1では、候補確認を認証済みHuman Managementへ限定し、Connectorには`needs_review`という状態だけを返す第一候補とする。

候補情報の表示は、対象facility、authenticated actor、action、purpose、Data Classification、監査、保持期間をserver-sideで確認できる経路に限定する。

## 13. 将来のserver-side同期識別子

Connectorが次回同期、再送、状態照会、idempotency確認のため識別子を必要とする場合、次の概念を候補とする。

- `ingestionId`: 1回の取込処理を追跡するserver-side identifier
- `documentId`: 1つのSource Document系列を追跡するidentifier
- `recordId`: Server-side Record Identity
- `versionId`: Record Version Identity
- `operationId`: 非同期処理やstatus pollingを追跡するidentifier

これらは互いに異なる責務を持つ。

- `ingestionId`は送信・取込操作の追跡候補
- `documentId`はSource Document系列の追跡候補
- `recordId`はServer Recordの内部Identity候補
- `versionId`はRecord変更履歴のVersion候補
- `operationId`は非同期処理の操作追跡候補

v0.1では、採用するidentifier、外部公開範囲、形式、寿命、再利用可否、facility scope、推測耐性を確定しない。

特に`recordId`はResident Identityの`residentId`と混同しない。Local側が送信したsourceRecordKeyをServer-side recordIdとして無条件に採用しない方針は、Record Identity / Idempotency設計に従う。

## 14. retry / idempotencyとの関係

response statusとretry可否を同じ概念にしない。

### 14.1 retryしない第一候補

- `matched`: 同じ内容の無制限retryを行わない
- `needs_review`: review結果が変わらないまま無制限retryしない
- `unmatched`: matching条件が変わらないまま無制限retryしない
- `denied`: credentialや登録状態を修正せず無制限retryしない
- `invalid`: payloadを修正せずretryしない

### 14.2 retry候補

- 一時的な`error`
- timeout
- gatewayやserver unavailable
- idempotency確認が可能な再送

ただし、同じrequestを再送しても二重登録しないため、idempotency contractが先に必要である。

### 14.3 idempotency

Idempotency設計では少なくとも次を分離する。

- request / ingestionの操作識別
- Document Identity
- Source Record Identity
- Content Identity
- Server Record Identity
- Version Identity
- Resident Identity

Connectorは、内部`residentId`をidempotency keyとして使わない。Localが生成するsource identifier、source record key、content hashを使う場合も、Server側で検証・scope確認・衝突処理を行う。

idempotency key、requestId、ingestionId等の具体的な形式と保存期間はTBDである。

## 15. status pollingが必要になった場合

同期処理で最終結果をすぐ返せない場合は、将来次の方向を候補とする。

```text
Connector
  -> submit
  <- accepted + operationId候補
  -> status polling
  <- processing / matched / needs_review / unmatched / denied / invalid / error
```

ただし、status polling responseも通常のresponseと同じallowlist原則に従う。

- `operationId`を返す場合でもresidentIdを返さない
- `processing`状態をAIやConnectorが勝手にmatchedへ変換しない
- `needs_review`では候補を返さない
- status照会時にConnector credentialをresponseへ返さない
- 他Connector、他facility、他requestの状態を照会できないscopeを必要とする

`operationId`、polling endpoint、polling認証、TTL、rate limit、最終statusの保存、retry-afterはTBDである。status pollingが必要になる場合は、HTTP Adapter Contract、Storage Policy、Record Identity / Idempotency設計を同時に更新する。

## 16. PII minimization

responseは送信・同期に必要な最小情報だけを返す。

通常responseから除外するもの:

- residentの氏名
- source resident identifier
- residentId
- facilityId
- candidates
- gender
- affiliation
- source file name
- raw content
- document contents
- classification details
- human actor details
- credential、token、secret

`requestId`や将来の同期identifierも、個人情報やfacility情報を埋め込まないopaque値とする。

reviewに必要なPIIはConnectorへ返さず、Human Managementのserver-side認可経路で、目的と必要範囲を確認して提供する。

## 17. Response allowlist

HTTP AdapterはConnectorIngestionServiceの結果を無条件にJSONへspreadしない。

```javascript
// 禁止
return response.json({ ...ingestionResult });
```

v0.1の第一候補はstatusごとに次の明示的allowlistを使う。

```javascript
function toConnectorResponse(result, requestId) {
    if (result.status === "matched") {
        return { requestId, status: "matched" };
    }

    if (result.status === "needs_review") {
        return { requestId, status: "needs_review" };
    }

    if (result.status === "unmatched") {
        return { requestId, status: "unmatched" };
    }

    if (
        result.status === "denied" ||
        result.status === "invalid" ||
        result.status === "error"
    ) {
        return {
            requestId,
            status: result.status,
            errorCode: result.errorCode
        };
    }

    return {
        requestId,
        status: "error",
        errorCode: "internal_result_invalid"
    };
}
```

この例は概念であり、HTTP status mappingやerrorCodeの全一覧を確定するものではない。`result`の未知field、`verifiedContext`、facilityId、residentId、candidates、message、stackはコピーしない。

`errorCode`自体に個人情報、facility情報、credential情報、内部例外文字列を含めない。

## 18. HTTP Adapter Contractとの関係

[server-trust-boundary-http-adapter-contract-v0.1.md](server-trust-boundary-http-adapter-contract-v0.1.md) と次の関係を持つ。

- HTTP Adapterはrequest transportとresponse allowlistを担当する
- ConnectorIngestionServiceはTrust → Payload Validation → Matchingのdomain順序を担当する
- HTTP statusとdomain statusは分離する
- `matched`、`needs_review`、`unmatched`はHTTP障害と同一視しない
- HTTP Adapterが`verifiedContext`、facilityId、credentialを外部へ返さない
- HTTP Adapterの401 / 403、endpoint、auth scheme、body size、timeout、rate limitのTBDは維持する
- responseにresidentId、candidates、matchMethodを返す必要性は、この文書の第一候補と整合するが、最終公開契約としては別途確定する

この文書はHTTP Adapter ContractのTBDを勝手に上書きしない。HTTP statusやtransport詳細を確定する場合は、両文書を同時に更新する。

## 19. Storage Policyとの関係

Storage Policyでは、received、storable、resident-confirmed、AIKO-accessibleを分離する。

responseの`matched`は、すべてのPayloadが保存されたことやAIKO利用可能であることを意味しない。

- `matched`: Resident Matchingが成立したdomain result
- `needs_review`: PENDING_REVIEW候補。Connectorへcandidateを返さない
- `unmatched`: PENDING_REVIEW等の安全保留候補。residentIdを補完しない
- `denied` / `invalid`: REJECTED候補
- `error`: 結果未確定。再送やidempotencyを別途判断

Storage Policy、Classification、Retention、review queueの判断をresponse statusから推測してはならない。

## 20. Human Authorizationとの関係

Connector TrustはConnector installationと登録facilityの関係を確認するためのもの、Human Authorizationは人間が対象facility・resource・actionを扱う権限を確認するためのものである。

`needs_review`の候補参照、resident identityの確定、facility assignment、facility correctionは、Connector credentialだけで許可しない。

Human Management側では、少なくとも次をserver-sideで確認する方向とする。

- authenticated human actor
- target facility
- target resource
- action
- active membership / permission
- audit requirement

具体的なrole、permission、UI、DB schemaは既存Authorization文書のTBDであり、この文書では確定しない。

## 21. errorCode方針

外部errorCodeは、Connectorが同期状態を判断するための安定した分類keyに限定する。

許可候補:

- `connector_trust_denied`
- `connector_payload_invalid`
- `connector_processing_unavailable`
- `connector_request_timeout`
- `internal_result_invalid`

上記は候補例であり、既存`ConnectorIngestionService`やHTTP Adapterで定義済みのerrorCodeを自動的に変更・統合するものではない。具体的な一覧、retry可否、client表示、監査分類はTBDとする。

errorCodeに次を含めない。

- exception message
- stack
- SQLやRepository details
- facilityId
- residentId
- candidate name
- credential material
- tokenやsecret

## 22. v0.1で確定すること

- Connectorは送信・同期の主体であり、resident identityの最終確認主体ではない
- `needs_review`の候補確認は将来の認証済みHuman Management経路で扱う
- Connector credentialとhuman actor authorizationを分離する
- v0.1のConnector向けresponseはstatus中心の最小形を第一候補とする
- `matched`、`needs_review`、`unmatched`では`requestId`とstatusだけを返す第一候補とする
- `denied`、`invalid`、`error`では`requestId`、status、許可済み`errorCode`だけを返す第一候補とする
- residentIdを返さない第一候補とする
- candidatesを返さない第一候補とする
- matchMethodを返さない第一候補とする
- `verifiedContext`、facilityId、registrationContext、credential、token、secretを返さない
- internal repository、Supabase、stack、dependency detailsを返さない
- responseを明示的allowlistで構築する
- `needs_review`と`unmatched`をHTTP障害や自動retryの根拠としない
- Connector側で`needs_review`を`matched`へ昇格しない
- client supplied residentIdをresponse authorityにしない
- `ingestionId`、`documentId`、`recordId`、`versionId`、`operationId`は勝手に確定しない
- HTTP status mapping、endpoint、auth scheme、body size、timeout、rate limitはHTTP Adapter ContractのTBDを維持する
- review queue、Human Management UI、DB schemaは今回実装しない
- AI推論でresponseを補完しない

## 23. TBD

- residentIdを将来返す必要性の有無
- candidatesを将来返す必要性の有無と公開範囲
- matchMethodを将来返す必要性
- requestIdの生成・引継ぎ・外部公開ルール
- ingestionId / documentId / recordId / versionId / operationIdの採用、形式、TTL、scope
- submit responseとstatus pollingの最終構造
- retryable errorの一覧、backoff、Retry-After
- idempotency key、重複送信、再送、conflict処理
- HTTP statusの401 / 403 / 409 / 422 / 5xx mapping
- endpoint、HTTP method、Authorization scheme
- body size、timeout、rate limit
- review queueのschema、candidate PII、Human Management UI
- Human Authorizationのrole、permission、action mapping
- responseの監査記録、保持期間、アクセス制御
- Storage Policy、Classification、Retentionとの具体的連携
- status pollingの認証、facility scope、rate limit
- errorCodeの最終一覧と外部公開可否

## 24. 既存設計との整合

### HTTP Adapter Contract

HTTP Adapterはtransport境界とresponse allowlistを担当する。HTTP statusとdomain statusを分離し、credentialやverifiedContextを外部へ返さない方針に従う。本書はstatus mapping、endpoint、Authorization scheme、body size、timeout、rate limitを確定しない。

### Server Trust Boundary Payload

facilityIdとresidentIdをLocal側の確定値として扱わず、raw contentや原本を標準Payloadへ含めない方針に従う。responseにもこれらを不要に複製しない。

### Payload Minimum JSON Schema

Local観測値とServer確定値を分離し、unknown inputをfail-openで扱わない方針に従う。responseへraw payloadやunknown fieldを返さない。

### Resident Identity / Matching

source resident identityとinternal residentIdを分離し、`matched`は現在のserver-side matching contractにおいてresident associationが成立したことを意味する。`needs_review`ではresidentIdをnullとし、Connectorへ候補を返さない第一候補とする。

### Authorization / Actor-Facility

Connector TrustとHuman Authorizationを分離する。review、mapping、facility assignment、facility correctionはauthenticated human actorのserver-side authorizationを必要とし、Connector credentialで代替しない。

### Storage Policy

response statusを保存可否やAIKO accessの許可と同一視しない。`needs_review`、`unmatched`、`error`の再送・保留・保存はStorage Policyと別途の運用設計に従う。

### Record Identity / Idempotency

request、Document、Source Record、Content、Server Record、Version、Residentのidentityを分離する。同期用identifierを採用する場合も、residentIdを代替するものとして扱わない。

既存設計と異なる具体的な公開契約が必要になった場合は、この文書だけで上書きせず、関係する既存文書を同時に更新する。

## 25. 次の設計課題

1. Connector向けresponseの最終公開allowlist
2. 外部`errorCode`の一覧、retry分類、client表示方針
3. `requestId`、`ingestionId`、`operationId`の役割分担
4. submit / polling / retryのidempotency契約
5. review queueとHuman Management UIの認証・認可
6. candidate PIIの最小表示と監査
7. matched後のStorage Policy、Classification、Retention
8. unmatched / needs_review / errorの同期状態モデル
9. facility scopeとstatus照会の権限境界
10. HTTP status、gateway、TLS、rate limitの最終設計
11. Connector側のresponse処理と再送テスト
