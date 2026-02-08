# rag/generator.py - Complete with template validation and CLEAR fallback indicators
import json
import re
from typing import List, Dict, Any
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

class COREPGenerator:
    def __init__(self, groq_api_key: str):
        self.groq_api_key = groq_api_key
        self.llm = None
        
        if groq_api_key and groq_api_key.strip():
            try:
                self.llm = ChatGroq(
                    groq_api_key=groq_api_key,
                    model_name="llama-3.3-70b-versatile",
                    temperature=0.1,
                    max_tokens=4000,
                    timeout=30
                )
                print("✓ Groq LLM initialized successfully with model: llama-3.3-70b-versatile")
            except Exception as e:
                print(f"❌ Error initializing GROQ LLM: {e}")
                print("⚠ Will use mock responses when needed")
                self.llm = None
        
        # Define template-topic mappings
        self.template_topics = {
            "C 01.00": ["own funds", "cet1", "tier 1", "tier 2", "capital", "capital requirements", 
                       "common equity", "additional tier 1", "retained earnings", "regulatory adjustments"],
            "C 14.00": ["leverage ratio", "leverage exposure", "leverage requirements", 
                       "total exposure measure", "tier 1 capital leverage"],
            "C 31.00": ["large exposures", "exposure limits", "counterparty exposure", 
                       "single counterparty", "group of connected clients", "large exposure reporting"]
        }
    
    def _validate_template_topic_match(self, query: str, selected_template: str) -> Dict[str, Any]:
        """Check if the query topic matches the selected template"""
        query_lower = query.lower()
        selected_template = selected_template.strip()
        
        # Get expected topics for selected template
        expected_topics = self.template_topics.get(selected_template, [])
        
        # Check if query contains expected topics
        topic_match = any(topic in query_lower for topic in expected_topics)
        
        if not topic_match:
            # Find which template the query actually belongs to
            actual_template = None
            for template, topics in self.template_topics.items():
                if any(topic in query_lower for topic in topics):
                    actual_template = template
                    break
            
            if actual_template and actual_template != selected_template:
                return {
                    "valid": False,
                    "selected_template": selected_template,
                    "suggested_template": actual_template,
                    "message": f"Query appears to be about '{actual_template}' topics, but you selected '{selected_template}'"
                }
        
        return {"valid": True}
    
    def generate_response(self, query: str, scenario: str, 
                         retrieved_texts: List[Dict[str, Any]], 
                         template: str) -> Dict[str, Any]:
        """Generate COREP response using retrieved texts"""
        
        # Step 1: Validate template-topic match BEFORE calling LLM
        validation_result = self._validate_template_topic_match(query, template)
        
        if not validation_result["valid"]:
            print(f"⚠ Template mismatch detected: {validation_result['message']}")
            return self._create_template_mismatch_response(
                query, template, 
                validation_result["suggested_template"],
                validation_result["message"]
            )
        
        # If no LLM, return CLEAR fallback response
        if not self.llm:
            print("⚠ No LLM available, returning CLEARLY MARKED fallback response")
            return self._create_fallback_response(
                query, template, 
                "LLM service unavailable - showing example data",
                is_fallback=True
            )
        
        print(f"Calling generate_response with LLM...")
        
        # Prepare context from retrieved texts
        context_parts = []
        for i, text in enumerate(retrieved_texts):
            source = text.get("metadata", {}).get("source", "Unknown")
            content = text.get("content", "")
            context_parts.append(f"[Document {i+1} - {source}]\n{content}")
        
        context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant documents found."
        
        # ENHANCED: Add template validation to the prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a COREP regulatory reporting expert for UK banks.
            
            CRITICAL VALIDATION: Before answering, verify if the query topic matches the selected template.
            
            TEMPLATE-TOPIC MAPPING:
            - C 01.00: Own Funds, CET1, Tier 1, Tier 2 capital, capital requirements
            - C 14.00: Leverage Ratio, leverage exposure, leverage requirements  
            - C 31.00: Large Exposures, exposure limits, counterparty exposure
            
            If the query is about a different template than selected, respond with:
            "template_mismatch": true, 
            "selected_template": "X", 
            "correct_template": "Y",
            "explanation": "This query is about [topic] which belongs to template Y, not X"
            
            Otherwise, provide the COREP response in this JSON format:
            {{
                "template": "template_code",
                "reporting_date": "YYYY-MM-DD",
                "institution_name": "string",
                "fields": [
                    {{
                        "field_code": "string",
                        "field_name": "string", 
                        "value": number or null,
                        "description": "string",
                        "validation_status": "valid|invalid|pending"
                    }}
                ],
                "rule_references": ["string"],
                "validation_errors": ["string"]
            }}"""),
            ("human", """SELECTED TEMPLATE: {template}
            QUERY: {question}
            SCENARIO: {scenario}
            
            REGULATORY DOCUMENTS:
            {context}
            
            First, validate if the query topic matches the selected template.
            Then provide the COREP response in JSON:""")
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        
        try:
            print(f"Invoking chain with: question={query[:50]}..., template={template}")
            response_text = chain.invoke({
                "question": query,
                "scenario": scenario,
                "template": template,
                "context": context
            })
            
            print(f"Raw LLM response (first 300 chars): {response_text[:300]}...")
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                print(f"Extracted JSON (first 300 chars): {json_str[:300]}...")
                response_dict = json.loads(json_str)
                
                # Check for template mismatch in LLM response
                if response_dict.get("template_mismatch"):
                    return self._create_template_mismatch_response(
                        query, 
                        response_dict.get("selected_template", template),
                        response_dict.get("correct_template"),
                        response_dict.get("explanation", "Template mismatch detected")
                    )
                
                return response_dict
            else:
                print("Warning: Could not parse JSON from LLM response")
                return self._create_fallback_response(
                    query, template, 
                    "Could not parse LLM response - showing example data",
                    is_fallback=True
                )
                
        except Exception as e:
            print(f"Error generating response: {e}")
            return self._create_fallback_response(
                query, template, 
                f"LLM error: {str(e)[:100]} - showing example data",
                is_fallback=True
            )
    
    def _create_template_mismatch_response(self, query: str, selected_template: str, 
                                          correct_template: str, explanation: str) -> Dict[str, Any]:
        """Create response for template mismatch"""
        return {
            "template": selected_template,
            "reporting_date": None,
            "institution_name": "UK Banking Corporation",
            "fields": [
                {
                    "field_code": "TMP_ERR_001",
                    "field_name": "⚠ TEMPLATE SELECTION ERROR",
                    "value": None,
                    "description": f"{explanation}. Please select template {correct_template} for this query.",
                    "validation_status": "invalid"
                }
            ],
            "rule_references": [],
            "validation_errors": [
                f"❌ Template mismatch: Query about '{query[:50]}...' belongs to {correct_template}, not {selected_template}",
                f"📋 Please use template {correct_template} for this type of query"
            ],
            "template_mismatch": True,
            "suggested_template": correct_template,
            "is_fallback": False  # This is not a fallback, it's a validation error
        }
    
    def _create_fallback_response(self, query: str, template: str, 
                                 reason: str, is_fallback: bool = True) -> Dict[str, Any]:
        """Create a CLEARLY MARKED fallback response when LLM fails"""
        
        # Determine which fields to show based on template
        fields = []
        fallback_note = f"⚠ FALLBACK DATA: {reason} ⚠"
        
        if template == "C 01.00":
            fields = [
                {
                    "field_code": "FB_C01.010",
                    "field_name": "⚠ EXAMPLE: Common Equity Tier 1 capital",
                    "value": 125.5,  # £125.5 million
                    "description": f"{fallback_note} - Example value for demonstration",
                    "validation_status": "pending"
                },
                {
                    "field_code": "FB_C01.020",
                    "field_name": "⚠ EXAMPLE: Additional Tier 1 capital",
                    "value": 35.2,  # £35.2 million
                    "description": f"{fallback_note} - Based on typical bank ratios",
                    "validation_status": "pending"
                },
                {
                    "field_code": "FB_C01.030",
                    "field_name": "⚠ EXAMPLE: Tier 2 capital",
                    "value": 50.0,  # £50 million
                    "description": f"{fallback_note} - Subordinated debt example",
                    "validation_status": "pending"
                }
            ]
            rule_refs = ["⚠ EXAMPLE: CRR Article 25", "⚠ EXAMPLE: PRA Rulebook"]
            
        elif template == "C 14.00":
            fields = [
                {
                    "field_code": "FB_C14.010",
                    "field_name": "⚠ EXAMPLE: Leverage Ratio",
                    "value": 5.2,  # 5.2%
                    "description": f"{fallback_note} - Example leverage ratio",
                    "validation_status": "pending"
                }
            ]
            rule_refs = ["⚠ EXAMPLE: CRR Article 429", "⚠ EXAMPLE: Leverage Ratio Framework"]
            
        elif template == "C 31.00":
            fields = [
                {
                    "field_code": "FB_C31.010",
                    "field_name": "⚠ EXAMPLE: Large Exposure Limit",
                    "value": 25.0,  # 25%
                    "description": f"{fallback_note} - 25% of Tier 1 capital limit",
                    "validation_status": "pending"
                }
            ]
            rule_refs = ["⚠ EXAMPLE: CRR Article 395", "⚠ EXAMPLE: Large Exposures Regulation"]
            
        else:
            fields = [
                {
                    "field_code": "FB_GEN_001",
                    "field_name": "⚠ EXAMPLE: Regulatory Field",
                    "value": None,
                    "description": f"{fallback_note} - Generic example field",
                    "validation_status": "pending"
                }
            ]
            rule_refs = ["⚠ EXAMPLE: Regulatory Reference"]
        
        return {
            "template": template,
            "reporting_date": "2024-12-31",
            "institution_name": "⚠ EXAMPLE BANK (Fallback Data)",
            "fields": fields,
            "rule_references": rule_refs,
            "validation_errors": [
                f"⚠ USING FALLBACK DATA: {reason}",
                "⚠ This is example data for demonstration only",
                "⚠ Actual LLM response could not be generated"
            ],
            "is_fallback": is_fallback,  # Flag to indicate this is fallback data
            "fallback_reason": reason
        }