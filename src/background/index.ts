import { userIdentityService } from "~/services/user-identity-service"
import { versionService } from "~/services/version-service"

export const onInstalled = async () => {
  await userIdentityService.initialize()
  console.info(
    `[LeetEx] Extension installed — ${versionService.currentVersion}`
  )
}
