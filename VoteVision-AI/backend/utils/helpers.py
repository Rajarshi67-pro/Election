"""
VoteVision AI - Utility Helpers
Common utility functions used across the backend.
"""

import json
import os
import socket
import pandas as pd


def load_json_file(filepath):
    """Load and parse a JSON file."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"JSON file not found: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_csv_file(filepath):
    """Load a CSV file into a pandas DataFrame."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"CSV file not found: {filepath}")

    return pd.read_csv(filepath)


def find_available_port(host='0.0.0.0', start_port=5001, max_tries=50):
    """
    Check if a port is available, or find the next available port.
    Tests binding directly on the target host to avoid collisions.
    """
    target_host = host if host else '0.0.0.0'
    for p in range(start_port, start_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((target_host, p))
                return p
            except OSError:
                continue
    return start_port


def validate_prediction_input(data):
    """
    Validate the input data for a prediction request.

    Returns:
        tuple: (is_valid, error_message)
    """
    required_fields = ['constituency', 'state']

    for field in required_fields:
        if field not in data or not data[field]:
            return False, f"Missing required field: {field}"

    # Validate swing_adjustment if present
    if 'swing_adjustment' in data:
        try:
            swing = float(data['swing_adjustment'])
            if swing < -20 or swing > 20:
                return False, "swing_adjustment must be between -20 and 20"
        except (ValueError, TypeError):
            return False, "swing_adjustment must be a number"

    return True, None


def format_percentage(value):
    """Format a value as a percentage string."""
    return f"{value:.1f}%"


def safe_float(value, default=0.0):
    """Safely convert a value to float."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value, default=0):
    """Safely convert a value to int."""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default
