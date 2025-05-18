from flask import Flask, request, render_template
from werkzeug.utils import secure_filename

# Core modules
from modules.parser import parse_nec
from modules.sy_resolver import resolve_sy
from modules.converter import json_to_nec
from modules.fidelity import compare_nec
from modules.geometry import extract_geometry
from modules.simulation import simulate_impedance_sweep

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB
ALLOWED_EXTENSIONS = {'nec'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        file = request.files.get('file')
        if not file or file.filename == '' or not allowed_file(file.filename):
            return render_template('index.html', show_results=False, error='Please upload a valid .nec file')

        data = file.read().decode('utf-8')
        lines = data.splitlines()

        # 1. SY variable resolution
        resolved_lines = resolve_sy(lines)
        # 2. Parsing NEC → JSON (with validation errors)
        parsed_json, card_count = parse_nec(resolved_lines)
        errors = parsed_json.get('errors', [])
        # 3. JSON → NEC reconversion
        nec_lines = json_to_nec(parsed_json)
        reconv_text = '\n'.join(nec_lines)
        # 4. Fidelity scoring
        fidelity_scores = compare_nec(lines, nec_lines)
        # 5. Geometry stub
        geometry = extract_geometry(parsed_json)

        return render_template(
            'index.html',
            show_results=True,
            original_text=data,
            line_count=len(lines),
            card_count=card_count,
            errors=errors,
            json_data=parsed_json,
            reconv_text=reconv_text,
            fidelity_scores=fidelity_scores,
            geometry=geometry
        )

    return render_template('index.html', show_results=False)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5555)
