# audit/trace.py
from datetime import datetime
import json
from datetime import date

class AuditLogger:
    def log_query(self, query: dict, retrieved_texts: list, response: dict, errors: list):
        """
        Log query and response for audit purposes
        """
        # Helper to serialize dates
        def json_serial(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")
        
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "query": query,
                "retrieved_docs_count": len(retrieved_texts),
                "response": response,
                "validation_errors": errors
            }
            
            # Save to file
            with open("audit_log.json", "a", encoding="utf-8") as f:
                json.dump(log_entry, f, default=json_serial, ensure_ascii=False)
                f.write("\n")
            
            print(f"\n📊 Audit Log Entry Saved")
            
        except Exception as e:
            print(f"Error writing audit log: {e}")
            # Just print minimal info
            print(f"Query: {query.get('question', '')[:50]}...")