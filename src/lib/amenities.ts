import {
  Wifi,
  Car,
  ChefHat,
  Snowflake,
  Sun,
  Zap,
  ShieldCheck,
  Waves,
  Sofa,
  Droplets,
  type LucideIcon,
} from "lucide-react";

export const AMENITY: Record<string, { label: string; icon: LucideIcon }> = {
  wifi: { label: "Wi-Fi fibre", icon: Wifi },
  parking: { label: "Parking privé", icon: Car },
  kitchen: { label: "Cuisine équipée", icon: ChefHat },
  ac: { label: "Climatisation", icon: Snowflake },
  terrace: { label: "Terrasse / rooftop", icon: Sun },
  power: { label: "Groupe électrogène", icon: Zap },
  security: { label: "Gardiennage 24 h/24", icon: ShieldCheck },
  beach: { label: "Proche plage", icon: Waves },
  lounge: { label: "Salon détente", icon: Sofa },
  water: { label: "Réserve d'eau", icon: Droplets },
};

export function amenityLabel(key: string): string {
  return AMENITY[key]?.label ?? key;
}
