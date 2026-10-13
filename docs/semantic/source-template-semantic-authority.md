# RISEN CARE Source Template Semantic Authority

## 1. Purpose

RISEN CARE must separate:

1. provenance of an observed source document
2. semantic knowledge reusable across source documents

Existing connector semantic records remain the authority for
what a specific connector observed and confirmed.

A new Source Template layer provides reusable knowledge about
the structure and meaning of a document format.

---

## 2. Existing responsibilities

### connector_source_documents

Represents an observed source document.

Identity is connector-specific.

It preserves:

- facility
- connector
- source document identity
- source snapshot
- source provenance

It must remain unchanged.

### connector_confirmed_document_types

Represents the confirmed business type of a specific source document.

Examples:

- resident_master
- support_record
- recipient_certificate

It remains source-document and connector specific.

### connector_source_field_interpretations

Represents semantic interpretation and review state for a specific
field observed by a specific connector.

It preserves:

- inferred meaning
- confidence
- suggested standard meaning
- review state
- human confirmation
- confirmed meaning
- snapshot identity

It remains evidence / review state.

### connector_source_field_mappings

Represents the standard mapping actually accepted for a specific
source document field.

It remains execution-facing connector provenance.

---

## 3. Problem

Semantic knowledge is currently repeated when the connector identity changes.

Example:

The same resident master document has been observed by multiple connectors.

Both connectors independently contain mappings such as:

- 利用者番号 -> user.user_code
- 利用者名 -> user.name
- 生年月日 -> user.birth_date
- 性別 -> user.gender
- 受給者証番号 -> recipient_certificate.certificate_number

The semantic meaning is reusable knowledge.

The connector-specific records are provenance.

These responsibilities must not be conflated.

---

## 4. New semantic layer

### source_templates

Represents a reusable source format / schema.

Proposed responsibility:

- template_id
- facility_id
- display_name
- file_type
- document_type
- structure_fingerprint
- template_version
- status
- created_at
- updated_at

Initial scope should be facility-local.

Cross-facility promotion may be introduced later.

---

### source_template_fields

Represents structural fields belonging to a template.

Proposed responsibility:

- template_id
- template_field_key
- structural_path
- sheet_index
- ordinal
- sheet_name
- header_label
- normalized_header_label
- created_at
- updated_at

`sheet_index` identifies the structural sheet position.

For CSV, `sheet_index` is 0.

For Excel, `sheet_index` follows the stable sheet position produced by
the source extractor. `ordinal` identifies the field position within
that sheet.

Examples:

CSV:

    sheet:0:column:2

Excel:

    sheet:利用者台帳:column:2

Word:

    section:基本情報:label:氏名

---

### source_template_semantic_mappings

Represents reusable confirmed semantic authority.

This table contains only human-confirmed reusable knowledge.

Candidate, deferred, and unresolved interpretation state remains in
connector_source_field_interpretations and must not be promoted into
Template Semantic Authority until resolved.

Proposed responsibility:

- template_id
- template_field_key
- interpretation_status
- mapping_status
- confirmed_meaning
- standard_entity_name
- standard_field_name
- confirmed_by_human
- confirmed_at
- created_at
- updated_at

Allowed authority states in v1:

- confirmed + mapped
- confirmed + no_standard_match
- excluded + unmapped

For confirmed + no_standard_match, confirmed_meaning is required.

Unresolved fields must remain visible in the interpretation / review
layer.

They must not be discarded merely because Template Semantic Authority
has not yet been established.

---

### source_document_template_bindings

Associates an observed source document snapshot with a reusable template.

Proposed responsibility:

- facility_id
- connector_id
- source_document_key
- source_updated_at
- source_size
- template_id
- match_method
- match_confidence
- confirmed_by_human
- confirmed_at
- created_at

Possible match methods:

- exact_structure_fingerprint
- confirmed_by_human
- inferred_structure_match

---

## 5. Structure fingerprint

A Source Template must not use sourceDocumentKey as its identity.

sourceDocumentKey is an opaque UUID associated with a local
relative-path registry.

Template identity must instead be based on document structure.

The canonical fingerprint input should eventually include normalized
structural information such as:

CSV:

- file type
- ordered column/header structure

Excel:

- file type
- relevant sheet names
- ordered field/header structure per sheet

Word:

- file type
- structural labels
- table / section field structure

Values belonging to individual residents or support records must not
be included in the template fingerprint.

---

## 6. Semantic registration flow

