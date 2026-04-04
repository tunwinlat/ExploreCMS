/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  mass: number
  fleeing: boolean
  fleeTimer: number
  id: number
}

// Convert hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ]
  }
  return [99, 102, 241]
}

// Get computed accent color from CSS variable
function getAccentColorRgb(): [number, number, number] {
  if (typeof window === 'undefined') return [99, 102, 241]
  
  const computedStyle = getComputedStyle(document.documentElement)
  const accentColor = computedStyle.getPropertyValue('--accent-color').trim()
  
  if (accentColor) {
    if (accentColor.startsWith('#')) {
      return hexToRgb(accentColor)
    }
    const rgbMatch = accentColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (rgbMatch) {
      return [
        parseInt(rgbMatch[1], 10),
        parseInt(rgbMatch[2], 10),
        parseInt(rgbMatch[3], 10)
      ]
    }
  }
  
  return [99, 102, 241]
}

export function ParticleBackground({ enabled = true }: { enabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000, isActive: false })
  const nextIdRef = useRef(0)
  const spawnTimerRef = useRef(0)
  const [accentRgb, setAccentRgb] = useState<[number, number, number]>([99, 102, 241])
  const [isDark, setIsDark] = useState(true)

  // Track theme changes
  useEffect(() => {
    if (!enabled) return
    
    const updateThemeColors = () => {
      const htmlElement = document.documentElement
      const isDarkMode = htmlElement.classList.contains('dark')
      setIsDark(isDarkMode)
      setAccentRgb(getAccentColorRgb())
    }
    
    updateThemeColors()
    
    const observer = new MutationObserver(updateThemeColors)
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme'] 
    })
    
    return () => observer.disconnect()
  }, [enabled])

  const createParticle = useCallback((x: number, y: number, size: number, vx: number = 0, vy: number = 0): Particle => ({
    x,
    y,
    vx,
    vy,
    size,
    alpha: Math.random() * 0.4 + 0.3,
    mass: size * size, // Mass proportional to area
    fleeing: false,
    fleeTimer: 0,
    id: nextIdRef.current++
  }), [])

  const initParticles = useCallback((width: number, height: number) => {
    const area = width * height
    const particleCount = Math.min(Math.floor(area / 4000), 200)
    const particles: Particle[] = []
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 1.5 + 0.5
      ))
    }
    
    particlesRef.current = particles
  }, [createParticle])

  // Spawn new particles periodically
  const spawnParticles = useCallback((width: number, height: number) => {
    const spawnCount = Math.floor(Math.random() * 3) + 2 // 2-4 particles
    
    for (let i = 0; i < spawnCount; i++) {
      // Spawn at random edge
      let x, y
      const edge = Math.floor(Math.random() * 4)
      switch (edge) {
        case 0: x = Math.random() * width; y = -10; break
        case 1: x = width + 10; y = Math.random() * height; break
        case 2: x = Math.random() * width; y = height + 10; break
        default: x = -10; y = Math.random() * height
      }
      
      particlesRef.current.push(createParticle(
        x,
        y,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ))
    }
  }, [createParticle])

  // Explode a particle into smaller ones
  const explodeParticle = useCallback((particle: Particle, width: number, height: number) => {
    const fragments = Math.floor(Math.random() * 3) + 3 // 3-5 fragments
    const newSize = Math.max(0.5, particle.size / Math.sqrt(fragments))
    
    const newParticles: Particle[] = []
    for (let i = 0; i < fragments; i++) {
      const angle = (Math.PI * 2 * i) / fragments + Math.random() * 0.5
      const speed = Math.random() * 3 + 2
      newParticles.push(createParticle(
        particle.x + Math.cos(angle) * particle.size,
        particle.y + Math.sin(angle) * particle.size,
        newSize,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      ))
    }
    
    return newParticles
  }, [createParticle])

  useEffect(() => {
    if (!enabled) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)
      
      if (particlesRef.current.length === 0) {
        initParticles(window.innerWidth, window.innerHeight)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let lastTime = Date.now()
    
    const animate = () => {
      if (!ctx || !canvas) return

      const width = window.innerWidth
      const height = window.innerHeight
      const currentTime = Date.now()
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime
      
      // Spawn new particles every ~10 seconds
      spawnTimerRef.current += deltaTime
      if (spawnTimerRef.current > 10) {
        spawnTimerRef.current = 0
        spawnParticles(width, height)
      }
      
      const mouse = mouseRef.current
      const [r, g, b] = accentRgb
      
      ctx.clearRect(0, 0, width, height)
      
      // Physics simulation
      const newParticles: Particle[] = []
      const particlesToRemove = new Set<number>()
      
      // Update each particle
      particlesRef.current.forEach((particle, i) => {
        if (particlesToRemove.has(particle.id)) return
        
        // Calculate distance to mouse
        const dxMouse = particle.x - mouse.x
        const dyMouse = particle.y - mouse.y
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse)
        
        // Mouse repulsion (antigravity)
        particle.fleeing = false
        if (mouse.isActive && distMouse < 180) {
          const force = (180 - distMouse) / 180
          const angle = Math.atan2(dyMouse, dxMouse)
          const repelForce = force * 8
          
          particle.vx += Math.cos(angle) * repelForce * 0.3
          particle.vy += Math.sin(angle) * repelForce * 0.3
          particle.fleeing = true
          particle.fleeTimer = 10 // Frames to stay in fleeing state
        }
        
        if (particle.fleeTimer > 0) {
          particle.fleeTimer--
          particle.fleeing = true
        }
        
        // Attraction to other particles (gravity-like)
        particlesRef.current.forEach((other, j) => {
          if (i === j || particlesToRemove.has(other.id)) return
          
          const dx = other.x - particle.x
          const dy = other.y - particle.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 10 || dist > 150) return
          
          // Attraction force (stronger for larger particles)
          const minMass = Math.min(particle.mass, other.mass)
          const attractionStrength = 0.0005 * minMass / (dist * dist + 100)
          
          const ax = (dx / dist) * attractionStrength
          const ay = (dy / dist) * attractionStrength
          
          particle.vx += ax / particle.mass
          particle.vy += ay / particle.mass
        })
        
        // Repulsion from fleeing particles (shockwave effect)
        particlesRef.current.forEach((other) => {
          if (other.id === particle.id || !other.fleeing) return
          
          const dx = particle.x - other.x
          const dy = particle.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 80 && dist > 0) {
            const force = (80 - dist) / 80
            const angle = Math.atan2(dy, dx)
            particle.vx += Math.cos(angle) * force * 0.5
            particle.vy += Math.sin(angle) * force * 0.5
          }
        })
        
        // Apply velocity damping
        particle.vx *= 0.985
        particle.vy *= 0.985
        
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy
        
        // Wrap around edges
        if (particle.x < -20) particle.x = width + 20
        if (particle.x > width + 20) particle.x = -20
        if (particle.y < -20) particle.y = height + 20
        if (particle.y > height + 20) particle.y = -20
      })
      
      // Check for collisions and merging
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p1 = particlesRef.current[i]
        if (particlesToRemove.has(p1.id)) continue
        
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p2 = particlesRef.current[j]
          if (particlesToRemove.has(p2.id)) continue
          
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = p1.size + p2.size
          
          if (dist < minDist) {
            // Collision detected
            
            // If fleeing particle hits larger particle, explode
            if ((p1.fleeing && p2.size > p1.size * 1.5) || (p2.fleeing && p1.size > p2.size * 1.5)) {
              const fleeing = p1.fleeing ? p1 : p2
              const larger = p1.fleeing ? p2 : p1
              
              particlesToRemove.add(fleeing.id)
              particlesToRemove.add(larger.id)
              
              // Explode both into fragments
              newParticles.push(...explodeParticle(fleeing, width, height))
              if (larger.size > 2) {
                newParticles.push(...explodeParticle(larger, width, height))
              }
            }
            // Otherwise, merge if both are calm
            else if (!p1.fleeing && !p2.fleeing) {
              // Merge smaller into larger
              const larger = p1.mass >= p2.mass ? p1 : p2
              const smaller = p1.mass >= p2.mass ? p2 : p1
              
              // Conservation of momentum
              larger.vx = (larger.vx * larger.mass + smaller.vx * smaller.mass) / (larger.mass + smaller.mass)
              larger.vy = (larger.vy * larger.mass + smaller.vy * smaller.mass) / (larger.mass + smaller.mass)
              
              // New size based on combined area
              larger.mass += smaller.mass
              larger.size = Math.sqrt(larger.mass)
              larger.alpha = Math.min(larger.alpha + 0.1, 0.9)
              
              particlesToRemove.add(smaller.id)
            }
            // If fleeing hits fleeing, bounce apart
            else {
              const angle = Math.atan2(dy, dx)
              const force = 2
              p1.vx -= Math.cos(angle) * force
              p1.vy -= Math.sin(angle) * force
              p2.vx += Math.cos(angle) * force
              p2.vy += Math.sin(angle) * force
            }
          }
        }
      }
      
      // Remove merged/exploded particles and add new ones
      particlesRef.current = particlesRef.current
        .filter(p => !particlesToRemove.has(p.id))
        .concat(newParticles)
      
      // Cap total particles for performance
      if (particlesRef.current.length > 400) {
        // Remove smallest particles
        particlesRef.current.sort((a, b) => b.mass - a.mass)
        particlesRef.current = particlesRef.current.slice(0, 400)
      }
      
      // Draw particles
      particlesRef.current.forEach((particle) => {
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
        let alpha = Math.min(particle.alpha + speed * 0.05, 1)
        
        // Fleeing particles glow brighter
        if (particle.fleeing) {
          alpha = Math.min(alpha * 1.3, 1)
        }
        
        const themeAlpha = isDark ? alpha * 0.8 : alpha * 0.6
        
        // Color based on state
        if (particle.fleeing) {
          ctx.fillStyle = `rgba(${Math.min(r + 50, 255)}, ${g}, ${Math.min(b + 50, 255)}, ${themeAlpha})`
        } else {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${themeAlpha})`
        }
        ctx.fill()
        
        // Glow effect for larger particles
        if (particle.size > 2) {
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${themeAlpha * 0.15})`
          ctx.fill()
        }
        
        // Fleeing particles get extra glow
        if (particle.fleeing) {
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${Math.min(r + 50, 255)}, ${g}, ${Math.min(b + 50, 255)}, ${themeAlpha * 0.2})`
          ctx.fill()
        }
      })
      
      // Draw attraction lines between nearby particles
      const maxDistance = 80
      
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i]
          const p2 = particlesRef.current[j]
          
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.15
            const connectionAlpha = isDark ? alpha : alpha * 0.5
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${connectionAlpha})`
            ctx.lineWidth = 0.3
            ctx.stroke()
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, isActive: true }
    }

    const handleMouseLeave = () => {
      mouseRef.current.isActive = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.body.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      document.body.removeEventListener('mouseleave', handleMouseLeave)
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [enabled, accentRgb, isDark, initParticles, spawnParticles, explodeParticle])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: isDark ? 0.75 : 0.6
      }}
      aria-hidden="true"
    />
  )
}
