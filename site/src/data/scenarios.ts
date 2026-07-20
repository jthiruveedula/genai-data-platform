/**
 * Composite scenario threads: two recurring fictional-but-realistic
 * companies whose story runs through every module's "In the field" aside.
 * Neither is a real company, and none of these numbers are claims about a
 * real deployment — they're illustrative, consistent with the honest-copy
 * rule that governs the rest of the site (no invented metrics presented as
 * fact). ModuleScenario.astro renders a visible disclaimer alongside every
 * instance for exactly this reason.
 */

export interface Company {
  name: string;
  kind: string;
  context: string;
}

export const ENTERPRISE: Company = {
  name: "Northbridge Mutual",
  kind: "Enterprise",
  context: "a regional insurer with 40 years of policy documents and a compliance team that reviews every AI-assisted answer",
};

export const STARTUP: Company = {
  name: "Fernlight",
  kind: "Startup",
  context: "a 6-person team building an AI support assistant that a few dozen e-commerce brands embed on their own sites",
};

export interface ScenarioImpact {
  /** What went wrong, in a few words — the scannable half of the beat. */
  problem: string;
  /** What actually fixed it — paired with `problem` as a "before → after" line. */
  fix: string;
}

export interface ScenarioBeat {
  company: Company;
  vignette: string;
  impact: ScenarioImpact;
}

export interface ModuleScenarioContent {
  beats: [ScenarioBeat, ScenarioBeat];
}

