export type BulkImportTutorialStep = {
  title: string;
  description: string;
  action: 'download' | 'upload';
  highlight?: boolean;
  readyMessage?: string;
};

export type BulkImportRowStatusView = {
  label: string;
  tone: 'green' | 'yellow' | 'red';
};

export type BulkImportPostSaveView = {
  message: string;
  tone: 'green';
  primaryActionLabel: string;
};

export function getBulkImportTutorialSteps(options?: { hasSelectedCampaign?: boolean }): BulkImportTutorialStep[];
export function getBulkImportRowStatusView(status: string): BulkImportRowStatusView;
export function getBulkValidationStatusMessage(summary: { canSave: boolean; warningRows?: number }): string;
export function getBulkImportPostSaveView(createdCount: number): BulkImportPostSaveView;
