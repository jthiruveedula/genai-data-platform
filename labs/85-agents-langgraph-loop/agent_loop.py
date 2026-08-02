"""Module 85 (Agents & MCP) — a real, runnable LangGraph agent loop.

Demonstrates the exact mechanics Module 85's "Agent development kits" section
describes for LangGraph: the plan-act-observe loop modeled as an explicit
state graph with deterministic edges, a hard iteration budget, and a human-
approval gate before any side-effecting tool call — not a mechanism you'd
hand-roll, built on the real `langgraph` package.

The "planning" logic here is deterministic (not an LLM call) so this lab
runs the same in CI as on a laptop, with no API key required — the point of
this lab is the graph mechanics (state, edges, budget, gate), which are
identical whether the node that decides the next action is an LLM or, as
here, a plain function.
"""

from __future__ import annotations

from typing import Literal, Optional, TypedDict

from langgraph.graph import END, StateGraph

# The task script this lab's deterministic planner works through — real
# agents plan against an LLM's judgment instead, but the graph mechanics
# (state, routing, budget, gate) are exactly the same either way.
TASK_STEPS = ["search_docs", "compare_versions", "send_summary_email"]

SIDE_EFFECTING_TOOLS = {"send_summary_email"}


class AgentState(TypedDict):
    step_index: int
    iteration: int
    max_iterations: int
    tool_calls: list[str]
    approved: bool
    side_effects_executed: list[str]
    status: Optional[str]


def plan(state: AgentState) -> AgentState:
    """Decide the next tool call from the task script — this is the node an
    LLM-backed agent would replace with a real planning call."""
    return state


def route_after_plan(state: AgentState) -> Literal["budget_exceeded", "human_gate", "act", "done"]:
    if state["iteration"] >= state["max_iterations"]:
        return "budget_exceeded"
    if state["step_index"] >= len(TASK_STEPS):
        return "done"
    next_tool = TASK_STEPS[state["step_index"]]
    if next_tool in SIDE_EFFECTING_TOOLS:
        return "human_gate"
    return "act"


def human_gate(state: AgentState) -> AgentState:
    """Every side-effecting tool call stops here first. Without `approved`,
    the loop never reaches `act` for this step — the side effect simply
    never runs, rather than running and being undone after the fact."""
    return state


def route_after_gate(state: AgentState) -> Literal["act", "blocked"]:
    return "act" if state["approved"] else "blocked"


def act(state: AgentState) -> AgentState:
    tool = TASK_STEPS[state["step_index"]]
    state["tool_calls"].append(tool)
    if tool in SIDE_EFFECTING_TOOLS:
        state["side_effects_executed"].append(tool)
    state["step_index"] += 1
    state["iteration"] += 1
    return state


def budget_exceeded(state: AgentState) -> AgentState:
    state["status"] = "budget_exceeded"
    return state


def blocked(state: AgentState) -> AgentState:
    state["status"] = "blocked_pending_approval"
    return state


def done(state: AgentState) -> AgentState:
    state["status"] = "done"
    return state


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("plan", plan)
    graph.add_node("act", act)
    graph.add_node("human_gate", human_gate)
    graph.add_node("budget_exceeded", budget_exceeded)
    graph.add_node("blocked", blocked)
    graph.add_node("done", done)

    graph.set_entry_point("plan")
    graph.add_conditional_edges(
        "plan",
        route_after_plan,
        {"budget_exceeded": "budget_exceeded", "human_gate": "human_gate", "act": "act", "done": "done"},
    )
    graph.add_conditional_edges("human_gate", route_after_gate, {"act": "act", "blocked": "blocked"})
    graph.add_edge("act", "plan")
    graph.add_edge("budget_exceeded", END)
    graph.add_edge("blocked", END)
    graph.add_edge("done", END)

    return graph.compile()


def run_agent(*, max_iterations: int, approved: bool) -> AgentState:
    app = build_graph()
    initial_state: AgentState = {
        "step_index": 0,
        "iteration": 0,
        "max_iterations": max_iterations,
        "tool_calls": [],
        "approved": approved,
        "side_effects_executed": [],
        "status": None,
    }
    return app.invoke(initial_state)
