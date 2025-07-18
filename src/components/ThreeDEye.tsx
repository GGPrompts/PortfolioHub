import React from 'react'
import SvgIcon from './SvgIcon'

interface ThreeDEyeProps {
  isOpen: boolean
  onClick: () => void
  className?: string
}

export default function ThreeDEye({ isOpen, onClick, className = '' }: ThreeDEyeProps) {
  return (
    <button
      className={className}
      onClick={onClick}
      title={isOpen ? 'Disable live previews' : 'Enable live previews'}
    >
      <SvgIcon 
        name={isOpen ? 'eye' : 'eyeOff'} 
        size={16} 
      />
    </button>
  )
}