import os
import json
from dotenv import load_dotenv
from groq import Groq

from vectorstore.chroma_store import get_vectorstore

# --------------------------------------------------
# Environment & Client setup
# --------------------------------------------------

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL_NAME = os.getenv("MODEL_NAME", "llama-3.1-8b-instant")


# --------------------------------------------------
# Scope classification (LLM-assisted, bounded)
# --------------------------------------------------

def classify_scope(query: str) -> str:
    prompt = f"""
You are classifying regulatory questions for a PRA COREP prototype.

Decide which category the question belongs to:

- C_01_OWN_FUNDS (Own Funds, capital, retained earnings, reserves, CET1, AT1, Tier 2)
- C_14_SECURITISATION (securitisation, tranches, originator, sponsor, credit risk transfer)
- OUT_OF_SCOPE

Respond with ONLY one label.

Question:
{query}
"""

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You classify regulatory scope only."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    return response.choices[0].message.content.strip().upper()


# --------------------------------------------------
# Main RAG generation function
# --------------------------------------------------

def generate_answer(query: str):
    """
    End-to-end RAG flow:
    user question
    -> scope classification
    -> regulatory text retrieval
    -> structured COREP-aligned JSON output
    """

    # -------------------------------
    # Scope guard
    # -------------------------------
    scope = classify_scope(query)

    if scope == "OUT_OF_SCOPE":
        return {
            "question": query,
            "answer": "This COREP template is outside the scope of this prototype.",
            "template": "OUT_OF_SCOPE",
            "corep_fields": {},
            "references": []
        }

    template = "C 01.00" if scope == "C_01_OWN_FUNDS" else "C 14.00"

    # -------------------------------
    # Retrieve regulatory text
    # -------------------------------
    vectordb = get_vectorstore()
    retriever = vectordb.as_retriever(search_kwargs={"k": 4})
    docs = retriever.invoke(query)

    if not docs:
        return {
            "question": query,
            "answer": "No relevant regulatory text was found for this question.",
            "template": template,
            "corep_fields": {},
            "references": []
        }

    context = "\n\n".join(
        f"[Source: {d.metadata.get('source')}, page {d.metadata.get('page')}]\n{d.page_content}"
        for d in docs
    )

    # -------------------------------
    # Prompt
    # -------------------------------
    prompt = f"""
You are an LLM-assisted regulatory reporting assistant for UK PRA COREP reporting.

Your task:
- Explain clearly for a NON-BANKER
- Use ONLY the regulatory text
- Do NOT guess
- Respond ONLY in valid JSON

Supported templates:
- C 01.00 (Own Funds)
- C 14.00 (Securitisation)

JSON FORMAT:

{{
  "question": "...",
  "answer": "Clear explanation in simple language",
  "template": "{template}",
  "corep_fields": {{
    "description": "...",
    "reporting_required": true | false | null
  }},
  "references": [
    {{
      "template": "{template}",
      "article": "...",
      "description": "Why this rule supports the answer"
    }}
  ]
}}

Rules:
- For C 14.00, reporting_required MUST be present
- If data is missing, use null
- No banking jargon

REGULATORY TEXT:
{context}

QUESTION:
{query}
"""

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You are a UK PRA COREP regulatory reporting expert."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    raw = response.choices[0].message.content.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "question": query,
            "answer": "The model failed to return valid structured output.",
            "template": template,
            "corep_fields": {},
            "references": []
        }
