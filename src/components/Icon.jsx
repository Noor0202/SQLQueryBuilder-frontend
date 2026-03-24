import React from 'react';
import * as Icons from 'lucide-react';

const Icon = ({ name, size = 16, className = '' }) => {
  const LucideIcon = Icons[name];
  if (!LucideIcon) return null;
  
  return (
    <span className={`icon-wrapper ${className}`}>
      <LucideIcon size={size} />
    </span>
  );
};

export default Icon;