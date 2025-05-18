import os
import statistics
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename

from modules.parser    import parse_nec_lines
from modules.converter import json_to_nec
from modules.geometry  import extract_geometry
from modules.fidelity  import compare_nec, extract_fidelity
from modules.simulation import simulate_impedance_sweep

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB

ALLOWED_EXTENSIONS = {'nec'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        uploaded = request.files.get('file')
        if not uploaded or uploaded.filename == '' or not allowed_file(uploaded.filename):
            return render_template('index.html', error="Invalid or no NEC file selected.")

        raw_text  = uploaded.read().decode('utf-8', errors='ignore')
        raw_lines = raw_text.splitlines()
        line_count = len(raw_lines)

        # Fully parse (SY and FR handled inside)
        cards = parse_nec_lines(raw_lines)
        card_count = len(cards)

        # Gather validation errors
        errors = []
        for c in cards:
            for e in c.get('errors', []):
                errors.append(f"Line {c['line_number']}: {e}")

        # JSON, reconvert, fidelity
        json_data     = {'cards': cards}
        reconv_lines  = json_to_nec(json_data)
        reconv_text   = '\n'.join(reconv_lines)
        reconv_cards  = parse_nec_lines(reconv_lines)
        fidelity_scores = compare_nec(cards, reconv_cards)
        # Compute mean & std dev of overall scores
        overall_vals = [s['overall_score'] for s in fidelity_scores]
        fidelity_mean = statistics.mean(overall_vals) if overall_vals else 0.0
        # use population stdev so single element gives 0.0
        fidelity_std  = statistics.pstdev(overall_vals) if overall_vals else 0.0
        
        # Geometry & feed-map
        geometry = extract_geometry(json_data)
        feed_map = extract_fidelity(json_data)

        return render_template('index.html',
            show_results    = True,
            original_text   = raw_text,
            line_count      = line_count,
            card_count      = card_count,
            errors          = errors,
            json_data       = json_data,
            reconv_text     = reconv_text,
            fidelity_scores = fidelity_scores,
            fidelity_mean   = fidelity_mean,
            fidelity_std    = fidelity_std,
            geometry        = geometry,
            fidelity        = feed_map
        )

    return render_template('index.html')

@app.route('/simulate', methods=['POST'])
def simulate_route():
    data = request.get_json() or {}
    nec_data = data.get('nec_data', '')
    try:
        results = simulate_impedance_sweep(nec_data.splitlines())
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5555)