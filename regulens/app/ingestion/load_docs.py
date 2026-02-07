import os
import pdfplumber
from app.config import RAW_DOCS_DIR

def load_documents():
    documents = []

    for root, _, files in os.walk(RAW_DOCS_DIR):
        for file in files:
            if not file.lower().endswith(".pdf"):
                continue

            path = os.path.join(root, file)

            with pdfplumber.open(path) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        documents.append({
                            "text": text,
                            "metadata": {
                                "source": file,
                                "folder": os.path.basename(root),
                                "page": i + 1
                            }
                        })

    return documents
