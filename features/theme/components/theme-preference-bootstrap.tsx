import { getThemePreferenceBootstrapScript } from "@/features/theme/init-script";
import { type ThemePreference } from "@/features/theme/types";

type ThemePreferenceBootstrapProps = {
  themePreference: ThemePreference;
};

export function ThemePreferenceBootstrap({
  themePreference,
}: ThemePreferenceBootstrapProps) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: getThemePreferenceBootstrapScript({
          themePreference,
        }),
      }}
    />
  );
}
