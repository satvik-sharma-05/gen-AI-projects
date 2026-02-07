from app.vectorstore.chroma_store import get_vectorstore

def retrieve_context(query, k=5):
    store = get_vectorstore()
    results = store.similarity_search(query, k=k)

    context = "\n\n".join(
        f"[{r.metadata['source']} | page {r.metadata['page']}]\n{r.page_content}"
        for r in results
    )

    return context
