import { createHash } from "node:crypto"

const speechSDK = require("microsoft-cognitiveservices-speech-sdk")

const SPEECH_KEY = process.env.AZURE_TTS_KEY ?? ""
const SPEECH_REGION = process.env.AZURE_TTS_REGION ?? "eastasia"

export function sha256(input: string) {
  const hash = createHash("sha256")
  hash.update(input)
  return hash.digest("hex")
}

const LangMap: { [key: string]: string } = {
  French: "fr-FR",
  English: "en-GB",
  German: "de-DE",
  Spanish: "es-ES",
  Japanese: "ja-JP",
  Chinese: "zh-CN",
  Thai: "th-TH",
}

export async function textToSpeech(
  text = "",
  params: { [key: string]: string }
) {
  if (!text.trim()) {
    throw new Error("text is empty")
  }

  try {
    const { lang, voiceName, tag } = params

    const voice = voiceName
    const hash = sha256(`${text}_${lang}_${voice}`)
    const key = `TTS_${tag}_${lang}_${voice}_${hash}`
    const isNeedCache = true

    const filename = ""
    const speechConfig = speechSDK.SpeechConfig.fromSubscription(
      SPEECH_KEY,
      SPEECH_REGION
    )
    speechConfig.speechSynthesisOutputFormat = 5 // mp3 is cheap
    speechConfig.speechSynthesisLanguage = LangMap[lang] ?? "fr-FR"
    speechConfig.speechSynthesisVoiceName = voice ?? "" //

    let audioConfig
    if (filename) {
      audioConfig = speechSDK.AudioConfig.fromAudioFileOutput(filename)
    }

    const synthesizer = new speechSDK.SpeechSynthesizer(
      speechConfig,
      audioConfig
    )

    const result: any = await new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (result: any) => {
          resolve(result)
        },
        (error: any) => {
          reject(error)
        }
      )
    })
    const { audioData } = result
    const buffer = Buffer.from(audioData)

    return {
      success: true,
      cache: false,
      buffer: buffer,
      hash: hash,
    }
  } catch (err) {
    return {
      success: false,
      err: JSON.stringify(err),
    }
  }
}
