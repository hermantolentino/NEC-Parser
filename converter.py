# modules/converter.py

def json_to_nec(parsed_json):
    """
    Convert parsed NEC JSON structure back into NEC file format lines.

    Args:
        parsed_json (dict): Output from parse_nec, containing 'cards'.

    Returns:
        List[str]: NEC file lines suitable for writing to .nec file.
    """
    lines = []
    for card in parsed_json.get('cards', []):
        raw = card.get('raw_content')
        if raw:
            lines.append(raw)
        else:
            # Fallback: reconstruct from type and params
            typ = card.get('type', '')
            params = card.get('params', [])
            # Convert all params to string
            param_strs = [str(p) for p in params]
            if param_strs:
                line = typ + '\t' + '\t'.join(param_strs)
            else:
                line = typ
            lines.append(line)
    return lines
