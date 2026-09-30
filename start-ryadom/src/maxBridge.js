export function initMaxBridge() {
  const bridge = getMaxBridge()
  if (!bridge) return { embedded: false, platform: 'browser', user: null }

  bridge.ready()
  return {
    embedded: true,
    platform: bridge.platform || 'max',
    version: bridge.version || null,
    user: bridge.initDataUnsafe?.user || null,
  }
}

export function getMaxBridge() {
  return window.WebApp || null
}

export async function loadSavedOpportunities() {
  const storage = getMaxBridge()?.DeviceStorage
  if (!storage) return []
  try {
    const result = await storage.getItem('saved_opportunities')
    return JSON.parse(result?.value || '[]')
  } catch {
    return []
  }
}

export async function saveSavedOpportunities(ids) {
  const storage = getMaxBridge()?.DeviceStorage
  if (!storage) return
  await storage.setItem('saved_opportunities', JSON.stringify(ids))
}

export function syncBackButton(isVisible, onBack) {
  const backButton = getMaxBridge()?.BackButton
  if (!backButton) return () => {}

  if (isVisible) {
    backButton.show()
    backButton.onClick(onBack)
  } else {
    backButton.hide()
  }

  return () => backButton.offClick(onBack)
}
