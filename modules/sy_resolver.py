# modules/sy_resolver.py
import re
import ast

# Matches lines that start with “SY ” (case-insensitive)
SY_RE = re.compile(r'^\s*SY\b', re.IGNORECASE)

def safe_eval(expr, vars_dict):
    """
    Safely evaluate a numeric expression using only literals and previously-defined vars.
    Supports: +, -, *, /, **, parentheses, numeric literals, and names from vars_dict.
    """
    node = ast.parse(expr, mode='eval').body

    def _eval(n):
        # Binary operations
        if isinstance(n, ast.BinOp):
            l = _eval(n.left)
            r = _eval(n.right)
            if isinstance(n.op, ast.Add):  return l + r
            if isinstance(n.op, ast.Sub):  return l - r
            if isinstance(n.op, ast.Mult): return l * r
            if isinstance(n.op, ast.Div):  return l / r
            if isinstance(n.op, ast.Pow):  return l ** r
            raise ValueError(f"Unsupported binary op {n.op}")

        # Unary +/-
        if isinstance(n, ast.UnaryOp):
            val = _eval(n.operand)
            if isinstance(n.op, ast.UAdd): return +val
            if isinstance(n.op, ast.USub): return -val
            raise ValueError(f"Unsupported unary op {n.op}")

        # Python 3.8+ literal node
        if isinstance(n, ast.Constant):
            if isinstance(n.value, (int, float)):
                return n.value
            raise ValueError(f"Unsupported constant type: {type(n.value).__name__}")

        # Fallback for older versions
        if hasattr(ast, 'Num') and isinstance(n, ast.Num):
            return n.n

        # Named symbol
        if isinstance(n, ast.Name):
            if n.id in vars_dict:
                return vars_dict[n.id]
            raise ValueError(f"Unknown symbol {n.id}")

        raise ValueError(f"Unsupported AST node: {n!r}")

    return _eval(node)

def resolve_sy(lines):
    """
    Given a list of NEC lines (strings), returns a new list where:
      - SY lines build a symbol table.
      - Subsequent lines have any SY-symbol occurrences replaced by their values.
    """
    vars_dict = {}
    symbol_pattern = None

    # First pass: build symbol table
    for line in lines:
        stripped = line.strip()
        if SY_RE.match(stripped):
            _, rest = stripped.split(None, 1)
            if '=' in rest:
                name, expr = [s.strip() for s in rest.split('=', 1)]
                try:
                    vars_dict[name] = safe_eval(expr, vars_dict)
                except Exception:
                    pass

    # Precompile a regex to replace all symbols
    if vars_dict:
        symbol_pattern = re.compile(r'\b(' + '|'.join(map(re.escape, vars_dict.keys())) + r')\b')

    # Second pass: substitute variables into all lines
    output = []
    for line in lines:
        if symbol_pattern:
            def repl(mo):
                return str(vars_dict[mo.group(1)])
            output.append(symbol_pattern.sub(repl, line.rstrip('\n')))
        else:
            output.append(line.rstrip('\n'))

    return output