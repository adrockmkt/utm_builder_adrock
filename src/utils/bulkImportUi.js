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

export function getBulkImportRowStatusView(status) {
  if (status === 'error') {
    return {
      label: 'Erro',
      tone: 'red'
    };
  }

  if (status === 'warning') {
    return {
      label: 'Valide com atenção',
      tone: 'yellow'
    };
  }

  return {
    label: 'OK',
    tone: 'green'
  };
}

export function getBulkValidationStatusMessage({ canSave, warningRows = 0 }) {
  if (canSave && warningRows > 0) {
    return 'Valide com atenção: há avisos na prévia antes de salvar o lote.';
  }

  if (canSave) {
    return 'Planilha validada. Revise a prévia e salve o lote.';
  }

  return 'Corrija os erros na planilha e suba novamente.';
}

export function getBulkImportPostSaveView(createdCount) {
  return {
    message: `${createdCount} links salvos com sucesso.`,
    tone: 'green',
    primaryActionLabel: 'Reiniciar processo'
  };
}
