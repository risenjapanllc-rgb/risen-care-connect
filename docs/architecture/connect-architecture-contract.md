# RISEN Connect Architecture Contract

## 1. Purpose

This document defines the architectural contract that implementations of
RISEN Connect must preserve.

The governing architectural principle is defined in:

- `docs/architecture/semantic-first-promotion-principle.md`

That document defines **Semantic First -> Promotion** as the data-modeling
principle.

This document defines the implementation boundaries, guarantees, and
prohibitions required to preserve that principle as Connect evolves.

The default flow is:

Source
-> Parse / Canonicalize
-> Identity Resolution
-> Validation
-> Semantic Persistence
-> Promotion when justified
-> Operational Domain Model

External source structure must not directly determine RISEN's operational
database structure.

## 2. Architectural boundaries

RISEN Connect separates four concerns:

1. Source and provenance
2. Semantic interpretation and persistence
3. Promotion
4. Operational domain models

These concerns may participate in one atomic operation where required, but
their responsibilities must remain conceptually distinct.

A source value does not become operational truth merely because it was
successfully parsed.

A semantic record does not become operational truth merely because it was
successfully persisted.

Promotion is the explicit boundary between accepted semantic meaning and
RISEN operational state.

## 3. Source and provenance contract

Connect must retain sufficient provenance to determine where accepted semantic
data came from and how it was processed.

Depending on the integration, this may include information such as:

- source document identity
- source record identity
- source type
- source filename
- source update timestamp
- source size
- content hash
- canonicalization version

The exact representation may evolve.

This contract does not currently require a dedicated `source_artifacts` table
or other specific persistence model.

### Guarantees

Source provenance must be sufficient for the integration's required:

- traceability
- reconciliation
- conflict investigation
- stale-write detection
- idempotent reprocessing

### Prohibitions

Implementations must not:

- treat a filename alone as universally sufficient source identity
- create semantic data with no meaningful source traceability where
  traceability is required
- make source-specific physical structure part of the permanent domain model
  merely because it exists in an external file

## 4. Semantic contract

`semantic_records` is the first canonical persistence layer for accepted
semantic meaning.

A semantic record represents:

> what Connect understood the source data to mean

It does not merely reproduce the source document layout.

Each supported semantic type must have a governed semantic contract.

A semantic contract defines, as appropriate:

- semantic type
- accepted semantic keys
- meaning of those keys
- validation rules
- canonicalization rules
- identity requirements
- provenance requirements
- conflict behavior
- hashing behavior
- versioning behavior

The implementation mechanism may differ between semantic types. A single
shared validator is not required.

### Guarantees

Accepted semantic content must be:

- meaningfully typed
- validated according to its semantic contract
- canonicalized according to a known version where canonicalization applies
- traceable to its source context
- suitable for deterministic comparison where idempotency or conflict
  detection requires it

### Prohibitions

`semantic_content` must not become:

- an unrestricted JSON dumping ground
- a copy of arbitrary source columns with no defined meaning
- a shortcut for avoiding domain modeling
- a place for silently mixing unrelated semantic concepts

New fields must not be accepted merely because a new source contains them.

Their meaning must first be established.

## 5. Semantic acceptance is not operational authority

Semantic persistence means that Connect accepted an interpretation of source
data.

It does not automatically authorize mutation of RISEN operational data.

For example, a source may be interpreted as:

`user.name = <value>`

That interpretation may be valid semantic data while still conflicting with
an existing operational user profile.

Therefore:

Semantic understanding
!=
automatic operational overwrite

Operational mutation requires an explicit Promotion rule.

## 6. Promotion contract

Promotion is the controlled projection of accepted semantic meaning into
RISEN operational domain models.

Promotion must be based on semantic meaning, not on the physical column or
field structure of a particular source.

A Promotion rule must define, as appropriate:

- eligible semantic type and fields
- target operational concept
- identity requirements
- create behavior
- fill behavior
- unchanged behavior
- conflict behavior
- overwrite policy
- idempotency behavior
- transaction boundary

### Safe default

Where no stronger domain-specific rule has been established, Connect must not
silently overwrite conflicting operational data.

The recipient-certificate integration demonstrates the intended pattern for
safe profile filling:

- operational value empty + safely accepted semantic value -> fill
- same value -> unchanged
- different value -> conflict

This pattern is an example, not a requirement that every future domain use
identical rules.

## 7. Promotion must be explicit

Implementations must not use the rule:

semantic value exists
-> update operational database

Promotion must be deliberate and domain-specific.

The source system must not determine Promotion authority.

For example:

