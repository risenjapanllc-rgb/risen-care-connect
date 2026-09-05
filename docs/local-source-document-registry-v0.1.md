# Local Source Document Registry v0.1

## 1. Purpose

Local Source Document Registryは、Local Connectorが同じSource Documentを継続観測するために、`sourceDocumentKey`とLocal observation metadataの対応を保持するcontractである。

これはLocal Connector内のDocument observation boundaryを定義する文書である。Server-side `documentId`、Source Document内部のRecord identity、Storage、Idempotency、Supabase実装を定義しない。

## 2. Identity Separation

次のidentityを同一視しない。

```text
sourceDocumentKey
= Local Connector内のSource Document継続観測identity

documentId
= Server側RISEN Document identity

sourceRecordKey
= Source Document内部のRecord identity

recordId
= Server側RISEN Record identity

contentHash
= semantic content identity

sourceHash
= original bytes observation material
```

```text
sourceDocumentKey != documentId
sourceDocumentKey != sourceRecordKey
sourceDocumentKey != recordId
sourceDocumentKey != contentHash
sourceDocumentKey != sourceHash
```

## 3. Registry Responsibility

Registryは、Local Connectorが観測したSource Documentと`sourceDocumentKey`の対応を保持する。

Registryは次を行わない。

- business semantic contentを保存しない
- raw Word / Excel本文を保存しない
- Supabase credentialを保存しない
- Server service_role credentialを保存しない
- Source Document内部の`sourceRecordKey`を生成しない
- Server-side `documentId`、`recordId`、`versionId`を生成しない
- contentHashまたはsourceHashからDocument identityを生成しない

## 4. sourceDocumentKey Definition

`sourceDocumentKey`はLocal Connectorが管理するopaqueなSource Document継続観測identityである。

最低条件:

- randomである
- opaqueである
- unpredictableである
- collision riskが十分に低い
- file metadataからdeterministically生成しない
- Connector installation-local registryに永続化する

`sourceDocumentKey`は次ではない。

- fileNameそのもの
- absolute pathそのもの
- path hash
- fileName hash
- contentHash
- sourceHash
- residentId
- documentId
- hardware ID
- Server deterministic ID

UUID、random bytes、encoding、length等の具体方式はimplementation decisionとしてTBDとする。keyを知っていることは認証、認可、暗号化、匿名化を意味しない。

## 5. Registry Scope

`sourceDocumentKey`はConnector installation-local identityである。

- 別Connector installation間で同じkeyを共有しない
- 別Connector installationのDocumentをkeyだけで自動mergeしない
- cross-connector mergeは別のServer-side policyとhistoryで扱う

Server側でsourceDocumentKeyをlookup materialとして用いる場合のscope候補は次とする。

```text
verifiedFacilityId
+ verifiedConnectorId
+ validated sourceDocumentKey
```

これはServer-side `documentId`の決定論的生成式ではない。`verifiedFacilityId`と`verifiedConnectorId`はServer Trust Boundaryで確定した値だけを使用し、client supplied facilityIdでscopeを決めない。

## 6. Minimum Registry Metadata

現行`LocalFolderScanner`が安全に観測できる値は、root folder内の`relativePath`、`fileName`、`size`、`updatedAt`である。v0.1 Registry entryの最小候補は次とする。

```javascript
{
    sourceDocumentKey,
    relativePath,
    fileName,
    firstSeenAt,
    lastSeenAt,
    lastObservedUpdatedAt,
    lastObservedSize
}
```

`relativePath`、`fileName`、時刻、sizeはLocal-only observation metadataである。これらを`sourceDocumentKey`の導出値、Server authority、または単独のbusiness identityとして扱わない。

現行Scannerは非再帰scanで`relativePath`としてfileNameを返す。この仕様は将来変更され得るため、registry contractは`relativePath`をLocal observation locatorとして扱い、Server送信用identityとして扱わない。

absolute pathはLocal Connectorが登録folderへアクセスするために必要になり得るが、Serverへ送信するregistry identityとして保存・送信しない。path、fileName、size、mtimeは個人情報または施設内部構造を含み得るため、logsへ不用意に出力しない。

## 7. Same Rescan and Content Update

同じLocal registry entryとして安全に再発見できる場合、既存の`sourceDocumentKey`を再利用する。

- `updatedAt`だけの変化で新しいkeyを生成しない
- sizeだけの変化で新しいkeyを生成しない
- semantic contentの変化だけで新しいkeyを生成しない
- sourceHashまたはcontentHashの変化だけで新しいkeyを生成しない

v0.1の最小再発見候補はsame-path rescanである。ただしsame-path reuseは、同じpathに現れたDocumentが必ず同じ物理Document系列であることを証明しない。delete/recreateまたはsame-name replacementを完全に検出したと主張しない。

## 8. Rename and Move

renameまたはfolder内moveでidentityを維持できるかはTBDとする。

現在のLocal Connectorが通常観測するfileName、relativePath、size、mtimeだけでは、rename/moveを安全に同じSource Documentと確定できない。

- fileNameだけで自動同一視しない
- sizeだけで自動同一視しない
- mtimeだけで自動同一視しない
- sourceHashまたはcontentHashだけで自動同一視しない

将来、Windows file identity等をLocal hintとして検討できる。ただしそれはServer authorityまたは永続identityそのものではない。

## 9. Copy

copyされたDocumentは、contentHashまたはsourceHashが一致しても元Documentと同じ`sourceDocumentKey`にしない。

