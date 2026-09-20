# Requo

Owner-led SaaS for service businesses: inquiry → quote → invoice → manual payment record. Requo records money received outside Requo; it never processes money.

## Language

### Manual payments

**Record payment**:
An authorized user attests the business received money outside Requo against one invoice.
_Avoid_: Process payment, charge, collect online

**Payment record**:
One attestation of money received against one invoice, with amount, method, date, optional reference and notes.
_Avoid_: Transaction, payment intent, charge

**Receipt**:
The view and PDF rendering of a single payment record for business records.
_Avoid_: Tax receipt, official receipt, proof of processing

**Void**:
Marking a payment record as excluded from invoice balances while keeping the row for audit.
_Avoid_: Delete, remove, refund, reverse

**Amount paid**:
Sum of non-voided payment records against an invoice, in integer minor units.
Code synonym: `paidInCents` (effective, clamped to total).
_Avoid_: Total payments

**Amount due**:
Invoice total minus amount paid.
Code synonyms: `balanceInCents`, `balance` in invoice list/detail/PDF displays.
_Avoid_: Remaining (in copy), outstanding (in code for per-invoice balance)

**Payment number**:
The human-readable per-business yearly identifier of a payment record (`PAY-YYYY-NNNN`).
_Avoid_: Database id, payment id

**Payment source**:
Where a payment record originated. Only `manual` exists: money received outside Requo and recorded by an authorized user.
_Avoid_: Processor, gateway, provider payment

### Quote acceptance

**Accept & Sign**:
The customer action on the public quote link: entering their name and confirming they agree to the scope, pricing, and terms shown.
_Avoid_: Legally binding contract, certified signature

**Acceptance record**:
One immutable row per accepted quote version capturing who accepted, when, the exact wording shown, and a snapshot plus hash of the customer-facing quote state.
_Avoid_: Contract, certificate, legal guarantee

**Accepted quote**:
A quote in `accepted` status with an acceptance record pointing at the exact quote version accepted. Acceptance is not invoicing and not payment.
_Avoid_: Paid, invoiced, revenue recognized
