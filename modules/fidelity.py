from modules.parser import parse_nec
from difflib import SequenceMatcher

def compare_nec(orig_lines, reconv_lines):
    """
    Compare original and reconverted NEC lines, returning per-card fidelity metrics.

    Args:
        orig_lines (List[str]): Lines from original NEC file.
        reconv_lines (List[str]): Lines from reconverted NEC file.

    Returns:
        List[dict]: Each dict contains:
            - line_number
            - type
            - actual_params
            - similarity
            - field_count_score
            - value_alignment_score
            - overall_score
    """
    # Parse both sets of lines
    orig_json, _ = parse_nec(orig_lines)
    reconv_json, _ = parse_nec(reconv_lines)
    orig_cards = orig_json.get('cards', [])
    reconv_cards = reconv_json.get('cards', [])

    results = []
    count = min(len(orig_cards), len(reconv_cards))
    for i in range(count):
        o = orig_cards[i]
        r = reconv_cards[i]
        # Similarity of raw content
        sim = SequenceMatcher(None, o['raw_content'], r.get('raw_content','')).ratio()
        # Field count alignment
        op = o.get('params', []) or []
        rp = r.get('params', []) or []
        len_o = len(op)
        len_r = len(rp)
        if max(len_o, len_r) > 0:
            field_count_score = 1 - abs(len_o - len_r) / max(len_o, len_r)
        else:
            field_count_score = 1.0
        # Field value alignment: compare stringified params
        matches = sum(1 for xo, xr in zip(op, rp) if str(xo) == str(xr))
        max_params = max(len_o, len_r, 1)
        value_alignment_score = matches / max_params
        # Overall: average of sim, field_count_score, value_alignment_score
        overall = (sim + field_count_score + value_alignment_score) / 3
        results.append({
            'line_number': o.get('line_number'),
            'type': o.get('type'),
            'actual_params': len_o,
            'similarity': sim,
            'field_count_score': field_count_score,
            'value_alignment_score': value_alignment_score,
            'overall_score': overall
        })
    return results