Target flow:

    Source file
        ↓
    Structural analysis
        ↓
    Structure fingerprint
        ↓
    Existing template lookup
        │
        ├── found
        │     ↓
        │   load reusable semantic mappings
        │
        └── not found
              ↓
            create template candidate
              ↓
            Semantic registration / human review

After resolution:

    Template Semantic Authority
        ↓
    Source Field Interpretation
        ↓
    Source Field Mapping
        ↓
    Import / Semantic Revision / Promotion

---

## 7. Authority boundaries

Source Template Semantic Authority must not overwrite source evidence.

Template knowledge says:

    "fields with this confirmed structure are normally interpreted
     with these RISEN meanings"

It does not say:

    "all future source values are automatically domain truth"

Each actual source document remains traceable through:

- facility
- connector
- sourceDocumentKey
- source snapshot
- source field
- interpretation
- mapping
- Semantic Revision

---

## 8. Initial safety rule

Template reuse should initially be limited to the same facility.

A future promotion process may allow templates to become reusable
across facilities only after explicit review.

This prevents accidental semantic leakage between unrelated legacy
systems whose labels happen to look similar.

---

## 9. UI model

Semantic registration UI:

    ファイル取込
    Semantic登録
    登録済み書式

Semantic登録 status:

- 登録済み
- 候補
- 未解決
- 対象外

A user should not be forced to assign a meaning when the source field
cannot yet be interpreted safely.

---

## 10. Compatibility principle

Existing tables and APIs remain valid.

The Template layer is additive.

Existing connector-specific records continue to preserve provenance,
review state and execution history.

Template knowledge is used to pre-fill or suggest those records,
not replace them.

---

## 11. Structure fingerprint v1

### 11.1 Goal

The structure fingerprint identifies document formats whose semantic
field structure is equivalent enough to reuse Template Semantic
Authority.

It must identify structure, not content.

It must not include:

- resident names
- support record text
- dates belonging to actual records
- phone numbers
- certificate numbers
- row counts
- file modification timestamps
- connector identity
- sourceDocumentKey

---

### 11.2 Canonicalization version

Every fingerprint must record the canonicalization version used to
build it.

Initial version:

    risen-source-template-canonicalization-1

The version must be persisted separately from the fingerprint.

A future change in canonicalization rules must create a new version,
not silently reinterpret existing fingerprints.

---

### 11.3 Hash algorithm

Initial algorithm:

    SHA-256

The stored fingerprint is the lowercase hexadecimal digest of the
canonical structure representation.

---

### 11.4 CSV canonical structure

For CSV, canonical structure should include:

- source type: csv
- ordered field count
- ordered normalized header labels
- stable field positions

Conceptual canonical form:

    type=csv
    field_count=4
    field[0]=利用者番号
    field[1]=利用者名
    field[2]=生年月日
    field[3]=性別

Header order is significant.

Two CSV files with the same labels in a different order are not
automatically assumed to be the same template in v1.

---

### 11.5 Excel canonical structure

For Excel, canonical structure should include:

- source type: excel
- relevant sheet count
- normalized relevant sheet names
- ordered structural fields per sheet
- field positions within each sheet

Cell values belonging to actual records must not be included.

Conceptual canonical form:

    type=excel
    sheet_count=1
    sheet[0].name=利用者台帳
    sheet[0].field_count=4
    sheet[0].field[0]=利用者番号
    sheet[0].field[1]=利用者名
    sheet[0].field[2]=生年月日
    sheet[0].field[3]=性別

Sheet order should remain significant in v1 unless the extractor
already provides an explicit stable logical order.

---

### 11.6 Word canonical structure

For Word documents, canonical structure should include structural
labels and table / section organization discovered by the source
adapter.

Possible structural elements:

- section labels
- table identities
- row labels
- field labels
- structural ordering

Narrative values and resident-specific text must not be included.

Conceptual canonical form:

    type=word
    section[0]=基本情報
    section[0].field[0]=氏名
    section[0].field[1]=生年月日
    section[1]=受給者証
    section[1].field[0]=受給者証番号

Word fingerprinting may remain conservative until the extractor
produces sufficiently stable structural metadata.

---

### 11.7 Label normalization

Initial normalization should be deliberately conservative.

Proposed v1 normalization:

1. Unicode normalize using NFKC
2. trim leading and trailing whitespace
3. collapse consecutive whitespace to a single ASCII space
4. preserve semantic characters
5. preserve field order

Do not automatically:

- translate labels
- remove all punctuation
- convert unrelated synonyms to the same label
- infer semantic equivalence

