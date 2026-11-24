import React, { useState } from 'react';
import {
  Coffee,
  Cookie,
  Droplets,
  Flame,
  Leaf,
  Milk,
  Package,
  Sparkles,
  SprayCan,
  Wheat,
} from 'lucide-react';
import { cn } from '@/src/utils/cn';

interface ProductThumbnailProps {
  src?: string;
  alt: string;
  categoryId?: string;
  sku?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'card';
  className?: string;
}

const CATEGORY_FALLBACK: Record<
  string,
  { bg: string; iconColor: string; icon: React.ComponentType<{ className?: string }> }
> = {
  'cat-1': { bg: 'bg-amber-50/80', iconColor: 'text-amber-600', icon: Wheat },
  'cat-2': { bg: 'bg-orange-50/80', iconColor: 'text-orange-600', icon: Flame },
  'cat-3': { bg: 'bg-sky-50/80', iconColor: 'text-sky-600', icon: Milk },
  'cat-4': { bg: 'bg-emerald-50/80', iconColor: 'text-emerald-600', icon: Coffee },
  'cat-5': { bg: 'bg-yellow-50/80', iconColor: 'text-yellow-600', icon: Cookie },
  'cat-6': { bg: 'bg-violet-50/80', iconColor: 'text-violet-600', icon: Sparkles },
  'cat-7': { bg: 'bg-cyan-50/80', iconColor: 'text-cyan-600', icon: SprayCan },
  'cat-8': { bg: 'bg-lime-50/80', iconColor: 'text-lime-600', icon: Leaf },
};

const SIZE_CLASSES: Record<NonNullable<ProductThumbnailProps['size']>, string> = {
  xs: 'h-8 w-8 rounded-md',
  sm: 'h-10 w-10 rounded-lg',
  md: 'h-12 w-12 rounded-lg',
  lg: 'h-20 w-20 rounded-xl',
  card: 'w-full aspect-[4/3] rounded-t-xl',
};

export function ProductThumbnail({
  src,
  alt,
  categoryId,
  sku,
  size = 'sm',
  className,
}: ProductThumbnailProps) {
  const [failed, setFailed] = useState(false);

  const fallback = (categoryId && CATEGORY_FALLBACK[categoryId]) || {
    bg: 'bg-slate-100',
    iconColor: 'text-slate-400',
    icon: categoryId === 'cat-2' ? Droplets : Package,
  };
  const FallbackIcon = fallback.icon;
  const showImage = Boolean(src && src.trim().length > 0 && !failed);

  return (
    <div
      className={cn(
        'relative overflow-hidden shrink-0 border border-slate-200/80 bg-slate-50 flex items-center justify-center',
        SIZE_CLASSES[size],
        size === 'card' && 'border-0 border-b border-slate-100',
        !showImage && fallback.bg,
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 text-center px-1">
          <FallbackIcon
            className={cn(
              fallback.iconColor,
              size === 'xs'
                ? 'h-3.5 w-3.5'
                : size === 'sm'
                ? 'h-4 w-4'
                : size === 'md'
                ? 'h-5 w-5'
                : 'h-7 w-7'
            )}
          />
          {(size === 'lg' || size === 'card') && sku && (
            <span className="font-mono text-[10px] font-medium text-slate-500 truncate max-w-full">
              {sku}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
