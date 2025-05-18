# modules/fidelity.py
from difflib import SequenceMatcher

def compare_nec(orig_cards, reconv_cards):
    """
    Line-by-line fidelity check between original and reconverted decks.
    For CM, CE, SY cards, value alignment is based on text match.
    Returns a list of metrics per line.
    """
    results = []
    for o, r in zip(orig_cards, reconv_cards):
        raw_o = o.get('raw_content', '')
        raw_r = r.get('raw_content', '')
        # 1) Raw-string similarity
        sim = SequenceMatcher(None, raw_o, raw_r).ratio()

        p_o = o.get('params', [])
        p_r = r.get('params', [])
        len_o, len_r = len(p_o), len(p_r)
        # 2) Field-count agreement
        count_score = 1 - abs(len_o - len_r) / max(len_o, len_r, 1)

        # 3) Value alignment
        if o.get('type') in ('CM', 'CE', 'SY'):
            # Compare the raw text (or text field) for these cards
            text_o = o.get('text', '').strip()
            text_r = r.get('text', '').strip()
            value_align = 1.0 if text_o == text_r else 0.0
        else:
            # Param-by-param exact matches
            matches = sum(1 for i in range(min(len_o, len_r)) if p_o[i] == p_r[i])
            value_align = matches / max(len_o, len_r, 1)

        # 4) Aggregate
        overall = (sim + count_score + value_align) / 3

        results.append({
            'line_number':            o.get('line_number'),
            'type':                   o.get('type'),
            'actual_params':          len_o,
            'similarity':             sim,
            'field_count_score':      count_score,
            'value_alignment_score':  value_align,
            'overall_score':          overall
        })

    return results

def extract_fidelity(parsed_json):
    """
    Build a map of feed-point tags from all EX cards.
    Returns: { tag (int): True, … }
    """
    feed_map = {}
    for card in parsed_json.get('cards', []):
        if card.get('type') == 'EX' and len(card.get('params', [])) >= 2:
            try:
                tag = int(card['params'][1])
                feed_map[tag] = True
            except ValueError:
                continue
    return feed_map