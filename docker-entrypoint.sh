#!/bin/sh
# QBirdSynth Docker Entrypoint
echo "=========================================="
echo "  QBirdSynth - 80s Retro Synthesizer"
echo "  http://localhost:8080"
echo "=========================================="
exec nginx -g 'daemon off;'
