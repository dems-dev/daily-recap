"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("settings")}</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold">U</div>
              <div>
                <h3 className="font-medium">Update Profile</h3>
                <p className="text-sm text-muted-foreground">Change your avatar and personal details.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Language</h4>
                <p className="text-sm text-muted-foreground mb-2">Select your preferred language.</p>
                {/* Language selector placeholder */}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Currency</h4>
                <p className="text-sm text-muted-foreground mb-2">Default currency for financial logs.</p>
                {/* Currency selector placeholder */}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Reset Data</h4>
              <p className="text-sm text-muted-foreground mb-3">Permanently delete all your tracked data.</p>
              <Button variant="destructive">Delete All Data</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
