import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { SongDTO } from '../api/types'

interface PlayerContextValue {
  queue: SongDTO[]
  index: number
  current: SongDTO | null
  playing: boolean
  time: number
  duration: number
  volume: number
  muted: boolean
  error: string | null
  /** Toca a lista a partir de startIndex (músicas indisponíveis são puladas). */
  playList: (songs: SongDTO[], startIndex?: number) => void
  enqueue: (song: SongDTO) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  /** Atualiza dados de uma música na fila (ex.: favorito) sem interromper a reprodução. */
  patchSong: (song: SongDTO) => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

const VOLUME_KEY = 'musicStreaming.volume'

function storedVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY))
    return Number.isFinite(v) && v >= 0 && v <= 1 && localStorage.getItem(VOLUME_KEY) !== null ? v : 0.8
  } catch {
    return 0.8
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  // um único <audio> para o app inteiro, criado na primeira vez que for usado
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const getAudio = useCallback((): HTMLAudioElement | null => {
    if (!audioRef.current && typeof Audio !== 'undefined') {
      audioRef.current = new Audio()
      audioRef.current.preload = 'metadata'
    }
    return audioRef.current
  }, [])
  const [queue, setQueue] = useState<SongDTO[]>([])
  const [index, setIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(storedVolume)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = index >= 0 && index < queue.length ? queue[index] : null
  const currentId = current?.id ?? null

  // refs com o estado mais recente, para callbacks de eventos estáveis
  const currentIdRef = useRef<number | null>(null)
  const indexRef = useRef(index)
  const queueLengthRef = useRef(queue.length)
  useLayoutEffect(() => {
    currentIdRef.current = currentId
    indexRef.current = index
    queueLengthRef.current = queue.length
  })

  // troca de faixa
  useEffect(() => {
    const audio = getAudio()
    if (!audio) return
    if (currentId == null) {
      audio.pause()
      audio.removeAttribute('src')
      return
    }
    audio.src = api.songs.streamUrl(currentId)
    setTime(0)
    setDuration(0)
    setError(null)
    audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    )
  }, [currentId, getAudio])

  useEffect(() => {
    const audio = getAudio()
    if (audio) {
      audio.volume = volume
      audio.muted = muted
    }
  }, [getAudio, volume, muted])

  const next = useCallback(() => {
    if (indexRef.current + 1 < queueLengthRef.current) setIndex(indexRef.current + 1)
  }, [])

  const prev = useCallback(() => {
    const audio = getAudio()
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    setIndex((i) => (i > 0 ? i - 1 : i))
  }, [getAudio])

  // eventos do <audio>
  useEffect(() => {
    const audio = getAudio()
    if (!audio) return
    const onTime = () => setTime(audio.currentTime)
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => {
      if (audio.getAttribute('src')) {
        setError('Não foi possível tocar esta música.')
        setPlaying(false)
      }
    }
    const onEnded = () => {
      if (indexRef.current + 1 < queueLengthRef.current) setIndex(indexRef.current + 1)
      else setPlaying(false)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
    }
  }, [getAudio])

  const playList = useCallback((songs: SongDTO[], startIndex = 0) => {
    const start = songs[startIndex]
    const playable = songs.filter((s) => s.available)
    if (!playable.length) return
    const newIndex = start && start.available ? playable.indexOf(start) : 0
    setQueue(playable)
    setIndex(newIndex)
    // mesma música que já estava tocando: o efeito de troca não dispara, então reinicia aqui
    const audio = getAudio()
    if (audio && playable[newIndex].id === currentIdRef.current) {
      audio.currentTime = 0
      void audio.play().catch(() => setPlaying(false))
    }
  }, [getAudio])

  const enqueue = useCallback((song: SongDTO) => {
    if (!song.available) return
    setQueue((q) => [...q, song])
    setIndex((i) => (i < 0 ? 0 : i))
  }, [])

  const toggle = useCallback(() => {
    const audio = getAudio()
    if (!audio || currentIdRef.current == null) return
    if (audio.paused) void audio.play().catch(() => setPlaying(false))
    else audio.pause()
  }, [getAudio])

  const seek = useCallback((seconds: number) => {
    const audio = getAudio()
    if (audio && Number.isFinite(seconds)) {
      audio.currentTime = seconds
      setTime(seconds)
    }
  }, [getAudio])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v))
    setVolumeState(clamped)
    setMuted(false)
    try {
      localStorage.setItem(VOLUME_KEY, String(clamped))
    } catch {
      // ignora
    }
  }, [])

  const toggleMute = useCallback(() => setMuted((m) => !m), [])

  const patchSong = useCallback((song: SongDTO) => {
    setQueue((q) => (q.some((s) => s.id === song.id) ? q.map((s) => (s.id === song.id ? song : s)) : q))
  }, [])

  // Media Session: controles do sistema/tela de bloqueio
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist ?? '',
      album: current.album ?? '',
    })
    navigator.mediaSession.setActionHandler('play', toggle)
    navigator.mediaSession.setActionHandler('pause', toggle)
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', prev)
  }, [current, toggle, next, prev])

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      index,
      current,
      playing,
      time,
      duration: duration || current?.durationSec || 0,
      volume,
      muted,
      error,
      playList,
      enqueue,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      patchSong,
    }),
    [queue, index, current, playing, time, duration, volume, muted, error, playList, enqueue, toggle, next, prev, seek, setVolume, toggleMute, patchSong],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer fora do PlayerProvider')
  return ctx
}
