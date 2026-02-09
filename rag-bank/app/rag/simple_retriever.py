from typing import List

class SimpleRetriever:
    def __init__(self, documents: List):
        self.documents = documents

    def retrieve_relevant_text(self, query: str, template: str, k: int = 5):
        query_lower = query.lower()

        scored = []
        for doc in self.documents:
            text = doc.page_content.lower()
            score = text.count(query_lower)
            if score > 0:
                scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)

        results = []
        for _, doc in scored[:k]:
            results.append({
                "content": doc.page_content[:1500],
                "metadata": doc.metadata
            })

        return results
