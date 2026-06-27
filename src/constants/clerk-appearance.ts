/** OAuth/SAML redirect flows break in extension tabs (and get ad-blocked on sso-callback). */
export const CLERK_EXTENSION_APPEARANCE = {
  elements: {
    socialButtonsRoot: "hidden",
    socialButtons: "hidden",
    dividerRow: "hidden"
  }
} as const
