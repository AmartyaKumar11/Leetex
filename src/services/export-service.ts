import { LEETEX_PLATFORM } from "~/constants/version"
import { sessionMetricsService } from "~/services/session-metrics-service"
import { userIdentityService } from "~/services/user-identity-service"
import { versionService } from "~/services/version-service"
import type {
  ExportFailure,
  ExportMetadata,
  ExportOutcome,
  ExportValidationError,
  SessionExportPayload
} from "~/types/export"
import type { Session } from "~/types/session"
import { getBrowserLabel } from "~/utils/browser-info"
import { withAggregatedLearningSources } from "~/utils/learning-source-aggregation"
import { toISOString } from "~/utils/time"

const EXPORT_ERROR_MESSAGES: Record<ExportValidationError, string> = {
  missing_user_id: "Export blocked: user ID is not initialized. Reload the extension.",
  missing_version: "Export blocked: LeetEx version is unavailable.",
  missing_session: "Export blocked: no active session to export."
}

export class ExportService {
  async validateExport(session: Session | null): Promise<ExportFailure | null> {
    if (!session) {
      return this.failure("missing_session")
    }

    const userId = await userIdentityService.getUserId()

    if (!userId) {
      return this.failure("missing_user_id")
    }

    if (!versionService.isValid()) {
      return this.failure("missing_version")
    }

    return null
  }

  async buildExportPayload(session: Session): Promise<SessionExportPayload | null> {
    const validationError = await this.validateExport(session)

    if (validationError) {
      return null
    }

    const userId = await userIdentityService.getUserId()

    if (!userId) {
      return null
    }

    const metadata: ExportMetadata = {
      userId,
      leetexVersion: versionService.currentVersion,
      exportedAt: toISOString(Date.now()),
      browser: getBrowserLabel(),
      platform: LEETEX_PLATFORM
    }

    return {
      metadata,
      session: structuredClone(
        sessionMetricsService.attach(withAggregatedLearningSources(session))
      )
    }
  }

  async exportSession(session: Session | null): Promise<ExportOutcome> {
    const validationError = await this.validateExport(session)

    if (validationError) {
      return validationError
    }

    const payload = await this.buildExportPayload(session!)

    if (!payload) {
      return this.failure("missing_session")
    }

    return {
      success: true,
      payload,
      json: JSON.stringify(payload, null, 2)
    }
  }

  private failure(error: ExportValidationError): ExportFailure {
    return {
      success: false,
      error,
      message: EXPORT_ERROR_MESSAGES[error]
    }
  }
}

export const exportService = new ExportService()
