const DEFAULT_FLIMFLAP_DESTINATION_URL = "/trumpybird";

const configuredFlimFlapUrl =
  process.env.NEXT_PUBLIC_FLIMFLAP_URL?.trim() ||
  process.env.NEXT_PUBLIC_TRUMPYBIRD_URL?.trim();

export const FLIMFLAP_DESTINATION_URL =
  configuredFlimFlapUrl && configuredFlimFlapUrl.length > 0
    ? configuredFlimFlapUrl
    : DEFAULT_FLIMFLAP_DESTINATION_URL;

export const FLIMFLAP_DESTINATION_IS_EXTERNAL = /^https?:\/\//i.test(FLIMFLAP_DESTINATION_URL);

export const FLIMFLAP_DESTINATION_STATUS = FLIMFLAP_DESTINATION_IS_EXTERNAL
  ? "Standalone site"
  : "Temporary route";

export const FLIMFLAP_DESTINATION_NOTE = FLIMFLAP_DESTINATION_IS_EXTERNAL
  ? "Dedicated FlimFlap site while FLIMFLAM keeps the main hub entry."
  : "Same FlimFlap landing, temporarily launching from the legacy Trumpybird route.";
