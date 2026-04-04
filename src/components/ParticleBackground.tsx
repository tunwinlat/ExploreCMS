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
  // Fallback colors for different themes if parsing fails
  return [99, 102, 241] // Default indigo
}

// Get computed accent color from CSS variable
function getAccentColorRgb(): [number, number, number] {
  if (typeof window === 'undefined') return [99, 102, 241]
  
  const computedStyle = getComputedStyle(document.documentElement)
  const accentColor = computedStyle.getPropertyValue('--accent-color').trim()
  
  if (accentColor) {
    // If it's a hex color
    if (accentColor.startsWith('#')) {
      return hexToRgb(accentColor)
    }
    // If it's an rgb/rgba color
    const rgbMatch = accentColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (rgbMatch) {
      return [
        parseInt(rgbMatch[1], 10),
        parseInt(rgbMatch[2], 10),
        parseInt(rgbMatch[3], 10)
      ]
    }
  }
  
  return [99, 102, 241] // Default fallback
}

export function ParticleBackground({ enabled = true }: { enabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000, isActive: false })
  const [accentRgb, setAccentRgb] = useState<[number, number, number]>([99, 102, 241])
  const [isDark, setIsDark] = useState(true)

  // Track theme changes and update accent color
  useEffect(() => {
    if (!enabled) return
    
    const updateThemeColors = () => {
      const htmlElement = document.documentElement
      const isDarkMode = htmlElement.classList.contains('dark')
      setIsDark(isDarkMode)
      setAccentRgb(getAccentColorRgb())
    }
    
    // Initial check
    updateThemeColors()
    
    // Set up mutation observer to watch for class and data-theme changes
    const observer = new MutationObserver(updateThemeColors)
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme'] 
    })
    
    return () => observer.disconnect()
  }, [enabled])

  const initParticles = useCallback((width: number, height: number) => {
    const particleCount = Math.min(Math.floor((width * height) / 15000), 80)
    const particles: Particle[] = []
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.3
      })
    }
    
    particlesRef.current = particles
  }, [])

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
      
      // Reinitialize particles on resize
      initParticles(window.innerWidth, window.innerHeight)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let frameCount = 0
    
    const animate = () => {
      if (!ctx || !canvas) return

      const width = window.innerWidth
      const height = window.innerHeight
      const mouse = mouseRef.current
      
      // Skip frames when mouse is inactive to save battery
      frameCount++
      const skipFrames = mouse.isActive ? 0 : 1
      if (frameCount % (skipFrames + 1) !== 0) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      
      ctx.clearRect(0, 0, width, height)
      
      const [r, g, b] = accentRgb
      
      particlesRef.current.forEach((particle, index) => {
        // Mouse repulsion (antigravity effect)
        if (mouse.isActive) {
          const dx = particle.x - mouse.x
          const dy = particle.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 150 && dist > 0) {
            const force = (150 - dist) / 150
            const angle = Math.atan2(dy, dx)
            const repelForce = force * 2.5
            
            particle.vx += Math.cos(angle) * repelForce * 0.15
            particle.vy += Math.sin(angle) * repelForce * 0.15
          }
        }
        
        // Random drift (Brownian motion) - more active when mouse is away
        const driftStrength = mouse.isActive ? 0.02 : 0.08
        particle.vx += (Math.random() - 0.5) * driftStrength
        particle.vy += (Math.random() - 0.5) * driftStrength
        
        // Apply velocity damping
        particle.vx *= 0.98
        particle.vy *= 0.98
        
        // Minimum movement when idle (stardust floating effect)
        if (!mouse.isActive) {
          // Add subtle sine wave motion for organic floating
          const time = Date.now() * 0.001
          particle.vx += Math.sin(time + index * 0.5) * 0.005
          particle.vy += Math.cos(time + index * 0.3) * 0.005
        }
        
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy
        
        // Wrap around edges
        if (particle.x < -10) particle.x = width + 10
        if (particle.x > width + 10) particle.x = -10
        if (particle.y < -10) particle.y = height + 10
        if (particle.y > height + 10) particle.y = -10
        
        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        
        // Dynamic alpha based on velocity (faster = brighter)
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
        const dynamicAlpha = Math.min(particle.alpha + speed * 0.1, 0.8)
        
        // Adjust opacity based on theme - lighter in dark mode, more subtle in light
        const themeAlpha = isDark ? dynamicAlpha : dynamicAlpha * 0.7
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${themeAlpha})`
        ctx.fill()
        
        // Draw subtle glow for larger particles
        if (particle.size > 1.5) {
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${themeAlpha * 0.15})`
          ctx.fill()
        }
      })
      
      // Draw connections between nearby particles (subtle constellation effect)
      const maxDistance = 100
      const maxConnections = 3
      
      for (let i = 0; i < particlesRef.current.length; i++) {
        let connections = 0
        for (let j = i + 1; j < particlesRef.current.length && connections < maxConnections; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x
          const dy = particlesRef.current[i].y - particlesRef.current[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.15
            // Lighter connections in light mode
            const connectionAlpha = isDark ? alpha : alpha * 0.6
            ctx.beginPath()
            ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y)
            ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y)
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${connectionAlpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
            connections++
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Mouse event handlers
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [enabled, accentRgb, isDark, initParticles])

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
        opacity: isDark ? 0.6 : 0.5
      }}
      aria-hidden="true"
    />
  )
}
