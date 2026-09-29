# Recipient Certificate Promotion Revision Model

## 1. Purpose

This document defines the Recipient Certificate-specific persistence model for
the governed path:

Source Evidence
→ Semantic Meaning
→ Semantic Revision
→ Promotion Event
→ Domain Fact Revision
→ Current Operational Truth
→ downstream operational / remuneration / claim use

It specializes the existing RISEN architecture principles without changing
their authority boundaries.

The goals are:

- preserve immutable evidence of what RISEN understood at Promotion time;
- prevent current Semantic or Domain state from silently rewriting history;
- keep Promotion separate from Source and Semantic persistence;
- prevent source data from becoming Domain authority by direct overwrite;
- keep Domain corrections traceable as revisions;
- support later linkage to Performance, calculation, and Claim Snapshots.

---

## 2. Existing Recipient Certificate import boundary

The existing Recipient Certificate atomic persistence path owns:

- trusted resident admission / resident profile fill; and
- Semantic Logical Record persistence.

It does not own Recipient Certificate Domain authority.

A successful Semantic persistence operation therefore does not by itself mean
that a Recipient Certificate Domain fact has been created or revised.

Promotion remains a separate governed operation.

---

## 3. Semantic Logical Record and Semantic Revision are different concepts

A Semantic Logical Record represents the current accepted semantic state for a
logical semantic identity.

Its stable `recordId` identifies the logical record.

The current Semantic persistence implementation may update the semantic content
and content hash associated with that same `recordId`.

Therefore `recordId` alone must not be treated as immutable evidence of the
meaning that existed at an earlier Promotion.

Recipient Certificate Promotion requires an immutable Semantic Revision
reference.

A Semantic Revision must preserve, at minimum:

- semanticRevisionId;
- semantic recordId;
- residentId;
- semanticType;
- logicalSlot;
- contentHash;
- canonicalizationVersion;
- semanticContent applicable to that revision;
- trusted source provenance;
- trusted facility / connector scope as required for provenance;
- created / accepted time as server authority.

A Semantic Revision is append-only historical evidence.

Changing the current Semantic Logical Record must not mutate an existing
Semantic Revision.

---

## 4. Promotion Evidence

Promotion must operate from an immutable Semantic Revision, not from mutable
current Semantic state alone.

For Recipient Certificate Promotion, the Promotion evidence reference must
identify the exact Semantic Revision that supplied:

- `recipient_certificate.certificate_number`; and
- `recipient_certificate.valid_until`, when present.

The Promotion candidate may expose the governed Domain fields required for the
decision, but the persisted Promotion history must retain the immutable
Semantic Revision reference.

Source snapshot identity alone is not Domain authority.

Semantic content alone is not Domain authority.

Promotion is the governed boundary that decides whether the accepted Semantic
Revision may create or revise a Recipient Certificate Domain fact.

A Promotion decision that reaches the governed Promotion boundary must be
representable as an immutable Promotion Event.

A Promotion Event is decision history, not Domain authority.

It must preserve, at minimum:

- promotionEventId;
- source Semantic Revision reference;
- Promotion contract version;
- Promotion decision status;
- Recipient Certificate Domain identity evaluated by the decision;
- current Domain Fact Revision observed by the decision, when one existed;
- server-created decision time.

A Promotion Event must not mutate because the current Semantic or Domain state
later changes.

---

## 5. Recipient Certificate Domain identity

The logical Recipient Certificate Domain identity is:

- residentId; and
- certificateNumber.

The following are not part of Recipient Certificate Domain identity:

- source file name;
- sourceDocumentKey;
- source row;
- sourceRecordKey;
- connectorId;
- contentHash;
- canonicalizationVersion;
- validUntil.

`validUntil` is a governed Domain attribute, not identity.

---

## 6. Domain Fact Revision

Recipient Certificate Domain state must preserve revisions rather than
silently replacing historical fact state.

A Domain Fact Revision is append-only and must preserve, at minimum:

- domainFactRevisionId;
- Recipient Certificate Domain identity;
- governed Domain field values;
- Promotion Event reference;
- Promotion contract version;
- source Semantic Revision reference;
- revision relationship to the prior Domain Fact Revision when applicable;
- server-created revision time.

A correction or governed fill creates a new Domain Fact Revision.

It must not destructively rewrite the prior revision.

