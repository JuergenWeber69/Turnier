/**
 * Guarantees that the icon font (Ionicons) and the Inter text fonts are
 * available in the static web export.
 *
 * Why this exists: with `web.output: "single"` (a single-page app), Expo Router
 * does NOT render `app/+html.tsx`, so any `@font-face` rules placed there never
 * reach the browser. At the same time, the `@font-face` rules that
 * `expo-font` / `@expo/vector-icons` inject at runtime point at content-hashed
 * asset URLs and did not resolve reliably in the export — icons rendered as
 * empty "tofu" boxes and text fell back to the browser's serif font.
 *
 * The fonts are self-hosted under `public/fonts/` (copied verbatim into the
 * export at `/fonts/...`). This module declares them with plain CSS
 * `@font-face` rules from bundled JavaScript at startup, so the browser loads
 * them natively over stable URLs, independently of expo-font's runtime loader.
 *
 * The family names MUST match exactly what the components render with:
 *   - `ionicons` — the family name @expo/vector-icons gives the Ionicons set
 *     (see Ionicons.js: `createIconSet(glyphMap, 'ionicons', font)`).
 *   - `Inter_400Regular` / `Inter_500Medium` / `Inter_600SemiBold` /
 *     `Inter_700Bold` — the family names from `@expo-google-fonts/inter`.
 */
import { Platform } from "react-native";

const FONT_FACE_CSS = `
@font-face {
  font-family: "ionicons";
  src: url("/fonts/Ionicons.ttf") format("truetype");
  font-display: block;
}
@font-face {
  font-family: "Inter_400Regular";
  src: url("/fonts/Inter_400Regular.ttf") format("truetype");
  font-display: swap;
}
@font-face {
  font-family: "Inter_500Medium";
  src: url("/fonts/Inter_500Medium.ttf") format("truetype");
  font-display: swap;
}
@font-face {
  font-family: "Inter_600SemiBold";
  src: url("/fonts/Inter_600SemiBold.ttf") format("truetype");
  font-display: swap;
}
@font-face {
  font-family: "Inter_700Bold";
  src: url("/fonts/Inter_700Bold.ttf") format("truetype");
  font-display: swap;
}
`;

const STYLE_ELEMENT_ID = "self-hosted-app-fonts";

if (Platform.OS === "web" && typeof document !== "undefined") {
  if (!document.getElementById(STYLE_ELEMENT_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ELEMENT_ID;
    style.textContent = FONT_FACE_CSS;
    (document.head || document.documentElement).appendChild(style);
  }
}

export {};
