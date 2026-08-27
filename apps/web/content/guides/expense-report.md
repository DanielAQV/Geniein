---
title: Expense Report
summary: How to submit the monthly expense report for your team.
role_scope: [requester, approver]
source: guide
source_format: markdown
lang: [en]
effective_date: 2026-08-27
order: 10
---

## Before you start

One report covers one month for one team. Each expense is a line inside the report.

- Approvals run one after another, in the order you list the approvers.

## Submitting

### Step 1 — Fill in the form

In the Expense Report list, click **+ Add new item**.

| Field | What to enter |
|---|---|
| Title | A name for this report. |
| Month | The month the expenses belong to. |
| Team | Filled in automatically. |
| Approver | One or more people, in the order they should approve. |
| CC List | Optional. These people get a notification. They don't approve. |

### Step 2 — Add the expense lines

Add one line per expense and fill in every column.

| Column | What to enter |
|---|---|
| Category · Expense Type | What kind of expense this is. |
| Description | What it was for. |
| Invoice No · Invoice Date | The invoice this line comes from. |
| Card | Which card paid it, if a card was used. |
| Currency · Amount · Rate | The amount as invoiced, and the rate used to convert it. |
| VAT · Total · VND Amount | Tax and the converted total. |
| Remark | Anything the approvers should know about this line. |

### Step 3 — Save and wait to be picked up (Pending)

Right after saving, the report sits as **Pending** until the system picks it up.

!warn Saving again cancels the approval in progress and starts it over.

### Step 4 — Approval starts (In Progress)

The status changes to **In Progress** and the first approver receives the request.

### Step 5 — Approvers review, one after another

Each approver gets a card in Microsoft Teams and approves or rejects. The next approver is notified after the previous one approves. A comment written by an approver also appears on the report.

- Everyone approved → **Approved**
- Rejected by anyone → **Rejected**, and you get an email with the comment.

## After approval

The report and its lines are marked Approved, an approval document is filed automatically, and you receive a confirmation email.

## Changing a report you already submitted

Edit the report and save it again. The approval in progress is cancelled, and a new one is sent starting from the first approver.

## Status

| Status | Meaning |
|---|---|
| Pending | Saved, waiting for the system to pick it up. |
| In Progress | The approval is running, one approver at a time. |
| Approved | Every approver approved. |
| Rejected | An approver declined. The comment says why. |

## When something goes wrong

| What you see | Why | Fix |
|---|---|---|
| Stuck on **Pending** | The system hasn't picked the report up yet. | Wait a few minutes. If it stays, tell the Approval admin — saving again restarts the approval. |
| You want to know whose turn it is | | Open **Sent** in the Teams Approvals app. |
