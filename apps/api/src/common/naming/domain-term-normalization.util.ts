import { DOMAIN_TERM_MAP, DomainTermMappingEntry } from './domain-term-map';

export const getLegacyToUniversalMap = (): DomainTermMappingEntry[] => DOMAIN_TERM_MAP;

export const getPreferredDomainTerm = (legacyTerm: string): string => {
  const normalized = legacyTerm.trim().toLowerCase();
  const mapping = DOMAIN_TERM_MAP.find(
    (entry) => entry.legacyTerm.toLowerCase() === normalized,
  );

  return mapping?.preferredUniversalTerm ?? legacyTerm;
};

export const normalizeDomainLabel = (label: string): string => getPreferredDomainTerm(label);
