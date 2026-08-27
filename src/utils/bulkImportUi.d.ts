export type BulkImportTutorialStep = {
  title: string;
  description: string;
  action: 'download' | 'upload';
  highlight?: boolean;
  readyMessage?: string;
};

export type BulkImportRowStatusView = {
  label: string;
  tone: 'green' | 'red';
};

export function getBulkImportTutorialSteps(options?: { hasSelectedCampaign?: boolean }): BulkImportTutorialStep[];
export function getBulkImportRowStatusView(status: string): BulkImportRowStatusView;
export function getBulkValidationStatusMessage(summary: { canSave: boolean; warningRows?: number }): string;
