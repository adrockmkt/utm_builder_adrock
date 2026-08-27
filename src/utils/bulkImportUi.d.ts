export type BulkImportTutorialStep = {
  title: string;
  description: string;
  action: 'download' | 'upload';
};

export function getBulkImportTutorialSteps(): BulkImportTutorialStep[];