"the value came from Fukushi Monogatari"

is not by itself a sufficient reason to promote a value.

The relevant question is:

"Is this semantic meaning authorized and safe to project into this operational
domain under the applicable Promotion contract?"

## 8. Operational domain model contract

Operational domain tables represent how RISEN uses information in actual
workflows.

They are not mirrors of external forms, spreadsheets, CSV layouts, or vendor
schemas.

New domain models should be introduced when their business meaning is
sufficiently established through evidence such as:

- actual facility workflows
- product requirements
- authoritative regulatory meaning
- observed source data
- cross-source consistency

Potential future concepts may include recipient certificates, service
contracts, service delivery, billing calculations, or claims.

Their names and schemas must not be considered established merely because
those concepts appear in source documents.

## 9. Promotion does not destroy semantic history

Promotion creates or updates an operational representation.

It does not replace the semantic record.

The semantic record must remain available according to applicable retention
rules so RISEN can preserve the distinction between:

- what Connect accepted and understood from the source
- how RISEN projected that meaning into operational state

This supports:

- provenance
- reconciliation
- conflict investigation
- future model evolution
- controlled re-projection

## 10. Fact and calculation separation

Where regulatory or billing calculations are involved, Connect must avoid
silently collapsing historical business facts and rule-derived calculation
results into one mutable concept.

Conceptually:

Business fact
-> applicable rule/version
-> calculation result

A later rule change must not silently rewrite the historical fact from which a
calculation was derived.

Where reproducibility is required, the system should preserve sufficient
version information to explain which rule interpretation produced a result.

The exact billing rule model is not defined by this document and must be
established separately from facility fact modeling.

## 11. Idempotency contract

Connect is a continuously usable integration system, not a one-shot importer.

For the same effective input and the same applicable semantic contract,
reprocessing should converge on the same accepted state rather than create
unnecessary duplicates or changes.

Each integration must define the identity and comparison information required
for safe reprocessing.

Depending on the semantic type, this may include:

- source identity
- logical record identity
- resident identity
- content hash
- canonicalization version
- expected prior hash
- source update information

Idempotency must be tested at the appropriate boundary.

## 12. Conflict contract

Conflicts are valid system outcomes.

A conflict must not automatically be treated as either:

- source wins
- database wins

The applicable semantic or Promotion contract must define the safe behavior.

Where automatic resolution is not justified, Connect must preserve the
conflict rather than silently overwrite information.

## 13. Atomicity and failure safety

Operations that must succeed as one business unit must define an explicit
transaction boundary.

Where partial success would create an invalid or misleading operational state,
the operation must behave as:

all required changes succeed
or
the protected changes are rolled back

The recipient-certificate STEP6 implementation is an example: resident
admission/profile filling and semantic persistence are protected so a
downstream semantic persistence failure does not leave the protected resident
change committed by itself.

Atomicity boundaries are domain-specific and must not be assumed to be
identical for every Connect integration.

## 14. Versioning contract

Semantic interpretation and canonicalization may evolve.

Where a change can affect deterministic representation, comparison, hashing,
or interpretation, the relevant version must be explicit.

A new version must not silently reinterpret historical data as though it had
always been processed under the new rules.

Migration, reprocessing, or re-projection must be deliberate.

## 15. New integration decision rule

When adding a new Connect integration, implementation must begin with:

1. Understand the source and its operational context.
2. Determine what the source data means.
3. Define the semantic contract and meaningful record granularity.
4. Define identity resolution.
5. Define validation and canonicalization.
6. Define provenance and idempotency requirements.
7. Persist accepted meaning in the semantic layer.
8. Determine whether any semantic data has a sufficiently established
   operational model for Promotion.
9. Define explicit Promotion and conflict rules for that subset only.
10. Preserve the semantic record after Promotion.

The implementation must not begin by asking:

> Which database table should each source column be written into?

The first architectural question is:

> What does Connect understand this source data to mean?

## 16. Current implementation versus architectural requirement

This contract contains both principles already represented in the current
implementation and requirements that future integrations must preserve.

Not every semantic type is required to use the same implementation classes,
validators, or persistence path.

Existing implementations must not be described as providing guarantees that
have not been verified.

When this contract and an implementation diverge, the divergence must be made
explicit and resolved deliberately rather than hidden by documentation.

## 17. Core rule

The architectural rule of RISEN Connect is:

> Source is evidence.
> Semantic is Connect's governed understanding of that evidence.
> Promotion is the controlled decision to project that understanding.
> Domain is RISEN's operational representation.

Keep these responsibilities separate even when they participate in the same
transaction.
