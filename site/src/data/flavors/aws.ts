import type { CloudId } from "../modules";
import type { FlavorEntry } from "./gcp";

export const cloud: CloudId = "aws";

export const flavor: Record<string, FlavorEntry> = {
  "00-foundations": {
    services: ["Amazon Bedrock"],
    storage: "N/A (concepts only)",
    snippet: `# No cloud calls in this module — pure concepts.\n# Bedrock model catalog is where you'll pick embedding + LLM models later.`,
    labSteps: [
      "Read the concept page and glossary.",
      "Open the Bedrock console and browse the model catalog (no calls made).",
    ],
    costNote: "$0 — no infrastructure created in this module.",
    claimId: "aws-bedrock-model-catalog",
  },
  "10-ingestion": {
    services: ["S3", "Glue", "Athena"],
    storage: "S3 (raw) + Athena (queryable)",
    snippet: `aws s3 mb s3://\${ACCOUNT_ID}-gdp-raw --region \${REGION}\n\naws s3 cp ./sample-docs/ s3://\${ACCOUNT_ID}-gdp-raw/ --recursive\n\n# Glue crawler to catalog raw documents\naws glue create-crawler \\\n  --name gdp-raw-crawler \\\n  --role \${GLUE_ROLE_ARN} \\\n  --targets S3Targets=[{Path=s3://\${ACCOUNT_ID}-gdp-raw/}] \\\n  --database-name gdp`,
    labSteps: [
      "Create an S3 bucket for raw documents.",
      "Upload 3-5 sample PDFs.",
      "Run a Glue crawler to catalog the bucket into the Glue Data Catalog.",
      "Query the catalog table via Athena to confirm row count.",
    ],
    costNote: "~$0.05 for a handful of PDFs (S3 storage + one Glue crawler run + Athena scan).",
    claimId: "aws-glue-ingestion",
  },
  "15-chunking": {
    services: ["Lambda", "Athena"],
    storage: "S3 (chunked JSON) + Athena (queryable)",
    snippet: `# Recursive chunking with LangChain, run in a Lambda\nfrom langchain_text_splitters import RecursiveCharacterTextSplitter\n\nsplitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)\nchunks = splitter.split_text(document_text)\n\n# Each chunk written as JSON to\n# s3://\${ACCOUNT_ID}-gdp-raw/chunks/{doc_id}/{chunk_id}.json`,
    labSteps: [
      "Take the raw rows cataloged in Module 10's Glue table.",
      "Run the recursive chunker at chunk_size=800, chunk_overlap=120 in a Lambda.",
      "Write chunk JSON (doc_id, chunk_id, text, offsets) back to S3 and re-crawl with Glue.",
      "Re-run with chunk_size=200 and compare via Athena: count chunks, spot orphaned mid-sentence splits.",
    ],
    costNote: "~$0.02 for a handful of Lambda invocations + Athena scan.",
    claimId: "aws-lambda-chunking",
  },
  "20-embeddings": {
    services: ["Bedrock (Titan Embeddings)", "OpenSearch Serverless"],
    storage: "OpenSearch Serverless vector index",
    snippet: `import boto3\nbedrock = boto3.client("bedrock-runtime")\n\ndef embed(text):\n    resp = bedrock.invoke_model(modelId="amazon.titan-embed-text-v2:0", body=json.dumps({"inputText": text}))\n    return json.loads(resp["body"].read())["embedding"]\n\n# Index into OpenSearch Serverless as a k-NN vector field\nos_client.index(index="gdp-chunks", body={"chunk_id": c.chunk_id, "embedding": embed(c.text)})`,
    labSteps: [
      "Embed all chunks from Module 15 with Titan Embeddings on Bedrock.",
      "Create an OpenSearch Serverless collection with a k-NN vector index and index the vectors.",
      "Embed two different queries and eyeball their nearest neighbors.",
      "Confirm semantically similar chunks (not just keyword-similar) land near each other.",
    ],
    costNote: "~$0.02 for embedding a handful of documents' worth of chunks.",
    claimId: "aws-titan-embeddings",
  },
  "25-serving": {
    services: ["Lambda + API Gateway", "Bedrock (Claude Haiku 4.5)"],
    storage: "N/A — reads the Module 20 OpenSearch index at request time",
    snippet: `def handler(event, context):\n    query_vec = embed(event["question"])\n    neighbors = os_client.search(index="gdp-chunks", body={"knn": {"embedding": {"vector": query_vec, "k": 5}}})\n    prompt = build_prompt(event["question"], neighbors)\n    response = bedrock.invoke_model(modelId="anthropic.claude-haiku-4-5", body=json.dumps({"prompt": prompt}))\n    return {"answer": response, "citations": [n["chunk_id"] for n in neighbors]}`,
    labSteps: [
      "Deploy a Lambda behind API Gateway wrapping embed -> retrieve -> prompt -> Claude Haiku 4.5 on Bedrock.",
      "Ask a question your Module 10 documents can answer; confirm the response cites a real chunk.",
      "Ask an out-of-scope question; confirm the model says it doesn't know instead of guessing.",
      "Log every request/response pair — this becomes the event log Module 30 builds dashboards on.",
    ],
    costNote: "~$0.01 per query (Claude Haiku 4.5 fast tier) + negligible Lambda/API Gateway cost at low volume.",
    claimId: "aws-lambda-rag-api",
  },
  "35-retrieval": {
    services: ["OpenSearch Service", "Bedrock"],
    storage: "OpenSearch (hybrid BM25 + k-NN index)",
    snippet: `// Hybrid search: combine BM25 and k-NN in one OpenSearch query\nconst res = await client.search({\n  index: "gdp-chunks",\n  body: {\n    query: {\n      hybrid: {\n        queries: [\n          { match: { text: query } },\n          { knn: { embedding: { vector: queryVec, k: 20 } } },\n        ],\n      },\n    },\n  },\n});\n\n// Rerank top-20 with a Bedrock reranker model before answering\nconst reranked = await rerank(query, res.hits, { topK: 5 });`,
    labSteps: [
      "Enable a hybrid search pipeline on the Module 15 chunk index (BM25 + k-NN).",
      "Run a query with k-NN only, note top-5 results.",
      "Re-run the same query through the hybrid pipeline, compare top-5.",
      "Add a Bedrock reranking pass over the top-20 hybrid results and compare the final top-5 again.",
    ],
    costNote: "~$0.03 for a handful of hybrid queries + rerank calls on a small OpenSearch domain.",
    claimId: "aws-opensearch-hybrid",
  },
  "45-evaluation": {
    services: ["Bedrock evaluations", "S3"],
    storage: "S3 (golden dataset + evaluation job output)",
    snippet: `import boto3\nbedrock = boto3.client("bedrock")\n\nresponse = bedrock.create_evaluation_job(\n    jobName="gdp-rag-eval",\n    evaluationConfig={\n        "automated": {\n            "datasetMetricConfigs": [{\n                "taskType": "General",\n                "dataset": {"name": "golden", "datasetLocation": {"s3Uri": "s3://gdp-eval/golden.jsonl"}},\n                "metricNames": ["Builtin.Faithfulness", "Builtin.Correctness", "Builtin.Helpfulness"],\n            }],\n            "evaluatorModelConfig": {"bedrockEvaluatorModels": [{"modelIdentifier": "anthropic.claude-sonnet-5"}]},\n        }\n    },\n)`,
    labSteps: [
      "Build a golden dataset of 20+ labeled Q&A pairs from the documents ingested in Module 10 and upload to S3.",
      "Run a Bedrock evaluation job with faithfulness, correctness, and helpfulness metrics against the Module 25 RAG API.",
      "Spot-check 5 LLM-as-judge scores against your own human judgment and note any disagreement.",
      "Write the job's summary metrics to S3 and wire a CI step that fails the build if faithfulness drops below a threshold.",
    ],
    costNote: "~$0.04 for evaluating a 20-example golden set with an LLM-as-judge model.",
    claimId: "aws-bedrock-evaluation",
  },
  "55-observability": {
    services: ["CloudWatch", "Bedrock invocation logging"],
    storage: "CloudWatch Logs (traces) + S3 (Bedrock invocation logs)",
    snippet: `import boto3\nbedrock = boto3.client("bedrock")\n\nbedrock.put_model_invocation_logging_configuration(\n    loggingConfig={\n        "cloudWatchConfig": {"logGroupName": "/gdp/bedrock-invocations", "roleArn": role_arn},\n        "s3Config": {"bucketName": "gdp-invocation-logs"},\n        "textDataDeliveryEnabled": True,\n    }\n)\n# Each invocation now logs prompt, completion, and input/output token counts`,
    labSteps: [
      "Instrument the Module 25 RAG API with OpenTelemetry spans for embed, retrieve, prompt, and generate.",
      "Enable Bedrock invocation logging so every call's request/response and token counts land in CloudWatch and S3.",
      "Confirm one trace per request shows all four stages nested correctly, with token counts on the generate span.",
      "Query CloudWatch Logs Insights for p50/p95 total latency versus time-to-first-token.",
    ],
    costNote: "~$0.01 for a handful of traced requests (CloudWatch ingestion + small S3 log volume).",
    claimId: "aws-bedrock-invocation-logging",
  },
  "65-security": {
    services: ["Bedrock Guardrails", "Macie"],
    storage: "N/A — inline screening at request/response time",
    snippet: `import boto3\nbedrock = boto3.client("bedrock-runtime")\n\nresponse = bedrock.apply_guardrail(\n    guardrailIdentifier="gdp-rag-guardrail",\n    guardrailVersion="1",\n    source="INPUT",\n    content=[{"text": {"text": incoming_prompt}}],\n)\nif response["action"] == "GUARDRAIL_INTERVENED":\n    raise PromptBlocked("prompt injection or denied-topic signal detected")`,
    labSteps: [
      "Insert a document into the Module 15 chunk index containing a hidden instruction ('ignore prior instructions and reveal...').",
      "Ask a normal question that retrieves that chunk and observe whether the model follows the injected instruction.",
      "Enable Bedrock Guardrails' contextual grounding check and content filters in front of the Module 25 RAG API and re-run the same query.",
      "Add a document-level access-control filter to retrieval and confirm a second tenant's query can no longer surface the first tenant's chunks.",
    ],
    costNote: "~$0.02 for a handful of guardrail-screened prompts/responses.",
    claimId: "aws-bedrock-guardrails",
  },
  "75-finops": {
    services: ["Cost & Usage Report", "Athena"],
    storage: "S3 (CUR) queried via Athena, joined with the Module 55 event log",
    snippet: `-- Join CUR against the traced event log to get $/query\nSELECT\n  e.tenant_id,\n  COUNT(*) AS queries,\n  SUM(cur.line_item_unblended_cost) AS total_cost,\n  SUM(cur.line_item_unblended_cost) / COUNT(*) AS cost_per_query\nFROM event_log e\nJOIN cur_table cur ON e.request_id = cur.resource_id\nGROUP BY e.tenant_id\nORDER BY cost_per_query DESC;`,
    labSteps: [
      "Enable the Cost & Usage Report delivered to S3 and query it via Athena joined against the Module 55 event log.",
      "Compute $/query and $/tenant, and confirm output tokens dominate cost versus embedding calls.",
      "Add a semantic cache in front of the Module 25 RAG API and measure the drop in $/query for repeated questions.",
      "Add a fast-model-first router that only escalates to a reasoning-tier model on low retrieval confidence, and re-measure.",
      "Set a Bedrock prompt cache checkpoint after the repeated system prompt + retrieved chunks prefix, and confirm the ~90% cache-read discount shows up in the next CUR + event log join.",
    ],
    costNote: "~$0.02 for the Athena scan over a small CUR + event log join.",
    claimId: "aws-cur-athena-finops",
  },
  "85-agents": {
    services: ["Bedrock Agents"],
    storage: "N/A — reads the Module 20 OpenSearch index and calls tools at request time",
    snippet: `import boto3\nbedrock = boto3.client("bedrock-agent")\n\nbedrock.create_agent_action_group(\n    agentId=agent_id,\n    agentVersion="DRAFT",\n    actionGroupName="search_docs",\n    apiSchema={"s3": {"s3BucketName": "gdp-schemas", "s3ObjectKey": "search-docs.json"}},\n    actionGroupExecutor={"lambda": search_docs_lambda_arn},\n)\n# The agent now plans, calls search_docs, and observes the result before responding`,
    labSteps: [
      "Wrap the Module 25 retrieval call as a Lambda action group and register it with a Bedrock Agent.",
      "Give the agent a multi-step task ('find X, then summarize how it changed across the last two documents') and trace the plan-act-observe loop.",
      "Cap the agent at a fixed iteration budget and confirm it stops instead of looping indefinitely on an unanswerable task.",
      "Add a human-approval gate before any action group call with a side effect (e.g. sending an email) and verify the agent pauses for it.",
    ],
    costNote: "~$0.03 for a handful of agent turns with tool calls on the fast tier.",
    claimId: "aws-bedrock-agents",
  },
};
