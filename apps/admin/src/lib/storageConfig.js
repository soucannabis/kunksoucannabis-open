const STORAGE_PROMPT_KEY = 'kunk.admin.storage.prompt.dismissed';

export function isStoragePromptDismissed() {
  try {
    return localStorage.getItem(STORAGE_PROMPT_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissStoragePrompt() {
  try {
    localStorage.setItem(STORAGE_PROMPT_KEY, '1');
  } catch {
    /* ignore */
  }
}

export const DRIVER_LABELS = {
  local: 'Disco local',
  s3: 'Amazon S3',
  gcs: 'Google Cloud Storage',
};
