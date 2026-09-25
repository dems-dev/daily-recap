"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Bell, Download, KeyRound, Sparkles, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { PageHeader, useFailureToast } from "@/components/common";
import { usePush } from "@/components/settings/use-push";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { useMe, type Me } from "@/hooks/use-me";
import { usePathname, useRouter } from "@/i18n/routing";
import { CURRENCIES, LOCALES, WEEK_START_DAYS } from "@/lib/settings";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProfileSection({ me }: { me: Me }) {
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [form, setForm] = useState({
    name: me.name ?? "",
    locale: me.locale,
    currency: me.currency,
    timezone: me.timezone,
    weekStartDay: me.weekStartDay,
  });
  const [saving, setSaving] = useState(false);
  const timezones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return list.includes(form.timezone) ? list : [form.timezone, ...list];
  }, [form.timezone]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await sendJson("/api/me", "PATCH", form);
      toast.add({ title: tc("saved"), type: "success" });
      invalidate();
      if (form.locale !== me.locale) router.replace(pathname, { locale: form.locale as "id" | "en" });
    } catch (err) {
      onFail(err);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-4" aria-hidden /> {t("profile")}
        </CardTitle>
        <CardDescription>{me.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field id="s-name" label={t("name")}>
            <Input id="s-name" value={form.name} maxLength={80} required onChange={set("name")} />
          </Field>
          <Field id="s-locale" label={t("language")}>
            <select id="s-locale" className={selectClass} value={form.locale} onChange={set("locale")}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {l === "id" ? "Bahasa Indonesia" : "English"}
                </option>
              ))}
            </select>
          </Field>
          <Field id="s-currency" label={t("currency")}>
            <select id="s-currency" className={selectClass} value={form.currency} onChange={set("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field id="s-week" label={t("weekStart")}>
            <select id="s-week" className={selectClass} value={form.weekStartDay} onChange={set("weekStartDay")}>
              {WEEK_START_DAYS.map((d) => (
                <option key={d} value={d}>
                  {t(`weekdays.${d}`)}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field id="s-tz" label={t("timezone")} hint={t("timezoneHint")}>
              <select id="s-tz" className={selectClass} value={form.timezone} onChange={set("timezone")}>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              {tc("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ReminderSection({ me }: { me: Me }) {
  const t = useTranslations("Settings");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const { status, subscribe, unsubscribe } = usePush();
  const [busy, setBusy] = useState(false);

  const setReminder = async (enabled: boolean) => {
    setBusy(true);
    try {
      if (enabled && status !== "subscribed") {
        const ok = await subscribe();
        if (!ok) {
          toast.add({ title: t("permissionDenied"), type: "error" });
          return;
        }
      }
      await sendJson("/api/me", "PATCH", { reminderEnabled: enabled });
      toast.add({ title: enabled ? t("reminderOn") : t("reminderOff"), type: "success" });
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setBusy(false);
    }
  };

  const setHour = async (hour: number) => {
    try {
      await sendJson("/api/me", "PATCH", { reminderHour: hour });
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  const test = async () => {
    try {
      const res = (await sendJson("/api/push/test", "POST")) as { sent: number };
      toast.add({ title: res.sent > 0 ? t("testSent") : t("testNoDevice"), type: res.sent > 0 ? "success" : "warning" });
    } catch (err) {
      onFail(err);
    }
  };

  const available = me.pushEnabled && status !== "unsupported";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4" aria-hidden /> {t("reminder")}
        </CardTitle>
        <CardDescription>{t("reminderDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!me.pushEnabled ? (
          <p className="text-sm text-muted-foreground">{t("pushNotConfigured")}</p>
        ) : status === "unsupported" ? (
          <p className="text-sm text-muted-foreground">{t("pushUnsupported")}</p>
        ) : status === "denied" ? (
          <p className="text-sm text-muted-foreground">{t("pushBlocked")}</p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="s-reminder">{t("reminderToggle")}</Label>
          <Switch
            id="s-reminder"
            checked={me.reminderEnabled && status === "subscribed"}
            disabled={!available || status === "denied" || status === "loading" || busy}
            onCheckedChange={(checked) => setReminder(checked)}
          />
        </div>

        <Field id="s-hour" label={t("reminderHour")} hint={t("reminderHourHint")}>
          <select
            id="s-hour"
            className={selectClass}
            value={me.reminderHour}
            onChange={(e) => setHour(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => 16 + i).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </Field>

        {status === "subscribed" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={test}>
              {t("sendTest")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await unsubscribe().catch(onFail);
                await setReminder(false);
              }}
            >
              {t("unsubscribeDevice")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AiSection({ me }: { me: Me }) {
  const t = useTranslations("Settings");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [busy, setBusy] = useState(false);

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      await sendJson("/api/me", "PATCH", { aiEnabled: enabled });
      toast.add({ title: enabled ? t("aiOn") : t("aiOff"), type: "success" });
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" aria-hidden /> {t("ai")}
        </CardTitle>
        <CardDescription>{t("aiDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!me.aiAvailable && <p className="text-sm text-muted-foreground">{t("aiNotConfigured")}</p>}
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="s-ai">{t("aiToggle")}</Label>
          <Switch id="s-ai" checked={me.aiOptIn} disabled={busy} onCheckedChange={(checked) => toggle(checked)} />
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t("aiFeatureLog")}</li>
          <li>{t("aiFeatureChat")}</li>
          <li>{t("aiFeatureCoach")}</li>
        </ul>
        <p className="text-xs text-muted-foreground">{t("aiPrivacy")}</p>
      </CardContent>
    </Card>
  );
}

function PasswordSection() {
  const t = useTranslations("Settings");
  const onFail = useFailureToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.newPassword.length < 8) return setError(t("errors.passwordTooShort"));
    if (form.newPassword !== form.confirm) return setError(t("errors.passwordMismatch"));
    setSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      if (res.status === 403) return setError(t("errors.wrongPassword"));
      if (res.status === 429) return setError(t("errors.rateLimited"));
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? res.statusText);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast.add({ title: t("passwordChanged"), type: "success" });
    } catch (err) {
      onFail(err);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" aria-hidden /> {t("security")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
          <Field id="s-current" label={t("currentPassword")}>
            <Input id="s-current" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={set("currentPassword")} />
          </Field>
          <Field id="s-new" label={t("newPassword")}>
            <Input id="s-new" type="password" autoComplete="new-password" minLength={8} required value={form.newPassword} onChange={set("newPassword")} />
          </Field>
          <Field id="s-confirm" label={t("confirmPassword")}>
            <Input id="s-confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={set("confirm")} />
          </Field>
          <div className="flex items-center justify-between gap-2 sm:col-span-3">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
            <Button type="submit" disabled={saving}>
              {t("changePassword")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DataSection({ me }: { me: Me }) {
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");
  const onFail = useFailureToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setOpenAndReset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPassword("");
      setError(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 403) return setError(t("errors.wrongPassword"));
      if (res.status === 429) return setError(t("errors.rateLimited"));
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? res.statusText);
      await signOut({ redirectTo: "/login" });
    } catch (err) {
      onFail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="size-4" aria-hidden /> {t("data")}
        </CardTitle>
        <CardDescription>{t("dataDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<a href="/api/me/export?format=json" download />}>
            <Download /> {t("exportJson")}
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href="/api/me/export?format=csv" download />}>
            <Download /> {t("exportCsv")}
          </Button>
        </div>

        <div className="rounded-lg border border-destructive/40 p-4">
          <p className="text-sm font-medium">{t("deleteAccount")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("deleteAccountDescription")}</p>
          <Button variant="destructive" className="mt-3 gap-1.5" onClick={() => setOpen(true)}>
            <Trash2 /> {t("deleteAccount")}
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpenAndReset}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
              <DialogDescription>{t("deleteConfirmDescription", { email: me.email })}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="s-delete-password">{t("currentPassword")}</Label>
              <Input
                id="s-delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAndReset(false)} disabled={busy}>
                {tc("cancel")}
              </Button>
              <Button variant="destructive" onClick={remove} disabled={busy || !password}>
                {t("deleteForever")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const { data: me } = useMe();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("pageTitle")} />
      {!me ? (
        <div className="space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <ProfileSection key={me.email} me={me} />
          <ReminderSection me={me} />
          <AiSection me={me} />
          <PasswordSection />
          <DataSection me={me} />
        </>
      )}
    </div>
  );
}
