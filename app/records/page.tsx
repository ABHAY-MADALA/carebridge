"use client";

import { FileHeart } from "lucide-react";
import { HelpTip } from "@/components/HelpTip";
import { useT } from "@/components/a11y/useT";
import { RecordConnection } from "@/components/records/RecordConnection";
import { RecordUploader } from "@/components/records/RecordUploader";
import { PageHeader } from "@/components/ui/PageHeader";

export default function RecordsPage() {
  const { t } = useT();

  return (
    <div className="records-page">
      <PageHeader
        eyebrow={t("records.eyebrow")}
        title={t("nav.records")}
        description={t("records.subtitle")}
        actions={<HelpTip topic="records" align="right" />}
      />
      <div className="records-intro-note">
        <FileHeart aria-hidden />
        <p>{t("records.privateNote")}</p>
      </div>
      <div className="records-grid">
        <RecordUploader />
        <RecordConnection />
      </div>
    </div>
  );
}
