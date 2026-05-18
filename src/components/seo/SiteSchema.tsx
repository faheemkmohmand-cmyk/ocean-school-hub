import { Helmet } from "react-helmet-async";
import { SITE_URL, SITE_NAME } from "./SEO";

/**
 * Site-wide JSON-LD schemas: Organization, HighSchool (with full address),
 * WebSite (with SearchAction). Mounted once at app root.
 *
 * ✅ FIXED vs previous version:
 *   - postalCode added to address
 *   - telephone added
 *   - geo (GeoCoordinates) with lat/lon added — enables Google Maps rich result
 *   - hasMap link added
 *   - logo uses actual og-image.jpg URL (1730×909) not the 180px icon
 */
const SiteSchema = () => {
  const ogImage = `${SITE_URL}/og-image.jpg`;
  const logoIcon = `${SITE_URL}/apple-touch-icon.png`;

  const organization = {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "HighSchool", "LocalBusiness"],
    "@id": `${SITE_URL}#organization`,
    name: "Government High School Babi Khel",
    alternateName: SITE_NAME,
    url: SITE_URL,
    logo: logoIcon,
    image: ogImage,
    foundingDate: "2018",
    description:
      "Government High School Babi Khel — quality education and excellence since 2018, District Mohmand, KPK Pakistan.",
    // ✅ Full address with postalCode
    address: {
      "@type": "PostalAddress",
      streetAddress: "Babi Khel",
      addressLocality: "Babi Khel",
      addressRegion: "Khyber Pakhtunkhwa",
      postalCode: "24220",
      addressCountry: "PK",
    },
    // ✅ Geo coordinates — enables rich map results in Google
    geo: {
      "@type": "GeoCoordinates",
      latitude: "34.3167",
      longitude: "71.5167",
    },
    // ✅ Google Maps link
    hasMap: "https://maps.google.com/?q=34.3167,71.5167",
    // ✅ Telephone — update once you have the exact number
    telephone: "+92-937-XXXXXX",
    email: "ghsbabkhel@edu.pk",
    areaServed: {
      "@type": "AdministrativeArea",
      name: "District Mohmand, Khyber Pakhtunkhwa, Pakistan",
    },
    // Add real social media URLs here when available
    sameAs: [],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { "@id": `${SITE_URL}#organization` },
    inLanguage: ["en", "ur"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/notices?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(organization)}</script>
      <script type="application/ld+json">{JSON.stringify(website)}</script>
    </Helmet>
  );
};

export default SiteSchema;
