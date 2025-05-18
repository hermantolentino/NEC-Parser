# modules/simulation.py

import numpy as np

def simulate_impedance_sweep(parsed_json, start_mhz=1.0, stop_mhz=30.0, points=301):
    """
    Stub: generates a linear-frequency sweep and mock complex impedance
    (purely resistive + j*0 for now) so you can plot a Smith chart.
    """
    freqs = np.linspace(start_mhz, stop_mhz, points).tolist()
    # For a real sim you'd invoke NEC2 or similar here.
    # We'll just return a flat 50Ω line as a placeholder.
    impedances = [{"r": 50.0, "x": 0.0} for _ in freqs]

    return {
        "frequencies_mhz": freqs,
        "impedances": impedances
    }