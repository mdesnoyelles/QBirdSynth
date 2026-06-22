# 🎹 QBirdSynth — Modern 80s Synthesizer

A complete modern reimagining of QiBrd — zero Csound dependency.

## Quick Start (Web)
\`\`\`bash
cd /app/data/qbirdsynth/web
python3 -m http.server 8080
# Open http://localhost:8080 in a browser
\`\`\`

## Features (vs Original QiBrd)
| Feature | QiBrd | QBirdSynth |
|---------|-------|-----------|
| Language | Java | Kotlin / ES6 |
| Audio | Csound 6 (60MB APK) | Pure Kotlin/WebAudio (3MB) |
| Oscillators | Single voice | **1-8 stacked** (supersaw) |
| Sub oscillator | ❌ | ✅ |
| Effects | Basic | **Reverb + Delay + Compressor** |
| Sequencer | ❌ | ✅ **16-step, 6-track** |
| XY Pad | ❌ | ✅ Filter × LFO |
| Waveform | ❌ | ✅ Real-time oscilloscope |
| Browser | ❌ | ✅ Zero-install |
| Recording | Separate APK | Built-in |
| Design | Material Light | **80s Retro Dark** |

## Design Palette
- **Purple**: #7B1FA2 (primary), #CE93D8 (glow), #4A148C (deep)
- **Orange**: #FF6D00 (accent), #FFAB40 (glow), #BF360C (deep)
- **Grey**: #1E1E1E (surface), #333 (panels), #B0B0B0 (text)
- **Black**: #0A0A0A (background)

## Presets
Neon Dreams · Retro Lead · Thunder Bass · Electric Dusk · Pixel Stab ·
Vapor Trail · Circuit Break · Midnight Chase · QBirdSynth Init

## Controls
- **Mouse/Touch**: Click keyboard keys, drag sliders, use XY pad
- **Computer keyboard**: A=C, W=C#, S=D, E=D#, D=E, F=F, T=F#, G=G, Y=G#, H=A, U=A#, J=B, K=C5
- **MIDI**: Connect any MIDI controller (Web MIDI API)
- **Recording**: Click red record button, exports .webm file
