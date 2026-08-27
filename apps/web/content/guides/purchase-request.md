---
title: Purchase Request
summary: How to submit a purchase or repair request, what the system does with it, and what each status means.
roles: [requester, approver]
order: 1
updated: 2026-08-27
supersedes: Purchase_Request_Guide_v1.pdf (23 Apr 2026)
---

## Before you start

Use this form to request a purchase. For a repair, use the same form and set **Request Type** to `Repair` — the Repair Detail section then appears at the bottom.

- Know **who approves and in what order**. Approvals run one after another, never at the same time.
- Have your item list ready. Items go in the Excel template, not in the form.
- You don't need a request number — the system assigns one.

## Submitting

### Step 1 — Open the form and fill in the header

In the Purchase Request list, click **+ Add new item**.

| Field | What to enter |
|---|---|
| Title | A clear name for this request. |
| Team | Your team. |
| Approver | One or more people, **in the order they should approve**. The second is notified only after the first approves. |
| CC List | Optional. These people can follow the request on the CC Dashboard without approving it. |
| Request Type | `General`, or `Repair` for repair work. |
| Total Amount | The grand total of your item list. It must match the Excel file. |
| Remark | Why this purchase is needed. |

### Step 2 — Download the template and fill in your items

Click **Download Template** and complete one row per item: `Item`, `Specification`, `Quantity`, `Unit`, `Unit Price`, `Amount`, `Remark`.

!stop **Don't rename or delete the column headers, and don't rename the table.** The system reads the file by those names. If they change, the file can't be processed.

!note **Units matter.** Enter the unit you actually buy in — if you buy by the box, write `box`, not `m`. Mixed units for the same item are the most common cause of stock and invoice errors later.

### Step 3 — Attach the file and save

Attach the completed template with the paperclip icon, check that the filename appears, then click **Save**.

!note You can attach **more than one file** — quotations, drawings, photos. The system finds the template among them and reads that one.

### Step 4 — The request is queued (Pending)

Right after saving, the request sits as **Pending** until the system picks it up. This is short.

!warn **Don't save again to hurry it.** A second save cancels the approval and starts everything over.

### Step 5 — The system takes over (In Progress)

The status changes to **In Progress** first. The system then reads your Excel file, assigns a request number, and sends the approval to the first approver.

!note **Where your items go.** They stay on the request itself — open your request and scroll down to see them. They don't appear as separate rows in the list.

### Step 6 — Approvers review, one after another

Each approver gets a card in Microsoft Teams and can **Approve** or **Reject**. The next approver is notified only after the previous one approves.

- Approved by everyone → the request becomes **Approved**.
- Rejected by anyone → it becomes **Rejected** and you get an email with the approver's comment.

## After approval

Nothing further is required from you. The request and every item are marked Approved, your item rows are added to the purchasing records the rest of the company works from, the CC Dashboard updates for everyone you listed, and you receive a confirmation email.

!note **Why accuracy pays off here.** The item names and units you typed are what purchasing, warehouse and invoicing will use. Correcting them later costs far more than getting them right now.

## Changing a request you already submitted

Edit the request and save it again. The approval that was running is cancelled, the entries from the previous submission are cleared, and approval restarts from the first approver.

!warn **Approvers who already approved will be asked again.** Tell them what changed — otherwise the second card looks like a duplicate and sits unanswered.

## Status

| Status | Meaning | What you do |
|---|---|---|
| Pending | Saved, waiting for the system to pick it up. | Wait. Don't save again. |
| In Progress | The system is reading your file and running the approval, one approver at a time. | Nothing. The current approver is shown on the request. |
| Approved | Every approver approved. Items are in the purchasing records. | Proceed with purchasing. |
| Rejected | An approver declined. The comment says why. | Fix and submit again, or drop the request. |

## When something goes wrong

| What you see | Why | Fix |
|---|---|---|
| **In Progress** but no items appear | The template couldn't be read — usually a renamed header, a renamed table, or rows placed outside the table. | Download a fresh template, copy your rows into it, attach it again. |
| Stuck on **Pending** | The system hasn't picked the request up yet. | Give it a few minutes. If it stays, tell the Approval admin — saving again restarts everything. |
| **Total Amount** doesn't match the items | The header total is typed by hand and wasn't updated after the Excel file changed. | Correct the header amount and save again. |
| An approver says they never received it | Approvals are sequential — later approvers aren't notified until the ones before them approve. | Check who the current approver is before chasing anyone. |

## For approvers

You'll get a card in Teams. Before deciding, open the request and check the item detail — quantity, unit, unit price — not only the total. Approving passes the request to the next approver; rejecting ends it and notifies the requester, so write a comment that says what to change.
