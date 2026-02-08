# schemas/corep.py
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import date
import datetime

class ReportingField(BaseModel):
    field_code: str
    field_name: str
    value: Optional[float] = None
    description: str = ""
    validation_status: str = "pending"

class UserQuery(BaseModel):
    question: str
    scenario_description: str
    template: str
    reporting_date: date  # This expects a Python date object
    institution_name: str

class COREPResponse(BaseModel):
    template: str
    reporting_date: date  # This expects a Python date object
    institution_name: str
    fields: List[ReportingField] = []
    rule_references: List[str] = []
    validation_errors: List[str] = []
    validation_status: str = "pending"
    
    @field_validator('reporting_date', mode='before')
    @classmethod
    def parse_reporting_date(cls, v):
        """Parse reporting_date from string or date object"""
        if isinstance(v, str):
            try:
                # Try to parse ISO format
                return datetime.date.fromisoformat(v)
            except:
                # Try other common formats
                try:
                    return datetime.datetime.strptime(v, "%Y-%m-%d").date()
                except:
                    try:
                        return datetime.datetime.strptime(v, "%d-%m-%Y").date()
                    except:
                        # If all parsing fails, return today
                        return datetime.date.today()
        elif isinstance(v, datetime.date):
            return v
        elif isinstance(v, datetime.datetime):
            return v.date()
        else:
            # Default to today
            return datetime.date.today()