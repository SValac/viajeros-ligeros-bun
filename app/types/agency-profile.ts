export type AgencyProfile = {
  id: string;
  companyName: string | null;
  countryCode: string;
  stateCode: string | null;
  phone: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
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
};

export type AgencyProfileUpdateData = Partial<AgencyProfileFormData> & {
  logoUrl?: string | null;
};

export type CountryState = {
  countryCode: string;
  code: string;
  name: string;
};
