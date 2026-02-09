# Flash Card SRS

A flash card app with spaced repetition for learning vocabulary. Built with Next.js and stores everything locally in your browser.

## Features

- Spaced repetition using FSRS algorithm
- Two card types: words and sentences
- Learning mode and test mode
- Text-to-speech for pronunciation (optional, needs Azure key)
- Import from CSV or Anki
- Review history tracking
- Dark mode
- Works offline

## Setup

```bash
pnpm install
pnpm dev
```

Open http://localhost:1234

For text-to-speech, add to `.env.local`:
```
AZURE_TTS_KEY = "your_azure_tts_key"
AZURE_TTS_REGION = "your_azure_tts_region"
```

## Usage

Create a deck, add cards manually or import from CSV, then start reviewing. The app schedules reviews automatically based on how well you know each card.

## Tech

- Next.js 16, React 19, TypeScript
- Dexie for IndexedDB storage
- ts-fsrs for spaced repetition
- Tailwind CSS for styling
