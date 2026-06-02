type VitalReport = {
  lcp?: number;
  fcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  path?: string;
  timestamp: number;
};

export function reportLcpMetric() {
  if (!("PerformanceObserver" in window)) return;

  let reported = false;

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lcp = entries.at(-1);
      if (lcp && !reported) {
        reported = true;
        const value = Math.round(lcp.startTime);
        console.info("[perf] LCP", value, "ms");
        storeVital("lcp", value);
      }
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    /* ignore */
  }
}

export function reportFirstContentfulPaint() {
  if (!("PerformanceObserver" in window)) return;

  let reported = false;
  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcp = entries.at(-1);
      if (fcp && !reported) {
        reported = true;
        const value = Math.round(fcp.startTime);
        console.info("[perf] FCP", value, "ms");
        storeVital("fcp", value);
      }
    });
    observer.observe({ type: "paint", buffered: true });
  } catch {
    /* ignore */
  }
}

export function reportFirstInputDelay() {
  if (!("PerformanceObserver" in window)) return;

  let reported = false;
  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fid = entries.at(-1);
      if (fid && !reported) {
        reported = true;
        const value = Math.round((fid as PerformanceEventTiming).processingStart - fid.startTime);
        console.info("[perf] FID", value, "ms");
        storeVital("fid", value);
      }
    });
    observer.observe({ type: "first-input", buffered: true });
  } catch {
    /* ignore */
  }
}

export function reportCumulativeLayoutShift() {
  if (!("PerformanceObserver" in window)) return;

  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShift = entry as any;
        if (layoutShift && !layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && clsValue > 0) {
        console.info("[perf] CLS", clsValue.toFixed(4));
        storeVital("cls", clsValue);
      }
    });
  } catch {
    /* ignore */
  }
}

export function reportTimeToFirstByte() {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const ttfb = Math.round(nav.responseStart - nav.requestStart);
      console.info("[perf] TTFB", ttfb, "ms");
      storeVital("ttfb", ttfb);
    }
  } catch {
    /* ignore */
  }
}

export function reportWebVitals() {
  reportLcpMetric();
  reportFirstContentfulPaint();
  reportFirstInputDelay();
  reportCumulativeLayoutShift();
  reportTimeToFirstByte();
}

function storeVital(name: string, value: number) {
  try {
    const key = "perf_vitals";
    const raw = localStorage.getItem(key);
    const vitals: VitalReport[] = raw ? JSON.parse(raw) : [];
    vitals.push({ [name]: value, path: location.pathname, timestamp: Date.now() } as VitalReport);
    if (vitals.length > 50) vitals.splice(0, vitals.length - 50);
    localStorage.setItem(key, JSON.stringify(vitals));
  } catch {
    /* ignore */
  }
}

export function getStoredVitals(): VitalReport[] {
  try {
    return JSON.parse(localStorage.getItem("perf_vitals") || "[]");
  } catch {
    return [];
  }
}

export function clearStoredVitals() {
  localStorage.removeItem("perf_vitals");
}
