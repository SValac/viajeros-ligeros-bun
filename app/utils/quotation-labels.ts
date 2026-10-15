import type { CostSplitType, ProviderCostType, QuotationStatus } from '~/types/quotation';

// Select items of how a cost is split among the seats (providers, buses, expenses)
export const COST_SPLIT_OPTIONS: { label: string; value: CostSplitType }[] = [
  { label: 'Asientos mínimos objetivo', value: 'minimum' },
  { label: 'Asientos vendibles', value: 'total' },
];

// Short form of the split, for table badges
const COST_SPLIT_SHORT_LABELS: Record<CostSplitType, string> = {
  minimum: 'Asientos min.',
  total: 'Asientos vend.',
};

// Select items of a provider's or expense's cost type
export const COST_TYPE_OPTIONS: { label: string; value: ProviderCostType }[] = [
  { label: 'Costo total', value: 'total' },
  { label: 'Costo por persona', value: 'per_person' },
];

const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmada',
};

const QUOTATION_STATUS_COLORS: Record<QuotationStatus, 'warning' | 'success'> = {
  draft: 'warning',
  confirmed: 'success',
};

export function getCostSplitShortLabel(splitType: CostSplitType): string {
  return COST_SPLIT_SHORT_LABELS[splitType];
}

export function getQuotationStatusLabel(status: QuotationStatus): string {
  return QUOTATION_STATUS_LABELS[status];
}

export function getQuotationStatusColor(status: QuotationStatus): 'warning' | 'success' {
  return QUOTATION_STATUS_COLORS[status];
}
