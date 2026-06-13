import { LEETEX_PLATFORM, LEETEX_VERSION } from "~/constants/version"

export class VersionService {
  get currentVersion(): string {
    return LEETEX_VERSION
  }

  get platform(): typeof LEETEX_PLATFORM {
    return LEETEX_PLATFORM
  }

  isValid(): boolean {
    return Boolean(this.currentVersion && this.currentVersion.length > 0)
  }
}

export const versionService = new VersionService()
