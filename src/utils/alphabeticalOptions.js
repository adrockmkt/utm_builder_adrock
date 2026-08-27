const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

export function sortAlphabeticallyByLabel(items) {
  return [...items].sort((left, right) => collator.compare(getComparableLabel(left), getComparableLabel(right)));
}

export function sortSuggestionGroups(groups) {
  return sortAlphabeticallyByLabel(groups).map((group) => ({
    ...group,
    options: sortAlphabeticallyByLabel(group.options || [])
  }));
}

export function sortSelectOptions(options) {
  const blankOptions = options.filter((option) => !String(option.value || '').trim());
  const filledOptions = options.filter((option) => String(option.value || '').trim());
  return [...blankOptions, ...sortAlphabeticallyByLabel(filledOptions)];
}

function getComparableLabel(item) {
  return String(item?.label || item?.name || item?.title || item?.value || '').trim();
}
