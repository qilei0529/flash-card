"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { Play, Loader2 } from "lucide-react"
import { getAudioUrl } from "@/lib/audioCache"

export interface PlayButtonHandle {
  play(): void
  stop(): void
}

interface PlayButtonProps {
  text: string
  lang: string
  tag?: string
  className?: string
}

export const PlayButton = forwardRef<PlayButtonHandle, PlayButtonProps>(function PlayButton(
  { text, lang, tag = "word", className = "" },
  ref
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  async function handlePlay() {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }

    // If we already have an audio URL, just play it
    if (audioUrlRef.current && audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = await getAudioUrl(text, lang, tag)
      audioUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
      }

      audio.onerror = () => {
        setError("Failed to play audio")
        setIsPlaying(false)
        setLoading(false)
      }

      await audio.play()
      setIsPlaying(true)
    } catch (err) {
      console.error("Error playing audio:", err)
      setError("Failed to load audio")
    } finally {
      setLoading(false)
    }
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation() // Prevent card click when clicking play button
    if (isPlaying) {
      handleStop()
    } else {
      handlePlay()
    }
  }

  useImperativeHandle(ref, () => ({
    play() {
      if (!isPlaying && !loading) handlePlay()
    },
    stop() {
      handleStop()
    },
  }), [isPlaying, loading])

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-full p-2 transition-colors ${
        loading
          ? "cursor-not-allowed opacity-50"
          : "bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
      } ${className}`}
      title={error || (isPlaying ? "Stop" : "Play pronunciation")}
      onMouseDown={(e) => {
        // Prevent card click when clicking play button
        e.stopPropagation()
      }}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
      ) : error ? (
        <span className="text-xs text-red-500">{error}</span>
      ) : (
        <Play
          className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${
            isPlaying ? "fill-current" : ""
          }`}
        />
      )}
    </button>
  )
})
