import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

interface QubitState {
  alpha: { real: number; imag: number }
  beta: { real: number; imag: number }
}

interface BlochSphereViewerProps {
  state: QubitState
  showAxes?: boolean
  showLabels?: boolean
  animate?: boolean
  size?: number
  className?: string
}

export function BlochSphereViewer({
  state,
  showAxes = true,
  showLabels = true,
  animate = true,
  size = 300,
  className,
}: BlochSphereViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const stateVectorRef = useRef<THREE.ArrowHelper | null>(null)
  const animationRef = useRef<number>(0)

  const blochCoords = stateToBlochCoordinates(state)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(3, 2, 3)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(size, size)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32)
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    scene.add(sphere)

    if (showAxes) {
      const axisLength = 1.5
      const axisColors = {
        x: 0xef4444,
        y: 0x22c55e,
        z: 0x3b82f6,
      }

      const createAxis = (dir: THREE.Vector3, color: number) => {
        const material = new THREE.LineBasicMaterial({ color })
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          dir.clone().multiplyScalar(axisLength),
        ])
        return new THREE.Line(geometry, material)
      }

      scene.add(createAxis(new THREE.Vector3(1, 0, 0), axisColors.x))
      scene.add(createAxis(new THREE.Vector3(-1, 0, 0), axisColors.x))
      scene.add(createAxis(new THREE.Vector3(0, 1, 0), axisColors.y))
      scene.add(createAxis(new THREE.Vector3(0, -1, 0), axisColors.y))
      scene.add(createAxis(new THREE.Vector3(0, 0, 1), axisColors.z))
      scene.add(createAxis(new THREE.Vector3(0, 0, -1), axisColors.z))
    }

    const addLabel = (text: string, position: THREE.Vector3, color: string) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = 64
      canvas.height = 64
      ctx.fillStyle = color
      ctx.font = 'bold 32px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 32, 32)

      const texture = new THREE.CanvasTexture(canvas)
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
      const sprite = new THREE.Sprite(spriteMaterial)
      sprite.scale.set(0.3, 0.3, 1)
      sprite.position.copy(position)
      return sprite
    }

    if (showLabels) {
      scene.add(addLabel('|0⟩', new THREE.Vector3(0, 1.7, 0), '#3b82f6'))
      scene.add(addLabel('|1⟩', new THREE.Vector3(0, -1.7, 0), '#3b82f6'))
      scene.add(addLabel('|+⟩', new THREE.Vector3(1.7, 0, 0), '#ef4444'))
      scene.add(addLabel('|-⟩', new THREE.Vector3(-1.7, 0, 0), '#ef4444'))
      scene.add(addLabel('|i⟩', new THREE.Vector3(0, 0, 1.7), '#22c55e'))
      scene.add(addLabel('|-i⟩', new THREE.Vector3(0, 0, -1.7), '#22c55e'))
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 1)
    pointLight.position.set(5, 5, 5)
    scene.add(pointLight)

    return () => {
      cancelAnimationFrame(animationRef.current)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [size, showAxes, showLabels])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (stateVectorRef.current) {
      scene.remove(stateVectorRef.current)
    }

    const direction = new THREE.Vector3(
      blochCoords.x,
      blochCoords.z,
      blochCoords.y
    ).normalize()

    const arrow = new THREE.ArrowHelper(
      direction,
      new THREE.Vector3(0, 0, 0),
      1,
      0xfbbf24,
      0.15,
      0.1
    )
    scene.add(arrow)
    stateVectorRef.current = arrow

    const pointGeometry = new THREE.SphereGeometry(0.08, 16, 16)
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    const point = new THREE.Mesh(pointGeometry, pointMaterial)
    point.position.set(blochCoords.x, blochCoords.z, blochCoords.y)

  }, [blochCoords])

  useEffect(() => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!renderer || !scene || !camera) return

    let angle = 0

    const renderLoop = () => {
      animationRef.current = requestAnimationFrame(renderLoop)

      if (animate) {
        angle += 0.005
        camera.position.x = 3 * Math.cos(angle)
        camera.position.z = 3 * Math.sin(angle)
        camera.lookAt(0, 0, 0)
      }

      renderer.render(scene, camera)
    }

    renderLoop()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [animate])

  return (
    <div
      ref={containerRef}
      className={cn('rounded-lg overflow-hidden', className)}
      style={{ width: size, height: size }}
    />
  )
}

function stateToBlochCoordinates(state: QubitState) {
  const { alpha, beta } = state

  const alphaAbs = Math.sqrt(alpha.real ** 2 + alpha.imag ** 2)
  const betaAbs = Math.sqrt(beta.real ** 2 + beta.imag ** 2)

  let theta = 2 * Math.acos(Math.min(1, alphaAbs))

  let phi = 0
  if (betaAbs > 1e-10 && alphaAbs > 1e-10) {
    const relPhase = Math.atan2(beta.imag, beta.real) - Math.atan2(alpha.imag, alpha.real)
    phi = relPhase
  }

  return {
    x: Math.sin(theta) * Math.cos(phi),
    y: Math.sin(theta) * Math.sin(phi),
    z: Math.cos(theta),
    theta,
    phi,
  }
}

export default BlochSphereViewer
