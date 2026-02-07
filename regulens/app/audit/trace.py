import datetime

def log_trace(query, retrieved_chunks, answer):
    with open("audit.log", "a", encoding="utf-8") as f:
        f.write(f"\n--- {datetime.datetime.utcnow()} ---\n")
        f.write(f"QUERY: {query}\n\n")
    
        f.write("RETRIEVED SOURCES:\n")
        for c in retrieved_chunks:
            f.write(
                f"- {c.metadata.get('source')} "
                f"(page {c.metadata.get('page')})\n"
            )

        f.write("\nANSWER:\n")
        f.write(answer)
        f.write("\n")

def log_trace(query, answer):
    print("QUERY:", query)
    print("ANSWER:", answer)
