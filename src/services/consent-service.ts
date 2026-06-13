import { STORAGE_KEYS } from "~/constants/storage-keys"
import { StorageService } from "~/services/storage-service"

export class ConsentService {
  private static instance: ConsentService | null = null
  private cachedConsent: boolean | null = null

  static getInstance(): ConsentService {
    if (!ConsentService.instance) {
      ConsentService.instance = new ConsentService()
    }

    return ConsentService.instance
  }

  async hasAcceptedConsent(): Promise<boolean> {
    if (this.cachedConsent !== null) {
      return this.cachedConsent
    }

    const stored = await StorageService.get<boolean>(STORAGE_KEYS.CONSENT_ACCEPTED)
    this.cachedConsent = stored === true

    return this.cachedConsent
  }

  async acceptConsent(): Promise<void> {
    await StorageService.set(STORAGE_KEYS.CONSENT_ACCEPTED, true)
    this.cachedConsent = true
  }
}

export const consentService = ConsentService.getInstance()
