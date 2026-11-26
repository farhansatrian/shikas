import React from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Briefcase,
  Car,
  Cloud,
  Coffee,
  Dumbbell,
  Gamepad2,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Music,
  Plane,
  PlusCircle,
  Receipt,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Train,
  TrendingUp,
  Utensils,
  Wallet,
} from "lucide-react";

export const CategoryIcon: React.FC<{
  name?: string;
  className?: string;
}> = ({ name, className = "h-4 w-4" }) => {
  switch (name) {
    case "ArrowLeftRight":
      return <ArrowLeftRight className={className} />;
    case "Landmark":
      return <Landmark className={className} />;
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
    case "Coffee":
      return <Coffee className={className} />;
    case "Home":
      return <Home className={className} />;
    case "Train":
      return <Train className={className} />;
    case "Car":
      return <Car className={className} />;
    case "Cloud":
      return <Cloud className={className} />;
    case "ShoppingBag":
      return <ShoppingBag className={className} />;
    case "Shirt":
      return <Shirt className={className} />;
    case "HeartPulse":
      return <HeartPulse className={className} />;
    case "Dumbbell":
      return <Dumbbell className={className} />;
    case "Music":
      return <Music className={className} />;
    case "Gamepad2":
      return <Gamepad2 className={className} />;
    case "BookOpen":
      return <BookOpen className={className} />;
    case "Plane":
      return <Plane className={className} />;
    case "Smartphone":
      return <Smartphone className={className} />;
    case "Wallet":
      return <Wallet className={className} />;
    case "Tag":
      return <Tag className={className} />;
    case "Gift":
      return <Gift className={className} />;
    default:
      return <Receipt className={className} />;
  }
};
