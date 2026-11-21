"use client"

import { Component, type ReactNode } from "react"

type Props = { children: ReactNode; fallback?: ReactNode; onError?: (error: unknown) => void }

export class SceneErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn("[rosa] scena 3D:", error instanceof Error ? error.message : error)
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
