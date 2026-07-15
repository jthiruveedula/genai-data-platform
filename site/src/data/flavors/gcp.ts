import type { CloudId } from "../modules";

export interface FlavorEntry {
  services: string[];
  storage: string;
  snippet: string;
  labSteps: string[];
  costNote: string;
  claimId: string;
}

export const cloud: CloudId = "gcp";

export const flavor: Record<string, FlavorEntry> = {
  "00-foundations": {
    services: ["Vertex AI"],
    storage: "N/A (concepts only)",
    snippet: `# No cloud calls in this module — pure concepts.\n# Vertex AI Model Garden is where you'll pick embedding + LLM models later.`,
    labSteps: [
      "Read the concept page and glossary.",
      "Open Vertex AI Model Garden in the console and browse available embedding models (no calls made).",
    ],
    costNote: "$0 — no infrastructure created in this module.",
    claimId: "gcp-vertex-model-garden",
  },
  "10-ingestion": {
    services: ["Cloud Storage", "Dataflow", "BigQuery"],
    storage: "Cloud Storage (raw) + BigQuery (structured)",
    snippet: `gcloud storage buckets create gs://\${PROJECT_ID}-gdp-raw --location=\${REGION}\n\n# Minimal Dataflow batch job template\npython ingest_pipeline.py \\\n  --input="gs://\${PROJECT_ID}-gdp-raw/*.pdf" \\\n  --output_table="\${PROJECT_ID}:gdp.raw_documents" \\\n  --runner=DataflowRunner \\\n  --project=\${PROJECT_ID} \\\n  --region=\${REGION}`,
    labSteps: [
      "Create a Cloud Storage bucket for raw documents.",
      "Upload 3-5 sample PDFs.",
      "Run the Dataflow batch job to land metadata rows in BigQuery.",
      "Verify row count in BigQuery matches uploaded file count.",
    ],
    costNote: "~$0.05 for a handful of PDFs (Dataflow small batch + GCS/BigQuery storage).",
    claimId: "gcp-dataflow-ingestion",
  },
};
