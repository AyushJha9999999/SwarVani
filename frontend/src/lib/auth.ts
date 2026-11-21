export type WorkerProfile = {
  name: string
  workerId: string
  district: string
}

const STORAGE_KEY = 'swarvani.worker'

export function loadWorker(): WorkerProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<WorkerProfile>
    if (!value.name || !value.workerId || !value.district) return null
    return { name: value.name, workerId: value.workerId, district: value.district }
  } catch {
    return null
  }
}

export function saveWorker(profile: WorkerProfile): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function clearWorker(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

export function workerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AS'
}
