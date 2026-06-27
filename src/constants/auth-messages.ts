export const AUTH_MESSAGE = {
  GET_AUTH: "LEETEX_GET_AUTH",
  SIGN_OUT: "LEETEX_SIGN_OUT",
  OPEN_SIGN_IN: "LEETEX_OPEN_SIGN_IN"
} as const

export const SIGN_IN_PAGE_PATH = "tabs/sign-in.html"

export interface AuthBridgeResponse {
  isSignedIn: boolean
  userId: string | null
  email: string | null
}
