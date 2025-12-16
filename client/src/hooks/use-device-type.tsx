import * as React from "react"

type DeviceType = 'mobile' | 'tablet' | 'desktop'

// Breakpoints for device detection
const BREAKPOINTS = {
  mobile: 640,    // < 640px = mobile phones
  tablet: 1024,   // 640px - 1024px = tablets
  desktop: 1024   // >= 1024px = desktops/laptops
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = React.useState<DeviceType>(() => {
    if (typeof window === 'undefined') return 'mobile'
    
    const width = window.innerWidth
    if (width < BREAKPOINTS.mobile) return 'mobile'
    if (width < BREAKPOINTS.tablet) return 'tablet'
    return 'desktop'
  })

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      let newType: DeviceType
      
      if (width < BREAKPOINTS.mobile) newType = 'mobile'
      else if (width < BREAKPOINTS.tablet) newType = 'tablet'
      else newType = 'desktop'
      
      setDeviceType(newType)
    }

    // Use match media for better performance
    const mqMobile = window.matchMedia(`(max-width: ${BREAKPOINTS.mobile - 1}px)`)
    const mqTablet = window.matchMedia(`(max-width: ${BREAKPOINTS.tablet - 1}px)`)
    
    const handleChange = () => handleResize()
    
    mqMobile.addEventListener("change", handleChange)
    mqTablet.addEventListener("change", handleChange)
    
    return () => {
      mqMobile.removeEventListener("change", handleChange)
      mqTablet.removeEventListener("change", handleChange)
    }
  }, [])

  return deviceType
}
