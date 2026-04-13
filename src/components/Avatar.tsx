'use client';

import React from 'react';

interface AvatarProps {
  gender?: 'male' | 'female';
  bodyType?: 'slim' | 'average' | 'athletic' | 'plus-size';
  skinTone?: string;
  clothingUrl?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  gender = 'female', 
  bodyType = 'average', 
  skinTone = '#E5C298',
  clothingUrl 
}) => {
  // Map body type to width factors
  const bodyWidthMap = {
    'slim': 0.8,
    'average': 1.0,
    'athletic': 1.1,
    'plus-size': 1.3
  };

  const widthFactor = bodyWidthMap[bodyType];

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl overflow-hidden p-4">
      <svg viewBox="0 0 200 400" className="h-full w-auto drop-shadow-md">
        {/* Head */}
        <circle cx="100" cy="50" r="25" fill={skinTone} />
        
        {/* Neck */}
        <rect x="95" y="75" width="10" height="10" fill={skinTone} />
        
        {/* Body/Torso */}
        <path 
          d={`M ${100 - 40 * widthFactor} 85 
             L ${100 + 40 * widthFactor} 85 
             L ${100 + 35 * widthFactor} 200 
             L ${100 - 35 * widthFactor} 200 Z`} 
          fill={skinTone} 
        />
        
        {/* Arms */}
        <rect x={100 - 55 * widthFactor} y="85" width="15" height="100" rx="7" fill={skinTone} />
        <rect x={100 + 40 * widthFactor} y="85" width="15" height="100" rx="7" fill={skinTone} />
        
        {/* Legs */}
        <rect x={100 - 30 * widthFactor} y="200" width="20" height="150" rx="10" fill={skinTone} />
        <rect x={100 + 10 * widthFactor} y="200" width="20" height="150" rx="10" fill={skinTone} />

        {/* Clothing Overlay (Virtual Try-On) */}
        {clothingUrl && (
          <image 
            href={clothingUrl} 
            x={100 - 45 * widthFactor} 
            y="85" 
            width={90 * widthFactor} 
            height="150" 
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </svg>
      
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-500 border">
        Avatar: {bodyType}
      </div>
    </div>
  );
};
