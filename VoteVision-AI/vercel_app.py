"""
Vercel Serverless Function Entry Point
"""
from backend.app import create_app

# Vercel looks for an object named 'app'
app = create_app()
