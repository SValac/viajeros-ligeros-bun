import type { Json } from '~/types/database.types';

export type AgencyProfile = {
  id: string;
  companyName: string | null;
  countryCode: string;
  stateCode: string | null;
  phone: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  tagline: string | null;
  contactEmail: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  aboutPage: AboutPage | null;
  createdAt: string;
  updatedAt: string;
};

export type AgencyProfileFormData = {
  companyName: string;
  countryCode: string;
  stateCode: string | null;
  phone: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  tagline: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
};

export type AgencyProfileUpdateData = Partial<Omit<AgencyProfileFormData, 'tagline' | 'contactEmail' | 'instagramUrl' | 'facebookUrl'>> & {
  logoUrl?: string | null;
  tagline?: string | null;
  aboutPage?: Json | null;
  contactEmail?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
};

export type CountryState = {
  countryCode: string;
  code: string;
  name: string;
};

// Pages of the agency's public site, as edited in the CRM. Optional texts are `''` while
// editing and are left out of the stored JSON (see serializeAboutPage).
// The public site owns the design; the agency only controls the content, which sections
// exist and their order.

export type PageSectionFeatureItem = {
  title: string;
  description: string;
  icon: string;
};

export type PageSectionStepItem = {
  title: string;
  description: string;
};

export type PageTextSection = {
  type: 'text';
  headline: string;
  title: string;
  description: string;
};

export type PageFeaturesSection = {
  type: 'features';
  headline: string;
  title: string;
  description: string;
  items: PageSectionFeatureItem[];
};

export type PageStepsSection = {
  type: 'steps';
  headline: string;
  title: string;
  items: PageSectionStepItem[];
};

export type PageSection = PageTextSection | PageFeaturesSection | PageStepsSection;

export type PageSectionType = PageSection['type'];

// Title + optional paragraphs, e.g. a page's hero.
export type PageTextBlock = {
  title: string;
  description: string;
};

// "Nosotros" page. `null` on the profile = the site has no such page.
export type AboutPage = {
  hero: PageTextBlock;
  sections: PageSection[];
};
