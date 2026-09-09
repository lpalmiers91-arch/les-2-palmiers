import {
  Car,
  Sparkles,
  Scissors,
  ChefHat,
  Hand,
  Waves,
  Wallet,
  Shirt,
  Baby,
  Compass,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  car: Car,
  sparkles: Sparkles,
  scissors: Scissors,
  "chef-hat": ChefHat,
  hand: Hand,
  waves: Waves,
  wallet: Wallet,
  shirt: Shirt,
  baby: Baby,
  compass: Compass,
};

export function ServiceIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const Icon = map[name] ?? Compass;
  return <Icon className={className} strokeWidth={1.6} aria-hidden />;
}
