/**
 * Per-module "in the field" case study: one real, publicly published customer
 * story per cloud, swapped in as the visitor switches clouds. Replaces an
 * earlier fictional-composite design (two recurring invented companies) after
 * feedback that a cloud-swapped tagline wasn't enough — the actual story now
 * has to change too, and it should be real, not invented.
 *
 * Sourcing rules (honest-copy convention, same spirit as validation/sources.yaml):
 *  - Every fact/number/quote below is taken verbatim from the cited sourceUrl,
 *    not paraphrased into a rounder or more dramatic number.
 *  - Where no clean real match exists for a module on a given cloud, the
 *    closest publicly available real story is used and marked `stretch: true`
 *    — the vignette itself says so in plain language, it is never presented
 *    as a clean fit. See validation/sources.yaml for the matching claim
 *    entries (id prefix `scenario-`).
 */

export interface ScenarioImpact {
  /** What the story was solving, in a few words — the scannable half of the beat. */
  problem: string;
  /** The real, cited outcome — paired with `problem` as a "before → after" line. */
  fix: string;
}

export interface RealCaseStudy {
  company: string;
  industry: string;
  vignette: string;
  impact: ScenarioImpact;
  sourceUrl: string;
  /** True when this is the closest available real match, not a clean fit for the module — rendered as an honest caveat, not hidden. */
  stretch?: boolean;
}

export interface ModuleCaseStudy {
  gcp: RealCaseStudy;
  aws: RealCaseStudy;
  azure: RealCaseStudy;
  oss: RealCaseStudy;
}

