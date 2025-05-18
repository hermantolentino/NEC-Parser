import re
from modules.sy_resolver import safe_eval

# Only geometry‐and‐frequency cards are strictly validated
CARD_SPECS = {
    'GW': [
        ('tag', int, True),
        ('segments', int, True),
        ('x1', float, True), ('y1', float, True), ('z1', float, True),
        ('x2', float, True), ('y2', float, True), ('z2', float, True),
        ('radius', float, False)
    ],
    'GC': [
        ('i', int, True), ('j', int, True), ('k', int, True),
        ('rc', float, True), ('zc', float, True)
    ],
    'FR': [
        ('NFRF', int, True),
        ('NFREQ', int, True),
        ('I1', int, True),
        ('I2', int, True),
        ('freq', float, True),
        ('delf', float, True)
    ],
    'RP': [
        ('j1', int, True), ('j2', int, True), ('M', int, True),
        ('RHO', int, True), ('PHI', int, True), ('DELTAPHI', float, True),
        ('NPHI', int, True), ('L', float, False)
    ],
    'LD': [
        ('i', int, True), ('j', int, True),
        ('RHO', float, True), ('PHI', float, True), ('Z', float, True)
    ]
}

# Recognize SY variable‐definition cards
SY_RE = re.compile(r'^\s*SY\b', re.IGNORECASE)

def parse_nec_lines(raw_lines):
    """
    Two‐pass NEC parser:
      1) Build sym_tab from SY cards.
      2) Parse each line:
         - SY, CM, CE: no numeric validation.
         - GW, GC, FR, RP, LD: safe_eval() + type/count checks.
         - All others: raw params, no validation.
    Returns list of dicts:
      {line_number, raw_content, type, params, text?, errors}
    """
    # 1) Build symbol table
    sym_tab = {}
    for ln in raw_lines:
        st = ln.strip()
        if SY_RE.match(st):
            parts = st.split(None, 1)
            if len(parts) == 2 and '=' in parts[1]:
                name, expr = [s.strip() for s in parts[1].split('=', 1)]
                try:
                    sym_tab[name] = safe_eval(expr, sym_tab)
                except Exception:
                    pass

    cards = []
    for idx, ln in enumerate(raw_lines, start=1):
        raw = ln.rstrip('\r\n')

        # a) Apostrophe comments
        if raw.startswith("'"):
            cards.append({
                'line_number': idx, 'raw_content': raw,
                'type': 'CM', 'params': [], 'text': raw[1:].strip(), 'errors': []
            })
            continue

        # b) SY cards
        if SY_RE.match(raw):
            text = raw.split(None,1)[1].strip() if ' ' in raw else ''
            cards.append({
                'line_number': idx, 'raw_content': raw,
                'type': 'SY', 'params': [], 'text': text, 'errors': []
            })
            continue

        # c) Split on tabs or whitespace
        if '\t' in raw:
            parts = raw.split('\t')
            ctype = parts[0].strip().upper()
            raws  = [p.strip() for p in parts[1:]]
        else:
            parts = re.split(r'\s+', raw.strip(), maxsplit=1)
            ctype = parts[0].upper()
            raws  = re.split(r'[,\s]\s*', parts[1].strip()) if len(parts)>1 else []

        # d) CM/CE block comments
        if ctype in ('CM', 'CE'):
            text = raws[0] if raws else ''
            cards.append({
                'line_number': idx, 'raw_content': raw,
                'type': ctype, 'params': [], 'text': text, 'errors': []
            })
            continue

        # e) Strictly validate GW, GC, FR, RP, LD
        if ctype in CARD_SPECS:
            spec   = CARD_SPECS[ctype]
            params = []
            errors = []
            # evaluate each expected param
            for i, r in enumerate(raws):
                if i < len(spec):
                    _, ptype, _ = spec[i]
                    try:
                        val = safe_eval(r, sym_tab) if ptype in (int, float) else r
                        params.append(int(val) if ptype is int else (float(val) if ptype is float else val))
                    except Exception as e:
                        errors.append(f"Failed to eval '{r}': {e}")
                        params.append(r)
                else:
                    # extra raw param, just append
                    params.append(r)
            # check count
            min_req = len([p for p in spec if p[2]])
            max_req = len(spec)
            if not (min_req <= len(params) <= max_req):
                errors.append(f"Expected {min_req}-{max_req} params, got {len(params)}")
            cards.append({
                'line_number': idx,
                'raw_content': raw,
                'type':        ctype,
                'params':      params,
                'errors':      errors
            })
            continue

        # f) All other cards (EX, GN, GE, EK, EN, etc.): no validation
        cards.append({
            'line_number': idx,
            'raw_content': raw,
            'type':        ctype,
            'params':      raws,
            'errors':      []
        })

    return cards