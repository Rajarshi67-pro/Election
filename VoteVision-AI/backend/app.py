"""
VoteVision AI - Flask Application Entry Point
Main application factory and server startup.
"""

import os
import sys

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from backend.config import get_config
from backend.routes.prediction import prediction_bp
from backend.routes.data import data_bp
from backend.utils.helpers import load_json_file, load_csv_file


def create_app():
    """Application factory."""
    config = get_config()

    app = Flask(__name__,
                static_folder=os.path.join(project_root, 'frontend'),
                static_url_path='')

    # Load configuration
    app.config.from_object(config)

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": config.CORS_ORIGINS}})

    # Load dataset
    try:
        dataset = load_csv_file(config.DATASET_PATH)
        app.config['DATASET'] = dataset
        print(f"✓ Dataset loaded: {len(dataset)} records")
    except Exception as e:
        print(f"✗ Failed to load dataset: {e}")
        app.config['DATASET'] = None

    # Load candidate data (General)
    try:
        candidate_data = load_json_file(config.CANDIDATE_DATA_PATH)
        app.config['CANDIDATE_DATA'] = candidate_data
        print(f"✓ General candidate data loaded: {len(candidate_data.get('candidates', []))} candidates")
    except Exception as e:
        print(f"✗ Failed to load general candidate data: {e}")
        app.config['CANDIDATE_DATA'] = None

    # Load assembly dataset
    try:
        assembly_dataset = load_csv_file(config.ASSEMBLY_DATASET_PATH)
        app.config['ASSEMBLY_DATASET'] = assembly_dataset
        print(f"✓ Assembly dataset loaded: {len(assembly_dataset)} records")
    except Exception as e:
        print(f"✗ Failed to load assembly dataset: {e}")
        app.config['ASSEMBLY_DATASET'] = None

    # Load assembly candidate data
    try:
        assembly_candidate_data = load_json_file(config.ASSEMBLY_CANDIDATE_DATA_PATH)
        app.config['ASSEMBLY_CANDIDATE_DATA'] = assembly_candidate_data
        print(f"✓ Assembly candidate data loaded: {len(assembly_candidate_data.get('candidates', []))} candidates")
    except Exception as e:
        print(f"✗ Failed to load assembly candidate data: {e}")
        app.config['ASSEMBLY_CANDIDATE_DATA'] = None

    # Load ML model
    try:
        from backend.models.prediction_model import PredictionModel
        model = PredictionModel(
            model_path=config.MODEL_PATH,
            preprocessor_path=config.PREPROCESSOR_PATH,
            metadata_path=config.MODEL_METADATA_PATH
        )
        app.config['PREDICTION_MODEL'] = model
        print(f"✓ Prediction model loaded successfully")
    except Exception as e:
        print(f"✗ Failed to load prediction model: {e}")
        print("  Run 'python ml/train_model.py' to train the model first.")
        app.config['PREDICTION_MODEL'] = None

    # Register blueprints
    app.register_blueprint(prediction_bp, url_prefix='/api')
    app.register_blueprint(data_bp, url_prefix='/api')

    # Serve frontend
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

    # Health check
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'model_loaded': app.config.get('PREDICTION_MODEL') is not None,
            'general_dataset_loaded': app.config.get('DATASET') is not None,
            'general_candidates_loaded': app.config.get('CANDIDATE_DATA') is not None,
            'assembly_dataset_loaded': app.config.get('ASSEMBLY_DATASET') is not None,
            'assembly_candidates_loaded': app.config.get('ASSEMBLY_CANDIDATE_DATA') is not None
        })

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'success': False, 'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'success': False, 'error': 'Bad request'}), 400

    return app


if __name__ == '__main__':
    app = create_app()
    config = get_config()

    print(f"\n{'='*50}")
    print(f"  VoteVision AI - Election Prediction Platform")
    print(f"  Running on http://{config.HOST}:{config.PORT}")
    print(f"{'='*50}\n")

    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )
