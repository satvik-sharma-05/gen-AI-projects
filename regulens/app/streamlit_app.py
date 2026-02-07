import sys
from pathlib import Path

# --------------------------------------------------
# Ensure repo root is on Python path (monorepo fix)
# --------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

import streamlit as st
from dotenv import load_dotenv

from regulens.app.rag.generator import generate_answer


# --------------------------------------------------
# Environment
# --------------------------------------------------


st.set_page_config(
    page_title="ReguLens – PRA COREP Assistant",
    layout="centered"
)

st.title("ReguLens")
st.subheader("LLM-assisted PRA COREP Reporting Assistant (Prototype)")

st.markdown("""
This tool helps answer **PRA COREP reporting questions** using official regulatory documents.

### Supported templates
- **C 01.00** – Own Funds  
- **C 14.00** – Securitisation  

Any other COREP template will be marked **out of scope**.
""")

# --------------------------------------------------
# User input
# --------------------------------------------------

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

        # Answer
        st.markdown("## Answer")
        st.write(result.get("answer", ""))

        # Template
        st.markdown("## COREP Template")
        st.code(result.get("template", ""))

        # COREP fields
        corep_fields = result.get("corep_fields", {})
        if corep_fields:
            st.markdown("## Structured COREP Fields")
            st.json(corep_fields)

        # Audit trail
        references = result.get("references", [])
        if references:
            st.markdown("## Regulatory References (Audit Trail)")
            for ref in references:
                st.markdown(
                    f"- **Template:** {ref.get('template')}  \n"
                    f"  **Article:** {ref.get('article')}  \n"
                    f"  **Description:** {ref.get('description')}"
                )

        # Raw JSON
        with st.expander("Raw structured output (JSON)"):
            st.json(result)