export const CASE_STUDIES: Record<string, ModuleCaseStudy> = {
  "00-foundations": {
    gcp: {
      company: "Vet-AI (Joii)",
      industry: "Healthcare",
      vignette:
        "Vet-AI's Joii app grounds veterinary advice by integrating Google's text embedding models with Gemini's generative model, rather than trusting the model's memory alone — the RAG pipeline reached 81% clinical accuracy and a 94% customer satisfaction score, built and live in just 10 weeks.",
      impact: { problem: "Chat-only LLM, no clinical grounding", fix: "Embeddings + Gemini RAG: 81% clinical accuracy" },
      sourceUrl: "https://cloud.google.com/customers/vet-ai",
    },
    aws: {
      company: "Dovetail",
      industry: "B2B SaaS",
      vignette:
        "Dovetail rebuilt its customer-research assistant on Amazon Bedrock's serverless model access instead of managing its own inference stack — engineer Peter Wooden says it cut prototyping to \"under a day\" and new feature builds to weeks, with customers reporting an 80% productivity improvement and 10 hours saved weekly.",
      impact: { problem: "Self-managed inference slowed every RAG prototype", fix: "Bedrock serverless: prototypes in <1 day" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/dovetail-case-study/",
    },
    azure: {
      company: "H&R Block",
      industry: "Tax preparation",
      vignette:
        "H&R Block's AI Tax Assist, built on Azure AI Foundry and Azure OpenAI, answers routine tax questions 24/7 for free across its DIY online editions — grounded in the same tax expertise behind its 60,000 human preparers, freeing live agents to focus on the complex returns AI shouldn't touch alone.",
      impact: { problem: "60,000 tax pros needed for every routine question", fix: "24/7 grounded assistant frees agents for complex returns" },
      sourceUrl:
        "https://www.microsoft.com/en/customers/story/1771647415089854527-hrblock-azure-ai-studio-professional-services-en-united-states",
    },
    oss: {
      company: "HubSpot",
      industry: "B2B SaaS / CRM",
      vignette:
        "No open-source RAG-foundations case study names a single company the way the cloud vendors do — the closest real published data point is HubSpot's own engineering account of the vector infrastructure underneath its RAG and agent features: over 20 billion vectors across 140+ self-hosted Qdrant clusters in production, the same text-to-vector idea this module introduces, just at extreme scale.",
      impact: { problem: "No dedicated OSS \"foundations\" case study exists", fix: "Closest real proof: 20B+ vectors on self-hosted Qdrant" },
      sourceUrl: "https://product.hubspot.com/blog/building-the-ai-retrieval-infrastructure-behind-20-billion-vectors-at-hubspot",
      stretch: true,
    },
  },
  "10-ingestion": {
    gcp: {
      company: "Parseur",
      industry: "Document automation",
      vignette:
        "Parseur's document-extraction pipeline runs Document AI's OCR into Gemini 1.5 Flash across more than 2 million documents a month for 50,000 users — the company attributes 36.2% of its overall revenue directly to that Google Cloud AI pipeline, alongside an 80% jump in token-processing speed.",
      impact: { problem: "OCR + extraction at 2M docs/month, unscaled", fix: "Document AI → Gemini: 36.2% of revenue traced to it" },
      sourceUrl: "https://cloud.google.com/customers/parseur",
    },
    aws: {
      company: "Rocket Close",
      industry: "Mortgage / title & appraisal",
      vignette:
        "Rocket Close's mortgage-document pipeline runs Amazon Textract ahead of Amazon Bedrock to process roughly 2,000 title and appraisal packages a day — each averaging 75 pages across 60+ document types — cutting processing time from 30 minutes per package to under 2 minutes, at roughly 90% accuracy.",
      impact: { problem: "30 min/package, manual review, 60+ doc types", fix: "Textract + Bedrock: under 2 min/package, ~90% accuracy" },
      sourceUrl:
        "https://aws.amazon.com/blogs/machine-learning/rocket-close-transforms-mortgage-document-processing-with-amazon-bedrock-and-amazon-textract",
    },
    azure: {
      company: "Ramp",
      industry: "Fintech",
      vignette:
        "Ramp built its receipt-and-invoice ingestion pipeline on Azure AI Document Intelligence in under a week — it now processes roughly 400,000 invoices and 5 million receipts every month at 90%+ field accuracy, saving customers an estimated 30,000 hours of manual work monthly.",
      impact: { problem: "400K invoices + 5M receipts/month, by hand", fix: "Document Intelligence pipeline: 30,000 hours/month saved" },
      sourceUrl: "https://www.microsoft.com/en/customers/story/23693-ramp-azure-ai-services",
    },
    oss: {
      company: "Laurel",
      industry: "Legal tech",
      vignette:
        "Laurel's AI timekeeping product runs RAG-based description generation through Apache Airflow DAGs scheduled to its customers' billing cycles, instead of on every event — that one orchestration change cut LLM inference costs by over $40,000 a month, on a product where professionals log 50+ projects a day in 6-minute increments.",
      impact: { problem: "RAG generation ran on every event, unscheduled", fix: "Airflow-scheduled batching: $40K+/month saved" },
      sourceUrl: "https://www.astronomer.io/blog/airflow-in-action-laurel/",
    },
  },
  "15-chunking": {
    gcp: {
      company: "Parseur",
      industry: "Document automation",
      vignette:
        "No published Google Cloud case study centers on chunking strategy directly — the closest real data point is Parseur's own account of the alternative: shorter-context tools forced them to \"restrict data extraction to two- or three-page documents or undertake the cumbersome process of breaking large documents down into digestible chunks,\" which is exactly why Gemini's long context is part of their pitch instead.",
      impact: { problem: "Short-context tools forced manual document chunking", fix: "Gemini's long context sidesteps chunking for many documents" },
      sourceUrl: "https://cloud.google.com/customers/parseur",
      stretch: true,
    },
    aws: {
      company: "Affinda",
      industry: "Intelligent document processing",
      vignette:
        "Affinda's document-extraction product configures new chunking and extraction schemas in minutes instead of the weeks or months manual setup used to take — a 90% cut in configuration time that, per Head of AI Andrew Bird, means \"someone in our product or implementation team can manage it on their own,\" no engineer required.",
      impact: { problem: "New extraction schema: weeks to months to configure", fix: "90% faster configuration, no engineer needed" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/affinda-case-study/",
    },
    azure: {
      company: "Worten",
      industry: "Retail",
      vignette:
        "Worten indexed over 1,000 internal SharePoint process documents with Azure AI Search — splitting and indexing that corpus turned a 3.5-minute manual search into seconds across 75,000+ searches a year, saving an estimated 11,000 work hours annually, per product owner Eduardo Lucena.",
      impact: { problem: "1,000+ process docs, 3.5-minute manual searches", fix: "Indexed corpus: seconds per search, 11,000 hrs/yr saved" },
      sourceUrl: "https://www.microsoft.com/en/customers/story/24385-worten-azure-openai",
    },
    oss: {
      company: "Anima Health",
      industry: "Healthcare",
      vignette:
        "No open-source case study focuses on chunking strategy itself — the closest real account is Anima Health's: they use self-hosted Qdrant to match unstructured clinical PDFs and referral letters to SNOMED codes with a clinician still reviewing every match, because, per Lead AI Engineer Colin Cooke, \"LLMs are great at understanding unstructured data, but they cannot free recall SNOMED codes\" — splitting documents into matchable pieces is the same underlying problem, just for medical coding rather than prose.",
      impact: { problem: "Unstructured clinical notes, no reliable code matching", fix: "Qdrant-matched chunks to SNOMED codes, clinician-reviewed" },
      sourceUrl: "https://qdrant.tech/blog/case-study-anima-health/",
      stretch: true,
    },
  },
  "20-embeddings": {
    gcp: {
      company: "Omoda",
      industry: "Retail / e-commerce",
      vignette:
        "Omoda's AI stylist runs on Vertex AI's Multimodal Embeddings and Vector Search, putting product photos and style descriptions in the same vector space — shoppers who use the AI stylist convert at 2.5 times the site average.",
      impact: { problem: "Text and product-photo search lived in separate systems", fix: "Multimodal embeddings: AI-stylist shoppers convert 2.5x" },
      sourceUrl: "https://cloud.google.com/customers/omoda",
    },
    aws: {
      company: "Bynder",
      industry: "Digital asset management",
      vignette:
        "Bynder re-embedded its 175-million-asset digital library with Amazon Titan Multimodal Embeddings on Bedrock — a typical campaign search now takes 75% less time and surfaces 50% more usable results, which director Roald Bankras says \"solved the puzzle for us\" after simpler approaches didn't scale.",
      impact: { problem: "175M assets, search too slow and too narrow", fix: "Titan multimodal embeddings: 75% faster, 50% more results" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/bynder-bedrock-case-study/",
    },
    azure: {
      company: "UBS",
      industry: "Banking",
      vignette:
        "UBS's Legal AI Assistant vectorizes language across 26 million documents with Azure AI Search — it finds a document about a \"legacy portfolio\" when a lawyer searches for \"remaining part,\" true semantic match rather than keyword overlap, and lead AI engineer Ilias Fotopoulos says it's become \"one of the largest-scale knowledge retrieval systems at UBS.\"",
      impact: { problem: "26M legal documents, keyword search only", fix: "Vectorized semantic search finds meaning, not just words" },
      sourceUrl: "https://www.microsoft.com/en/customers/story/22961-ubs-ag-azure-ai-search",
    },
    oss: {
      company: "Bazaarvoice",
      industry: "E-commerce reviews",
      vignette:
        "Bazaarvoice migrated 2.7 billion review vectors off Postgres/pgvector to self-hosted Qdrant and applied quantization — cutting storage from multiple terabytes to a few hundred gigabytes, a roughly 100x reduction, while holding sub-100ms query latency and about 98% recall. Senior Principal Engineer Dr. Lou Kratz: \"Storage is the story nobody talks about, and it's the most important one at this scale.\"",
      impact: { problem: "2.7B vectors on pgvector, multi-TB storage bill", fix: "Quantized on Qdrant: ~100x less storage, 98% recall" },
      sourceUrl: "https://qdrant.tech/blog/case-study-bazaarvoice/",
    },
  },
  "25-serving": {
    gcp: {
      company: "Moveo.AI",
      industry: "Customer experience automation",
      vignette:
        "Moveo.AI moved its CX model-serving stack onto Vertex AI's infrastructure (A3 VMs and Cloud TPUs) and cut model-upgrade time in half — responses that used to take 15+ seconds on their prior multi-cloud setup now return 5 times faster, and they've trained 150+ model versions in six months, versus roughly one a week before.",
      impact: { problem: "15+ second responses, ~1 model version/week", fix: "5x faster responses, 150+ versions in 6 months" },
      sourceUrl: "https://cloud.google.com/customers/moveoai",
    },
    aws: {
      company: "ASAPP",
      industry: "Contact center AI",
      vignette:
        "ASAPP's GenerativeAgent Platform serves customer-support conversations through Amazon Bedrock, automating over 90% of contact-center interactions at a 77% lower cost per chat — VP of AI Engineering Nirmal Mukhi says \"every bit of the product benefit is directly related to our ability to use powerful models\" via Bedrock, and first-call resolution on complex issues hit 91%.",
      impact: { problem: "Complex support routed to costly human-only flows", fix: "Bedrock-served agent: 91% first-call resolution, 77% cheaper" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/asapp-case-study/",
    },
    azure: {
      company: "Visier",
      industry: "People analytics",
      vignette:
        "Visier's \"Vee\" assistant serves up to 150,000 queries an hour on Azure OpenAI — switching from pay-as-you-go to Provisioned Throughput cut response time from 10-12 seconds to 2-4 seconds, roughly 3x faster, which Chief Innovation Officer Adam Binnie says improved \"both the quality and the performance of our generative AI experience.\"",
      impact: { problem: "PAYG tier: 10-12 second responses at 150K queries/hr", fix: "Provisioned Throughput: 2-4 seconds, ~3x faster" },
      sourceUrl:
        "https://www.microsoft.com/en/customers/story/1770536569687978092-visier-solutions-azure-openai-service-professional-services-en-canada",
    },
    oss: {
      company: "LinkedIn",
      industry: "Professional network",
      vignette:
        "LinkedIn serves 50+ generative AI features — including Hiring Assistant and AI Job Search — on self-hosted vLLM, using PagedAttention, prefix caching, and continuous batching. Scheduler tuning alone bought a 10% throughput gain, and a broader migration reached 1,245 tokens/sec at saturation while freeing 60 GPUs, holding AI Job Search under 600ms p95 latency at thousands of queries per second.",
      impact: { problem: "50+ GenAI features, GPU-hungry at scale", fix: "vLLM tuning: 60 GPUs freed, sub-600ms p95 latency" },
      sourceUrl: "https://www.linkedin.com/blog/engineering/ai/how-we-leveraged-vllm-to-power-our-genai-applications",
    },
  },
  "35-retrieval": {
    gcp: {
      company: "Rogo",
      industry: "Financial research",
      vignette:
        "Rogo's Wall Street research assistant combines Spanner's vector-embedding search with token-based keyword search in one query layer — real hybrid retrieval, not vector-only — and pairs it with Gemini 2.5 Flash, which cut hallucination rates from 34.1% to 3.9% while supporting 10x more tokens per query at lower latency and cost.",
      impact: { problem: "Vector-only search, 34.1% hallucination rate", fix: "Spanner hybrid search + Gemini 2.5 Flash: 3.9% hallucination" },
      sourceUrl: "https://cloud.google.com/customers/rogo",
    },
    aws: {
      company: "CoStar Group",
      industry: "Real estate data",
      vignette:
        "No published AWS customer story ties its results specifically to hybrid vector+keyword RAG retrieval — the closest real account is CoStar Group's Homes.com/Apartments.com search, which runs on Amazon OpenSearch at serious scale: 30-millisecond average search results for 50 million monthly users, with listing updates that used to take 6-30 minutes now landing in about 4 seconds, at a quarter of the on-premises cost.",
      impact: { problem: "On-prem listings search: 6-30 min updates, high cost", fix: "OpenSearch at scale: ~4s updates, 30ms search, 4x cheaper" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/costar-opensearch-case-study/",
      stretch: true,
    },
    azure: {
      company: "KPMG International",
      industry: "Professional services / audit",
      vignette:
        "KPMG's Clara AI platform grounds its audit agents in enterprise data through Azure AI Search, serving 95,000 auditors across 140+ countries and shifting audits from statistical sampling to analyzing whole datasets at petabyte scale. Global Head of Audit Innovation Sebastian Stöckle: \"Azure Cosmos DB is foundational for us. It gives our audit teams the ability to work with massive, distributed datasets in real time.\"",
      impact: { problem: "Sampling-based audits, no whole-dataset visibility", fix: "AI Search-grounded agents analyze full petabyte datasets" },
      sourceUrl: "https://www.microsoft.com/en/customers/story/25353-kpmg-international-azure",
    },
    oss: {
      company: "HubSpot",
      industry: "B2B SaaS / CRM",
      vignette:
        "HubSpot runs self-hosted Qdrant behind its RAG and dedup features at serious scale: 20+ billion vectors across 140+ clusters in 5 regions, the largest single index holding 9.5 billion vectors, handling write spikes up to 100,000 requests per second. They picked Qdrant specifically for its hybrid search, named vectors, and multi-stage querying — the same fused dense+keyword pattern this module covers, just at HubSpot's scale.",
      impact: { problem: "Retrieval infra needed to scale past a single vector DB region", fix: "Self-hosted Qdrant hybrid search: 20B+ vectors, 100K RPS spikes" },
      sourceUrl: "https://product.hubspot.com/blog/building-the-ai-retrieval-infrastructure-behind-20-billion-vectors-at-hubspot",
    },
  },
  "38-multimodal": {
    gcp: {
      company: "THE ICONIC",
      industry: "Retail / e-commerce",
      vignette:
        "THE ICONIC's \"Snap-to-Shop\" feature runs Multimodal Search across product photos, decomposing a single image into browsable pieces — null search results dropped from 5% to almost zero and the retailer measured a 2.6% revenue increase, with data query time falling from minutes to seconds.",
      impact: { problem: "Text-only search, 5% null results on visual queries", fix: "Multimodal image search: ~0% nulls, +2.6% revenue" },
      sourceUrl: "https://cloud.google.com/customers/the-iconic",
    },
    aws: {
      company: "TwelveLabs",
      industry: "Video AI",
      vignette:
        "TwelveLabs builds video-native multimodal search on Amazon S3 Vectors and Bedrock, tackling what CEO Jae Lee frames as the core problem: \"nearly 90% of the world's data is unstructured, a majority of it in video, yet most of it is unsearchable.\" S3 Vectors gives them sub-second semantic search across billions of vectors while cutting total costs by up to 90%.",
      impact: { problem: "Video content: unstructured, unsearchable at scale", fix: "S3 Vectors: sub-second search across billions, 90% cheaper" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/twelvelabs-case-study/",
    },
    azure: {
      company: "Accenture",
      industry: "Professional services / media",
      vignette:
        "Accenture's Cloud Video Platform runs Azure AI Video Indexer over roughly 1 petabyte of broadcast video, processing 200-300 clips a week across ~140 events a month — Broadcast and Production Technology Lead Christopher Lemire: \"The key that Video Indexer has given us is the insights in the video that it's been able to extract — insights that even a human wouldn't be able to do.\"",
      impact: { problem: "1PB of broadcast video, unmanaged and unsearchable", fix: "Video Indexer extracts insights across 200-300 clips/week" },
      sourceUrl: "https://www.microsoft.com/en/customers/story/25711-accenture-azure-ai-video-indexer",
    },
    oss: {
      company: "Tripadvisor",
      industry: "Travel / hospitality",
      vignette:
        "Tripadvisor's AI Trip Planner runs self-hosted Qdrant over more than a billion reviews — including hundreds of millions of photos — for 100 million-plus monthly users across 21 countries. Head of Data and AI Rahul Todkar: \"When you're dealing with over a billion plus user-generated, multi-modal pieces of content... you need a way to bring it all together.\" Users who engage with the AI features generate 2-3x more revenue.",
      impact: { problem: "1B+ reviews and photos, siloed by format", fix: "Qdrant multimodal search: 2-3x revenue from AI-feature users" },
      sourceUrl: "https://qdrant.tech/blog/case-study-tripadvisor/",
    },
  },
  "45-evaluation": {
    gcp: {
      company: "Galileo",
      industry: "AI evaluation platform",
      vignette:
        "Galileo — itself an AI-reliability platform — runs its evaluation and RAG-analytics stack on Vertex AI Vector Search and GKE, processing over 20 million requests a day at 300-millisecond latencies. In two years it scaled to a petabyte of data and 5,000+ end users, and says it's de-risked more than 1,000 AI applications for its customers.",
      impact: { problem: "AI apps shipped with no systematic evaluation", fix: "Galileo's Vector Search-backed eval: 1,000+ apps de-risked" },
      sourceUrl: "https://cloud.google.com/customers/galileo",
    },
    aws: {
      company: "Multitudes",
      industry: "Engineering analytics",
      vignette:
        "Multitudes evaluated 10 different LLMs on Amazon Bedrock across 1,000 real code reviews before picking a model for its engineering-analytics product — that evaluation pass cut misclassification from 20% down to under 1%, shipped in two months, and drove a 44% increase in monthly active users.",
      impact: { problem: "No model comparison; 20% misclassification rate", fix: "10-model eval on 1,000 reviews: <1% misclassification" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/multitudes-case-study/",
    },
    azure: {
      company: "Accenture",
      industry: "Professional services",
      vignette:
        "Accenture standardized on Azure AI Foundry's integrated evaluation suite — scoring groundedness, coherence, fluency, and jailbreak resistance in one place — across 75+ generative AI use cases, 16 already in production. Anoop Gopinatha: \"Instead of stitching together a dozen tools, we had a single SDK to track safety, accuracy, and performance,\" and the team delivered 17 use cases in 4 months versus the 14 originally requested over 8.",
      impact: { problem: "A dozen separate tools to check safety/accuracy/performance", fix: "One eval SDK: 17 use cases shipped in 4 months, not 8" },
      sourceUrl: "https://www.microsoft.com/en/customers/story/23953-accenture-azure-ai-foundry",
    },
    oss: {
      company: "Vectara",
      industry: "RAG-as-a-service",
      vignette:
        "Vectara used RAGAS's synthetic test-set generator to score its own RAG pipeline against 50 generated question-answer pairs — turning on hybrid search traded faithfulness down (0.9772 to 0.9493) for answer-correctness up (0.5045 to 0.5640), and adding a stronger prompt with GPT-4-Turbo pushed correctness to 0.5941. Numbers you only get by scoring retrieval and generation separately, not by eyeballing answers.",
      impact: { problem: "\"Feels right\" answers, no separated retrieval/generation score", fix: "RAGAS-scored: exact faithfulness vs. correctness tradeoffs" },
      sourceUrl: "https://www.vectara.com/blog/evaluating-rag",
    },
  },
  "55-observability": {
    gcp: {
      company: "Galileo",
      industry: "AI evaluation platform",
      vignette:
        "Galileo's own platform is built to \"observe and measure behavior, evaluate models... and automatically surface insights\" — running that observability layer on Vertex AI Vector Search and GKE at 20 million-plus requests a day, 300ms latencies, and a petabyte-plus of data across 5,000+ users, the same trace-and-measure discipline this module covers, at production scale.",
      impact: { problem: "No systematic way to observe agent/RAG behavior at scale", fix: "Galileo's GKE-hosted observability: 20M+ requests/day tracked" },
      sourceUrl: "https://cloud.google.com/customers/galileo",
    },
    aws: {
      company: "Druva",
      industry: "Data security / cyber resilience",
      vignette:
        "AWS's dedicated CloudWatch GenAI Observability only shipped in November 2025, too recent for a named customer case study yet — the closest real published account is Druva's, whose DruAI agents run on Bedrock AgentCore (Runtime, Gateway, Identity, Memory) and already resolve 68% of customer issues through agent workflows, the same trace-the-agent's-steps discipline this module covers, just not yet broken out as its own observability case study.",
      impact: { problem: "No AWS customer story yet ties results to LLM observability", fix: "Closest real proof: Druva's AgentCore agents resolve 68% of issues" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/druva-agentcore-case-study/",
      stretch: true,
    },
    azure: {
      company: "Accenture",
      industry: "Professional services",
      vignette:
        "No Microsoft customer story centers specifically on Azure Monitor or Application Insights tracing for a GenAI app — the closest real account is Accenture's AI Foundry deployment, which names Azure Monitor and Application Insights in its stack alongside its evaluation suite, delivering 17 use cases in 4 months against a 50% cut in time-to-build — the same request-to-trace discipline this module covers, just reported as part of a broader evaluation story rather than its own.",
      impact: { problem: "No dedicated Azure observability case study published yet", fix: "Closest real proof: Accenture's Monitor + App Insights-backed stack" },
      sourceUrl: "https://www.microsoft.com/en/customers/story/23953-accenture-azure-ai-foundry",
      stretch: true,
    },
    oss: {
      company: "Cresta",
      industry: "Contact center AI",
      vignette:
        "Cresta self-hosts Langfuse — one instance per Kubernetes cluster — specifically because, as they put it, \"traces capture the content of customer conversations,\" so keeping that data inside their own infrastructure boundary is a hard requirement, with trace data auto-deleting within four weeks. Every step of their production pipeline — intent detection, knowledge retrieval, tool execution, safety validation — gets typed trace-tree observations they can replay in a sandbox against updated prompts and models.",
      impact: { problem: "Multi-step LLM pipeline, conversation data can't leave infra", fix: "Self-hosted Langfuse: full trace tree, replayable, auto-deletes" },
      sourceUrl: "https://cresta.com/blog/observability-for-ai-agents-tracing-multi-service-llm-pipelines-with-langfuse",
    },
  },
  "65-security": {
    gcp: {
      company: "Adya",
      industry: "Enterprise AI agent platform",
      vignette:
        "No Google Cloud customer case study names a specific guardrail product like Model Armor as the centerpiece of a documented security outcome — the closest real account is from Adya, an enterprise-agent platform built on Vertex AI whose founder Shayak Mazumder describes enforcing security \"at the agent level, the protocol level, and the model level\" with \"an entire observability suite\" of Adaptive Learning Protocols, alongside an 85% cut in fine-tuned-LLM costs with a 21% performance gain.",
      impact: { problem: "No named GCP customer ties results to a specific guardrail", fix: "Adya's layered agent/protocol/model security, 85% cost cut" },
      sourceUrl: "https://cloud.google.com/customers/adya-ai",
      stretch: true,
    },
    aws: {
      company: "PwC",
      industry: "Professional services",
      vignette:
        "PwC uses Amazon Bedrock Guardrails' Automated Reasoning checks — which can deliver up to 99% verification accuracy — across three regulated use cases: EU AI Act compliance for financial-services risk management, pharmaceutical content review, and utility outage management. \"Reasoning is one of the most important technical advances to help our joint customers succeed in generative AI.\"",
      impact: { problem: "Regulated AI outputs needed provable, not just plausible, compliance", fix: "Automated Reasoning checks: up to 99% verification accuracy" },
      sourceUrl: "https://aws.amazon.com/blogs/machine-learning/pwc-and-aws-build-responsible-ai-with-automated-reasoning-on-amazon-bedrock/",
    },
    azure: {
      company: "South Australia Department for Education",
      industry: "Education",
      vignette:
        "South Australia's Department for Education piloted \"EdChat\" — built on Azure OpenAI with Azure AI Content Safety wired in from day one — across 1,500 students and 150 teachers in 8 secondary schools. Director of Digital Architecture Simon Chapman: \"We wouldn't have been able to proceed at this pace without having the content safety service in there from Day 1. It's a must-have.\"",
      impact: { problem: "Student-facing chatbot, no content-safety layer", fix: "Content Safety from day one: safe 8-week pilot, 1,500 students" },
      sourceUrl:
        "https://www.microsoft.com/en/customers/story/1751701319789621671-south-australia-department-of-education-azure-ai-content-safety-higher-education-en-australia",
    },
    oss: {
      company: "Red Hat",
      industry: "Enterprise software",
      vignette:
        "Red Hat's internal IT self-service agent runs two guardrail layers: a small Prompt-Guard model on CPU catching injection attempts, and Llama Guard 3-8B served on vLLM checking 14 content-safety categories. They found the defaults too strict out of the box — Llama Guard flagged legitimate employee lookups as \"Privacy\" violations — and had to explicitly exclude categories before real IT workflows stopped getting blocked.",
      impact: { problem: "Default guardrail categories blocked legitimate IT requests", fix: "Tuned Llama Guard categories: real workflows unblocked" },
      sourceUrl: "https://developers.redhat.com/articles/2026/05/04/guardrails-enterprise-safety-shields-llama-stack",
    },
  },
  "75-finops": {
    gcp: {
      company: "Taboola",
      industry: "AdTech",
      vignette:
        "Taboola cut ad-moderation costs by 75% by migrating content review onto Gemini, then rolled Gemini Enterprise out to 600+ sales staff — partnering with DoiT's \"intent-aware FinOps platform\" to keep the resulting spend accountable as 90% of employees started using it in daily workflows.",
      impact: { problem: "Ad-moderation costs, workflow rollout with no cost visibility", fix: "Gemini migration: -75% moderation cost, FinOps-tracked rollout" },
      sourceUrl: "https://cloud.google.com/customers/taboola",
    },
    aws: {
      company: "EXL",
      industry: "Data & AI services",
      vignette:
        "EXL's insurance-underwriting solution on Amazon Bedrock cut underwriting costs by 80% and processing time from days to hours — built in 60 days instead of the months a comparable system used to take. Product Manager Ajmal Malik: it \"significantly increases the efficiency of insurance underwriting while dramatically lowering the associated costs.\"",
      impact: { problem: "Underwriting: days per case, high manual cost", fix: "Bedrock pipeline: 80% cheaper, hours not days" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/exl-case-study/",
    },
    azure: {
      company: "Aditya Birla Capital",
      industry: "Financial services",
      vignette:
        "Aditya Birla Capital built a shared generative AI platform on Azure OpenAI with Cosmos DB caching repeated queries — cutting latency from 30 seconds to under a second and, per MD & CEO Pankaj Gadgil, delivering \"more than 40% in cost reductions\" alongside a 20% productivity gain for contact-center agents, now serving 2.5 million users on the way to a targeted 30 million.",
      impact: { problem: "30-second responses, no repeated-query caching", fix: "Cached + optimized: <1s latency, 40%+ cost reduction" },
      sourceUrl: "https://www.microsoft.com/en/customers/story/20596-aditya-birla-financial-shared-services-azure-open-ai-service",
    },
    oss: {
      company: "Laurel",
      industry: "Legal tech",
      vignette:
        "Laurel's $40,000-a-month inference savings (also Module 10's ingestion story) came from a pure FinOps move: scheduling Airflow-orchestrated RAG description generation to match customer billing cycles instead of running it on every event, plus tiered inference — cheap models for real-time predictions, larger ones run periodically and cached ahead of predicted demand.",
      impact: { problem: "RAG generation cost scaled with every event, unscheduled", fix: "Billing-cycle-aligned scheduling: $40K+/month saved" },
      sourceUrl: "https://www.astronomer.io/blog/airflow-in-action-laurel/",
    },
  },
  "85-agents": {
    gcp: {
      company: "Berenberg",
      industry: "Banking",
      vignette:
        "Berenberg's \"BegoChat\" assistant, built on Vertex AI, generates daily market research briefings 85-90% faster than before — \"an hour per day, per salesperson,\" per the bank — and Europe's oldest private bank is rolling out Gemini Enterprise across the whole organization in 2026 with a marketplace of role-specific agents for research, financial analysis, and due diligence.",
      impact: { problem: "Manual daily research briefings, ~1 hr/salesperson", fix: "Vertex AI agent: 85-90% faster briefing generation" },
      sourceUrl: "https://cloud.google.com/customers/berenberg",
    },
    aws: {
      company: "Druva",
      industry: "Data security / cyber resilience",
      vignette:
        "Druva's DruAI agents, built on Amazon Bedrock AgentCore, resolve 68% of customer issues through agent workflows alone — cyber-incident investigations that used to take 30-60 days now finish in minutes, across 17,500+ agent conversations and 3,000+ users, growing 55% in just four months. VP of AI Product David Gildea: \"What AgentCore helped us build is unlike virtually anything out there.\"",
      impact: { problem: "Cyber investigations: 30-60 days, mostly manual", fix: "Bedrock AgentCore agents: minutes, 68% resolved autonomously" },
      sourceUrl: "https://aws.amazon.com/solutions/case-studies/druva-agentcore-case-study/",
    },
    azure: {
      company: "ContraForce",
      industry: "Cybersecurity",
      vignette:
        "ContraForce's multi-agent system, built on Microsoft Foundry Agent Service alongside Sentinel and Defender XDR, autonomously handles over 90% of Level 1 security-operations investigation and response — a 93% lower cost per incident and 60x faster response time, letting each analyst support 10x more customers. CEO Stan Golubchik: \"Cybersecurity is a team sport.\"",
      impact: { problem: "SOC analysts manually triaging every Level 1 incident", fix: "Foundry multi-agent SOC: 90%+ automated, 60x faster" },
      sourceUrl: "https://www.microsoft.com/en/customers/story/25855-contraforce-microsoft-defender",
    },
    oss: {
      company: "Pinterest",
      industry: "Social media",
      vignette:
        "Pinterest built its internal AI-agent ecosystem on the Model Context Protocol, deliberately using multiple small domain-specific MCP servers (Presto, Spark, Airflow, Knowledge) behind a central registry rather than one monolith — 66,000 invocations a month across 844 active engineers, saving an estimated 7,000 engineering hours monthly, with a human-in-the-loop gate before any sensitive or expensive action runs.",
      impact: { problem: "One monolithic agent-tool server, no per-team boundaries", fix: "Many small MCP servers + registry: ~7,000 eng hours/month saved" },
      sourceUrl: "https://medium.com/pinterest-engineering/building-an-mcp-ecosystem-at-pinterest-d881eb4c16f1",
    },
  },
};

/** Shown when no cloud is selected yet — names every real story without picking one for the visitor. */
export function neutralCaseStudySummary(entry: ModuleCaseStudy): string {
  return `Real, cited customer stories exist for every cloud here — ${entry.gcp.company} (GCP), ${entry.aws.company} (AWS), ${entry.azure.company} (Azure), ${entry.oss.company} (self-hosted). Pick a cloud above to read theirs.`;
}
