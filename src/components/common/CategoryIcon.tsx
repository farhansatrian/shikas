import React from "react";
import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Cloud,
  Gift,
  HeartPulse,
  Home,
  Laptop,
  Music,
  PiggyBank,
  PlusCircle,
  Receipt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Train,
  TrendingUp,
  Utensils,
} from "lucide-react";
import type { WalletType } from "../../types/cashflow";

export const CategoryIcon: React.FC<{
  name?: string;
  className?: string;
}> = ({ name, className = "h-4 w-4" }) => {
  switch (name) {
    case "Briefcase":
      return <Briefcase className={className} />;
    case "Laptop":
      return <Laptop className={className} />;
    case "TrendingUp":
      return <TrendingUp className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "PlusCircle":
      return <PlusCircle className={className} />;
    case "Utensils":
      return <Utensils className={className} />;
    case "Home":
      return <Home className={className} />;
    case "Train":
      return <Train className={className} />;
    case "Cloud":
      return <Cloud className={className} />;
    case "ShoppingBag":
      return <ShoppingBag className={className} />;
    case "HeartPulse":
      return <HeartPulse className={className} />;
    case "Music":
      return <Music className={className} />;
    case "BookOpen":
      return <BookOpen className={className} />;
    case "Gift":
      return <Gift className={className} />;
    case "ArrowLeftRight":
      return <ArrowLeftRight className={className} />;
    default:
      return <Receipt className={className} />;
  }
};

export const WalletTypeIcon: React.FC<{
  type: WalletType;
  className?: string;
}> = ({ type, className = "h-4 w-4" }) => {
  switch (type) {
    case "bank":
      return <Building2 className={className} />;
    case "ewallet":
      return <Smartphone className={className} />;
    case "cash":
      return <Banknote className={className} />;
    case "savings":
      return <PiggyBank className={className} />;
  }
};
