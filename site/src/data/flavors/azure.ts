import type { CloudId } from "../modules";
import type { FlavorEntry } from "./gcp";

export const cloud: CloudId = "azure";

export const flavor: Record<string, FlavorEntry> = {
  "00-foundations": {
    services: ["Azure OpenAI"],
    storage: "N/A (concepts only)",
    snippet: `# No cloud calls in this module — pure concepts.\n# Azure AI Foundry model catalog is where you'll pick embedding + LLM models later.`,
    labSteps: [
      "Read the concept page and glossary.",
      "Open Azure AI Foundry and browse the model catalog (no calls made).",
    ],
    costNote: "$0 — no infrastructure created in this module.",
    claimId: "azure-foundry-model-catalog",
  },
  "10-ingestion": {
    services: ["Blob Storage", "Data Factory", "Azure SQL"],
    storage: "Blob Storage (raw) + Azure SQL (structured)",
    snippet: `az storage container create --name gdp-raw --account-name \${STORAGE_ACCOUNT}\n\naz storage blob upload-batch \\\n  --destination gdp-raw \\\n  --source ./sample-docs \\\n  --account-name \${STORAGE_ACCOUNT}\n\n# Data Factory pipeline triggers on new blobs and lands rows in Azure SQL`,
    labSteps: [
      "Create a Blob Storage container for raw documents.",
      "Upload 3-5 sample PDFs.",
      "Run a Data Factory pipeline to land metadata rows in Azure SQL.",
      "Verify row count in Azure SQL matches uploaded file count.",
    ],
    costNote: "~$0.05 for a handful of PDFs (Blob storage + one Data Factory pipeline run).",
    claimId: "azure-data-factory-ingestion",
  },
  "15-chunking": {
    services: ["Azure Functions", "Azure SQL"],
    storage: "Azure SQL (chunked rows with metadata)",
    snippet: `# Recursive chunking with LangChain, run in an Azure Function\nfrom langchain_text_splitters import RecursiveCharacterTextSplitter\n\nsplitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)\nchunks = splitter.split_text(document_text)\n\n# Each chunk row: (doc_id, chunk_id, text, char_start, char_end)\n# written to the gdp.chunks table`,
    labSteps: [
      "Take the raw rows landed in Module 10's Azure SQL table.",
      "Run the recursive chunker at chunk_size=800, chunk_overlap=120 in an Azure Function.",
      "Land chunk rows (doc_id, chunk_id, text, offsets) in a new Azure SQL table.",
      "Re-run with chunk_size=200 and compare: count chunks, spot orphaned mid-sentence splits.",
    ],
    costNote: "~$0.02 for a handful of Function invocations + Azure SQL storage.",
    claimId: "azure-functions-chunking",
  },
};
