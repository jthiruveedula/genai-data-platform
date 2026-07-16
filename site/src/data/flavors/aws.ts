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
};
