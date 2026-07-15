import type { CloudId } from "../modules";
import type { FlavorEntry } from "./gcp";

export const cloud: CloudId = "oss";

export const flavor: Record<string, FlavorEntry> = {
  "00-foundations": {
    services: ["vLLM", "HF Hub"],
    storage: "N/A (concepts only)",
    snippet: `# No infra calls in this module — pure concepts.\n# Hugging Face Hub is where you'll pick embedding + LLM models later.`,
    labSteps: [
      "Read the concept page and glossary.",
      "Browse the Hugging Face Hub model catalog (no downloads yet).",
    ],
    costNote: "$0 — no infrastructure created in this module.",
    claimId: "oss-hf-hub-catalog",
  },
  "10-ingestion": {
    services: ["MinIO", "Airflow", "Postgres"],
    storage: "MinIO (raw) + Postgres (structured)",
    snippet: `mc mb local/gdp-raw\n\nmc cp ./sample-docs/*.pdf local/gdp-raw/\n\n# Airflow DAG lands metadata rows in Postgres\nairflow dags trigger gdp_ingest_docs`,
    labSteps: [
      "Create a MinIO bucket for raw documents (docker compose up minio).",
      "Upload 3-5 sample PDFs with the mc client.",
      "Trigger the Airflow DAG to land metadata rows in Postgres.",
      "Verify row count in Postgres matches uploaded file count.",
    ],
    costNote: "$0 on a local kind cluster; ~compute cost only if run on cloud VMs.",
    claimId: "oss-airflow-ingestion",
  },
  "15-chunking": {
    services: ["Airflow", "Postgres"],
    storage: "Postgres (chunked rows with metadata)",
    snippet: `# Recursive chunking with LangChain, run as an Airflow task\nfrom langchain_text_splitters import RecursiveCharacterTextSplitter\n\nsplitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)\nchunks = splitter.split_text(document_text)\n\n# Each chunk row: (doc_id, chunk_id, text, char_start, char_end)\n# inserted into the chunks table via psycopg2`,
    labSteps: [
      "Take the raw rows landed in Module 10's Postgres table.",
      "Run the recursive chunker at chunk_size=800, chunk_overlap=120 as an Airflow task.",
      "Insert chunk rows (doc_id, chunk_id, text, offsets) into a new chunks table.",
      "Re-run with chunk_size=200 and compare: count chunks, spot orphaned mid-sentence splits.",
    ],
    costNote: "$0 on a local kind cluster; negligible CPU for a handful of documents.",
    claimId: "oss-airflow-chunking",
  },
};
