export type ApplicationDocuments = {
  tailoredResumeS3Url?: string | null;
  coverLetterText?: string | null;
  emailIntroduction?: string | null;
  interviewPrepText?: string | null;
};

// Preparation is document state, never an implicit application submission.
export function hasPreparedDocuments(application: ApplicationDocuments) {
  return Boolean(
    application.tailoredResumeS3Url &&
      application.tailoredResumeS3Url !== "preparing" &&
      application.coverLetterText?.trim() &&
      application.emailIntroduction?.trim() &&
      application.interviewPrepText?.trim(),
  );
}

export function formatAppliedDate(value?: string | null) {
  if (!value) return "Not recorded as applied";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Application date unavailable"
    : `Applied ${date.toLocaleDateString()}`;
}
