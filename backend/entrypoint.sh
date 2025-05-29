#!/bin/sh
set -e

# Run database migrations
flask db upgrade

# Populate the database (optional, if you want to fetch data on startup)
flask fetch-exa

# Start the Flask server
flask run --host=0.0.0.0 --port=5000 