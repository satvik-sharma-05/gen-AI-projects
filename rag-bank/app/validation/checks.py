from typing import List
from fastapi import HTTPException
from schemas.corep import COREPResponse, ReportingField


class COREPValidator:
    """
    Validates the generated COREP response against template-specific rules.
    Updates validation_status and collects errors.
    """

    # Template-specific mandatory/expected field codes (partial list - expand as needed)
    TEMPLATE_RULES = {
        "C 01.00": {  # Own Funds
            "mandatory_fields": [
                "C 01.00.010",  # Common shares
                "C 01.00.020",  # Retained earnings
                "C 01.00.030",  # Other reserves
            ],
            "capital_keywords": ["common equity", "tier 1", "own funds", "cet1"],
            "max_value_checks": {},  # e.g. "C 01.00.XXX": 100_000_000
        },
        "C 14.00": {  # Large Exposures
            "mandatory_fields": [
                "C 14.00.010",  # Total exposure value
                "C 14.00.020",  # Limit (usually 10%/25%)
            ],
            "limit_percentage": 0.25,  # 25% of eligible capital (Art. 395 CRR)
            "warning_threshold": 0.90,  # Warn if >90% of limit
        }
    }

    @staticmethod
    def validate_response(response: COREPResponse) -> COREPResponse:
        """
        Validate response and update validation_status / errors.
        Returns the modified response object.
        """
        errors = []

        # 1. Template validation
        if response.template not in COREPValidator.TEMPLATE_RULES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported COREP template: {response.template}. Allowed: {list(COREPValidator.TEMPLATE_RULES.keys())}"
            )

        rules = COREPValidator.TEMPLATE_RULES[response.template]

        # 2. Check mandatory fields (basic presence)
        present_field_codes = {field.field_code for field in response.fields}
        missing = [code for code in rules.get("mandatory_fields", []) if code not in present_field_codes]
        if missing:
            errors.append(f"Missing mandatory fields for {response.template}: {', '.join(missing)}")

        # 3. Template-specific validation
        if response.template == "C 01.00":
            # Check presence of capital-related fields (keyword-based)
            has_capital_field = any(
                any(kw.lower() in field.field_name.lower() for kw in rules["capital_keywords"])
                for field in response.fields
            )
            if not has_capital_field:
                errors.append("C 01.00 response should include at least one Own Funds / CET1 related field")

        elif response.template == "C 14.00":
            # Look for exposure value and limit
            exposure_value = None
            limit_value = None

            for field in response.fields:
                if "exposure" in field.field_name.lower():
                    exposure_value = field.value
                if "limit" in field.field_name.lower():
                    limit_value = field.value

            if exposure_value is not None and limit_value is not None:
                if exposure_value > limit_value:
                    errors.append(f"Exposure ({exposure_value}M) exceeds limit ({limit_value}M)")
                    for f in response.fields:
                        if f.value == exposure_value:
                            f.validation_status = "invalid"
                elif exposure_value > limit_value * rules["warning_threshold"]:
                    errors.append(f"Exposure ({exposure_value}M) close to limit ({limit_value}M) – warning")

        # 4. Per-field validation
        for field in response.fields:
            if field.value is None:
                field.validation_status = "pending"
            elif any(err.lower() in field.field_name.lower() for err in errors):
                field.validation_status = "invalid"
            else:
                field.validation_status = "valid"

        # 5. Finalize
        response.validation_errors = list(set(errors + response.validation_errors))  # deduplicate

        if response.validation_errors:
            print(f"Validation warnings/errors: {response.validation_errors}")

        return response