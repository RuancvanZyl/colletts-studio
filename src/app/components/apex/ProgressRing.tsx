interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  className = ''
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const getColor = (progress: number) => {
    if (progress < 30) return 'url(#gradient-blue)';
    if (progress < 60) return 'url(#gradient-amber)';
    if (progress < 100) return 'url(#gradient-purple)';
    return 'url(#gradient-green)';
  };

  const color = getColor(progress);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#65a30d" />
          </linearGradient>
          <linearGradient id="gradient-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
          <linearGradient id="gradient-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-slate-900 dark:text-white" style={{ fontSize: size * 0.2 }}>
          {progress}%
        </span>
      </div>
    </div>
  );
}
