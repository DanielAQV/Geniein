---
title: Repair Request
summary: How to submit a repair request through the Purchase Request form.
role_scope: [requester, approver]
source: guide
source_format: markdown
lang: [en]
effective_date: 2026-08-27
order: 4
supersedes: Repair_Request_Guide_v1.pdf (23 Apr 2026)
---

## Before you start

Repair requests use the **Purchase Request** form with **Request Type** set to `Repair`. Repair items are typed into the form — there is no Excel template for them.

- Approvals run one after another, in the order you list the approvers.

## Submitting

### Step 1 — Open the form and switch the request type

In the Purchase Request list, click **+ Add new item**, then change **Request Type** from `General` to `Repair`. The **Repair Detail** section appears at the bottom of the form.

### Step 2 — Fill in the form

| Field | What to enter |
|---|---|
| Title | A name for this repair request. |
| Team | Filled in automatically. |
| Approver | One or more people, in the order they should approve. |
| CC List | Optional. These people get a notification. They don't approve. |
| Attachments | Optional — photos, quotations, anything that helps the approvers. |

### Step 3 — Add the repair items

In **Repair Detail**, click **Add** for each item and fill in every column: `Item`, `Current Status`, `Reason`, `Repair Option`, `Estimated Cost`, `Note`.

Click **Add** again for another row, or the **X** on the right of a row to remove it. When the list is complete, click **Save**.

### Step 4 — The request waits to be picked up (Pending)

Right after saving, the request sits as **Pending** until the system picks it up.

!warn Saving again cancels the approval in progress and starts it over.

### Step 5 — Approval starts (In Progress)

The status changes to **In Progress** and the first approver receives the request.

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
| In Progress | The approval is running, one approver at a time. |
| Approved | Every approver approved. |
| Rejected | An approver declined. The comment says why. |

## When something goes wrong

| What you see | Why | Fix |
|---|---|---|
| No **Repair Detail** section | Request Type is still `General`. | Switch it to `Repair` — the section appears below. |
| Stuck on **Pending** | The system hasn't picked the request up yet. | Wait a few minutes. If it stays, tell the Approval admin — saving again restarts the approval. |
| You want to know whose turn it is | | Open **Sent** in the Teams Approvals app. |
