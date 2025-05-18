# modules/geometry.py

def extract_geometry(parsed_json):
    """
    Extract wire geometry segments for visualization from parsed NEC JSON.

    Assumes parsed_json['cards'] includes GW cards with parameters that may be strings or numbers.
    Converts each param to a numeric value using safe evaluation when necessary.

    Returns a list of dicts each containing:
      - tag (int)
      - segments (int)
      - start [x, y, z]
      - end   [x, y, z]
      - radius (float or None)
    """
    geoms = []

    def to_number(tok):
        # Already numeric
        if isinstance(tok, (int, float)):
            return tok
        s = str(tok).strip()
        # Direct float
        try:
            return float(s)
        except ValueError:
            pass
        # Evaluate simple arithmetic expressions
        try:
            # Only allow digits, operators, e, ., +, -, *, /, parentheses
            import re
            if re.fullmatch(r"[0-9\.\+\-\*/\(\)eE ]+", s):
                return float(eval(s, {}, {}))
        except Exception:
            pass
        raise ValueError(f"Cannot convert token to number: {tok}")

    for card in parsed_json.get('cards', []):
        if card.get('type') != 'GW':
            continue
        raw_params = card.get('params', [])
        if len(raw_params) < 8:
            continue
        try:
            nums = [to_number(p) for p in raw_params]
            tag      = int(nums[0])
            segments = int(nums[1])
            x1, y1, z1 = nums[2], nums[3], nums[4]
            x2, y2, z2 = nums[5], nums[6], nums[7]
            radius = float(nums[8]) if len(nums) >= 9 else None
        except Exception:
            continue
        geoms.append({
            'tag': tag,
            'segments': segments,
            'start': [x1, y1, z1],
            'end': [x2, y2, z2],
            'radius': radius
        })

    return geoms