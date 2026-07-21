/**
 * Composite scenario threads: two recurring fictional-but-realistic
 * companies whose story runs through every module's "In the field" aside.
 * Neither is a real company, and none of these numbers are claims about a
 * real deployment — they're illustrative, consistent with the honest-copy
 * rule that governs the rest of the site (no invented metrics presented as
 * fact). ModuleScenario.astro renders a visible disclaimer alongside every
 * instance for exactly this reason.
 *
 * Each vignette is a CloudLabelMap: same story arc and moral in every
 * variant, but the specific service the fix runs on changes with the
 * selected cloud (Module 00-foundations feedback: taglines swapping while
 * the story text stayed generic wasn't enough — the narrative itself has
 * to reflect the cloud).
 */
import type { CloudLabelMap } from "./platform";

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
  vignette: CloudLabelMap;
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
        vignette: {
          neutral:
            "Northbridge's first internal demo answered a policy question using the wrong coverage year — the model had 200K tokens of context and no retrieval, so it silently favored whatever text happened to be nearest the end of the prompt.",
          gcp: "Northbridge's first internal demo answered a policy question using the wrong coverage year — the model had 200K tokens of context and no retrieval, so it silently favored whatever text happened to be nearest the end of the prompt. Rebuilding the demo on Vertex AI gemini-embedding-001, with retrieval over an actual index, picked the right year every time.",
          aws: "Northbridge's first internal demo answered a policy question using the wrong coverage year — the model had 200K tokens of context and no retrieval, so it silently favored whatever text happened to be nearest the end of the prompt. Rebuilding it on Bedrock with Titan Embeddings v2 behind a real retrieval step, instead of stuffing the whole context window, picked the right year every time.",
          azure:
            "Northbridge's first internal demo answered a policy question using the wrong coverage year — the model had 200K tokens of context and no retrieval, so it silently favored whatever text happened to be nearest the end of the prompt. Swapping in Azure OpenAI embeddings with a retrieval step ahead of the prompt, instead of relying on a 200K-token window, picked the right year every time.",
          oss: "Northbridge's first internal demo answered a policy question using the wrong coverage year — the model had 200K tokens of context and no retrieval, so it silently favored whatever text happened to be nearest the end of the prompt. Standing up BGE embeddings via TEI in front of an actual retrieval step, instead of trusting a 200K-token window, picked the right year every time.",
        },
        impact: { problem: "200K-token context, zero retrieval", fix: "RAG over a live index, not a bigger window" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight almost fine-tuned a model on last year's return policies before realizing policies change monthly — RAG over a live index meant swapping documents, not retraining, every time a merchant updated their terms.",
          gcp: "Fernlight almost fine-tuned a model on last year's return policies before realizing policies change monthly — RAG over a live Vertex AI gemini-embedding-001 index meant swapping documents, not retraining, every time a merchant updated their terms.",
          aws: "Fernlight almost fine-tuned a model on last year's return policies before realizing policies change monthly — RAG over a live Bedrock Titan Embeddings v2 index meant swapping documents, not retraining, every time a merchant updated their terms.",
          azure:
            "Fernlight almost fine-tuned a model on last year's return policies before realizing policies change monthly — RAG over a live Azure OpenAI embeddings index meant swapping documents, not retraining, every time a merchant updated their terms.",
          oss: "Fernlight almost fine-tuned a model on last year's return policies before realizing policies change monthly — RAG over a live BGE (via TEI) index meant swapping documents, not retraining, every time a merchant updated their terms.",
        },
        impact: { problem: "Fine-tuning on policies that change monthly", fix: "RAG swaps the index, never the model" },
      },
    ],
  },
  "10-ingestion": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "Northbridge's compliance team requires every ingested document to keep its original PDF alongside any extracted text — an auditor can ask 'show me exactly what the model saw' for any answer given in the last seven years.",
          gcp: "Northbridge's compliance team requires every ingested document to keep its original PDF alongside any extracted text in Cloud Storage, landed there by Dataflow — an auditor can ask 'show me exactly what the model saw' for any answer given in the last seven years.",
          aws: "Northbridge's compliance team requires every ingested document to keep its original PDF alongside any extracted text in S3, landed there by Glue — an auditor can ask 'show me exactly what the model saw' for any answer given in the last seven years.",
          azure:
            "Northbridge's compliance team requires every ingested document to keep its original PDF alongside any extracted text in ADLS Gen2, landed there by Data Factory — an auditor can ask 'show me exactly what the model saw' for any answer given in the last seven years.",
          oss: "Northbridge's compliance team requires every ingested document to keep its original PDF alongside any extracted text in MinIO, landed there by Airflow — an auditor can ask 'show me exactly what the model saw' for any answer given in the last seven years.",
        },
        impact: { problem: "\"What did the model see?\" — no answer", fix: "Original PDF kept beside every extraction" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight's ingestion job used to fail halfway through a merchant's product catalog and silently duplicate the first half on retry — making every load idempotent on a stable document ID fixed it in an afternoon.",
          gcp: "Fernlight's Dataflow ingestion job used to fail halfway through a merchant's product catalog and silently duplicate the first half on retry — making every load idempotent on a stable document ID fixed it in an afternoon.",
          aws: "Fernlight's Glue ingestion job used to fail halfway through a merchant's product catalog and silently duplicate the first half on retry — making every load idempotent on a stable document ID fixed it in an afternoon.",
          azure:
            "Fernlight's Data Factory ingestion job used to fail halfway through a merchant's product catalog and silently duplicate the first half on retry — making every load idempotent on a stable document ID fixed it in an afternoon.",
          oss: "Fernlight's Airflow ingestion job used to fail halfway through a merchant's product catalog and silently duplicate the first half on retry — making every load idempotent on a stable document ID fixed it in an afternoon.",
        },
        impact: { problem: "Failed loads silently duplicated data", fix: "Idempotent writes keyed on a stable document ID" },
      },
    ],
  },
  "15-chunking": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "Northbridge's policy PDFs have numbered clauses that reference each other ('see Section 4.2') — fixed-size chunking split those references from their targets, so they switched to heading-aware chunking that keeps a clause with its parent section.",
          gcp: "Northbridge's policy PDFs have numbered clauses that reference each other ('see Section 4.2') — fixed-size chunking split those references from their targets, so they rebuilt the step on Document AI, chunking heading-aware so a clause stays with its parent section.",
          aws: "Northbridge's policy PDFs have numbered clauses that reference each other ('see Section 4.2') — fixed-size chunking split those references from their targets, so they rebuilt the step on Textract, chunking heading-aware so a clause stays with its parent section.",
          azure:
            "Northbridge's policy PDFs have numbered clauses that reference each other ('see Section 4.2') — fixed-size chunking split those references from their targets, so they rebuilt the step on Azure AI Document Intelligence, chunking heading-aware so a clause stays with its parent section.",
          oss: "Northbridge's policy PDFs have numbered clauses that reference each other ('see Section 4.2') — fixed-size chunking split those references from their targets, so they rebuilt the step on Docling, chunking heading-aware so a clause stays with its parent section.",
        },
        impact: { problem: "Clause references split from their targets", fix: "Heading-aware chunking keeps clauses with their section" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight chunked product FAQs at 2,000 tokens to save on embedding calls, then noticed retrieval kept returning half-relevant answers — smaller, overlapping chunks fixed precision at a small increase in embedding cost.",
          gcp: "Fernlight chunked product FAQs at 2,000 tokens through Document AI to save on embedding calls, then noticed retrieval kept returning half-relevant answers — smaller, overlapping chunks fixed precision at a small increase in embedding cost.",
          aws: "Fernlight chunked product FAQs at 2,000 tokens through Textract to save on embedding calls, then noticed retrieval kept returning half-relevant answers — smaller, overlapping chunks fixed precision at a small increase in embedding cost.",
          azure:
            "Fernlight chunked product FAQs at 2,000 tokens through Azure AI Document Intelligence to save on embedding calls, then noticed retrieval kept returning half-relevant answers — smaller, overlapping chunks fixed precision at a small increase in embedding cost.",
          oss: "Fernlight chunked product FAQs at 2,000 tokens through unstructured.io to save on embedding calls, then noticed retrieval kept returning half-relevant answers — smaller, overlapping chunks fixed precision at a small increase in embedding cost.",
        },
        impact: { problem: "2,000-token chunks, half-relevant answers", fix: "Smaller, overlapping chunks fixed precision" },
      },
    ],
  },
  "20-embeddings": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "Northbridge re-embedded four million policy chunks after switching embedding models and briefly mixed old and new vectors in one index — nearest-neighbor search silently degraded until they versioned the index by embedding model.",
          gcp: "Northbridge re-embedded four million policy chunks after switching to Vertex AI gemini-embedding-001 and briefly mixed old and new vectors in one index — nearest-neighbor search silently degraded until they versioned the index by embedding model.",
          aws: "Northbridge re-embedded four million policy chunks after switching to Bedrock Titan Embeddings v2 and briefly mixed old and new vectors in one index — nearest-neighbor search silently degraded until they versioned the index by embedding model.",
          azure:
            "Northbridge re-embedded four million policy chunks after switching to Azure OpenAI embeddings and briefly mixed old and new vectors in one index — nearest-neighbor search silently degraded until they versioned the index by embedding model.",
          oss: "Northbridge re-embedded four million policy chunks after switching to BGE via TEI and briefly mixed old and new vectors in one index — nearest-neighbor search silently degraded until they versioned the index by embedding model.",
        },
        impact: { problem: "Old + new vectors mixed in one index", fix: "Versioned the index by embedding model" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight started on a high-dimensional embedding model 'to be safe,' then found their per-merchant vector storage bill was the single largest line item — a smaller model measured just as well on their own eval set at a quarter of the storage.",
          gcp: "Fernlight started on Vertex AI gemini-embedding-001 at its largest output dimension 'to be safe,' then found their per-merchant vector storage bill was the single largest line item — a smaller dimension measured just as well on their own eval set at a quarter of the storage.",
          aws: "Fernlight started on Bedrock's full-size Titan Embeddings v2 'to be safe,' then found their per-merchant vector storage bill was the single largest line item — a smaller configuration measured just as well on their own eval set at a quarter of the storage.",
          azure:
            "Fernlight started on Azure OpenAI's largest embedding model 'to be safe,' then found their per-merchant vector storage bill was the single largest line item — a smaller model measured just as well on their own eval set at a quarter of the storage.",
          oss: "Fernlight started on BGE's largest variant via TEI 'to be safe,' then found their per-merchant vector storage bill was the single largest line item — a smaller model measured just as well on their own eval set at a quarter of the storage.",
        },
        impact: { problem: "High-dim embeddings, biggest bill line item", fix: "Smaller model, same eval score, 1/4 the storage" },
      },
    ],
  },
  "25-serving": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "Northbridge's compliance reviewers wait for a full answer before reading it, so streaming tokens didn't matter for them — but routing routine coverage questions to a fast model and reserving the reasoning-tier model for ambiguous claims cut their review queue's cost by more than half.",
          gcp: "Northbridge's compliance reviewers wait for a full answer before reading it, so streaming tokens didn't matter for them — but routing routine coverage questions to Gemini 3 Flash and reserving a reasoning-tier Vertex AI model for ambiguous claims cut their review queue's cost by more than half.",
          aws: "Northbridge's compliance reviewers wait for a full answer before reading it, so streaming tokens didn't matter for them — but routing routine coverage questions to Claude Haiku 4.5 on Bedrock and reserving a reasoning-tier model for ambiguous claims cut their review queue's cost by more than half.",
          azure:
            "Northbridge's compliance reviewers wait for a full answer before reading it, so streaming tokens didn't matter for them — but routing routine coverage questions to Azure OpenAI's fast tier and reserving a reasoning-tier deployment for ambiguous claims cut their review queue's cost by more than half.",
          oss: "Northbridge's compliance reviewers wait for a full answer before reading it, so streaming tokens didn't matter for them — but routing routine coverage questions to Llama on vLLM and reserving a larger reasoning-tier model for ambiguous claims cut their review queue's cost by more than half.",
        },
        impact: { problem: "Every claim routed to the reasoning-tier model", fix: "Fast-tier default cut review-queue cost 50%+" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight's support widget felt sluggish even though total generation time was fine — streaming the first token as soon as it was ready, instead of waiting for the full answer, is what actually fixed the complaint.",
          gcp: "Fernlight's support widget felt sluggish even though Gemini 3 Flash's total generation time was fine — streaming the first token as soon as it was ready, instead of waiting for the full answer, is what actually fixed the complaint.",
          aws: "Fernlight's support widget felt sluggish even though Claude Haiku 4.5's total generation time was fine — streaming the first token as soon as it was ready, instead of waiting for the full answer, is what actually fixed the complaint.",
          azure:
            "Fernlight's support widget felt sluggish even though Azure OpenAI's total generation time was fine — streaming the first token as soon as it was ready, instead of waiting for the full answer, is what actually fixed the complaint.",
          oss: "Fernlight's support widget felt sluggish even though vLLM's total generation time was fine — streaming the first token as soon as it was ready, instead of waiting for the full answer, is what actually fixed the complaint.",
        },
        impact: { problem: "Widget felt slow despite fine total latency", fix: "Stream the first token, not the full answer" },
      },
    ],
  },
  "35-retrieval": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "Northbridge's agents kept searching for exact policy-form numbers ('Form HO-3-2024') that dense embeddings treated as 'similar' to unrelated forms — adding sparse keyword search alongside the vector search, fused with reciprocal rank fusion, fixed exact-code lookups without hurting semantic queries.",
          gcp: "Northbridge's agents kept searching for exact policy-form numbers ('Form HO-3-2024') that dense embeddings treated as 'similar' to unrelated forms — adding sparse keyword search to Vertex AI Vector Search's hybrid mode, fused with reciprocal rank fusion, fixed exact-code lookups without hurting semantic queries.",
          aws: "Northbridge's agents kept searching for exact policy-form numbers ('Form HO-3-2024') that dense embeddings treated as 'similar' to unrelated forms — adding BM25 keyword search alongside OpenSearch's k-NN vector search, fused with reciprocal rank fusion, fixed exact-code lookups without hurting semantic queries.",
          azure:
            "Northbridge's agents kept searching for exact policy-form numbers ('Form HO-3-2024') that dense embeddings treated as 'similar' to unrelated forms — adding keyword search alongside Azure AI Search's vector search, fused with its semantic ranking, fixed exact-code lookups without hurting semantic queries.",
          oss: "Northbridge's agents kept searching for exact policy-form numbers ('Form HO-3-2024') that dense embeddings treated as 'similar' to unrelated forms — adding BM25 keyword search alongside Qdrant's dense vector search, fused with reciprocal rank fusion, fixed exact-code lookups without hurting semantic queries.",
        },
        impact: { problem: "Exact form numbers 'similar' to unrelated ones", fix: "Sparse + dense search, fused with RRF" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight's top-k retrieval looked fine on paper but real customers asked messier questions than the eval set covered — a lightweight reranker over a wider initial candidate set closed most of the gap.",
          gcp: "Fernlight's top-k retrieval on Vertex AI Vector Search looked fine on paper but real customers asked messier questions than the eval set covered — a lightweight reranker over a wider initial candidate set closed most of the gap.",
          aws: "Fernlight's top-k retrieval on OpenSearch looked fine on paper but real customers asked messier questions than the eval set covered — a lightweight reranker over a wider initial candidate set closed most of the gap.",
          azure:
            "Fernlight's top-k retrieval on Azure AI Search looked fine on paper but real customers asked messier questions than the eval set covered — a lightweight reranker over a wider initial candidate set closed most of the gap.",
          oss: "Fernlight's top-k retrieval on Qdrant looked fine on paper but real customers asked messier questions than the eval set covered — a lightweight reranker over a wider initial candidate set closed most of the gap.",
        },
        impact: { problem: "Top-k looked fine on paper, not on real questions", fix: "Reranker over a wider candidate set" },
      },
    ],
  },
  "38-multimodal": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "Northbridge's claims adjusters attach phone videos of storm damage to every claim file, but the RAG assistant only ever searched the typed adjuster notes — a claim citing 'roof damage visible in the walkthrough video' came back with no supporting evidence because the video itself was never indexed.",
          gcp: "Northbridge's claims adjusters attach phone videos of storm damage to every claim file, but the RAG assistant only ever searched the typed adjuster notes — a claim citing 'roof damage visible in the walkthrough video' came back with no supporting evidence because nobody had embedded the video itself; wiring Gemini Embedding 2's multimodal model in front of every upload fixed it.",
          aws: "Northbridge's claims adjusters attach phone videos of storm damage to every claim file, but the RAG assistant only ever searched the typed adjuster notes — a claim citing 'roof damage visible in the walkthrough video' came back with no supporting evidence because nobody had embedded the video itself; wiring Rekognition and Transcribe output into Titan multimodal embeddings in front of every upload fixed it.",
          azure:
            "Northbridge's claims adjusters attach phone videos of storm damage to every claim file, but the RAG assistant only ever searched the typed adjuster notes — a claim citing 'roof damage visible in the walkthrough video' came back with no supporting evidence because nobody had embedded the video itself; wiring Azure AI Vision embeddings and Video Indexer output in front of every upload fixed it.",
          oss: "Northbridge's claims adjusters attach phone videos of storm damage to every claim file, but the RAG assistant only ever searched the typed adjuster notes — a claim citing 'roof damage visible in the walkthrough video' came back with no supporting evidence because nobody had embedded the video itself; wiring CLIP frame embeddings and Whisper transcripts into BGE-M3 in front of every upload fixed it.",
        },
        impact: { problem: "Claims videos existed but weren't searchable", fix: "Keyframes + transcript embedded alongside the text index" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight's merchants upload product manuals as scanned PDFs full of wiring diagrams, plus a linked how-to video — the assistant answered from the manual's few sentences of body text and missed both the diagram-only spec page and the video's actual install steps.",
          gcp: "Fernlight's merchants upload product manuals as scanned PDFs full of wiring diagrams, plus a linked how-to video — the assistant answered from the manual's few sentences of body text and missed both the diagram-only spec page and the video's actual install steps, until embedding both with Gemini Embedding 2's multimodal model closed the gap.",
          aws: "Fernlight's merchants upload product manuals as scanned PDFs full of wiring diagrams, plus a linked how-to video — the assistant answered from the manual's few sentences of body text and missed both the diagram-only spec page and the video's actual install steps, until embedding both with Titan multimodal embeddings, plus Rekognition and Transcribe, closed the gap.",
          azure:
            "Fernlight's merchants upload product manuals as scanned PDFs full of wiring diagrams, plus a linked how-to video — the assistant answered from the manual's few sentences of body text and missed both the diagram-only spec page and the video's actual install steps, until embedding both with Azure AI Vision and Video Indexer closed the gap.",
          oss: "Fernlight's merchants upload product manuals as scanned PDFs full of wiring diagrams, plus a linked how-to video — the assistant answered from the manual's few sentences of body text and missed both the diagram-only spec page and the video's actual install steps, until embedding both with CLIP and Whisper into BGE-M3 closed the gap.",
        },
        impact: { problem: "Diagram pages and video steps invisible to text search", fix: "Layout-aware PDF + video transcript/frames, one index" },
      },
    ],
  },
  "45-evaluation": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "Northbridge's compliance team wouldn't sign off on 'it feels better' — building a 200-question golden set scored for both retrieval recall and answer faithfulness gave them a number to gate every prompt change against.",
          gcp: "Northbridge's compliance team wouldn't sign off on 'it feels better' — building a 200-question golden set, scored through Vertex AI evaluation for both retrieval recall and answer faithfulness, gave them a number to gate every prompt change against.",
          aws: "Northbridge's compliance team wouldn't sign off on 'it feels better' — building a 200-question golden set, scored through Bedrock evaluations for both retrieval recall and answer faithfulness, gave them a number to gate every prompt change against.",
          azure:
            "Northbridge's compliance team wouldn't sign off on 'it feels better' — building a 200-question golden set, scored through Microsoft Foundry evaluations for both retrieval recall and answer faithfulness, gave them a number to gate every prompt change against.",
          oss: "Northbridge's compliance team wouldn't sign off on 'it feels better' — building a 200-question golden set, scored with RAGAS for both retrieval recall and answer faithfulness, gave them a number to gate every prompt change against.",
        },
        impact: { problem: "\"It feels better\" isn't a sign-off", fix: "200-question golden set gates every prompt change" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight's founders eyeballed answers for months before a bad update shipped unnoticed for a week — every real support escalation now becomes a new golden-set case, so the suite gets harder as the product grows.",
          gcp: "Fernlight's founders eyeballed answers for months before a bad update shipped unnoticed for a week — every real support escalation now becomes a new golden-set case scored through Vertex AI evaluation, so the suite gets harder as the product grows.",
          aws: "Fernlight's founders eyeballed answers for months before a bad update shipped unnoticed for a week — every real support escalation now becomes a new golden-set case scored through Bedrock evaluations, so the suite gets harder as the product grows.",
          azure:
            "Fernlight's founders eyeballed answers for months before a bad update shipped unnoticed for a week — every real support escalation now becomes a new golden-set case scored through Microsoft Foundry evaluations, so the suite gets harder as the product grows.",
          oss: "Fernlight's founders eyeballed answers for months before a bad update shipped unnoticed for a week — every real support escalation now becomes a new golden-set case scored with RAGAS and tracked in Langfuse, so the suite gets harder as the product grows.",
        },
        impact: { problem: "A bad update shipped unnoticed for a week", fix: "Every escalation becomes a new golden-set case" },
      },
    ],
  },
  "55-observability": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "When an auditor asked Northbridge to reconstruct why a specific answer cited an outdated policy, a single trace ID let them replay the exact retrieved chunks and model call from six months earlier.",
          gcp: "When an auditor asked Northbridge to reconstruct why a specific answer cited an outdated policy, a single trace ID in Cloud Trace let them replay the exact retrieved chunks and model call from six months earlier.",
          aws: "When an auditor asked Northbridge to reconstruct why a specific answer cited an outdated policy, a single trace ID in CloudWatch let them replay the exact retrieved chunks and model call from six months earlier.",
          azure:
            "When an auditor asked Northbridge to reconstruct why a specific answer cited an outdated policy, a single trace ID in Application Insights let them replay the exact retrieved chunks and model call from six months earlier.",
          oss: "When an auditor asked Northbridge to reconstruct why a specific answer cited an outdated policy, a single trace ID in Langfuse let them replay the exact retrieved chunks and model call from six months earlier.",
        },
        impact: { problem: "Auditor asks why an answer cited a stale policy", fix: "One trace ID replays the call, 6 months later" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight didn't know which merchant's traffic was driving their token bill until they added per-request token counts to the trace log — one merchant's product catalog turned out to be triggering unusually long generations.",
          gcp: "Fernlight didn't know which merchant's traffic was driving their token bill until they added per-request token counts to their Cloud Trace log — one merchant's product catalog turned out to be triggering unusually long generations.",
          aws: "Fernlight didn't know which merchant's traffic was driving their token bill until they added per-request token counts to their CloudWatch log — one merchant's product catalog turned out to be triggering unusually long generations.",
          azure:
            "Fernlight didn't know which merchant's traffic was driving their token bill until they added per-request token counts to their Application Insights log — one merchant's product catalog turned out to be triggering unusually long generations.",
          oss: "Fernlight didn't know which merchant's traffic was driving their token bill until they added per-request token counts to their Langfuse trace log — one merchant's product catalog turned out to be triggering unusually long generations.",
        },
        impact: { problem: "No idea which merchant drove the token bill", fix: "Per-request token counts in the trace log" },
      },
    ],
  },
  "65-security": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "A Northbridge red-team exercise found that one business unit's retrieval index returned another unit's confidential claims data — missing document-level ACLs at retrieval time, not a model problem, and the fix that actually mattered.",
          gcp: "A Northbridge red-team exercise found that one business unit's retrieval index returned another unit's confidential claims data even with Model Armor screening every output — missing document-level ACLs at retrieval time, not a model problem, was the fix that actually mattered.",
          aws: "A Northbridge red-team exercise found that one business unit's retrieval index returned another unit's confidential claims data even with Bedrock Guardrails screening every output — missing document-level ACLs at retrieval time, not a model problem, was the fix that actually mattered.",
          azure:
            "A Northbridge red-team exercise found that one business unit's retrieval index returned another unit's confidential claims data even with Azure AI Content Safety screening every output — missing document-level ACLs at retrieval time, not a model problem, was the fix that actually mattered.",
          oss: "A Northbridge red-team exercise found that one business unit's retrieval index returned another unit's confidential claims data even with Llama Guard screening every output — missing document-level ACLs at retrieval time, not a model problem, was the fix that actually mattered.",
        },
        impact: { problem: "One business unit's index leaked into another's", fix: "Document-level ACLs enforced at retrieval time" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "A Fernlight customer's product description contained a hidden instruction telling the model to reveal other merchants' data — input filtering catching the injection attempt, combined with per-tenant retrieval scoping, is what actually stopped it.",
          gcp: "A Fernlight customer's product description contained a hidden instruction telling the model to reveal other merchants' data — Model Armor catching the injection attempt, combined with per-tenant retrieval scoping, is what actually stopped it.",
          aws: "A Fernlight customer's product description contained a hidden instruction telling the model to reveal other merchants' data — Bedrock Guardrails catching the injection attempt, combined with per-tenant retrieval scoping, is what actually stopped it.",
          azure:
            "A Fernlight customer's product description contained a hidden instruction telling the model to reveal other merchants' data — Azure AI Content Safety catching the injection attempt, combined with per-tenant retrieval scoping, is what actually stopped it.",
          oss: "A Fernlight customer's product description contained a hidden instruction telling the model to reveal other merchants' data — Llama Guard catching the injection attempt, combined with per-tenant retrieval scoping, is what actually stopped it.",
        },
        impact: { problem: "Hidden instruction in a product description", fix: "Input filtering + per-tenant retrieval scoping" },
      },
    ],
  },
  "75-finops": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "Northbridge assumed their AI assistant's cost scaled with document count — joining the event log against billing revealed output tokens from long compliance summaries dominated the bill, not the size of the index.",
          gcp: "Northbridge assumed their AI assistant's cost scaled with document count — joining the event log against their Cloud Billing export revealed output tokens from long compliance summaries dominated the bill, not the size of the index.",
          aws: "Northbridge assumed their AI assistant's cost scaled with document count — joining the event log against their Cost & Usage Report revealed output tokens from long compliance summaries dominated the bill, not the size of the index.",
          azure:
            "Northbridge assumed their AI assistant's cost scaled with document count — joining the event log against Microsoft Cost Management revealed output tokens from long compliance summaries dominated the bill, not the size of the index.",
          oss: "Northbridge assumed their AI assistant's cost scaled with document count — joining the event log against OpenCost revealed output tokens from long compliance summaries dominated the bill, not the size of the index.",
        },
        impact: { problem: "Assumed cost scaled with document count", fix: "Output tokens from summaries drove the bill instead" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight's per-merchant margins looked healthy in aggregate until $/tenant analysis showed two high-volume merchants were unprofitable at their plan price — prompt caching on their repeated system prompt bought enough margin back to avoid a price increase.",
          gcp: "Fernlight's per-merchant margins looked healthy in aggregate until a $/tenant join against their Cloud Billing export showed two high-volume merchants were unprofitable at their plan price — prompt caching on their repeated system prompt bought enough margin back to avoid a price increase.",
          aws: "Fernlight's per-merchant margins looked healthy in aggregate until a $/tenant join against their Cost & Usage Report showed two high-volume merchants were unprofitable at their plan price — prompt caching on their repeated system prompt bought enough margin back to avoid a price increase.",
          azure:
            "Fernlight's per-merchant margins looked healthy in aggregate until a $/tenant join against Microsoft Cost Management showed two high-volume merchants were unprofitable at their plan price — prompt caching on their repeated system prompt bought enough margin back to avoid a price increase.",
          oss: "Fernlight's per-merchant margins looked healthy in aggregate until a $/tenant join against OpenCost showed two high-volume merchants were unprofitable at their plan price — prompt caching on their repeated system prompt bought enough margin back to avoid a price increase.",
        },
        impact: { problem: "Two high-volume merchants, unprofitable margins", fix: "Prompt caching bought back margin, no price hike" },
      },
    ],
  },
  "85-agents": {
    beats: [
      {
        company: ENTERPRISE,
        vignette: {
          neutral:
            "Northbridge built an agent that could file a claims-status update — and bounded every tool call with a budget and a human-approval step, since an unsupervised loop making real policy changes was a compliance risk, not just a cost one.",
          gcp: "Northbridge built a claims-status agent on Vertex AI Agent Builder — and bounded every tool call with a budget and a human-approval step, since an unsupervised loop making real policy changes was a compliance risk, not just a cost one.",
          aws: "Northbridge built a claims-status agent on Bedrock Agents — and bounded every tool call with a budget and a human-approval step, since an unsupervised loop making real policy changes was a compliance risk, not just a cost one.",
          azure:
            "Northbridge built a claims-status agent on Microsoft Foundry Agent Service — and bounded every tool call with a budget and a human-approval step, since an unsupervised loop making real policy changes was a compliance risk, not just a cost one.",
          oss: "Northbridge built a claims-status agent with LiteLLM and MCP tool servers — and bounded every tool call with a budget and a human-approval step, since an unsupervised loop making real policy changes was a compliance risk, not just a cost one.",
        },
        impact: { problem: "Unsupervised agent could file real policy changes", fix: "Budget + human-approval step on every tool call" },
      },
      {
        company: STARTUP,
        vignette: {
          neutral:
            "Fernlight's first agent prototype kept calling the same lookup tool in a loop when a merchant's product data was malformed — a hard step budget turned a runaway (and expensive) loop into a graceful 'couldn't find that' response.",
          gcp: "Fernlight's first agent prototype, built on Vertex AI Agent Builder, kept calling the same lookup tool in a loop when a merchant's product data was malformed — a hard step budget turned a runaway (and expensive) loop into a graceful 'couldn't find that' response.",
          aws: "Fernlight's first agent prototype, built on Bedrock Agents, kept calling the same lookup tool in a loop when a merchant's product data was malformed — a hard step budget turned a runaway (and expensive) loop into a graceful 'couldn't find that' response.",
          azure:
            "Fernlight's first agent prototype, built on Microsoft Foundry Agent Service, kept calling the same lookup tool in a loop when a merchant's product data was malformed — a hard step budget turned a runaway (and expensive) loop into a graceful 'couldn't find that' response.",
          oss: "Fernlight's first agent prototype, built with LiteLLM and MCP servers, kept calling the same lookup tool in a loop when a merchant's product data was malformed — a hard step budget turned a runaway (and expensive) loop into a graceful 'couldn't find that' response.",
        },
        impact: { problem: "Malformed data looped the same tool call forever", fix: "Hard step budget → graceful \"couldn't find that\"" },
      },
    ],
  },
};
