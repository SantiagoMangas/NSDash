type UnauthorizedListener = () => void;

let listener: UnauthorizedListener | null = null;

export function setUnauthorizedListener(fn: UnauthorizedListener | null): void {
  listener = fn;
}

export function notifyUnauthorized(): void {
  listener?.();
}
