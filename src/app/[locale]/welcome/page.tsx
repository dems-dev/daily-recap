"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Sparkles, Wallet, Target, HeartPulse, BookHeart, Timer, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";

type FeatureKey = "finance" | "productivity" | "health" | "mind" | "focus" | "insights";
const FEATURES: { key: FeatureKey; icon: typeof Wallet; chip: string }[] = [
  { key: "finance", icon: Wallet, chip: "bg-finance/12 text-finance" },
  { key: "productivity", icon: Target, chip: "bg-task/12 text-task" },
  { key: "health", icon: HeartPulse, chip: "bg-mind/12 text-mind" },
  { key: "mind", icon: BookHeart, chip: "bg-sleep/12 text-sleep" },
  { key: "focus", icon: Timer, chip: "bg-focus/12 text-focus" },
  { key: "insights", icon: Sparkles, chip: "bg-primary/12 text-primary" },
];

export default function WelcomePage() {
  const t = useTranslations("Landing");
  const [demoLoading, setDemoLoading] = useState(false);

  const tryDemo = async () => {
    setDemoLoading(true);
    try {
      await signIn("credentials", { email: "demo@dailyrecap.com", password: "demo1234", redirectTo: "/" });
    } catch {
      setDemoLoading(false);
    }
  };

  return (
    <div className="app-shell min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
            <Sparkles className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold text-gradient">Daily Recap</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
            {t("login")}
          </Button>
          <Button nativeButton={false} render={<Link href="/register" />}>
            {t("signUp")}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-16 sm:pt-16">
        <FadeIn className="relative overflow-hidden rounded-3xl hero-surface px-6 py-14 text-center text-white shadow-xl sm:px-10 sm:py-20">
          <div className="hero-blob pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-white/20" />
          <div className="hero-blob pointer-events-none absolute -bottom-28 -left-10 size-64 rounded-full bg-fuchsia-400/25" />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">{t("tagline")}</h1>
            <p className="mx-auto max-w-xl text-base text-white/85 sm:text-lg">{t("subtitle")}</p>
            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <Button
                size="lg"
                onClick={tryDemo}
                disabled={demoLoading}
                className="gap-2 rounded-full bg-white px-6 text-primary hover:bg-white/90"
              >
                <Play className="size-4" /> {demoLoading ? "…" : t("tryDemo")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="/register" />}
                className="gap-2 rounded-full border-white/40 bg-white/10 px-6 text-white hover:bg-white/20"
              >
                {t("signUp")} <ArrowRight className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-white/70">{t("demoHint")}</p>
          </div>
        </FadeIn>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-8 text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{t("featuresTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("featuresSub")}</p>
        </div>
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.key}>
              <Card className="h-full p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <span className={`mb-3 grid size-11 place-items-center rounded-xl ${f.chip}`}>
                  <f.icon className="size-5" />
                </span>
                <h3 className="font-heading text-lg font-semibold">{t(`features.${f.key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`features.${f.key}.desc`)}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-12 flex flex-col items-center gap-3">
          <Button size="lg" onClick={tryDemo} disabled={demoLoading} className="gap-2 rounded-full">
            <Play className="size-4" /> {demoLoading ? "…" : t("tryDemo")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("footer")}</p>
        </div>
      </section>
    </div>
  );
}
