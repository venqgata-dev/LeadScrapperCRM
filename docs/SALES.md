# Sales Operations Guide

## Daily Workflow

```
Morning
  1. Open /workspace — review today's follow-ups and HOT leads
  2. Work through HOT leads list — call directly from workspace
  3. Log each call outcome on the lead detail page

Afternoon
  1. Update pipeline stages for morning calls
  2. Review proposals_waiting and follow up
  3. Schedule tomorrow's follow-ups

End of day
  1. Check Manager Dashboard — win rate, funnel metrics
  2. Identify any overdue follow-ups
```

---

## Sales Workspace

Route: `/workspace`

### Today at a Glance

| KPI | Source |
|-----|--------|
| Calls Today | Count of `call_logs` created today |
| Follow-ups Today | `client_follow_ups` due today with status PENDING |
| Follow-ups Overdue | `client_follow_ups` past due date with status PENDING |
| HOT Leads | Businesses with `ai_priority = 'HOT'` |
| Negotiating | Businesses with `contact_status = 'INTERESTED'` |
| Proposals Waiting | Businesses with `contact_status = 'PROPOSAL_SENT'` |
| Won Today | Businesses with `won_at` >= today |
| Pipeline Value | Sum of `deal_value` across all non-lost businesses |

### Manager Dashboard

| Metric | Calculation |
|--------|-------------|
| Calls This Week | Call logs since Monday |
| Win Rate | Won ÷ Total Called × 100 |
| Calls → Interested | Interested ÷ Called × 100 |
| Interested → Proposal | Proposal ÷ Interested × 100 |
| Proposal → Won | Won ÷ Proposal × 100 |
| Overdue Follow-ups % | Overdue ÷ (Today + Overdue) × 100 |
| Top Category | Most common category in the database |

---

## Sales Playbooks

Route: `/playbooks`

12 built-in playbooks organized by business type. Use them during calls or as training material.

### Built-in Playbook Types

1. Auto / Garage
2. Beauty & Hair Salons
3. Builders & Construction
4. Cleaning Services
5. Dentists & Medical
6. Electricians
7. Estate Agents
8. Food & Hospitality
9. Fitness & Gyms
10. Plumbers & Heating
11. Retail & Shops
12. Wedding & Events

### Creating a Custom Playbook

1. Click **New Playbook**
2. Fill in: name, description, applies-to (comma-separated categories)
3. Enter: opening line, discovery questions (one per line), pain points (one per line), closing
4. Enter objection handling in format: `Objection text: Response text` (one per line)
5. Save

### Using Playbooks on Calls

From the lead detail page, select a playbook in the Call Prep panel. The opening, questions, and pain points are displayed for reference during the call.

---

## Outreach Campaigns

Sales campaigns (distinct from search campaigns) let you target a filtered list of leads for bulk outreach.

### Campaign Filters

| Filter | Description |
|--------|-------------|
| `min_ai_score` | Only leads with AI score ≥ this value |
| `min_project_value` | Only leads with estimated project value ≥ this |
| `min_close_probability` | Only leads with close probability ≥ this % |
| `country` | Filter by country |
| `category` | Filter by category |

### Campaign Tracking

| Metric | Description |
|--------|-------------|
| `target_count` | Total leads in scope |
| `contacted_count` | Leads where outreach was attempted |
| `replied_count` | Leads that replied |
| `booked_count` | Leads that booked a meeting |

---

## Email Templates

Reusable email templates with:
- `template_type`: COLD_OUTREACH, FOLLOW_UP, PROPOSAL, THANK_YOU, etc.
- `subject_template`: Subject line (can include `{name}`, `{city}`, etc.)
- `body_template`: Email body (HTML or plain text)

Email history tracks every email sent to a business with status (SENT, OPENED, REPLIED, BOUNCED).

---

## Follow-up System

### Sales follow-ups (`follow_ups` table)

Short-term follow-up tasks linked to outreach campaigns:
- `follow_up_type`: CALL, EMAIL, LINKEDIN, MEETING
- `scheduled_for`: DateTime
- `status`: PENDING, COMPLETED, SKIPPED

### Client follow-ups (`client_follow_ups` table)

Longer-term client relationship tasks (post-sale):
- Supports time scheduling
- Priority levels
- Team member assignment
- Reminder flag

---

## CloudTalk Calling

### Setup

1. Get CloudTalk API credentials from your CloudTalk account settings
2. Set `CLOUDTALK_API_KEY=access_key_id:access_key_secret` in `.env`
3. Get your agent numeric ID from the CloudTalk dashboard
4. Set `CLOUDTALK_AGENT_ID=123456` in `.env`

### Making a Call

1. Open any lead detail page
2. Click **Sync to CloudTalk** (creates the contact if not already synced)
3. Click **Call Now**
4. Your CloudTalk softphone will ring; answer it to connect to the prospect

### Call History

All CloudTalk calls are stored in `cloudtalk_calls` table and displayed on the lead detail page with:
- Direction (OUTBOUND / INBOUND)
- Status (INITIATED, ANSWERED, NO_ANSWER, VOICEMAIL)
- Duration
- Recording URL (if available)
- Agent name

### Webhook Support

CloudTalk can send webhook events when calls are updated. Wire the webhook to `POST /cloudtalk/webhook` (implementation pending) to automatically update call status and recording URL.

---

## Meeting Notes

Meeting notes capture structured information from prospect conversations:

| Field | Description |
|-------|-------------|
| `summary` | Overview of the call/meeting |
| `requirements` | What the prospect needs |
| `budget` | Stated budget range |
| `deadline` | When they need it done |
| `competitors` | Agencies they're also talking to |
| `decision_maker` | Name of the decision maker |
| `next_meeting` | Next scheduled meeting datetime |

One set of meeting notes per business (upsert pattern — `PUT` replaces).

---

## Competitor Snapshot (SWOT)

Per-business SWOT analysis:
- **Strengths** — what this prospect does well
- **Weaknesses** — their current problems / gaps
- **Opportunities** — what you can offer them
- **Threats** — risks to closing (budget, competition, timing)
- **Main competitors** — names of their direct competitors
- **Notes** — free text observations

Used to tailor your pitch and proposals to the specific competitive context.
