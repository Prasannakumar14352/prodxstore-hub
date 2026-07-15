import { Palette, Code2, Layers, BookOpen, Zap, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Product = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  price: number;
  originalPrice: number;
  badge: string | null;
  badgeColor: string;
  icon: LucideIcon;
  gradient: string;
  accentColor: string;
  borderGlow: string;
  features: string[];
  highlights: { label: string; value: string }[];
  whatsIncluded: string[];
  image: string;
  screenshots: string[];
};

export const products: Product[] = [
  {
    id: "ui-component-kit",
    name: "UI Component Kit",
    category: "Design",
    tagline: "300+ production-ready components",
    description:
      "A comprehensive library of beautifully crafted UI components for Figma and React. Built with accessibility and responsiveness in mind, this kit gives your team a shared design language that ships directly to code — no redesign work needed.",
    price: 49,
    originalPrice: 89,
    badge: "Best Seller",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Palette,
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    accentColor: "text-amber-400",
    borderGlow: "hover:border-amber-500/40",
    features: ["Figma + React source", "Dark & light themes", "Lifetime updates"],
    highlights: [
      { label: "Components", value: "300+" },
      { label: "File formats", value: "Figma, TSX" },
      { label: "Themes", value: "Dark & Light" },
      { label: "Updates", value: "Lifetime" },
    ],
    whatsIncluded: [
      "300+ Figma component frames",
      "React/TypeScript source code",
      "Dark & light theme tokens",
      "Component documentation",
      "Usage examples & Storybook",
      "Lifetime free updates",
    ],
    image:
      "https://images.unsplash.com/photo-1540612597331-63c67ea382fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1627757757997-369fb38812e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
      "https://images.unsplash.com/photo-1676116777245-1cc40079cd38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
    ],
  },
  {
    id: "developer-toolkit",
    name: "Developer Toolkit",
    category: "Code",
    tagline: "Ship faster with proven patterns",
    description:
      "A battle-tested collection of TypeScript templates, CI/CD blueprints, and API boilerplates used by hundreds of engineering teams. Stop rebuilding the same infrastructure — start with solid foundations and focus on what makes your product unique.",
    price: 79,
    originalPrice: 149,
    badge: "New",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: Code2,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accentColor: "text-emerald-400",
    borderGlow: "hover:border-emerald-500/40",
    features: ["TypeScript templates", "CI/CD blueprints", "API boilerplates"],
    highlights: [
      { label: "Templates", value: "50+" },
      { label: "Language", value: "TypeScript" },
      { label: "Frameworks", value: "Next, Vite, Node" },
      { label: "Updates", value: "Lifetime" },
    ],
    whatsIncluded: [
      "50+ TypeScript project templates",
      "GitHub Actions CI/CD workflows",
      "REST & GraphQL API boilerplates",
      "Authentication starter kits",
      "Database migration scripts",
      "Docker & deployment configs",
    ],
    image:
      "https://images.unsplash.com/photo-1627757757997-369fb38812e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1540612597331-63c67ea382fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
      "https://images.unsplash.com/photo-1743385779313-ac03bb0f997b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
    ],
  },
  {
    id: "notion-os-bundle",
    name: "Notion OS Bundle",
    category: "Productivity",
    tagline: "Your second brain, fully wired",
    description:
      "A fully interconnected Notion workspace system with 15 linked databases, a GTD-inspired workflow, and an annual review system. Built over two years of iteration by a productivity obsessive. Duplicate it once, use it forever.",
    price: 29,
    originalPrice: 59,
    badge: "Popular",
    badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    icon: Layers,
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    accentColor: "text-violet-400",
    borderGlow: "hover:border-violet-500/40",
    features: ["15 linked databases", "GTD workflow", "Annual review system"],
    highlights: [
      { label: "Databases", value: "15 linked" },
      { label: "Templates", value: "30+" },
      { label: "System", value: "GTD-based" },
      { label: "Format", value: "Notion" },
    ],
    whatsIncluded: [
      "15 interlinked Notion databases",
      "Task & project management system",
      "Personal CRM template",
      "Knowledge base & note system",
      "Annual & weekly review templates",
      "Video walkthrough (45 min)",
    ],
    image:
      "https://images.unsplash.com/photo-1676116777245-1cc40079cd38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1627757757997-369fb38812e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
      "https://images.unsplash.com/photo-1540612597331-63c67ea382fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
    ],
  },
  {
    id: "startup-playbook",
    name: "Startup Playbook",
    category: "E-book",
    tagline: "Zero to launch in 90 days",
    description:
      "A 180-page actionable guide walking you through everything from validating your idea to acquiring your first 100 customers. Written by a founder who built and sold two startups. Includes investor deck template and launch checklists.",
    price: 19,
    originalPrice: 39,
    badge: null,
    badgeColor: "",
    icon: BookOpen,
    gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    accentColor: "text-sky-400",
    borderGlow: "hover:border-sky-500/40",
    features: ["180-page PDF", "Checklist templates", "Investor deck"],
    highlights: [
      { label: "Pages", value: "180" },
      { label: "Format", value: "PDF" },
      { label: "Bonuses", value: "Deck + Checklist" },
      { label: "Updates", value: "Free" },
    ],
    whatsIncluded: [
      "180-page PDF e-book",
      "Investor pitch deck template",
      "90-day launch checklist",
      "Customer interview scripts",
      "Pricing strategy worksheet",
      "Landing page swipe file",
    ],
    image:
      "https://images.unsplash.com/photo-1743385779313-ac03bb0f997b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1676116777245-1cc40079cd38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
      "https://images.unsplash.com/photo-1768979121229-392fce4957ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
    ],
  },
  {
    id: "motion-design-pack",
    name: "Motion Design Pack",
    category: "Design",
    tagline: "60fps animations, zero effort",
    description:
      "200+ production-ready Lottie animations and After Effects source files covering UI transitions, loading states, onboarding illustrations, and micro-interactions. Drop them into any web or mobile app and delight your users instantly.",
    price: 59,
    originalPrice: 99,
    badge: "Hot",
    badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    icon: Zap,
    gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
    accentColor: "text-rose-400",
    borderGlow: "hover:border-rose-500/40",
    features: ["200+ Lottie files", "After Effects source", "React components"],
    highlights: [
      { label: "Animations", value: "200+" },
      { label: "Formats", value: "Lottie, AE, TSX" },
      { label: "Categories", value: "8" },
      { label: "Updates", value: "Lifetime" },
    ],
    whatsIncluded: [
      "200+ Lottie JSON files",
      "After Effects source files",
      "React animation components",
      "8 animation categories",
      "Speed & color control docs",
      "Figma motion prototypes",
    ],
    image:
      "https://images.unsplash.com/photo-1758883019110-04c79dc56a71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1771226281605-f1e505ade901?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
      "https://images.unsplash.com/photo-1540612597331-63c67ea382fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
    ],
  },
  {
    id: "brand-identity-kit",
    name: "Brand Identity Kit",
    category: "Design",
    tagline: "Professional brand in a day",
    description:
      "Everything you need to build a cohesive, memorable brand from scratch. Logo templates, typography pairings, color system guidelines, and a complete social media kit — all in one Figma file you can customize in hours, not weeks.",
    price: 39,
    originalPrice: 79,
    badge: null,
    badgeColor: "",
    icon: Globe,
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    accentColor: "text-cyan-400",
    borderGlow: "hover:border-cyan-500/40",
    features: ["Logo templates", "Brand guidelines", "Social media kit"],
    highlights: [
      { label: "Logo variants", value: "40+" },
      { label: "Social templates", value: "60+" },
      { label: "Format", value: "Figma" },
      { label: "Updates", value: "Lifetime" },
    ],
    whatsIncluded: [
      "40+ logo template variants",
      "Brand guidelines document",
      "Typography pairing guide",
      "Color system & palette",
      "60+ social media templates",
      "Business card & stationery",
    ],
    image:
      "https://images.unsplash.com/photo-1768979121229-392fce4957ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1771226281605-f1e505ade901?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
      "https://images.unsplash.com/photo-1758883019110-04c79dc56a71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
    ],
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
