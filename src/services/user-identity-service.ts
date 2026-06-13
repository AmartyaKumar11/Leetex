import { STORAGE_KEYS } from "~/constants/storage-keys"
import { StorageService } from "~/services/storage-service"
import { generateUuidV4 } from "~/utils/id"

export class UserIdentityService {
  private static instance: UserIdentityService | null = null
  private cachedUserId: string | null = null

  static getInstance(): UserIdentityService {
    if (!UserIdentityService.instance) {
      UserIdentityService.instance = new UserIdentityService()
    }

    return UserIdentityService.instance
  }

  async initialize(): Promise<string> {
    return this.getOrCreateUserId()
  }

  async getOrCreateUserId(): Promise<string> {
    if (this.cachedUserId) {
      return this.cachedUserId
    }

    const stored = await StorageService.get<string>(STORAGE_KEYS.USER_ID)

    if (stored && this.isValidUuid(stored)) {
      this.cachedUserId = stored
      return stored
    }

    const userId = generateUuidV4()
    await StorageService.set(STORAGE_KEYS.USER_ID, userId)
    this.cachedUserId = userId

    return userId
  }

  async getUserId(): Promise<string | null> {
    if (this.cachedUserId) {
      return this.cachedUserId
    }

    const stored = await StorageService.get<string>(STORAGE_KEYS.USER_ID)

    if (stored && this.isValidUuid(stored)) {
      this.cachedUserId = stored
      return stored
    }

    return null
  }

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  }
}

export const userIdentityService = UserIdentityService.getInstance()
