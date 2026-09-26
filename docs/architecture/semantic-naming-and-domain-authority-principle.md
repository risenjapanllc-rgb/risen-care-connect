# Semantic Naming and Domain Authority Principle

## Purpose

RISEN Connect must not decide the business destination of data merely from
the physical file type, column position, database table, or UI selection.

The central architectural transition is:

Source Evidence
→ Semantic Naming
→ Promotion
→ Domain Authority
→ Operational / Billing Use

The first semantic naming of source evidence is therefore a critical
architectural boundary.

## 1. Source preserves what was observed

The Source layer preserves evidence of what actually existed in the source:

- source document identity
- source snapshot identity
- physical field identity
- original field label
- original value
- row / entity relationship
- provenance required to trace the fact back to its source

Source evidence must not be rewritten merely because the later semantic
interpretation changes.

## 2. Semantic names what the evidence means

The Semantic layer answers:

> What business fact does this source evidence represent?

Examples:

- `user.name`
- `user.birth_date`
- `user.gender`
- `user.user_code`
- `recipient_certificate.certificate_number`
- `recipient_certificate.valid_until`

Different physical source labels may resolve to the same governed semantic
meaning.

A semantic identifier is not a database column name and is not a UI label.
It is a stable business-meaning identifier.

## 3. Display-name change and meaning correction are different

Changing a human-readable label must not change the semantic identity.

For example, changing a displayed Japanese label does not by itself change:

`recipient_certificate.certificate_number`

Conversely, if evidence previously identified as a certificate number is
later confirmed to mean a different business fact, that is a semantic
correction, not a label edit.

Semantic corrections must be traceable. They must not silently erase the
previous interpretation or its provenance.

## 4. Promotion decides where governed meaning enters the business domain

A source file must not determine its destination table simply because it is
called a resident master, recipient certificate, support record, or another
document type.

Promotion uses governed semantic meaning to determine the appropriate Domain
authority.

For example, information observed in a recipient-certificate source may
contain both:

- facts whose Domain authority belongs to the user/resident domain; and
- facts whose Domain authority belongs to the recipient-certificate domain.

The physical source and the Domain authority are separate concerns.

## 5. One business fact should have one authoritative Domain owner

As a default principle, one business fact should have one authoritative
Domain owner.

The same value may legitimately appear elsewhere for purposes such as:

- immutable source evidence
- semantic evidence
- audit history
- historical snapshots
- billing snapshots
- derived read models

Those copies must not silently become competing authorities.

When duplication is necessary, the system must be able to distinguish the
authoritative fact from evidence, snapshots, history, and derived data.

## 6. A semantic correction must have an explicit impact path

When semantic meaning is corrected, RISEN should be able to determine:

- which Promotion was produced from the previous meaning;
- which Domain fact is affected;
- whether the old promoted fact should be replaced, invalidated, or retained
  as history;
- whether another Domain becomes the correct destination;
- whether downstream operational facts are affected; and
- whether remuneration or claim data already created from that fact requires
  review, correction, recalculation, or another governed action.

A semantic correction must not be implemented as uncontrolled multi-table
rewriting.

## 7. Historical and billing facts require temporal integrity

Current Domain facts and historical billing evidence are not necessarily the
same thing.

A correction to the current authoritative fact must not silently rewrite the
historical basis of an already-reviewed or submitted claim.

RISEN must preserve enough provenance, version, effective-period, and
snapshot information to explain which facts were used for an operational or
billing decision at that time.

Regulatory calculation rules remain separately versioned from facility facts.

## 8. Human confirmation belongs at the meaning boundary

Facility staff should primarily confirm facts they can judge from their work,
such as:

- what kind of source they are looking at;
- what a physical field means;
- which resident the evidence belongs to;
- whether proposed changes are correct.

They should not be required to understand internal database destinations or
Semantic Projection implementation details merely to make the system work.

Database routing is a Promotion responsibility.

## 9. Semantic records must remain governed

`semantic_records` must not become an unstructured JSON dumping ground.

Semantic content must remain governed by explicit semantic contracts,
provenance, stable semantic identifiers, validation, and controlled
Promotion.

The exact persistence model for semantic revisions and Promotion history is
a separate design decision and must be derived from actual domain and billing
requirements rather than assumed here.

## 10. End-to-end architectural test

For every important fact, RISEN should eventually be able to answer:

1. What source evidence produced this fact?
2. What semantic meaning was assigned to it?
3. Who or what confirmed that meaning?
4. What is the current semantic revision?
5. Which Domain owns the authoritative operational fact?
6. What Promotions were performed from it?
7. Which operational, remuneration, or claim results used it?
8. If the meaning is corrected, what must change and what historical evidence
   must remain unchanged?

This traceability is part of the path from RISEN Connect to end-to-end
Kokuhoren billing, not an optional audit feature.
