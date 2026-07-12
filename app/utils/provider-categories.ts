import type { ProviderCategory } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

export type ProviderCategoryMeta = {
  category: ProviderCategory;
  /** Plural display title, e.g. 'Guías' */
  label: string;
  icon: string;
  route: string;
  /** Used for both the list page header/empty-state icon and the dashboard card icon */
  iconColorClass: string;
  /** Dashboard stat number only — dark-mode aware, a distinct treatment from iconColorClass */
  dashboardTextColorClass: string;
};

export const PROVIDER_CATEGORY_META: Record<ProviderCategory, ProviderCategoryMeta> = {
  [PROVIDER_CATEGORY.GUIDES]: {
    category: PROVIDER_CATEGORY.GUIDES,
    label: 'Guías',
    icon: 'i-lucide-user-search',
    route: '/providers/guides',
    iconColorClass: 'text-blue-500',
    dashboardTextColorClass: 'text-blue-600 dark:text-blue-400',
  },
  [PROVIDER_CATEGORY.TRANSPORTATION]: {
    category: PROVIDER_CATEGORY.TRANSPORTATION,
    label: 'Transporte',
    icon: 'i-lucide-car',
    route: '/providers/transportation',
    iconColorClass: 'text-purple-500',
    dashboardTextColorClass: 'text-purple-600 dark:text-purple-400',
  },
  [PROVIDER_CATEGORY.ACCOMMODATION]: {
    category: PROVIDER_CATEGORY.ACCOMMODATION,
    label: 'Hospedajes',
    icon: 'i-lucide-hotel',
    route: '/providers/accommodation',
    iconColorClass: 'text-green-500',
    dashboardTextColorClass: 'text-green-600 dark:text-green-400',
  },
  [PROVIDER_CATEGORY.BUS_AGENCIES]: {
    category: PROVIDER_CATEGORY.BUS_AGENCIES,
    label: 'Agencias de Autobús',
    icon: 'i-lucide-bus',
    route: '/providers/bus-agencies',
    iconColorClass: 'text-orange-500',
    dashboardTextColorClass: 'text-orange-600 dark:text-orange-400',
  },
  [PROVIDER_CATEGORY.FOOD_SERVICES]: {
    category: PROVIDER_CATEGORY.FOOD_SERVICES,
    label: 'Comidas',
    icon: 'i-lucide-utensils',
    route: '/providers/food-services',
    iconColorClass: 'text-amber-500',
    dashboardTextColorClass: 'text-amber-600 dark:text-amber-400',
  },
  [PROVIDER_CATEGORY.OTHER]: {
    category: PROVIDER_CATEGORY.OTHER,
    label: 'Otros',
    icon: 'i-lucide-package',
    route: '/providers/other',
    iconColorClass: 'text-gray-500',
    dashboardTextColorClass: 'text-gray-600 dark:text-gray-400',
  },
};
