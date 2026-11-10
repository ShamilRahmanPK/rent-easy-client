import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const FALLBACK_CURRENCY = "PHP";

// The platform currency comes from the server (Settings > General), so changing it there changes every price on screen.
export function useCurrency(): string {
  const config = useQuery({ queryKey: ["public", "config"], queryFn: () => api.get<{ currency: string }>("/public/config"), staleTime: 5 * 60_000 });
  return config.data?.currency ?? FALLBACK_CURRENCY;
}

// Round price steps for the home page search and price tabs, sized to what rents look like in each currency.
export function priceSteps(currency: string): { budgets: number[]; tiers: number[] } {
  if (currency === "PHP") return { budgets: [10000, 20000, 30000, 50000, 100000], tiers: [15000, 30000, 50000] };
  return { budgets: [3000, 5000, 8000, 12000, 20000], tiers: [3000, 6000, 10000] };
}
