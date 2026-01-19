'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface LottieAnimationProps {
  src?: string; // CDN URL (.lottie or .json)
  animationData?: any; // Local JSON
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

export default function LottieAnimation({
  src,
  animationData,
  width = 300,
  height = 300,
  loop = true,
  autoplay = true,
  className = ''
}: LottieAnimationProps) {
  const [data, setData] = useState(animationData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (src && !animationData && src.endsWith('.json')) {
      // Fetch JSON from CDN
      setLoading(true);
      fetch(src)
        .then(res => res.json())
        .then(json => {
          setData(json);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load animation:', err);
          setLoading(false);
        });
    }
  }, [src, animationData]);

  // For .lottie files (dotLottie format)
  if (src && src.endsWith('.lottie')) {
    return (
      <div className={className} style={{ width, height }}>
        <DotLottieReact
          src={src}
          loop={loop}
          autoplay={autoplay}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  // For JSON format
  if (!data && !loading) return null;

  return (
    <div className={className} style={{ width, height }}>
      {data && (
        <Lottie
          animationData={data}
          loop={loop}
          autoplay={autoplay}
        />
      )}
    </div>
  );
}
