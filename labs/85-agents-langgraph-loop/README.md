# Lab: a real LangGraph agent loop (Module 85)

A real, runnable implementation of the agent-dev-kit mechanics described in
[Module 85's "Agent development kits"](../../site/src/pages/modules/85-agents/index.astro):
the plan-act-observe loop as an explicit state graph (LangGraph), with a hard
iteration budget and a human-approval gate in front of any side-effecting
tool call.

## What it demonstrates

- **The loop is a state graph, not a while-loop you hand-roll.** `plan` →
  (route) → `act` → back to `plan`, using LangGraph's real `StateGraph` and
  conditional edges — the same mechanism Module 85's prose describes.
- **A hard iteration budget.** `route_after_plan` checks `iteration >=
  max_iterations` before anything else — a task that would otherwise loop
  forever stops deterministically.
- **A human-approval gate on side-effecting tool calls.** Any tool in
  `SIDE_EFFECTING_TOOLS` (here, `send_summary_email`) routes through
  `human_gate` first. Without `approved=True` in state, the loop ends at
  `blocked_pending_approval` and the side effect **never executes** — not
  executed-then-undone, never run at all.

The "planner" in this lab is a deterministic function, not an LLM call —
that keeps the lab runnable with no API key in CI or on a laptop. The graph
mechanics (state, conditional routing, the budget, the gate) are identical
whether the node deciding the next action is a real LLM or, as here, a plain
function walking a fixed task script.

## Run it

```bash
pip install -r requirements.txt
pytest -v
```

Four scenarios, each genuinely executed (not just imported/parsed):

- a tight iteration budget stops the loop before it can finish
- an unapproved side-effecting call is blocked, and the side effect list
  stays empty (proving it never ran)
- an approved side-effecting call runs, and shows up in the executed list
- approval doesn't override the budget — a tight budget still wins

## Wiring into a real deployment

Replace `plan`'s deterministic logic with a real LLM call (an
`ainvoke`/`invoke` against your model of choice, parsing its tool-call
response into the next `step_index`/action) — every other node, the
conditional routing, the budget check, and the approval gate carry over
unchanged.
