import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { Project } from '../store/portfolioStore'
import styles from './ThreeProjectPreview.module.css'

interface ThreeProjectPreviewProps {
  projects: Project[]
  runningStatus: { [key: string]: boolean }
  projectPorts: { [key: string]: number | null }
  onProjectClick: (project: Project) => void
}

export default function ThreeProjectPreview({
  projects,
  runningStatus,
  projectPorts,
  onProjectClick
}: ThreeProjectPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const screenGroupRef = useRef<THREE.Group>()
  const [isAnimating, setIsAnimating] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>()
  const mouseRef = useRef(new THREE.Vector2())
  
  // Camera controls state
  const [cameraDistance, setCameraDistance] = useState(12)
  const [cameraRotation, setCameraRotation] = useState({ x: 0.15, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Update camera position function
  const updateCameraPosition = () => {
    if (!cameraRef.current) return
    
    const x = Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x) * cameraDistance
    const y = Math.sin(cameraRotation.x) * cameraDistance
    const z = Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x) * cameraDistance
    
    cameraRef.current.position.set(x, y, z)
    cameraRef.current.lookAt(0, 0, 0)
  }

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    // Camera setup - Interactive camera with controls
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    cameraRef.current = camera
    
    // Initial camera position
    updateCameraPosition()

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Raycaster for mouse interaction
    raycasterRef.current = new THREE.Raycaster()

    // Minimal lighting for better screen visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4) // Neutral white ambient
    scene.add(ambientLight)

    // Remove directional and point lights that were causing reflections
    // Screens use MeshBasicMaterial so they don't need complex lighting

    // Screen group
    const screenGroup = new THREE.Group()
    scene.add(screenGroup)
    screenGroupRef.current = screenGroup

    // Create screens for projects (will be updated via useEffect when data loads)
    if (projects.length > 0) {
      createScreens()
    }

    // Animation loop with floating effects
    const animate = () => {
      requestAnimationFrame(animate)
      
      const time = Date.now() * 0.001
      
      // Animate individual floating displays instead of rotating the group
      if (isAnimating && screenGroupRef.current && screenGroupRef.current.children.length > 0) {
        screenGroupRef.current.children.forEach((child, index) => {
          if (child.userData.isScreen) {
            // Gentle floating motion
            child.position.y = child.userData.baseY + Math.sin(time + index * 0.5) * 0.2
            // Subtle rotation
            child.rotation.y = Math.sin(time * 0.3 + index) * 0.05
          }
        })
      }

      // Update camera position in animation loop
      updateCameraPosition()
      
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return
      
      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current) return
      
      const rect = mountRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Handle camera rotation while dragging
      if (isDragging) {
        const deltaX = event.clientX - lastMousePos.x
        const deltaY = event.clientY - lastMousePos.y
        
        setCameraRotation(prev => ({
          x: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev.x - deltaY * 0.01)),
          y: prev.y + deltaX * 0.01
        }))
        
        setLastMousePos({ x: event.clientX, y: event.clientY })
      }
    }
    
    const handleMouseDown = (event: MouseEvent) => {
      setIsDragging(true)
      setLastMousePos({ x: event.clientX, y: event.clientY })
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const zoomSpeed = 0.5
      const newDistance = Math.max(5, Math.min(30, cameraDistance + event.deltaY * zoomSpeed * 0.01))
      setCameraDistance(newDistance)
    }

    const handleClick = (event: MouseEvent) => {
      // Don't trigger click if we were dragging
      if (isDragging) return
      
      if (!raycasterRef.current || !cameraRef.current || !screenGroupRef.current) return
      
      const rect = mountRef.current!.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
      const intersects = raycasterRef.current.intersectObjects(screenGroupRef.current.children, true)
      
      if (intersects.length > 0) {
        const clickedObject = intersects[0].object
        const projectId = clickedObject.userData.projectId
        const project = projects.find(p => p.id === projectId)
        if (project) {
          setSelectedProject(project)
          onProjectClick(project)
        }
      }
    }

    mountRef.current.addEventListener('mousemove', handleMouseMove)
    mountRef.current.addEventListener('mousedown', handleMouseDown)
    mountRef.current.addEventListener('mouseup', handleMouseUp)
    mountRef.current.addEventListener('click', handleClick)
    mountRef.current.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('resize', handleResize)
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousemove', handleMouseMove)
        mountRef.current.removeEventListener('mousedown', handleMouseDown)
        mountRef.current.removeEventListener('mouseup', handleMouseUp)
        mountRef.current.removeEventListener('click', handleClick)
        mountRef.current.removeEventListener('wheel', handleWheel)
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  const createScreens = () => {
    if (!screenGroupRef.current) return

    // Clear existing screens
    while (screenGroupRef.current.children.length > 0) {
      screenGroupRef.current.remove(screenGroupRef.current.children[0])
    }

    // Create floating grid layout
    const cols = Math.ceil(Math.sqrt(projects.length))
    const rows = Math.ceil(projects.length / cols)
    const spacing = 4
    
    projects.forEach((project, index) => {
      console.log(`Creating screen for project ${index}: ${project.title}`)
      
      // Grid positioning
      const col = index % cols
      const row = Math.floor(index / cols)
      
      // Center the grid
      const x = (col - (cols - 1) / 2) * spacing
      const z = (row - (rows - 1) / 2) * spacing
      const baseY = Math.random() * 2 - 1 // Random height variation

      // Screen geometry
      const screenGeometry = new THREE.PlaneGeometry(2.5, 1.8)
      
      // Create canvas for project preview
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 384
      const ctx = canvas.getContext('2d')!
      
      // Draw project preview with maximum contrast
      ctx.fillStyle = '#000000' // Pure black background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Add very subtle background for contrast
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, '#111111')
      gradient.addColorStop(1, '#000000')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Title - bright white for visibility
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px Arial'
      ctx.textAlign = 'center'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 4
      ctx.fillText(project.title, canvas.width / 2, 60)
      ctx.shadowBlur = 0
      
      // Status indicator
      const isRunning = runningStatus[project.id]
      const port = projectPorts[project.id]
      
      ctx.fillStyle = isRunning ? '#00ff88' : '#ff6666' // Brighter status colors
      ctx.font = 'bold 18px Arial'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 2
      ctx.fillText(
        isRunning ? `Running :${port}` : 'Stopped',
        canvas.width / 2, 90
      )
      ctx.shadowBlur = 0
      
      // Description - bright white with shadow
      ctx.fillStyle = '#ffffff'
      ctx.font = '16px Arial'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 1
      
      const words = project.description.split(' ')
      let line = ''
      let y = 130
      
      words.forEach((word, i) => {
        const testLine = line + word + ' '
        const metrics = ctx.measureText(testLine)
        
        if (metrics.width > canvas.width - 60 && i > 0) {
          ctx.fillText(line, canvas.width / 2, y)
          line = word + ' '
          y += 22
        } else {
          line = testLine
        }
      })
      ctx.fillText(line, canvas.width / 2, y)
      ctx.shadowBlur = 0
      
      // Tech stack - cyan for variety
      ctx.fillStyle = '#00dddd'
      ctx.font = 'bold 14px Arial'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 2
      const techText = project.tech.slice(0, 3).join(' • ')
      ctx.fillText(techText, canvas.width / 2, y + 50)
      ctx.shadowBlur = 0
      
      // Border effect - thicker and more visible
      ctx.strokeStyle = isRunning ? '#00ff88' : '#666666'
      ctx.lineWidth = 6
      ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6)
      
      // Create texture from canvas with proper settings
      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.wrapS = THREE.ClampToEdgeWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.flipY = false
      
      // Screen material - Ensure full opacity and proper texture display
      const screenMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: false,
        opacity: 1.0,
        side: THREE.FrontSide,
        alphaTest: 0.1
      })
      
      // Create screen mesh
      const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial)
      screenMesh.position.set(x, baseY, z)
      // Face the camera (no rotation needed for floating displays)
      screenMesh.userData = { 
        projectId: project.id,
        isScreen: true,
        baseY: baseY // Store base Y position for floating animation
      }
      
      // Add subtle glow effect for running projects
      if (isRunning) {
        const glowGeometry = new THREE.PlaneGeometry(2.6, 1.9)
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff88,
          transparent: true,
          opacity: 0.1 // Very subtle glow
        })
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
        glowMesh.position.copy(screenMesh.position)
        glowMesh.position.z -= 0.02
        glowMesh.userData = { isGlow: true }
        screenGroupRef.current.add(glowMesh)
      }
      
      // Frame - Simple basic material positioned clearly behind screen
      const frameGeometry = new THREE.BoxGeometry(2.6, 1.9, 0.1)
      const frameMaterial = new THREE.MeshBasicMaterial({
        color: isRunning ? 0x333333 : 0x222222, // Dark frames
        transparent: false
      })
      const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
      frameMesh.position.copy(screenMesh.position)
      frameMesh.position.z -= 0.15 // Move frame further back
      frameMesh.userData = { isFrame: true }
      
      screenGroupRef.current.add(frameMesh)
      screenGroupRef.current.add(screenMesh)
    })
  }

  // Update screens when projects change (debounced to prevent flashing)
  useEffect(() => {
    // Only create screens if we have projects loaded
    if (projects.length === 0) {
      console.log('No projects loaded yet, skipping screen creation')
      return
    }
    
    const timeoutId = setTimeout(() => {
      console.log('Updating screens for projects:', projects.length)
      console.log('Projects data:', projects.map(p => ({ id: p.id, title: p.title })))
      createScreens()
    }, 500) // Reduce delay since we're checking for data
    
    return () => clearTimeout(timeoutId)
  }, [projects, runningStatus, projectPorts])

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          className={styles.controlButton}
        >
          {isAnimating ? '⏸️ Pause Float' : '▶️ Float'}
        </button>
        <div className={styles.projectInfo}>
          {selectedProject && (
            <span>{selectedProject.title}</span>
          )}
        </div>
      </div>
      
      <div 
        ref={mountRef} 
        className={styles.threeContainer}
        style={{ 
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      />
      
      <div className={styles.instructions}>
        <p>Drag to rotate • Scroll to zoom • Click displays to view projects</p>
        <p>Running projects glow green • {projects.length} projects floating</p>
      </div>
    </div>
  )
}