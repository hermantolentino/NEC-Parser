import re


def parse_nec(lines):
    """
    Parse a list of NEC file lines into a JSON-friendly structure, including comment cards.

    Args:
        lines (List[str]): Lines of NEC file.

    Returns:
        parsed_json (dict): { 'cards': [ ... ] }
        card_count (int): Number of cards parsed.
    """
    cards = []
    for line_number, raw_line in enumerate(lines, start=1):
        stripped = raw_line.strip()
        # Skip blank lines and lines starting with '*'
        if not stripped or stripped.startswith('*'):
            continue

        # Apostrophe comments → CM cards
        if stripped.startswith("'"):
            cards.append({
                'type': 'CM',
                'text': stripped[1:].strip(),
                'raw_content': stripped,
                'line_number': line_number
            })
            continue

        # Tokenize on whitespace or comma
        tokens = re.split(r"[\s,]+", stripped)
        card_type = tokens[0].upper()

        # CM and CE comment cards
        if card_type in ('CM', 'CE'):
            cards.append({
                'type': card_type,
                'text': ' '.join(tokens[1:]).strip(),
                'raw_content': stripped,
                'line_number': line_number
            })
            continue

        # Standard cards: parse numeric and string parameters
        params = []
        for tok in tokens[1:]:
            try:
                if tok.lower().startswith('0x'):
                    params.append(int(tok, 16))
                elif re.match(r"^[+-]?\d+\.?\d*([eE][+-]?\d+)?$", tok):
                    params.append(float(tok))
                else:
                    params.append(tok)
            except Exception:
                params.append(tok)

        cards.append({
            'type': card_type,
            'params': params,
            'raw_content': stripped,
            'line_number': line_number
        })

    parsed_json = {'cards': cards, 'geometry': {}, 'simulation': {}}

    return parsed_json, len(cards)
