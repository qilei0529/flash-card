import Dexie, { type Table } from "dexie"

interface AudioCache {
  key: string
  audioBlob: Blob
  createdAt: number
}

class AudioCacheDB extends Dexie {
  audioCache!: Table<AudioCache>

  constructor() {
    super("AudioCacheDB")
    this.version(1).stores({
      audioCache: "key, createdAt",
    })
  }
}

const audioDb = new AudioCacheDB()

/**
 * Generate cache key in format: Lang_word
 */
export function generateCacheKey(lang: string, word: string): string {
  const normalizedWord = word.toLowerCase().trim()
  return `${lang}_${normalizedWord}`
}

/**
 * Get cached audio blob
 */
export async function getCachedAudio(key: string): Promise<Blob | null> {
  try {
    const cached = await audioDb.audioCache.get(key)
    return cached?.audioBlob || null
  } catch (error) {
    console.error("Error getting cached audio:", error)
    return null
  }
}

/**
 * Store audio blob in cache
 */
export async function setCachedAudio(key: string, audioBlob: Blob): Promise<void> {
  try {
    await audioDb.audioCache.put({
      key,
      audioBlob,
      createdAt: Date.now(),
    })
  } catch (error) {
    console.error("Error caching audio:", error)
  }
}

/**
 * Get audio URL, checking cache first, then fetching from API if needed
 */
export async function getAudioUrl(
  text: string,
  lang: string,
  tag: string = "word"
): Promise<string> {
  const cacheKey = generateCacheKey(lang, text)

  // Check cache first
  const cachedBlob = await getCachedAudio(cacheKey)
  if (cachedBlob) {
    return URL.createObjectURL(cachedBlob)
  }

  // Fetch from API
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        lang,
        tag,
      }),
    })

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`)
    }

    const audioBlob = await response.blob()

    // Cache the audio
    await setCachedAudio(cacheKey, audioBlob)

    return URL.createObjectURL(audioBlob)
  } catch (error) {
    console.error("Error fetching audio:", error)
    throw error
  }
}

/**
 * Clean up old cache entries (optional utility)
 */
export async function cleanOldCache(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
  const cutoff = Date.now() - maxAge
  try {
    await audioDb.audioCache.where("createdAt").below(cutoff).delete()
  } catch (error) {
    console.error("Error cleaning cache:", error)
  }
}
