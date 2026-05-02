export function SkeletonText({ width = '100%', height = '16px' }) {
  return <div className="skeleton skeleton-text" style={{ width, height }} />;
}

export function SkeletonCard() {
  return <div className="skeleton skeleton-card" />;
}

export function Skeleton({ width = '100%', height = '40px' }) {
  return <div className="skeleton" style={{ width, height, display: 'block' }} />;
}
