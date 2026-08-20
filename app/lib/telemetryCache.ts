export const telemetryCache: any = {
  metrics: null,
  priorities: null,
  matrix: null,
  briefs: null,
};

export function setTelemetryCache(payload: any) {
  if (payload.metrics) telemetryCache.metrics = payload.metrics;
  if (payload.priorities) telemetryCache.priorities = payload.priorities;
  if (payload.matrix) telemetryCache.matrix = payload.matrix;
  if (payload.briefs) telemetryCache.briefs = payload.briefs;
}

export function clearTelemetryCache() {
  telemetryCache.metrics = null;
  telemetryCache.priorities = null;
  telemetryCache.matrix = null;
  telemetryCache.briefs = null;
}
