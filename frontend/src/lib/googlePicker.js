/**
 * Google Picker helpers — load the client library and open a folder picker.
 * Requires drive.file OAuth scope (backend) + GOOGLE_PICKER_API_KEY.
 *
 * setAppId must be the Cloud **project number** (IAM & Admin → Settings), not
 * the project id string. Wrong appId → blank Picker with drive.file.
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
 * Resolve Cloud project number for PickerBuilder.setAppId.
 * Prefer an explicit project number; fall back to the OAuth client id prefix
 * (usually the same numeric project number).
 *
 * @param {string | null | undefined} projectNumber
 * @param {string} clientId
 * @returns {string}
 */
export function resolvePickerAppId(projectNumber, clientId) {
  const explicit = projectNumber != null ? String(projectNumber).trim() : ''
  if (explicit) return explicit
  const prefix = String(clientId).split('-')[0]
  if (!/^\d+$/.test(prefix)) {
    throw new Error(
      'GOOGLE_CLOUD_PROJECT_NUMBER is required (Cloud Console → IAM & Admin → Settings → Project number)',
    )
  }
  return prefix
}

/**
 * Open a folder-only Google Picker.
 *
 * @param {object} opts
 * @param {string} opts.apiKey GOOGLE_PICKER_API_KEY
 * @param {string} opts.clientId GOOGLE_CLIENT_ID (OAuth web client)
 * @param {string} opts.accessToken user access token with drive.file
 * @param {string} [opts.projectNumber] Cloud project number for setAppId
 * @param {string} [opts.title]
 * @param {string} [opts.origin] page origin (defaults to location.origin)
 * @returns {Promise<{ id: string, name: string, url: string | null } | null>}
 *   Resolves to the chosen folder, or null if the user cancelled.
 */
export async function openDriveFolderPicker({
  apiKey,
  clientId,
  accessToken,
  projectNumber,
  title = 'Choose a Drive folder for Vizably',
  origin,
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

  await ensureGapiPicker()
  const google = globalThis.google
  if (!google?.picker) {
    throw new Error('Google Picker is unavailable')
  }

  const appId = resolvePickerAppId(projectNumber, clientId)
  const pickerOrigin =
    origin ||
    (typeof globalThis.location !== 'undefined' ? globalThis.location.origin : undefined)

  return new Promise((resolve, reject) => {
    try {
      // Folder-only view. Avoid stacking FOLDERS + setMimeTypes (blank UI).
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)

      const builder = new google.picker.PickerBuilder()
        .setTitle(title)
        .setAppId(appId)
        .setDeveloperKey(apiKey)
        .setOAuthToken(accessToken)
        .addView(view)
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

      if (pickerOrigin) {
        builder.setOrigin(pickerOrigin)
      }

      const picker = builder.build()
      picker.setVisible(true)
    } catch (err) {
      reject(err)
    }
  })
}
