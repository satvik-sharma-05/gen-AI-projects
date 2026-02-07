from pydantic import BaseModel
from typing import List, Optional, Union


class COREPReference(BaseModel):
    template: str
    article: str
    description: str


# -------- C 01.00 (Own Funds) --------
class COREPC01Fields(BaseModel):
    total_own_funds: Optional[str]
    tier1_capital: Optional[str]
    tier2_capital: Optional[str]
    reporting_required: Optional[bool]


# -------- C 14.00 (Securitisation) --------
class COREPC14Fields(BaseModel):
    securitisation_type: Optional[str]
    banking_book: Optional[bool]
    role_of_bank: Optional[str]
    reporting_required: Optional[bool]
    


class COREPResponse(BaseModel):
    question: str
    answer: str
    template: str  # "C 01.00", "C 14.00", or "OUT_OF_SCOPE"
    corep_fields: Union[COREPC01Fields, COREPC14Fields]
    references: List[COREPReference]
