import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-");
}

export function cityFromSlug(slug: string): string {
  const map: Record<string, string> = {
    bangkok: "Bangkok",
    london: "London",
    "cape-town": "Cape Town",
  };
  return map[slug] ?? slug;
}
