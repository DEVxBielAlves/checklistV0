"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Camera, Maximize2, Minimize2, StopCircle } from 'lucide-react'

type CameraCaptureProps = {
  onCapture?: (blob: Blob) => void
  facingMode?: "environment" | "user"
  quality?: number
  aspectRatio?: number
  className?: string
  title?: string
  // Progresso por item (fotos tiradas vs mínimo exigido)
  takenCount?: number
  requiredCount?: number
}

export default function CameraCapture({
  onCapture = () => {},
  facingMode = "environment",
  quality = 0.9,
  aspectRatio = 4 / 3,
  className = "",
  title = "Câmera",
  takenCount = 0,
  requiredCount = 1,
}: CameraCaptureProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastUrl, setLastUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [overlayFS, setOverlayFS] = useState(false) // fallback iOS

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setActive(false)
  }, [])

  const startStream = useCallback(async () => {
    try {
      setError(null)
      setBusy(true)
      const constraints: MediaStreamConstraints = {
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: Math.round(1280 / aspectRatio) } },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
    } catch (e) {
      console.error(e)
      setError("Não foi possível acessar a câmera. Verifique permissões e se o dispositivo possui câmera.")
    } finally {
      setBusy(false)
    }
  }, [aspectRatio, facingMode])

  // Cleanup
  useEffect(() => {
    return () => {
      if (lastUrl) URL.revokeObjectURL(lastUrl)
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return
    try {
      const video = videoRef.current
      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) {
        setError("Câmera não está pronta. Tente novamente.")
        return
      }
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const img = new Image()
      img.crossOrigin = "anonymous"
      ctx.drawImage(video, 0, 0, w, h)
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality))
      if (!blob) {
        setError("Falha ao capturar imagem.")
        return
      }
      const url = URL.createObjectURL(blob)
      if (lastUrl) URL.revokeObjectURL(lastUrl)
      setLastUrl(url)
      onCapture(blob)
    } catch (e) {
      console.error(e)
      setError("Erro ao capturar a foto.")
    }
  }, [lastUrl, onCapture, quality])

  const hasMediaDevices = typeof navigator !== "undefined" && !!navigator.mediaDevices
  const supportsFullscreen = typeof document !== "undefined" && "fullscreenEnabled" in document

  async function enterFullscreen() {
    if (supportsFullscreen && containerRef.current && (document as any).fullscreenEnabled) {
      try {
        await (containerRef.current as any).requestFullscreen()
        setIsFullscreen(true)
      } catch {
        // fallback overlay
        setOverlayFS(true)
      }
    } else {
      setOverlayFS(true)
    }
  }

  async function exitFullscreen() {
    if (document && (document as any).fullscreenElement) {
      await (document as any).exitFullscreen()
    }
    setIsFullscreen(false)
    setOverlayFS(false)
  }

  // Progress computation
  const min = Math.max(requiredCount, 0)
  const current = Math.max(takenCount, 0)
  const pct = min === 0 ? 100 : Math.min(100, Math.round((current / min) * 100))
  const progressColor =
    min === 0 ? "bg-zinc-300" : current >= min ? "bg-emerald-500" : "bg-amber-500"

  const cameraView = (
    <div className="relative w-full aspect-[4/3]">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-contain bg-black"
        aria-label="Visualização da câmera"
      />
      {/* Top bar: progress and fullscreen */}
      <div className="absolute left-2 right-2 top-2 flex items-center justify-between gap-2">
        <div className="flex-1 rounded-full bg-white/50 backdrop-blur px-2 py-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span>{min === 0 ? "Foto opcional" : `Fotos: ${current}/${min}`}</span>
            <span className="ml-2">{pct}%</span>
          </div>
          <div className="mt-1 h-1 w-full rounded bg-white/70">
            <div className={`h-1 rounded ${progressColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-8 px-2" onClick={isFullscreen || overlayFS ? exitFullscreen : enterFullscreen}>
          {isFullscreen || overlayFS ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {!active && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
          <Button disabled={!hasMediaDevices || busy} onClick={startStream} className="bg-zinc-900">
            <Camera className="mr-2 h-4 w-4" />
            Ativar câmera
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Card ref={containerRef} className={className}>
      <CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium">{title}</div>
        </div>

        {!hasMediaDevices && (
          <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-800 text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>Seu navegador não suporta acesso à câmera.</span>
          </div>
        )}

        <div className="relative overflow-hidden rounded-md border bg-black">
          {cameraView}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button variant="outline" onClick={stopStream} disabled={!active}>
            <StopCircle className="mr-2 h-4 w-4" />
            Parar
          </Button>
          <Button onClick={capturePhoto} disabled={!active}>
            <Camera className="mr-2 h-4 w-4" />
            Capturar foto
          </Button>
        </div>

        {lastUrl && (
          <div className="mt-2">
            <div className="mb-1 text-[11px] text-zinc-500">Última captura</div>
            <img
              src={lastUrl || "/placeholder.svg?height=96&width=160&query=last-capture-preview"}
              alt="Pré-visualização da última foto capturada"
              className="h-24 w-full rounded-md object-cover"
              crossOrigin="anonymous"
            />
          </div>
        )}

        <p className="mt-2 text-[11px] text-zinc-500">
          Somente fotos da câmera são permitidas. Seleção de arquivos está desativada.
        </p>

        {/* Fullscreen fallback overlay */}
        {overlayFS && (
          <div className="fixed inset-0 z-50 bg-black">
            <div className="absolute inset-0">
              {cameraView}
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
              <Button variant="secondary" onClick={capturePhoto} className="flex-1">
                <Camera className="mr-2 h-4 w-4" /> Capturar
              </Button>
              <Button variant="outline" onClick={exitFullscreen}>
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
