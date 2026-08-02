"""Proves the LangGraph loop's safety mechanisms actually work — iteration
budget and human-approval gate — not just that the graph compiles."""

from __future__ import annotations

from agent_loop import TASK_STEPS, run_agent


def test_stops_at_iteration_budget():
    result = run_agent(max_iterations=1, approved=True)

    assert result["status"] == "budget_exceeded"
    assert result["tool_calls"] == ["search_docs"]
    assert result["side_effects_executed"] == []


def test_blocks_side_effect_without_approval():
    result = run_agent(max_iterations=10, approved=False)

    assert result["status"] == "blocked_pending_approval"
    assert result["tool_calls"] == ["search_docs", "compare_versions"]
    assert result["side_effects_executed"] == []  # the email was never sent


def test_side_effect_runs_with_approval():
    result = run_agent(max_iterations=10, approved=True)

    assert result["status"] == "done"
    assert result["tool_calls"] == TASK_STEPS
    assert result["side_effects_executed"] == ["send_summary_email"]


def test_approval_alone_does_not_bypass_the_budget():
    # Approval only ever matters if the loop actually reaches the gate —
    # a tight budget still cuts the loop off first, approved or not.
    result = run_agent(max_iterations=2, approved=True)

    assert result["status"] == "budget_exceeded"
    assert result["side_effects_executed"] == []
