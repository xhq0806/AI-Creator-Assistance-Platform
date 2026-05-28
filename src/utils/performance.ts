export function reportLcpMetric() {
  if (!('PerformanceObserver' in window)) {
    return;
  }

  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lcp = entries.at(-1);
    if (lcp) {
      console.info('[perf] LCP', Math.round(lcp.startTime), 'ms');
    }
  });

  observer.observe({ type: 'largest-contentful-paint', buffered: true });
}
