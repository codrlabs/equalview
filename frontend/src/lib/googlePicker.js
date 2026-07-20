/**
 * Google Picker helpers — load the client library and open a folder picker.
 * Requires drive.file OAuth scope (backend) + GOOGLE_PICKER_API_KEY.
 */

const GAPI_SCRIPT = 'https://apis.google.com/js/api.js'

/**
 * @param {string} src
 * @returns {Promise<void>}
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true' || globalThis.gapi) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google API script')), {
        once: true,
      })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google API script'))
    document.head.appendChild(script)
  })
}

/**
 * @returns {Promise<typeof globalThis.gapi>}
 */
async function ensureGapiPicker() {
  await loadScript(GAPI_SCRIPT)
  const gapi = globalThis.gapi
  if (!gapi) {
    throw new Error('Google API failed to initialize')
  }
  if (gapi.picker) {
    return gapi
  }
  await new Promise((resolve, reject) => {
    gapi.load('picker', {
      callback: resolve,
      onerror: () => reject(new Error('Failed to load Google Picker')),
    })
  })
  return gapi
}

/**
 * Open a folder-only Google Picker.
 *
 * @param {object} opts
 * @param {string} opts.apiKey GOOGLE_PICKER_API_KEY
 * @param {string} opts.clientId GOOGLE_CLIENT_ID (OAuth web client)
 * @param {string} opts.accessToken user access token with drive.file
 * @param {string} [opts.title]
 * @returns {Promise<{ id: string, name: string, url: string | null } | null>}
 *   Resolves to the chosen folder, or null if the user cancelled.
 */
export async function openDriveFolderPicker({
  apiKey,
  clientId,
  accessToken,
  title = 'Choose a Drive folder for Vizably',
}) {
  if (!apiKey) {
    throw new Error('Google Picker API key is not configured (GOOGLE_PICKER_API_KEY)')
  }
  if (!clientId) {
    throw new Error('Google OAuth client id is not configured (GOOGLE_CLIENT_ID)')
  }
  if (!accessToken) {
    throw new Error('Google access token is required to open the Picker')
  }

  const gapi = await ensureGapiPicker()
  const google = globalThis.google
  if (!google?.picker) {
    throw new Error('Google Picker is unavailable')
  }

  return new Promise((resolve, reject) => {
    try {
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMimeTypes('application/vnd.google-apps.folder')

      // Cloud project number is the numeric prefix of the OAuth client id.
      const appId = String(clientId).split('-')[0]

      const picker = new google.picker.PickerBuilder()
        .setTitle(title)
        .setAppId(appId)
        .setDeveloperKey(apiKey)
        .setOAuthToken(accessToken)
        .addView(view)
        .setSelectableMimeTypes('application/vnd.google-apps.folder')
        .setCallback((data) => {
          if (data.action === google.picker.Action.CANCEL) {
            resolve(null)
            return
          }
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs?.[0]
            if (!doc?.id) {
              resolve(null)
              return
            }
            resolve({
              id: doc.id,
              name: doc.name || 'Drive folder',
              url: doc.url || null,
            })
          }
        })
        .build()

      picker.setVisible(true)
    } catch (err) {
      reject(err)
    }
  })
}
