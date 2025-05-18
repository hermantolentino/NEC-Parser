# modules/sy_resolver.py
import re
import ast

# Matches lines that start with “SY ” (case‐insensitive)
SY_RE = re.compile(r'^\s*SY\b', re.IGNORECASE)

def safe_eval(expr, vars_dict):
    """
    Safely evaluate a numeric expression using only literals and previously-defined vars.
    """
    node = ast.parse(expr, mode='eval').body

    def _eval(n):
        if isinstance(n, ast.BinOp):
            l = _eval(n.left)
            r = _eval(n.right)
            if isinstance(n.op, ast.Add):    return l + r
            if isinstance(n.op, ast.Sub):    return l - r
            if isinstance(n.op, ast.Mult):   return l * r
            if isinstance(n.op, ast.Div):    return l / r
            if isinstance(n.op, ast.Pow):    return l ** r
        elif isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.USub):
            return -_eval(n.operand)
        elif isinstance(n, ast.Num):
            return n.n
        elif isinstance(n, ast.Name):
            return vars_dict[n.id]
        else:
            raise ValueError(f"Unsupported node in SY expression: {n}")

    return _eval(node)

def resolve_sy(lines):
    """
    First pass: collect all SY variable definitions.
    Second pass: substitute their values into non‐SY, non‐comment lines,
    but keep the original SY lines in the output.
    """
    vars_dict = {}
    # 1) Collect SY definitions
    for raw in lines:
        m = SY_RE.match(raw)
        if m:
            # everything after 'SY ' is the expression
            expr = raw.strip()[3:].strip()
            try:
                vars_dict[expr.split('=')[0].strip()] = safe_eval(expr.split('=',1)[1].strip(), vars_dict)
            except Exception:
                # fallback to Python eval (restricted globals)
                key, val = expr.split('=',1)
                vars_dict[key.strip()] = eval(val, {}, vars_dict)

    output = []
    # Precompile var‐replacement regex
    if vars_dict:
        pattern = re.compile(r'\b(' + '|'.join(map(re.escape, vars_dict)) + r')\b')

    # 2) Build resolved lines, preserving SY lines
    for raw in lines:
        stripped = raw.rstrip('\r\n')
        if not stripped or stripped.startswith('*'):
            # skip pure comments
            continue

        if SY_RE.match(stripped):
            # keep SY lines verbatim
            output.append(stripped)
            continue

        # substitute variables
        if vars_dict:
            def repl(mo):
                return str(vars_dict[mo.group(1)])
            resolved = pattern.sub(repl, stripped)
        else:
            resolved = stripped

        output.append(resolved)

    return output