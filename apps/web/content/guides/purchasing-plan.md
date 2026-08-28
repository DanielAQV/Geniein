---
title: Purchasing Plan
summary: How to submit a purchasing plan for an approved purchase request.
role_scope: [requester, approver]
source: repo
source_format: markdown
lang: [en]
effective_date: 2026-08-27
order: 2
supersedes: Purchasing_Plan_Guide_v1.pdf (23 Apr 2026)
---

## Before you start

Submit a purchasing plan after the purchase request it belongs to has been approved. The plan carries the supplier, cost and payment schedule for each item.

- Approvals run one after another, in the order you list the approvers.
- Items go in the Excel template, not in the form.

## Submitting

### Step 1 — Fill in the form

In the Purchasing Plan list, click **+ Add new item**.

| Field | What to enter |
|---|---|
| Title | A name for this plan. |
| Team | Filled in automatically. |
| Approver | One or more people, in the order they should approve. |
| CC List | Optional. They get a Teams notification when you submit, and can follow the status on the CC Dashboard. They don't approve. |
| Related Documents | The approved Purchase Request this plan is based on. |
| Total Amount | The total of your item list. |

### Step 2 — Fill in the Excel template

Click **Download Template** and complete one row per item: `Item`, `Unit`, `Quantity`, `Unit Price`, `Amount`, `Tax`, `Grand Total`, `Supplier`, `Payment Terms`, `Advance Amount`, `Expected Payment Date`, `Delivery Time`, `PIJ Number`, `Note`.

!stop **Don't rename the table, and don't rename or delete the column headers.** The system finds your items by the table inside the file, and reads the columns by their names.

### Step 3 — Attach the file and save

Attach the completed template with the paperclip icon and click **Save**. You can attach more than one file — the system looks for the table inside them.

!note Attachments are opened by downloading them — there is no preview.

### Step 4 — The request waits to be picked up (Pending)

Right after saving, the plan sits as **Pending** until the system picks it up.

!warn Saving again cancels the approval in progress and starts it over.

### Step 5 — The system reads the file (In Progress)

The status changes to **In Progress**, the system reads your Excel file, and the first approver receives the request.

### Step 6 — Approvers review, one after another

Each approver gets a card in Microsoft Teams and approves or rejects. The next approver is notified after the previous one approves. A comment written by an approver also appears on the plan.

- Everyone approved → **Approved**
- Rejected by anyone → **Rejected**, and you get an email with the comment.

## After approval

The plan and its items are marked Approved, the rows are added to the BO team's Excel database on the Approval site, and you receive a confirmation email.

## Changing a plan you already submitted

Edit the plan and save it again. The approval in progress is cancelled, and a new one is sent starting from the first approver.

## Status

| Status | Meaning |
|---|---|
| Pending | Saved, waiting for the system to pick it up. |
| In Progress | The file has been read and the approval is running, one approver at a time. |
| Approved | Every approver approved. |
| Rejected | An approver declined. The comment says why. |

## When something goes wrong

| What you see | Why | Fix |
|---|---|---|
| **In Progress** but no items appear | The table couldn't be found — the table or a column header was renamed, or items were placed outside the table. | Download a fresh template, copy your rows into it, attach it again. |
| A Flow bot message says **Invalid Unit Price Detected** | A Unit Price in your Excel isn't a plain number. VND must be whole numbers — `324000`, not `324,000` or `324000.0`. | The request is set to **Rejected** and Flow bot tells you. Fix the value and submit again. |
| Stuck on **Pending** | The system hasn't picked the plan up yet. | Wait a few minutes. If it stays, tell the Approval admin — saving again restarts the approval. |
| You want to know whose turn it is | | Open **Sent** in the Teams Approvals app. |
