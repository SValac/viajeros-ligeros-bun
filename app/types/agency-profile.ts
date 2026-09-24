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
  about: string | null;
  contactEmail: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
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
  about: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
};

export type AgencyProfileUpdateData = Partial<Omit<AgencyProfileFormData, 'tagline' | 'about' | 'contactEmail' | 'instagramUrl' | 'facebookUrl'>> & {
  logoUrl?: string | null;
  tagline?: string | null;
  about?: string | null;
  contactEmail?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
};

export type CountryState = {
  countryCode: string;
  code: string;
  name: string;
};
