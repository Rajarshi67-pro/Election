"""
VoteVision AI - Flask Application Factory & Server Entry Point
Initializes security middleware, loads ML models, mounts dataset caches, and registers API blueprints.
"""

import os
import sys

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS

from backend.config import get_config
from backend.routes.prediction import prediction_bp
from backend.routes.data import data_bp
from backend.utils.helpers import load_json_file, load_csv_file, find_available_port


def create_app(config_name=None):
    """Application factory for VoteVision AI."""
    config = get_config(config_name)

    app = Flask(
        __name__,
        static_folder=os.path.join(project_root, 'frontend'),
        static_url_path=''
    )

    # Load configuration
    app.config.from_object(config)

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": config.CORS_ORIGINS}})

    # Security Headers Middleware
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' *;"
        )
        return response

    # 1. Load General Election Dataset
    try:
        dataset = load_csv_file(config.DATASET_PATH)
        app.config['DATASET'] = dataset
        print(f"✓ General election dataset loaded: {len(dataset)} records")
    except Exception as e:
        print(f"✗ Failed to load general dataset: {e}")
        app.config['DATASET'] = None

    # 2. Load General Candidate Data
    try:
        candidate_data = load_json_file(config.CANDIDATE_DATA_PATH)
        app.config['CANDIDATE_DATA'] = candidate_data
        print(f"✓ General candidate profiles loaded: {len(candidate_data.get('candidates', []))} candidates")
    except Exception as e:
        print(f"✗ Failed to load general candidate data: {e}")
        app.config['CANDIDATE_DATA'] = None

    # 3. Load Assembly Election Dataset
    try:
        assembly_dataset = load_csv_file(config.ASSEMBLY_DATASET_PATH)
        app.config['ASSEMBLY_DATASET'] = assembly_dataset
        print(f"✓ Assembly election dataset loaded: {len(assembly_dataset)} records")
    except Exception as e:
        print(f"✗ Failed to load assembly dataset: {e}")
        app.config['ASSEMBLY_DATASET'] = None

    # 4. Load Assembly Candidate Data
    try:
        assembly_candidate_data = load_json_file(config.ASSEMBLY_CANDIDATE_DATA_PATH)
        app.config['ASSEMBLY_CANDIDATE_DATA'] = assembly_candidate_data
        print(f"✓ Assembly candidate profiles loaded: {len(assembly_candidate_data.get('candidates', []))} candidates")
    except Exception as e:
        print(f"✗ Failed to load assembly candidate data: {e}")
        app.config['ASSEMBLY_CANDIDATE_DATA'] = None

    # 5. Load Prediction Model
    try:
        from backend.models.prediction_model import PredictionModel
        model = PredictionModel(
            model_path=config.MODEL_PATH,
            preprocessor_path=config.PREPROCESSOR_PATH,
            metadata_path=config.MODEL_METADATA_PATH
        )
        app.config['PREDICTION_MODEL'] = model
        print("✓ Election prediction model and preprocessor loaded successfully")
    except Exception as e:
        print(f"✗ Prediction model initialization error: {e}")
        print("  Notice: Run 'python -m ml.train_model' to train and save the model.")
        app.config['PREDICTION_MODEL'] = None

    # Register API Blueprints
    app.register_blueprint(prediction_bp, url_prefix='/api')
    app.register_blueprint(data_bp, url_prefix='/api')

    # Frontend Page Routes
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/dashboard')
    @app.route('/dashboard.html')
    def serve_dashboard():
        return send_from_directory(app.static_folder, 'dashboard.html')

    @app.route('/constituency')
    @app.route('/constituency.html')
    def serve_constituency():
        return send_from_directory(app.static_folder, 'constituency.html')

    @app.route('/candidates')
    @app.route('/candidates.html')
    def serve_candidates():
        return send_from_directory(app.static_folder, 'candidates.html')

    # Health Check API
    @app.route('/api/health')
    def health_check():
        model_ready = app.config.get('PREDICTION_MODEL') is not None
        gen_dataset = app.config.get('DATASET')
        asm_dataset = app.config.get('ASSEMBLY_DATASET')

        status_str = 'healthy' if (model_ready and gen_dataset is not None) else 'degraded'

        return jsonify({
            'status': status_str,
            'version': '2.0.0',
            'model_loaded': model_ready,
            'general_records': len(gen_dataset) if gen_dataset is not None else 0,
            'assembly_records': len(asm_dataset) if asm_dataset is not None else 0,
            'general_candidates_loaded': app.config.get('CANDIDATE_DATA') is not None,
            'assembly_candidates_loaded': app.config.get('ASSEMBLY_CANDIDATE_DATA') is not None
        }), 200 if status_str == 'healthy' else 503

    # Error Handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND',
                'message': 'The requested resource or endpoint was not found'
            }
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'METHOD_NOT_ALLOWED',
                'message': f'HTTP method {request.method} is not allowed for this endpoint'
            }
        }), 405

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'BAD_REQUEST',
                'message': str(error) if error else 'Invalid request parameters'
            }
        }), 400

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            'success': False,
            'error': {
                'code': 'INTERNAL_SERVER_ERROR',
                'message': 'An internal error occurred processing your request'
            }
        }), 500

    return app


if __name__ == '__main__':
    app = create_app()
    config = get_config()

    # Automatically find an open port starting from config.PORT
    actual_port = find_available_port(config.HOST, config.PORT)

    print(f"\n{'='*60}")
    print("  VoteVision AI – Election Forecasting & Intelligence")
    print(f"  Web Application Running at: http://127.0.0.1:{actual_port}")
    print(f"{'='*60}\n")

    app.run(
        host=config.HOST,
        port=actual_port,
        debug=config.DEBUG,
        use_reloader=False
    )
