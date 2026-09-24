# Semantic First / Promotion Principle

## 1. Purpose

RISEN Connect receives operational data from facility-managed sources such as
Excel and CSV files.

The source formats, column names, layouts, and operational conventions may
differ between facilities and source systems.

Connect must absorb those differences without allowing source-specific
structures to become the permanent database model.

The default data flow is therefore:

Source document
→ Connect parsing and canonicalization
→ semantic_records
→ Promotion when operational requirements are established
→ operational domain tables

## 2. semantic_records is the first canonical storage layer

Data accepted through Connect is first stored as a semantic record.

A semantic record represents what Connect understood the source data to mean,
not merely the original spreadsheet layout.

The semantic layer uses:

- semantic_type
- semantic_content
- resident_id where applicable
- content hash
- canonicalization version
- source provenance

This layer provides a stable boundary between facility-specific source formats
and RISEN's internal data model.

## 3. Do not mirror spreadsheet structure into the database

Excel or CSV column names must not automatically become permanent database
columns.

Different facilities may use different labels for the same concept.

For example:

- 受給者証番号
- 受給者番号
- 受給者証No
- 証番号

Connect may normalize these source-specific expressions into one semantic key,
for example:

recipient_certificate.certificate_number

The database model should represent business meaning rather than the physical
layout of a particular source document.

## 4. semantic_content must remain governed

semantic_content is flexible, but it is not an unrestricted JSON storage box.

Each semantic_type must define which semantic keys are accepted and what those
keys mean.

Canonicalization, validation, conflict detection, hashing, and provenance
rules remain part of the semantic contract.

New source fields should not be added without determining their semantic
meaning.

## 5. Promotion

When a semantic concept becomes sufficiently stable and is required directly
by RISEN operational workflows, it may be promoted into a dedicated
operational domain table.

Examples may include:

- users
- recipient_certificates
- service_contracts
- assessments
- support_plans

These tables are introduced when real operational requirements establish their
necessary structure.

They should not be created only because a source spreadsheet contains a set of
columns.

## 6. Promotion does not delete the semantic record

Promotion is an additional representation of accepted semantic data.

The original semantic record remains available as the record of what Connect
accepted and understood from the source.

This allows:

- provenance tracking
- reconciliation
- conflict investigation
- future model changes
- controlled re-projection into revised operational models

## 7. Example: recipient certificate

A recipient certificate may first be stored as:

semantic_type:

recipient_certificate

semantic_content:

- user.name
- user.birth_date
- user.gender
- recipient_certificate.certificate_number
- recipient_certificate.valid_until

Some safe resident attributes may also be reflected into users under the
existing profile-fill rules.

If operational requirements later establish a stable recipient certificate
domain model, certificate-specific data may be promoted into a dedicated
recipient_certificates table.

The semantic record remains retained.

## 8. Separation of responsibilities

The layers have different responsibilities.

Source documents:
facility-owned operational input.

Connect:
parsing, canonicalization, semantic interpretation, identity resolution,
validation, conflict detection, and safe persistence.

semantic_records:
first canonical storage of accepted semantic meaning.

Operational domain tables:
structured projections used directly by RISEN workflows, applications,
queries, reporting, or automation.

Provenance and state:
traceability, source identity, canonicalization version, hashes, and update
control.

## 9. Evolution rule

Operational domain models should evolve from observed facility workflows and
real product requirements.

When requirements change, the operational projection may change without
requiring source-specific formats to become part of the permanent domain
model.

The semantic layer therefore acts as the stable boundary between changing
external data and evolving RISEN operational models.

## 10. Design rule

The default rule for new Connect integrations is:

1. Understand the source.
2. Define its semantic meaning.
3. Canonicalize and validate it.
4. Store the accepted meaning in semantic_records.
5. Preserve provenance and state.
6. Promote only the data whose operational model is sufficiently understood.
7. Retain the semantic record after promotion.

This principle is referred to as:

Semantic First → Promotion
