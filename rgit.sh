#!/bin/bash

# Quick git workflow script
# Usage: ./rgit.sh "Your commit message here"

if [ $# -eq 0 ]; then
    echo "Error: Please provide a commit message"
    echo "Usage: ./rgit.sh \"Your commit message here\""
    exit 1
fi

echo "Adding all changes..."
git add .

echo "Committing with message: $1"
git commit -m "$1"

echo "Pushing to origin main..."
git push origin main --force

echo "Done!" 