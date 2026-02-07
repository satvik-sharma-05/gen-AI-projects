from app.ingestion.load_docs import load_documents
from app.ingestion.chunk_docs import chunk_documents
from app.vectorstore.chroma_store import get_vectorstore
from app.rag.generator import generate_answer
from app.validation.checks import validate_answer
from app.audit.trace import log_trace

from dotenv import load_dotenv
load_dotenv()


def ingest():
    docs = load_documents()
    chunks = chunk_documents(docs)
    get_vectorstore(chunks)  # Chroma persists automatically


def ask(query):
    answer = generate_answer(query)
    errors = validate_answer(answer)
    log_trace(query, answer)
    return {"answer": answer, "validation_errors": errors}


if __name__ == "__main__":
    # ingest()    # called once to populate vectorstore, then comment out for regular use
    result = ask("What does C 07.00 report?")
    print(result)