export const SCENARIOS: Record<string, ModuleScenarioContent> = {
  "00-foundations": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "Northbridge's first internal demo answered a policy question using the wrong coverage year — the model had 200K tokens of context and no retrieval, so it silently favored whatever text happened to be nearest the end of the prompt.",
        impact: { problem: "200K-token context, zero retrieval", fix: "RAG over a live index, not a bigger window" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight almost fine-tuned a model on last year's return policies before realizing policies change monthly — RAG over a live index meant swapping documents, not retraining, every time a merchant updated their terms.",
        impact: { problem: "Fine-tuning on policies that change monthly", fix: "RAG swaps the index, never the model" },
      },
    ],
  },
  "10-ingestion": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "Northbridge's compliance team requires every ingested document to keep its original PDF alongside any extracted text — an auditor can ask 'show me exactly what the model saw' for any answer given in the last seven years.",
        impact: { problem: "\"What did the model see?\" — no answer", fix: "Original PDF kept beside every extraction" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight's ingestion job used to fail halfway through a merchant's product catalog and silently duplicate the first half on retry — making every load idempotent on a stable document ID fixed it in an afternoon.",
        impact: { problem: "Failed loads silently duplicated data", fix: "Idempotent writes keyed on a stable document ID" },
      },
    ],
  },
  "15-chunking": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "Northbridge's policy PDFs have numbered clauses that reference each other ('see Section 4.2') — fixed-size chunking split those references from their targets, so they switched to heading-aware chunking that keeps a clause with its parent section.",
        impact: { problem: "Clause references split from their targets", fix: "Heading-aware chunking keeps clauses with their section" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight chunked product FAQs at 2,000 tokens to save on embedding calls, then noticed retrieval kept returning half-relevant answers — smaller, overlapping chunks fixed precision at a small increase in embedding cost.",
        impact: { problem: "2,000-token chunks, half-relevant answers", fix: "Smaller, overlapping chunks fixed precision" },
      },
    ],
  },
  "20-embeddings": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "Northbridge re-embedded four million policy chunks after switching embedding models and briefly mixed old and new vectors in one index — nearest-neighbor search silently degraded until they versioned the index by embedding model.",
        impact: { problem: "Old + new vectors mixed in one index", fix: "Versioned the index by embedding model" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight started on a high-dimensional embedding model 'to be safe,' then found their per-merchant vector storage bill was the single largest line item — a smaller model measured just as well on their own eval set at a quarter of the storage.",
        impact: { problem: "High-dim embeddings, biggest bill line item", fix: "Smaller model, same eval score, 1/4 the storage" },
      },
    ],
  },
  "25-serving": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "Northbridge's compliance reviewers wait for a full answer before reading it, so streaming tokens didn't matter for them — but routing routine coverage questions to a fast model and reserving the reasoning-tier model for ambiguous claims cut their review queue's cost by more than half.",
        impact: { problem: "Every claim routed to the reasoning-tier model", fix: "Fast-tier default cut review-queue cost 50%+" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight's support widget felt sluggish even though total generation time was fine — streaming the first token as soon as it was ready, instead of waiting for the full answer, is what actually fixed the complaint.",
        impact: { problem: "Widget felt slow despite fine total latency", fix: "Stream the first token, not the full answer" },
      },
    ],
  },
  "35-retrieval": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "Northbridge's agents kept searching for exact policy-form numbers ('Form HO-3-2024') that dense embeddings treated as 'similar' to unrelated forms — adding sparse keyword search alongside the vector search, fused with reciprocal rank fusion, fixed exact-code lookups without hurting semantic queries.",
        impact: { problem: "Exact form numbers 'similar' to unrelated ones", fix: "Sparse + dense search, fused with RRF" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight's top-k retrieval looked fine on paper but real customers asked messier questions than the eval set covered — a lightweight reranker over a wider initial candidate set closed most of the gap.",
        impact: { problem: "Top-k looked fine on paper, not on real questions", fix: "Reranker over a wider candidate set" },
      },
    ],
  },
  "45-evaluation": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "Northbridge's compliance team wouldn't sign off on 'it feels better' — building a 200-question golden set scored for both retrieval recall and answer faithfulness gave them a number to gate every prompt change against.",
        impact: { problem: "\"It feels better\" isn't a sign-off", fix: "200-question golden set gates every prompt change" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight's founders eyeballed answers for months before a bad update shipped unnoticed for a week — every real support escalation now becomes a new golden-set case, so the suite gets harder as the product grows.",
        impact: { problem: "A bad update shipped unnoticed for a week", fix: "Every escalation becomes a new golden-set case" },
      },
    ],
  },
  "55-observability": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "When an auditor asked Northbridge to reconstruct why a specific answer cited an outdated policy, a single trace ID let them replay the exact retrieved chunks and model call from six months earlier.",
        impact: { problem: "Auditor asks why an answer cited a stale policy", fix: "One trace ID replays the call, 6 months later" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight didn't know which merchant's traffic was driving their token bill until they added per-request token counts to the trace log — one merchant's product catalog turned out to be triggering unusually long generations.",
        impact: { problem: "No idea which merchant drove the token bill", fix: "Per-request token counts in the trace log" },
      },
    ],
  },
  "65-security": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "A Northbridge red-team exercise found that one business unit's retrieval index returned another unit's confidential claims data — missing document-level ACLs at retrieval time, not a model problem, and the fix that actually mattered.",
        impact: { problem: "One business unit's index leaked into another's", fix: "Document-level ACLs enforced at retrieval time" },
      },
      {
        company: STARTUP,
        vignette:
          "A Fernlight customer's product description contained a hidden instruction telling the model to reveal other merchants' data — input filtering catching the injection attempt, combined with per-tenant retrieval scoping, is what actually stopped it.",
        impact: { problem: "Hidden instruction in a product description", fix: "Input filtering + per-tenant retrieval scoping" },
      },
    ],
  },
  "75-finops": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "Northbridge assumed their AI assistant's cost scaled with document count — joining the event log against billing revealed output tokens from long compliance summaries dominated the bill, not the size of the index.",
        impact: { problem: "Assumed cost scaled with document count", fix: "Output tokens from summaries drove the bill instead" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight's per-merchant margins looked healthy in aggregate until $/tenant analysis showed two high-volume merchants were unprofitable at their plan price — prompt caching on their repeated system prompt bought enough margin back to avoid a price increase.",
        impact: { problem: "Two high-volume merchants, unprofitable margins", fix: "Prompt caching bought back margin, no price hike" },
      },
    ],
  },
  "85-agents": {
    beats: [
      {
        company: ENTERPRISE,
        vignette:
          "Northbridge built an agent that could file a claims-status update — and bounded every tool call with a budget and a human-approval step, since an unsupervised loop making real policy changes was a compliance risk, not just a cost one.",
        impact: { problem: "Unsupervised agent could file real policy changes", fix: "Budget + human-approval step on every tool call" },
      },
      {
        company: STARTUP,
        vignette:
          "Fernlight's first agent prototype kept calling the same lookup tool in a loop when a merchant's product data was malformed — a hard step budget turned a runaway (and expensive) loop into a graceful 'couldn't find that' response.",
        impact: { problem: "Malformed data looped the same tool call forever", fix: "Hard step budget → graceful \"couldn't find that\"" },
      },
    ],
  },
};
