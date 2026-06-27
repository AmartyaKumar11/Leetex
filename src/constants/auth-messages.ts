export const AUTH_MESSAGE = {
  GET_AUTH: "LEETEX_GET_AUTH",
  GET_TOKEN: "LEETEX_GET_TOKEN",
  AUTH_CHANGED: "LEETEX_AUTH_CHANGED",
  SYNC_SESSION: "LEETEX_SYNC_SESSION",
  SIGN_OUT: "LEETEX_SIGN_OUT",
  OPEN_SIGN_IN: "LEETEX_OPEN_SIGN_IN"
} as const

export const SIGN_IN_PAGE_PATH = "tabs/sign-in.html"

export interface AuthBridgeResponse {
  isSignedIn: boolean
  userId: string | null
  email: string | null
}