v0.1の第一候補は、copyを別Source Documentとして扱い、新しい`sourceDocumentKey` candidateを使うことである。copy detection algorithmは未実装であり、正確な判定方法はTBDとする。

## 10. Delete and Recreate

同じpathまたはfileNameに再作成されたDocumentを、無条件で以前と同じ`sourceDocumentKey`へ接続しない。

安全な判定材料がない場合はnew `sourceDocumentKey` candidateとする。現在のLocal observation能力ではdelete/recreateを確実に検出できないため、same-path rescan MVPはdelete/recreateの完全判定を保証しない。

Registry entryを1回のscanで見つけられなかったことだけを理由にhard deleteしない。missingまたはdeletionの判定はcomplete observation等の別contractに従う。

## 11. Source Record Boundary

この文書では`sourceRecordKey`を生成しない。

1 Documentから0..N Recordsが生じ得るため、同じSource Document由来の複数Recordは同じ`sourceDocumentKey`を共有できる。各Recordのidentityは、別途`sourceRecordKey`または`recordIdentityCandidate` contractで扱う。

```text
sourceDocumentKey
!= sourceRecordKey
!= recordIdentityCandidate
```

Document identityからRecord identityを自動生成しない。stable source record IDがない場合、row number、cell address、paragraph position、fileName、contentHash、sourceHash、residentIdからpersistent `sourceRecordKey`を生成しない。

現在のsupport_record MVPは`SemanticRecordBuilder`が最大1 recordを返すが、これは1 Document = 1 business Recordの恒久的な前提ではない。record boundaryとmultiple record extractionは未実装であり、sourceDocumentKey導入時にもその制約を固定しない。

## 12. Server Boundary

Localが将来送信する`sourceDocumentKey`は、facilityIdやresidentIdのauthorityではない。

Serverは以下を分離する。

```text
client supplied sourceDocumentKey
= Local observation material

verifiedFacilityId / verifiedConnectorId
= Server Trust Boundaryで確定したscope

documentId
= Server-side resolve / generate対象
```

client supplied sourceDocumentKeyを無検証でbusiness identity確定に使用しない。Serverはverified facility / connector scope、format validation、server-side history、Document contextを使って判断する。sourceDocumentKey単独をglobal identityとして扱わない。

## 13. Persistence and Recovery

RegistryはConnector restart後も`sourceDocumentKey`を再利用できる永続化を必要とする。

physical storageはv0.1で固定しない。

- JSON
- SQLite
- OS-specific store

のいずれもimplementation candidateである。

implementationでは少なくとも次を検討する。

- atomic write
- corruption detection and recovery
- backup
- schema / registry migration
- installation reinstall時の扱い
- file permission and Local user boundary

具体的な保存方式、recovery手順、backup形式、retention periodはTBDとする。

## 14. Privacy and Security

Registryにはidentity継続観測に不要な個人情報を入れない。

- raw Word / Excel本文を保存しない
- business semantic contentを保存しない
- credentialを保存しない
- sourceDocumentKeyをauthentication tokenとして扱わない
- sourceDocumentKeyを知っているだけでServer authorizationを通過させない
- absolute path、document contents、credentialをlogsへ不用意に出さない

Local-only observation metadataとServerへ送信可能なfieldを分離する。Local registryにpathを保持する必要がある場合も、Serverへそのまま送信しない。

## 15. TOCTOU and Missing Boundaries

`sourceDocumentKey`はfile bytesの一貫性を保証しない。

将来の観測整合性確認は、別責務として次を扱う。

```text
stat
-> read
-> sourceHash
-> stat
```

read中変更、partial observation、read failure、network failureはDocument identityやmissing/deletionを自動確定する根拠にしない。

## 16. Current Implementation Gap

現状の実装は次の段階にある。

- `LocalFolderScanner`はfileName、relativePath、extension、size、updatedAtを観測する
- `LocalConnectorConfig`はregistered folder設定をLocalに保存する
- `LocalConnectorService`はregistered folder内のWord / Excelを読み、normalized documentを生成する
- `SemanticRecordBuilder`はsource resident context、semanticContent、safe provenanceを出力する
- `SemanticRecordBuilder`にsourceDocumentKeyはない
- Connector payload / ValidatorにsourceDocumentKeyは未接続である
- `RecordIdentityResolver`だけが入力としてsourceDocumentKeyを期待する

そのため、現時点ではLocal observationからRecord Identity Resolverまで`sourceDocumentKey`をend-to-endで伝播できない。

## 17. v0.1 TBD

次はv0.1で未決定のままとする。

- exact key format
- concrete random generation API, encoding, and length
- registry physical storage
- atomic write / corruption recovery / backup implementation
- retention period
- rename / move identity preservation
- Windows file ID usage
- copy detection algorithm
- delete / recreate exact detection
- sourceHash algorithm integration
- sourceRecordKey
- Record boundary
- Server-side documentId creation
- cross-connector merge
- payload field addition and Server validation details

## 18. Recommended Implementation Sequence

このdesignから導かれる小さな実装順序は次とする。

1. Local `SourceDocumentRegistry` interface
2. random opaque `sourceDocumentKey` generation
3. same-path rescan reuse MVP
4. Local Connector service integration
5. `SemanticRecordBuilder`へのsourceDocumentKey伝播
6. Connector payload validation
7. `SemanticRecordValidator` propagation
8. `RecordIdentityResolver`へのhandoff

rename/moveの安全なidentity preservationをsame-path MVPへ混ぜない。same-path reuseを実装しても、delete/recreateを完全に判定できるとは主張しない。
