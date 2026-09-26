# AI Semantic Interaction Principle

## Purpose

RISEN should allow facility staff to work in the language of their actual
business rather than requiring them to know where information is stored,
which screen contains it, or which database structure implements it.

The target interaction is not:

Human
→ finds the correct screen
→ finds the correct field
→ edits the database-backed form

The target interaction is:

Human Business Language
→ Intent Resolution
→ Subject / Semantic Resolution
→ Governed Read or Change Plan
→ Impact Analysis
→ Authorized Execution
→ Domain / Operational / Billing Result

AI chat is therefore not merely another input screen.

It is a semantic interaction layer over governed RISEN business capabilities.

## 1. Staff should not need to navigate the internal data model

A facility staff member should eventually be able to say things such as:

- "山田さんの受給者証の期限を来年3月31日に訂正して"
- "佐藤さんの生年月日を訂正して"
- "今月、受給者証の期限が切れる人を教えて"
- "このCSVから新しく分かった情報を見せて"
- "昨日の利用実績で未確定の人は？"
- "この訂正は請求に影響する？"

The staff member should not need to know:

- the Supabase table name;
- the database column name;
- the internal Semantic Projection name;
- the screen hierarchy;
- the Promotion implementation; or
- the billing storage structure.

RISEN is responsible for resolving business language into governed system
meaning.

## 2. AI must not be the database authority

AI must not translate natural language directly into arbitrary database
updates.

For a change request, AI may help resolve:

- user intent;
- subject / resident identity;
- semantic meaning;
- proposed value;
- temporal meaning;
- ambiguity requiring clarification.

The actual authority to read or change business data must remain in explicit
RISEN contracts and services.

The AI interaction layer must not bypass Domain rules, Promotion rules,
validation, authorization, concurrency protection, or billing safeguards.

## 3. Natural language resolves to stable semantic meaning

Human expressions may vary while their governed meaning remains stable.

For example, expressions such as:

- "受給者証の期限"
- "受給者証の有効期限"
- "証書の期限"

may, when context and evidence are sufficient, resolve to a stable semantic
identifier such as:

`recipient_certificate.valid_until`

The semantic identifier, not the wording used in chat, becomes the governed
meaning used by downstream processing.

If the meaning is ambiguous, RISEN must ask for clarification rather than
guessing a business-critical change.

## 4. Subject identity must be resolved separately from semantic meaning

Understanding what field a person wants to change is not sufficient.

RISEN must also establish which business subject the request concerns.

For example:

"山田さんの受給者証番号を訂正して"

contains at least two separate resolution problems:

1. Which resident does "山田さん" identify?
2. Which semantic fact does "受給者証番号" identify?

A semantic meaning must never compensate for unresolved resident identity,
and resident identity must never compensate for unresolved semantic meaning.

Ambiguous identity must fail closed or require human clarification.

## 5. Read intent and change intent are different capabilities

RISEN must distinguish between requests such as:

"受給者証の期限を教えて"

and:

"受給者証の期限を訂正して"

A read operation may resolve and present authoritative information.

A change operation requires a governed change plan and must satisfy the
applicable authorization, validation, concurrency, provenance, Promotion,
Domain, and downstream-impact rules.

The existence of a readable fact does not automatically make that fact
editable.

## 6. A correction is a governed business operation, not an UPDATE statement

A request to "訂正して" must not mean:

"find a database row and overwrite a value."

RISEN should instead determine:

- the subject being changed;
- the stable semantic meaning;
- the current authoritative value;
- the proposed new value;
- the provenance of the current value;
- the source or human basis for the correction;
- the Domain authority that owns the operational fact;
- the Promotion or governed command required to change it;
- whether concurrent changes have occurred;
- which downstream facts or processes depend on it; and
- whether historical or billing evidence must remain unchanged.

Only after the applicable checks succeed may the governed execution path
perform the change.

## 7. Semantic and Domain authorities have different responsibilities

Semantic authority answers:

> What does this evidence or statement mean, and why does RISEN understand it
> that way?

Domain authority answers:

> What fact is currently authoritative for operational use?

AI interaction should use the Semantic layer to understand the requested
business meaning and the Domain layer to obtain or change the authoritative
operational state through governed Promotion or Domain commands.

These responsibilities must not be collapsed into an AI-generated database
operation.

## 8. Every material AI change must remain explainable

After a correction, RISEN should eventually be able to answer:

- what the staff member requested;
- how the subject was identified;
- which semantic identifier was resolved;
- what value existed before the change;
- what value was proposed;
- what evidence or human confirmation supported the change;
- what governed operation was executed;
- which Domain authority changed;
- what downstream effects were detected; and
- which historical facts were intentionally preserved.

The goal is not merely that AI can change data.

The goal is that RISEN can explain what changed, why it changed, and what the
change affected.

## 9. Historical and billing integrity must survive conversational correction

A natural-language correction to a current fact must not silently rewrite the
historical basis of completed operational or billing processes.

If a corrected fact has already contributed to:

- service-performance facts;
- remuneration calculation;
- claim preparation;
- submitted Kokuhoren claims;
- returned or rejected claims; or
- correction / reclaim processes,

RISEN must identify the relevant impact and route it through an explicit
governed process.

Facility facts and regulatory calculation rules remain separate authorities
with separate versioning.

AI must not invent or silently reinterpret regulatory rules.

## 10. Conversation must support clarification instead of unsafe inference

Natural language is inherently incomplete.

When required information is missing or ambiguous, RISEN should continue the
conversation.

For example:

Staff:
"山田さんの情報を訂正して"

RISEN may need to ask:

"どの情報を訂正しますか？"

If multiple residents match "山田さん", RISEN must resolve that ambiguity
before preparing a change.

The objective is low-friction interaction, not elimination of necessary
confirmation.

## 11. The same governed capabilities should serve UI, AI, and future clients

AI chat must not create a second business system beside the existing RISEN
application.

Where practical, the same governed application capabilities should support:

- existing UI workflows;
- AI conversational workflows;
- RISEN Connect;
- future APIs;
- automation; and
- other trusted clients.

The interaction channel may differ.

The business authority must remain shared.

This prevents business rules from being duplicated between screens, AI
prompts, connectors, and future integrations.

## 12. Architecture test

For each important RISEN capability, ask:

> Could a facility staff member eventually request this operation in ordinary
> business language without knowing the screen, table, or internal data model,
> while RISEN still preserves identity safety, semantic correctness,
> authorization, provenance, concurrency safety, Domain authority, and
> historical / billing integrity?

If the answer is no because the business capability exists only as screen
logic or direct table manipulation, the architecture should be examined for
a missing governed application boundary.

The objective is not to remove useful screens.

The objective is to make screens optional navigation aids rather than the
only way humans can reach business capabilities.

## 13. End-to-end target

The long-term path is:

Facility Staff Language
→ AI Intent Understanding
→ Resident / Subject Resolution
→ Semantic Resolution
→ Governed Application Capability
→ Impact Analysis
→ Human Confirmation When Required
→ Promotion / Domain Command
→ Operational State
→ Performance
→ Remuneration
→ Kokuhoren Claim

Source evidence, semantic revisions, Domain facts, regulatory rule versions,
and billing evidence remain traceable throughout this path.

RISEN should therefore be designed so that a staff member can eventually
say:

"訂正して"

without needing to know where the data lives,

while the system still knows exactly what may be changed, what must not be
rewritten, and what downstream consequences require action.
