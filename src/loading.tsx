export default function Loading() {
  return (
    <div className="app-loading" aria-label="页面加载中">
      <svg width="100%" height="220" viewBox="0 0 960 220" role="img">
        <defs>
          <linearGradient id="skeleton-gradient">
            <stop offset="0%" stopColor="#eef2ff" />
            <stop offset="50%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#eef2ff" />
          </linearGradient>
        </defs>
        <rect x="40" y="32" width="240" height="32" rx="16" fill="url(#skeleton-gradient)" />
        <rect x="40" y="88" width="600" height="18" rx="9" fill="#edf2f7" />
        <rect x="40" y="124" width="520" height="18" rx="9" fill="#edf2f7" />
        <rect x="720" y="36" width="160" height="128" rx="24" fill="#e0f2fe" />
      </svg>
    </div>
  );
}
