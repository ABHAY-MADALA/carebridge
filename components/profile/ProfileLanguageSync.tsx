"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/components/a11y/SettingsProvider";
import { useHealthData } from "@/components/health/useHealthData";
import { useProfile } from "@/components/profile/ProfileProvider";

/**
 * Theme, type size, contrast and motion are device preferences. Language is a
 * patient preference, so it follows the active backend profile.
 */
export function ProfileLanguageSync() {
  const { context } = useProfile();
  const { settings, update } = useSettings();
  const { patientSettings, savePatientSettings } = useHealthData();
  const appliedContext = useRef<string | null>(null);

  useEffect(() => {
    if (!patientSettings) return;

    if (appliedContext.current !== context) {
      appliedContext.current = context;
      if (settings.language !== patientSettings.language) {
        update({ language: patientSettings.language });
      }
      return;
    }

    if (settings.language !== patientSettings.language) {
      void savePatientSettings({
        ...patientSettings,
        language: settings.language,
      });
    }
  }, [
    context,
    patientSettings,
    savePatientSettings,
    settings.language,
    update,
  ]);

  return null;
}
