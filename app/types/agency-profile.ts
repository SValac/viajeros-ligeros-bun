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
  aboutPage: AboutPage | null;
};

export type AgencyProfileUpdateData = Partial<Omit<AgencyProfileFormData, 'tagline' | 'contactEmail' | 'instagramUrl' | 'facebookUrl' | 'aboutPage'>> & {
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

// "Nosotros" page, as edited in the CRM. Optional texts are `''` while editing and are
// left out of the stored JSON (see serializeAboutPage). The public site owns the design;
// the agency only controls the content, which sections exist and their order.
export type AboutPageHero = {
  title: string;
  description: string;
};

export type AboutPageFeatureItem = {
  title: string;
  description: string;
  icon: string;
};

export type AboutPageStepItem = {
  title: string;
  description: string;
};

export type AboutPageTextSection = {
  type: 'text';
  headline: string;
  title: string;
  description: string;
};

export type AboutPageFeaturesSection = {
  type: 'features';
  headline: string;
  title: string;
  description: string;
  items: AboutPageFeatureItem[];
};

export type AboutPageStepsSection = {
  type: 'steps';
  headline: string;
  title: string;
  items: AboutPageStepItem[];
};

export type AboutPageSection = AboutPageTextSection | AboutPageFeaturesSection | AboutPageStepsSection;

export type AboutPageSectionType = AboutPageSection['type'];

export type AboutPage = {
  hero: AboutPageHero;
  sections: AboutPageSection[];
};
