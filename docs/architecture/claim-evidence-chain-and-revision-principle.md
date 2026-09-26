# Claim Evidence Chain and Revision Principle

## 1. Purpose

RISEN must support an end-to-end path from facility evidence to explainable
Kokuhoren claims.

The architectural objective is not merely to generate claim data.

RISEN must be able to explain:

- what source evidence existed;
- what RISEN understood that evidence to mean;
- what business fact was accepted;
- which regulatory rule version was applied;
- how the remuneration result was calculated;
- what was actually submitted;
- and what happened when any of those facts were later corrected.

The governing chain is:

Source Evidence
→ Semantic Authority
→ Promotion
→ Domain Fact Authority
→ Performance
→ Regulatory Rule Authority
→ Calculation Authority
→ Claim Authority

Revision and provenance must remain traceable across the entire chain.

This principle extends, and does not replace, the existing Semantic First,
Promotion, Domain Authority, and AI Semantic Interaction principles.

---

## 2. Source Evidence Authority

Source Evidence Authority answers:

> What did the source actually contain at that point in time?

Examples include:

- CSV files;
- Excel workbooks;
- records exported by welfare software;
- time-card data;
- facility-created records;
- human-entered source facts;
- and other evidence received by RISEN.

Source evidence must preserve sufficient provenance to identify the source and
the relevant source snapshot.

A later semantic correction must not rewrite the original source evidence.

If the physical source changes, the changed source must be distinguishable
from the previous source snapshot.

Source evidence is evidence.

It is not automatically an operational fact and it is not automatically a
claimable performance fact.

---

## 3. Semantic Authority

Semantic Authority answers:

> What business meaning does RISEN understand this evidence to represent?

Semantic meaning must be independent from:

- the physical source column name;
- the source product;
- the workbook layout;
- the UI label;
- and the destination database table.

A semantic interpretation may later be corrected.

Such a correction must create a traceable semantic revision or equivalent
history. It must not silently erase the previously accepted interpretation.

`semantic_records` may participate in this authority, but it must not become
an unstructured storage location for every operational, regulatory,
calculation, or claim concern.

---

## 4. Promotion

Promotion is the governed boundary between accepted semantic meaning and
business-operational authority.

Promotion answers:

> Is this accepted meaning allowed to create, revise, or contribute to an
> authoritative Domain fact?

Promotion must be based on governed business meaning and applicable business
rules, not merely on:

- the source file type;
- the source system;
- a spreadsheet column;
- a worksheet name;
- or an AI inference.

Promotion must preserve provenance back to the semantic and source evidence
that justified the operation.

---

## 5. Domain Fact Authority

Domain Fact Authority answers:

> What business fact does RISEN currently accept as authoritative for
> operational use?

Examples may include:

- resident facts;
- recipient-certificate / eligibility facts;
- contract facts;
- service-entitlement facts;
- service-delivery facts;
- cost-sharing facts;
- and other governed operational facts.

A Domain fact may require:

- an effective period;
- a service type;
- a facility or provider;
- a resident or other subject;
- provenance;
- confirmation state;
- and revision history.

The exact Domain model must be determined by business requirements and must
not be inferred solely from the shape of source files.

Where different services require different facts, RISEN may use a governed
common core with service-specific extensions rather than forcing all services
into one universal record shape.

---

## 6. Revision is a chain, not a competing authority

Revision is not a separate owner of business truth.

Semantic Authority remains responsible for semantic meaning.

Domain Authority remains responsible for operational facts.

Revision records how those authorities changed over time.

RISEN must be able to trace, as applicable:

Source Evidence
→ Semantic Revision
→ Promotion
→ Domain Fact Revision
→ affected Performance
→ applicable Regulatory Rule Version
→ Calculation
→ Claim Snapshot
→ Claim lifecycle

A correction must therefore be a governed business operation, not an
uncontrolled database UPDATE.

The correction process must be able to determine which downstream results
may require:

- review;
- invalidation;
- recalculation;
- correction;
- resubmission;
- or preservation as historical evidence.

---

## 7. Current Operational Truth and Historical Claim Truth are different

The current authoritative Domain fact and the fact historically used for a
claim are not necessarily the same after a correction.

RISEN must distinguish:

### Current Operational Truth

The fact currently accepted for ongoing operational use.

### Historical Claim Truth

The facts, rule versions, calculations, and claim values that were actually
used at the relevant historical point.

Correcting Current Operational Truth must not silently rewrite Historical
Claim Truth.

If a correction affects an already prepared or submitted claim, RISEN must
represent that impact explicitly.

---

## 8. Regulatory Rule Authority

Facility facts and regulatory calculation rules are separate authorities.

Regulatory Rule Authority answers:

> Under the applicable official rules for this period and service, how must
> the accepted business facts be evaluated?

Regulatory rules may change because of:

- remuneration revisions;
- notifications;
- official interpretations;
- service-code changes;
- interface-specification changes;
- or other applicable regulatory changes.

A new rule version must not silently reinterpret a historical calculation as
though the new rule had always applied.

RISEN must preserve or identify the rule version required to explain a
calculation.

AI must not invent, silently alter, or independently become the authority for
regulatory rules.

---

## 9. Calculation Authority

Calculation Authority answers:

> Which accepted facts and which regulatory rule version produced this
> remuneration result?

A material calculation should be reproducible or explainable from:

- the relevant Domain facts;
- their applicable effective state;
- the applicable Regulatory Rule Version;
- the calculation inputs;
- and the resulting units, adjustments, amounts, or other claim-relevant
  results.

