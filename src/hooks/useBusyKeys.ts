import { useState } from "react"

export function useBusyKeys() {
  const [busyKeys, setBusyKeys] = useState<string[]>([])

  async function runBusy<T>(key: string, task: () => Promise<T>) {
    setBusyKeys((current) => (current.includes(key) ? current : [...current, key]))
    try {
      return await task()
    } finally {
      setBusyKeys((current) => current.filter((item) => item !== key))
    }
  }

  return { busyKeys, runBusy }
}
