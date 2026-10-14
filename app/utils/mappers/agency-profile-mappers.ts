import type { AgencyProfile, CountryState } from '~/types/agency-profile';
import type { Tables } from '~/types/database.types';

import { toAboutPage } from '~/composables/agency-profile/use-about-page-domain';
import { toHomePage } from '~/composables/agency-profile/use-home-page-domain';

export function mapAgencyProfileRowToDomain(row: Tables<'agency_profiles'>): AgencyProfile {
  return {
    id: row.id,
    companyName: row.company_name,
    countryCode: row.country_code,
    stateCode: row.state_code,
    phone: row.phone,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    tagline: row.tagline,
    contactEmail: row.contact_email,
    instagramUrl: row.instagram_url,
    facebookUrl: row.facebook_url,
    youtubeUrl: row.youtube_url,
    xUrl: row.x_url,
    tiktokUrl: row.tiktok_url,
    aboutPage: toAboutPage(row.about_page),
    homePage: toHomePage(row.home_page),
    faviconUrl: row.favicon_url,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    shareImageUrl: row.share_image_url,
    bannerImageUrl: row.banner_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCountryStateRowToDomain(row: Tables<'country_states'>): CountryState {
  return {
    countryCode: row.country_code,
    code: row.code,
    name: row.name,
  };
}
