
This project is a Flask-based web application designed to parse, analyze, and simulate NEC (Numerical Electromagnetics Code) antenna definition files. It provides tools for file handling, data conversion, and simulation to aid in antenna design and analysis.

## Features

*   **NEC File Handling:**
    *   Upload and validate NEC files (with a size limit of 16MB).
    *   Parse NEC files into a JSON representation.
    *   Resolve symbolic variables within NEC files.
    *   Convert JSON representation back to NEC format.
    *   Assess fidelity between original and converted NEC files.
*   **Geometry Processing:**
    *   Extract geometric information from NEC file for visualization or analysis.
*   **Simulation:**
    *   Perform impedance sweep simulations and return results in JSON format.

## Getting Started

1.  **Prerequisites:** Python 3.x and Flask.
2.  **Installation:**
    ```bash
    pip install Flask
    ```
3.  **Running the Application:**
    ```bash
    python app.py
    ```
    Or, if you have Flask's command-line interface set up:
    ```bash
    flask run
    ```

## Usage

1.  Access the web application through your browser (default: `http://0.0.0.0:5555/`).
2.  Upload an NEC file using the provided form.
3.  View the parsing results, including any errors, the JSON representation, the reconverted NEC data, fidelity scores, and extracted geometry.
4.  Optionally, initiate an impedance sweep simulation.