export function nowIso() {
  return new Date().toISOString();
}

export function toLocaleDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
  });
}
