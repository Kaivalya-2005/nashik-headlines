#!/usr/bin/env bash

# Nashik Headlines AI Newsroom Engine
# This script ensures we run inside the virtual environment.

# 1. Check if the virtual environment exists
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "Virtual environment not found! Please create one and install requirements.txt"
    exit 1
fi

# 2. Activate the correct virtual environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# 3. Pass all arguments to run_agents.py
echo "Starting AI Newsroom Engine in Virtual Environment..."
python run_agents.py "$@"
