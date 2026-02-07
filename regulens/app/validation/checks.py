def validate_answer(answer: dict):
    errors = []

    template = answer.get("template")
    corep_fields = answer.get("corep_fields", {})
    references = answer.get("references", [])
    answer_text = answer.get("answer", "")

    # --- Scope validation ---
    if template == "OUT_OF_SCOPE":
        return errors  # correct behavior

    # --- Template reference ---
    if not template or not template.startswith("C "):
        errors.append("No valid COREP template referenced")

    # --- Explanation quality ---
    if isinstance(answer_text, str) and len(answer_text.strip()) < 40:
        errors.append("Answer too short for regulatory justification")

    # --- Audit trail ---
    if not references:
        errors.append("No regulatory references provided")

    # --- Template-specific checks ---
    if template == "C 14.00":
        if "reporting_required" not in corep_fields:
            errors.append("Missing reporting_required field for C 14.00")

    return errors
