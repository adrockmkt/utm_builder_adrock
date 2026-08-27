export type BulkImportTutorialStep = {
  title: string;
  description: string;
  action: 'download' | 'upload';
  highlight?: boolean;
  readyMessage?: string;
};

export function getBulkImportTutorialSteps(options?: { hasSelectedCampaign?: boolean }): BulkImportTutorialStep[];