Examples:

    " 氏名 "        -> "氏名"
    "Ｅ-mail"       -> "E-mail"
    "受給者証　番号" -> "受給者証 番号"

Semantic synonym handling belongs to the Semantic layer, not the
structure fingerprint layer.

---

### 11.8 Exact and inferred matches

Template binding must distinguish exact structural identity from
weaker similarity.

Initial match classes:

    exact_structure_fingerprint

Reserved for exact canonical fingerprint equality.

Future match classes may include:

    inferred_structure_match
    confirmed_by_human

An inferred match must never be silently upgraded to exact.

---

### 11.9 Fingerprint collision rule

A matching SHA-256 fingerprint is treated as matching canonical
structure under the same canonicalization version.

The canonical structure representation should also be persisted or
reconstructable for audit and debugging.

The system must not rely only on the opaque hash when explaining why
a template matched.

---

### 11.10 Versioning rule

A Template does not automatically become a different Template merely
because source content changed.

A new Template version is required when structural meaning changes,
for example:

- a field is added
- a field is removed
- a field moves position where order is significant
- a relevant sheet changes
- a structural label changes
- the canonical structure changes

A new file containing different resident data but the same canonical
structure remains the same Template version.

---

## 12. Initial implementation boundary

Version 1 should support:

1. CSV exact structure fingerprint
2. Excel exact structure fingerprint where extracted field structure
   is stable
3. Word registration without automatic cross-document matching unless
   structural extraction is sufficiently stable

For CSV and Excel in v1, structure_fingerprint,
canonicalization_version, and canonical_structure are required.

For Word in v1, those three fingerprint fields may all remain null
when stable structural extraction is not yet available. They must be
either all absent or all present as one fingerprint bundle.

Version 1 should not attempt fuzzy or AI-based template matching.

AI may suggest that two structures look similar, but human review is
required before they share Template Semantic Authority.


---

## 13. Template RPC boundary

### 13.1 Exact structure template registration

Version 1 separates exact fingerprint registration from manual
template registration.

CSV and Excel exact fingerprint registration uses:

    get_or_create_source_template_exact

The connector identity is supplied only for trust-boundary
authorization.

It is not part of Template identity.

Inputs:

- facility_id
- connector_id
- display_name
- file_type
- document_type
- structure_fingerprint
- canonicalization_version
- canonical_structure

Exact Template identity:

- facility_id
- canonicalization_version
- structure_fingerprint

The RPC must:

1. require connector_trust_boundary authorization
2. verify the connector is active for the facility
3. accept only CSV or Excel in the v1 exact path
4. validate the SHA-256 fingerprint
5. validate a nonblank canonicalization version
6. require canonical_structure to be a JSON object
7. serialize concurrent creation attempts for the exact Template
   identity
8. return the existing template when the exact identity already exists
9. reject structural inconsistency as a conflict
10. create a new Template only when no exact identity exists

Expected result statuses:

- created
- unchanged
- conflict
- denied
- invalid

The result also returns template_id.

`display_name` is presentation metadata and does not participate in
Template identity.

If the same exact Template identity exists, canonical_structure and
file_type must remain consistent.

A conflicting document_type must not silently overwrite existing
Template authority.

### 13.2 Word registration

Word registration is separate in v1.

When no stable structure fingerprint exists, Word must not use the
exact fingerprint get-or-create path.

A Word Template may be created only through an explicit human-reviewed
registration path until stable Word structural fingerprinting exists.

### 13.3 Exact Template field registration

Exact CSV / Excel Template fields are registered atomically with:

    register_source_template_fields_exact

Inputs:

- facility_id
- connector_id
- template_id
- fields

`fields` is a JSON array.

Each field contains:

- template_field_key
- structural_path
- sheet_index
- ordinal
- sheet_name
- header_label
- normalized_header_label

The connector identity is used only for trust-boundary authorization.

The RPC must:

1. require connector_trust_boundary authorization
2. verify the connector is active for the facility
3. verify the Template belongs to the same facility
4. require the Template to be an exact CSV or Excel Template
5. require a non-empty field array
6. validate every field before writing anything
7. reject duplicate template_field_key values
8. reject duplicate sheet_index + ordinal positions
9. serialize registration attempts for the Template
10. insert the complete field set only when the Template has no fields
11. return unchanged when the complete persisted field set is identical
12. return conflict when any persisted field differs
13. never silently update or delete an existing Template field

Expected result statuses:

- created
- unchanged
- conflict
- denied
- invalid

Template field structure is immutable for a given exact Template.

