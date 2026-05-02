export function createDeviceId(): string {
  return `dv_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

