#!/bin/bash
echo "BUILD START"
# Install dependencies
python3 -m pip install -r requirements.txt
# Install python-dotenv
python3 -m pip install 'python-dotenv>=1.0.1,<2.0.0'
# Install secretvaults
python3 -m pip install 'secretvaults'
# Run tests
#python3 -m pytest
echo "BUILD END"