If source structure changes, it must produce a different structure
fingerprint and therefore a different Template identity rather than
mutating the existing Template fields.

#### Exact field derivation rules

For CSV and Excel exact Templates, Template field identity is derived
from the existing SourceFieldExtractor contract.

For every field:

    template_field_key =
        sheet:{sheet_index}:column:{ordinal}

    structural_path =
        template_field_key

    sheet_index =
        source sheetIndex

    ordinal =
        source columnIndex

`normalized_header_label` is the canonical normalized header label
that participated in the Template fingerprint.

`header_label` is presentation metadata from the first observed
source. It does not participate in Template structural equality and
must not cause an otherwise identical exact Template to conflict.

For CSV exact Templates:

- sheet_index must be 0
- sheet_name is stored as null because CSV sheet naming does not
  participate in the canonical structure

For Excel exact Templates:

- sheet_index must match canonical_structure
- sheet_name must equal the canonical normalized sheet name
- ordinal must equal canonical columnIndex

Exact field registration must validate the supplied field structure
against the Template's persisted canonical_structure before inserting
any source_template_fields rows.

Structural equality is based on:

- template_field_key
- structural_path
- sheet_index
- ordinal
- canonical sheet_name where applicable
- normalized_header_label

It is not based on presentation-only header_label.

### 13.4 Template Semantic Authority confirmation

Reusable Template semantic decisions are confirmed with:

    confirm_source_template_semantic_authority

Inputs:

- facility_id
- connector_id
- template_id
- template_field_key
- interpretation_status
- mapping_status
- confirmed_meaning
- standard_entity_name
- standard_field_name
- confirmed_at

The connector identity is used only for trust-boundary authorization.

The RPC must:

1. require connector_trust_boundary authorization
2. verify the connector is active for the facility
3. verify the Template belongs to the same facility
4. verify the Template field exists
5. accept only human-confirmed reusable authority states
6. reject candidate, deferred, unresolved, or AI-only states
7. serialize confirmation attempts for the exact Template field
8. create authority when none exists
9. return unchanged when the existing authority is identical
10. return conflict when different authority already exists
11. never silently overwrite existing Template Semantic Authority

Allowed authority states in v1:

- confirmed + mapped
- confirmed + no_standard_match
- excluded + unmapped

For confirmed + mapped:

- standard_entity_name is required
- standard_field_name is required

For confirmed + no_standard_match:

- confirmed_meaning is required
- standard_entity_name must be null
- standard_field_name must be null

For excluded + unmapped:

- standard_entity_name must be null
- standard_field_name must be null

Expected result statuses:

- created
- unchanged
- conflict
- denied
- invalid

Template Semantic Authority is immutable in v1.

A changed human semantic decision must not silently replace existing
authority. Revision semantics can be introduced separately when an
explicit Template authority revision model is designed.

### 13.5 Source Document Template binding

A specific Connector source document snapshot is bound to a reusable
Template with:

    bind_source_document_template

Inputs:

- facility_id
- connector_id
- source_document_key
- source_updated_at
- source_size
- template_id
- match_method
- match_confidence
- confirmed_by_human
- confirmed_at

The binding records provenance only.

It does not create or modify Template Semantic Authority.

The RPC must:

1. require connector_trust_boundary authorization
2. verify the connector is active for the facility
3. verify the exact source document snapshot exists for the same
   facility and connector
4. verify the Template belongs to the same facility
5. verify match_method is an allowed value
6. require human confirmation when match_method is
   confirmed_by_human
7. serialize binding attempts for the exact source snapshot
8. create the binding when none exists
9. return unchanged when the existing binding is identical
10. return conflict when the same source snapshot is already bound
    differently
11. never silently replace an existing source snapshot binding

Allowed match methods in v1:

- exact_structure_fingerprint
- confirmed_by_human

For exact_structure_fingerprint:

- the Template must have a non-null structure_fingerprint
- the source structure must have been verified against that Template
  before this RPC is called
- confirmed_by_human may be false
- confirmed_at may be null when confirmed_by_human is false

For confirmed_by_human:

- confirmed_by_human must be true
- confirmed_at must be non-null

match_confidence may be:

- high
- medium
- low
- null

Expected result statuses:

- created
- unchanged
- conflict
- denied
- invalid

Binding identity is the exact source snapshot:

    facility_id
    + connector_id
    + source_document_key
    + source_updated_at
    + source_size

A later source snapshot is a different binding identity.

Template Semantic Authority remains reusable independently of Connector
identity.
