import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/**
 * Root HTML document for the web build (Expo Router).
 *
 * The icon font (Ionicons) and the Inter text fonts are loaded at runtime by
 * `expo-font`/`@expo/vector-icons` via dynamically injected `@font-face` rules
 * pointing at content-hashed asset URLs. In the static web export that runtime
 * loading proved unreliable — icons rendered as empty "tofu" boxes and text
 * fell back to the browser's serif font.
 *
 * To make font loading deterministic, the same fonts are also self-hosted under
 * `public/fonts/` (copied verbatim into the export) and declared here with
 * plain CSS `@font-face` rules. The browser then loads them natively, before
 * and independently of any JavaScript, so the family names the app renders with
 * — `ionicons` for icons and `Inter_*` for text — always resolve to a real
 * font. The family names must match exactly what the components use.
 */
const fontFaceCss = `
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

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/*
          Disable body scrolling on web so the app behaves like a native
          ScrollView. Remove if you want the document to scroll instead.
        */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: fontFaceCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
