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
};
