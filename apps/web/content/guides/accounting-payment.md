---
title: Accounting Payment
summary: How Admin submits a payment that doesn't come from a team's payment request.
roles: [admin, approver]
order: 12
updated: 2026-08-27
---

## Before you start

This form is for payments Admin raises directly. Payment lines go in the Excel template, not in the form.

- Approvals run one after another, in the order you list the approvers.

## Submitting

### Step 1 — Fill in the form

In the Accounting payment check list, click **+ Add new item**.

| Field | What to enter |
|---|---|
| Title | A name for this payment. |
| Applicant | Filled in automatically. |
| Related documents | The request or plan this payment belongs to, if there is one. |
| Total Amount | The total of your payment lines. |
| Remark / PJT | The project or anything the approvers should know. |
| Approver | One or more people, in the order they should approve. |

### Step 2 — Fill in the Excel template

Click **Download Template** and complete one row per payment: `Account Name`, `Bank Account`, `Bank`, `Branch`, `Amount`, `Due Date`, `Expected Date`, `Details`, `Remark`.

!stop **Don't rename the table, and don't rename or delete the column headers.** The system finds your payment lines by the table inside the file, and reads the columns by their names.

### Step 3 — Attach the file and save

Attach the completed template with the paperclip icon and click **Save**. You can attach more than one file — the system looks for the table inside them.

### Step 4 — The request waits to be picked up (Pending)

Right after saving, the request sits as **Pending** until the system picks it up.

!warn Saving again cancels the approval in progress and starts it over.

### Step 5 — The system reads the file (In Progress)

The status changes to **In Progress** and the system reads your Excel file. Open the request to see each payment line as the system read it.

### Step 6 — Approvers review, one after another

Each approver gets a card in Microsoft Teams and approves or rejects. The next approver is notified after the previous one approves. A comment written by an approver also appears on the request.

- Everyone approved → **Approved**
- Rejected by anyone → **Rejected**, and you get an email with the comment.

## Changing a request you already submitted

Edit the request and save it again. The approval in progress is cancelled, and a new one is sent starting from the first approver.

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
| No payment lines appear | The table couldn't be found — the table or a column header was renamed, or rows were placed outside the table. | Download a fresh template, copy your rows into it, attach it again. |
| Stuck on **Pending** | The system hasn't picked the request up yet. | Wait a few minutes. If it stays, tell the Approval admin — saving again restarts the approval. |
| You want to know whose turn it is | | Open **Sent** in the Teams Approvals app. |
