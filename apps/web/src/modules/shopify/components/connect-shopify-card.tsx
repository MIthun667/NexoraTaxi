'use client';

import { useMemo, useState } from 'react';
import { Loader2, Store } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function normalizeShopDomainInput(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function isValidShopDomain(value: string) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(normalizeShopDomainInput(value));
}

export function ConnectShopifyCard({
  defaultShopDomain,
  isSubmitting,
  errorMessage,
  onSubmit,
}: {
  defaultShopDomain?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (shopDomain: string) => void;
}) {
  const [shopDomain, setShopDomain] = useState(defaultShopDomain ?? '');
  const normalizedDomain = useMemo(() => normalizeShopDomainInput(shopDomain), [shopDomain]);
  const showValidationError = shopDomain.length > 0 && !isValidShopDomain(shopDomain);

  return (
    <SectionCard
      eyebrow="Step 1"
      title="Connect your Shopify store"
      description="Authorize Nexora to read orders, products, and customers securely from your Shopify store."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="shopDomain" className="text-sm font-medium text-white">
            Shopify store domain
          </label>
          <Input
            id="shopDomain"
            value={shopDomain}
            onChange={(event) => setShopDomain(event.target.value)}
            placeholder="your-store.myshopify.com"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-slate-500">
            Enter the permanent <code className="rounded bg-white/5 px-1 py-0.5 text-slate-300">myshopify.com</code> domain for the store you want to connect.
          </p>
          {showValidationError ? (
            <p className="text-sm text-rose-300">
              Enter a valid Shopify domain such as <span className="font-medium">acme-store.myshopify.com</span>.
            </p>
          ) : null}
          {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
        </div>

        <Button
          onClick={() => onSubmit(normalizedDomain)}
          disabled={!isValidShopDomain(shopDomain) || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Store className="mr-2 h-4 w-4" />}
          {isSubmitting ? 'Preparing Shopify connection...' : 'Connect Shopify'}
        </Button>
      </div>
    </SectionCard>
  );
}
