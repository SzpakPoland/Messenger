'use client';

import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
}

const sizeMap = {
  xs: { container: 'w-7 h-7', text: 'text-[11px]', dot: 'w-2 h-2 border' },
  sm: { container: 'w-9 h-9', text: 'text-xs', dot: 'w-2.5 h-2.5 border' },
  md: { container: 'w-11 h-11', text: 'text-sm', dot: 'w-3 h-3 border-2' },
  lg: { container: 'w-14 h-14', text: 'text-base', dot: 'w-3.5 h-3.5 border-2' },
  xl: { container: 'w-20 h-20', text: 'text-xl', dot: 'w-4 h-4 border-2' },
};

const getInitials = (name: string) =>
  name
    .split(/[\s_]+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

const stringToColor = (str: string) => {
  const colors = [
    'from-pink-500 to-rose-500',
    'from-orange-500 to-amber-500',
    'from-emerald-500 to-teal-500',
    'from-cyan-500 to-blue-500',
    'from-brand-500 to-violet-500',
    'from-fuchsia-500 to-pink-500',
    'from-lime-500 to-green-500',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const buildSrc = (src: string) => {
  if (src.startsWith('http')) return src;
  if (src.startsWith('/uploads')) return `${API_URL}${src}`;
  return src;
};

export default function Avatar({ src, name, size = 'md', online }: AvatarProps) {
  const { container, text, dot } = sizeMap[size];

  return (
    <div className={`relative flex-shrink-0 ${container}`}>
      {src ? (
        <div className={`${container} rounded-full overflow-hidden relative`}>
          <Image
            src={buildSrc(src)}
            alt={name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div
          className={`${container} rounded-full bg-gradient-to-br ${stringToColor(name)} flex items-center justify-center`}
        >
          <span className={`${text} font-semibold text-white`}>{getInitials(name)}</span>
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dot} rounded-full border-surface-900 ${
            online ? 'bg-green-400' : 'bg-slate-500'
          }`}
        />
      )}
    </div>
  );
}