Recalculation after a correction must not silently destroy the historical
calculation that was previously reviewed or used.

A recalculation is a new governed result or revision with an explicit
relationship to the prior result.

---

## 10. Claim Authority

Claim Authority answers:

> What claim information was actually prepared or submitted, and what
> happened to it afterward?

A Claim Snapshot must preserve the claim-relevant state used at the time of
that claim.

Once a claim has become historical evidence, later changes to current facts,
semantic interpretations, regulatory rules, or calculations must not
silently rewrite that snapshot.

Claim lifecycle events may include, as applicable:

- preparation;
- review;
- submission;
- acceptance;
- return or rejection;
- correction;
- cancellation;
- resubmission;
- and other governed claim processes.

A correction or resubmission must be represented as a lifecycle event or new
claim state, not as deletion of the historical submission.

The Kokuhoren external format is an external submission contract. It must not
become the entire RISEN Domain model.

---

## 11. Non-destructive correction rules

RISEN must not silently overwrite or destroy the evidence required to explain
historical decisions.

At minimum:

1. Source evidence must not be overwritten because its later interpretation
   changed.
2. A previous semantic interpretation must not disappear merely because a new
   semantic revision is accepted.
3. A Domain fact correction must not erase the fact state used by a historical
   calculation.
4. A regulatory revision must not replace the rule version used by a
   historical calculation.
5. Recalculation must not silently replace a historical calculation result.
6. A submitted Claim Snapshot must not be rewritten because current facts were
   corrected.
7. Return, correction, cancellation, and resubmission processes must preserve
   the relevant prior claim history.

Physical retention mechanisms may differ by authority, but the required
historical explanation must remain possible.

---

## 12. Extensibility

RISEN must remain extensible without sacrificing evidence integrity.

It must be possible to add, under governed contracts:

- new source products;
- new source layouts;
- new Semantic Meanings;
- new Domain fact types;
- new service-specific facts;
- new service types;
- new regulatory rule versions;
- new remuneration conditions;
- and new claim-interface versions.

Adding support for a new source or service must not require rewriting
historical evidence from an existing source or service.

Unknown source values must remain Source Evidence until RISEN has sufficient
authority to assign governed meaning.

A new or uncertain meaning must not be promoted merely to make an import
succeed.

---

## 13. Service Delivery and Performance must remain distinguishable

A support record, attendance record, time-card event, stay record, meal
record, hospitalization record, or other facility event may provide evidence
for service delivery.

It is not automatically equivalent to claimable Performance.

The relationship may differ by service.

RISEN must therefore allow:

Source Evidence
→ governed service-specific derivation
→ Service Delivery Fact
→ Performance
→ Regulatory Calculation
→ Remuneration Result
→ Claim Snapshot

where required.

For some trusted source systems, the evidence may be closer to an already
confirmed Service Delivery or Performance fact.

For other sources, additional derivation or human confirmation may be
required.

The strength of the source evidence may affect the required confirmation
process, but it must not bypass the governing Domain and regulatory rules.

---

## 14. AI correction must use the same chain

AI interaction is an interface to governed capabilities, not a separate
business authority.

For a request such as:

"6月15日の利用実績を訂正して"

RISEN must not translate the request directly into an arbitrary database
UPDATE.

The governed path must be capable of resolving:

- the subject;
- the intended business meaning;
- the relevant effective date or period;
- the current Domain fact;
- the evidence or human basis for the correction;
- the proposed Domain revision;
- affected Performance;
- affected calculations;
- affected Claim Snapshots;
- and any required correction or resubmission process.

Human confirmation must be required where identity, meaning, business impact,
authorization, or regulatory safety requires it.

The same governed capabilities should ultimately be usable by UI, AI,
Connect, APIs, and automation.

---

## 15. Architecture test

For every material fact that can influence remuneration or a Kokuhoren claim,
RISEN should eventually be able to answer:

1. What Source Evidence supports this fact?
2. What Semantic Meaning was assigned to that evidence?
3. Which semantic revision was applicable?
4. Who or what confirmed the meaning where confirmation was required?
5. Which Promotion created or revised the Domain fact?
6. Which Domain Authority owns the fact?
7. What effective period or service context applied?
8. Which Performance result used the fact?
9. Which Regulatory Rule Version was applied?
10. Which calculation result was produced?
11. Which Claim Snapshot used that result?
12. What was actually submitted?
13. What claim lifecycle events followed?
14. If the fact or meaning was later corrected, what changed?
15. What historical evidence was intentionally preserved?

If RISEN cannot answer these questions for a claim-relevant fact, the
end-to-end evidence chain is incomplete.

---

## 16. Governing principle

RISEN's flexibility means:

> New sources, meanings, business facts, services, and regulatory rules can be
> added, and incorrect meanings or facts can be corrected, without destroying
> the evidence required to explain past operational and claim decisions.

The target end-to-end architecture is:

Facility Source
→ Source Evidence
→ Semantic Meaning
→ Promotion
→ Governed Domain Facts
  (including, as applicable, Eligibility, Contract, Service Entitlement,
   Service Delivery, Cost Sharing, and service-specific facts)
→ Performance
→ Regulatory Calculation
→ Remuneration Result
→ Claim Snapshot
→ Kokuhoren

Service Delivery is therefore a governed Domain fact, not a separate authority
between Domain Authority and Performance.

Revision and Provenance must remain traceable across the full chain.
