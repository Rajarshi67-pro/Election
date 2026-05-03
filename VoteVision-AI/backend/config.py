"""
VoteVision AI - Backend Configuration
"""

import os

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'votevision-ai-secret-key-2024')
    DEBUG = False
    TESTING = False

    # Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    ML_DIR = os.path.join(BASE_DIR, 'ml')

    # Data files — General Election (2024 Lok Sabha)
    DATASET_PATH = os.path.join(DATA_DIR, 'cleaned_dataset.csv')
    CANDIDATE_DATA_PATH = os.path.join(DATA_DIR, 'sample_candidate_data.json')

    # Data files — Assembly Elections (2026 Vidhan Sabha)
    ASSEMBLY_DATASET_PATH = os.path.join(DATA_DIR, 'assembly_dataset.csv')
    ASSEMBLY_CANDIDATE_DATA_PATH = os.path.join(DATA_DIR, 'assembly_candidate_data.json')

    # Model files
    MODEL_PATH = os.path.join(ML_DIR, 'saved_model.pkl')
    PREPROCESSOR_PATH = os.path.join(ML_DIR, 'preprocessor.pkl')
    MODEL_METADATA_PATH = os.path.join(ML_DIR, 'model_metadata.json')

    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')

    # API
    API_PREFIX = '/api'

    # Server
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment variable."""
    env = os.environ.get('FLASK_ENV', 'development')
    return config_by_name.get(env, config_by_name['default'])
