import sys
from pyparsing import Path
import streamlit as st
from dotenv import load_dotenv
import json
import os
# IMPORTANT: absolute import from app package
from ReguLens.app.rag.generator import generate_answer
ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))
# Load env vars (locally). On Streamlit Cloud, secrets are used instead.
load_dotenv()

st.set_page_config(
    page_title="ReguLens – PRA COREP Assistant",
    layout="centered"
)

st.title("🏦 ReguLens")
st.subheader("LLM-assisted PRA COREP Reporting Assistant (Prototype)")

st.markdown("""
This tool helps answer **PRA COREP reporting questions** using official regulatory documents.

### ✅ Supported templates
- **C 01.00** – Own Funds  
- **C 14.00** – Securitisation  

Any other COREP template will be marked **out of scope**.
""")

# -------------------------
# User input
# -------------------------
query = st.text_input(
    "Ask a COREP question",
    placeholder="e.g. What does C 14.00 report?"
)

if st.button("Ask"):
    if not query.strip():
        st.warning("Please enter a question.")
    else:
        with st.spinner("Retrieving regulatory text and generating answer..."):
            result = generate_answer(query)

        st.success("Answer generated")

        # -------------------------
        # Main answer
        # -------------------------
        st.markdown("## 📌 Answer")
        st.write(result.get("answer", ""))

        # -------------------------
        # Template
        # -------------------------
        st.markdown("## 📄 COREP Template")
        st.code(result.get("template", ""))

        # -------------------------
        # COREP fields
        # -------------------------
        corep_fields = result.get("corep_fields", {})
        if corep_fields:
            st.markdown("## 🧾 COREP Fields (Structured Output)")
            st.json(corep_fields)

        # -------------------------
        # Regulatory references (audit trail)
        # -------------------------
        references = result.get("references", [])
        if references:
            st.markdown("## 🔍 Regulatory References (Audit Trail)")
            for ref in references:
                st.markdown(
                    f"- **Template:** {ref.get('template')}  \n"
                    f"  **Article:** {ref.get('article')}  \n"
                    f"  **Description:** {ref.get('description')}"
                )

        # -------------------------
        # Raw JSON (for assessors)
        # -------------------------
        with st.expander("🧠 Raw Structured Output (JSON)"):
            st.json(result)
