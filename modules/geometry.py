# modules/geometry.py
import re
import ast


def eval_expr(expr, sym_tab):
    """
    Evaluate a numeric expression string using only the provided symbols.
    Returns a float or raises.
    """
    e = str(expr).strip()
    # substitute known symbols
    for name, val in sym_tab.items():
        e = re.sub(rf'\b{name}\b', str(val), e)
    # safe eval: no builtins, only math operators
    try:
        return eval(e, {"__builtins__": None}, {})
    except Exception as ex:
        raise ValueError(f"Cannot evaluate '{expr}': {ex}")


def extract_geometry(parsed_json):
    """
    Walk through parsed NEC cards, resolve SY symbols, and collect all GW cards.
    Malformed entries are recorded in parsed_json['geometry_errors'].

    Returns list of dicts with keys:
      - tag (int)
      - segments (int)
      - start [x,y,z]
      - end   [x,y,z]
      - radius (float or None)
      - length (float)
    """
    geometry = []
    errors = []

    # 1) Build symbol table from SY cards
    sym_tab = {}
    for card in parsed_json.get('cards', []):
        if card.get('type', '').upper() == 'SY':
            raw = card.get('raw_content', '')
            try:
                # remove leading 'SY'
                _, expr = raw.split(None, 1)
                name, val_expr = expr.split('=', 1)
                name = name.strip()
                val = eval_expr(val_expr.strip(), sym_tab)
                sym_tab[name] = val
            except Exception as e:
                errors.append(f"SY parse error on line {card.get('line_number')}: {e}")

    # 2) Process GW cards
    for card in parsed_json.get('cards', []):
        if card.get('type', '').upper() != 'GW':
            continue
        params = card.get('params', [])
        if len(params) < 8:
            errors.append(f"GW insufficient params on line {card.get('line_number')}: {params}")
            continue
        try:
            tag = int(eval_expr(params[0], sym_tab))
            segs = int(eval_expr(params[1], sym_tab))
            start = [float(eval_expr(params[i], sym_tab)) for i in (2, 3, 4)]
            end   = [float(eval_expr(params[i], sym_tab)) for i in (5, 6, 7)]
            radius = float(eval_expr(params[8], sym_tab)) if len(params) > 8 else None
        except Exception as e:
            errors.append(f"GW parse error on line {card.get('line_number')}, params {params}: {e}")
            continue

        # compute length
        dx, dy, dz = [end[i] - start[i] for i in range(3)]
        length = (dx*dx + dy*dy + dz*dz) ** 0.5

        geometry.append({
            'tag': tag,
            'segments': segs,
            'start': start,
            'end': end,
            'radius': radius,
            'length': length
        })

    parsed_json['geometry_errors'] = errors
    return geometry
