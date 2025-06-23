import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export default function NavItemCard({ href, icon: Icon, title, description, className }: NavItemCardProps) {
  return (
    <Link href={href} className="flex">
      <Card className={cn("w-full transition-all hover:shadow-lg hover:-translate-y-1", className)}>
        <CardHeader>
            <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg mt-1">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                    <CardTitle className="text-base font-headline mb-1">{title}</CardTitle>
                    <CardDescription className="text-xs">{description}</CardDescription>
                </div>
            </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
