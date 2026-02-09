# Flash Card SRS

A flash card app with spaced repetition for learning vocabulary. Built with Next.js and stores everything locally in your browser.

## Features

- **Spaced repetition** — FSRS algorithm for review scheduling
- **Card types** — words and sentences
- **Modes** — learning and test
- **Import** — Paste words only and the AI agent will fetch rest (requires API key); or import from CSV / Anki
- **Text-to-speech** — optional, via Azure (requires API key)
- Review history, works offline

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

For agent add to `.env.local`:
```
OPENAI_API_KEY = "your_openai_api_key"
OPENAI_BASE_URL = "https://api.openai.com/v1"
```

## Usage

Create a deck, add cards manually or import from CSV, then start reviewing. The app schedules reviews automatically based on how well you know each card.

## Tech

- Next.js 16, React 19, TypeScript
- Dexie for IndexedDB storage
- ts-fsrs for spaced repetition
- Tailwind CSS for styling