---

## 7. Current Operational Truth

Current Operational Truth is the currently authoritative Domain Fact Revision
for a Recipient Certificate Domain identity.

The current view or pointer is not a competing authority.

It only identifies which immutable Domain Fact Revision is presently accepted
for operational use.

Conceptually:

Recipient Certificate Domain Identity
→ Domain Fact Revision 1
→ Domain Fact Revision 2
→ ...
→ Current Revision

The exact SQL representation of the current pointer or current read model is an
implementation decision, but it must not destroy revision history.

---

## 8. Promotion decision mapping

The existing Recipient Certificate Promotion decision states map to Domain
persistence semantics as follows.

### ready_create

Create the first Recipient Certificate Domain Fact Revision for the Domain
identity.

### ready_fill

Create a new Domain Fact Revision containing the governed fill.

`ready_fill` must never overwrite identity.

Only fields allowed by the applicable Promotion contract may be filled.

For Promotion contract
`recipient-certificate-promotion-1`, the current governed fill field is:

- validUntil.

### unchanged

No new Domain write intent is required.

Historical evidence remains unchanged.

### conflict

No Domain write occurs automatically.

The existing Domain fact and incoming Semantic Revision must both remain
available for governed review or later resolution.

### rejected / insufficient evidence

No Domain write occurs.

Source and Semantic evidence remain preserved.

---

## 9. Source-wins overwrite is forbidden

A later source observation does not automatically replace a nonempty current
Domain value.

If an incoming governed value differs from an existing nonempty Domain value,
the default outcome is conflict unless a later explicit Domain correction
contract authorizes a revision.

Source recency alone is not sufficient authority to overwrite Domain truth.

---

## 10. Promotion history

RISEN must eventually be able to answer, for every Recipient Certificate Domain
Fact Revision:

1. Which Semantic Revision supported it?
2. Which Source Evidence supported that Semantic Revision?
3. Which Promotion contract version evaluated it?
4. What Promotion decision produced it?
5. Which previous Domain Fact Revision, if any, it revised?
6. Which Domain Fact Revision is current?
7. Which downstream operational, remuneration, or Claim results used it?

Promotion history must therefore be traceable independently from mutable
current-state representations.

---

## 11. Claim and downstream integrity

A later Semantic correction or Domain correction must not silently alter:

- prior Performance evidence;
- prior regulatory calculation inputs;
- prior remuneration results; or
- prior Claim Snapshots.

Downstream historical artifacts must be able to reference the Domain Fact
Revision actually used at that time.

Current Operational Truth and Historical Claim Truth are separate concepts.

---

## 12. Persistence boundary

Recipient Certificate Domain persistence is downstream of successful Semantic
persistence.

The conceptual flow is:

Recipient Certificate import
→ trusted Resident / Semantic atomic persistence
→ persisted Semantic Revision
→ Recipient Certificate Promotion Contract
→ Promotion Decision
→ Persistence Intent
→ governed Domain persistence transaction
→ immutable Promotion Event
→ Domain Fact Revision persistence
→ Current Operational Truth

For `ready_create` and `ready_fill`, the Promotion Event, Domain Fact Revision,
and movement of Current Operational Truth must succeed as one governed Domain
persistence operation.

A partial result in which a Domain-changing Promotion Event is committed but
its corresponding Domain Fact Revision is not committed must not be treated as
a successful Promotion.

For non-writing outcomes such as `unchanged` or `conflict`, no Domain Fact
Revision is created. Whether those decisions are persisted as Promotion Events
must be defined explicitly by the Promotion Event contract.

Promotion must remain server-governed.

The Local Connector must not become the authority that chooses Domain
persistence destinations or revision behavior.

---

## 13. Implementation sequence

Implementation should proceed in this order:

1. define the immutable Semantic Revision contract;
2. expose a trusted server-side way to obtain the persisted Semantic Revision;
3. adapt Recipient Certificate Promotion candidates to reference that revision;
4. define the append-only Promotion Event contract;
5. define Recipient Certificate Domain Fact Revision repository contracts;
6. define current Domain lookup semantics;
7. implement append-only Domain revision persistence;
8. connect Promotion Decision, Promotion Event, and Persistence Intent to that repository;
9. add downstream Domain revision references before Claim integration.

Database schema must follow these contracts rather than define them implicitly.
