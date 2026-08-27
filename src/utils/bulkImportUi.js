export function getBulkImportTutorialSteps(options = {}) {
  const hasSelectedCampaign = Boolean(options.hasSelectedCampaign);

  return [
    {
      title: '1. Modelo',
      description: 'Use sempre o XLSX do sistema para incluir todos os campos obrigatórios.',
      action: 'download'
    },
    {
      title: '2. Upload',
      description: 'A validação roda antes do salvamento.',
      action: 'upload',
      highlight: hasSelectedCampaign,
      readyMessage: hasSelectedCampaign ? '🙂 Beleza, siga com a subida do arquivo.' : ''
    }
  ];
}
