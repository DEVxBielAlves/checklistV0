"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Camera, StopCircle } from 'lucide-react'

type CameraCaptureProps = {
  onCapture?: (blob: Blob) => void
  facingMode?: "environment" | "user"
  quality?: number // 0..1
  aspectRatio?: number // e.g., 4/3, 16/9
  className?: string
  title?: string
}

export default function CameraCapture({
  onCapture = () => {},
  facingMode = "environment",
  quality = 0.9,
  aspectRatio = 4 / 3,
  className = "",
  title = "Câmera",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastUrl, setLastUrl] = useState<string | null>(null)

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
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: Math.round(1280 / aspectRatio) },
        },
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
      setError(
        "Não foi possível acessar a câmera. Verifique as permissões do navegador e se o dispositivo possui câmera."
      )
    } finally {
      setBusy(false)
    }
  }, [aspectRatio, facingMode])

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
      // Evita CORS na exportação da imagem
      const img = new Image()
      img.crossOrigin = "anonymous"
      ctx.drawImage(video, 0, 0, w, h)
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
      )
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

  return (
    <Card className={className}>
      <CardContent className="p-3">
        <div className="mb-2 text-sm font-medium">{title}</div>

        {!hasMediaDevices && (
          <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-800 text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>Seu navegador não suporta acesso à câmera.</span>
          </div>
        )}

        <div className="relative overflow-hidden rounded-md border">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-56 w-full bg-black object-contain"
            aria-label="Visualização da câmera"
          />
          {!active && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
              <Button disabled={!hasMediaDevices || busy} onClick={startStream} className="bg-zinc-900">
                <Camera className="mr-2 h-4 w-4" />
                Ativar câmera
              </Button>
            </div>
          )}
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
            <div className="text-[11px] text-zinc-500 mb-1">Última captura</div>
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
      </CardContent>
    </Card>
  )
}
