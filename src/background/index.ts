import { registerClerkAuthHandlers } from "~/background/clerk-auth"
import { userIdentityService } from "~/services/user-identity-service"
import { versionService } from "~/services/version-service"

registerClerkAuthHandlers()

function initializeIdentity(): void {
  void userIdentityService
    .initialize()
    .then(() => {
      console.info(`[LeetEx] Ready — ${versionService.currentVersion}`)
    })
    .catch((error: unknown) => {
      console.error("[LeetEx] User identity initialization failed", error)
    })
}

chrome.runtime.onInstalled.addListener(() => {
  initializeIdentity()
})

chrome.runtime.onStartup.addListener(() => {
  initializeIdentity()
})
