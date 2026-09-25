"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function NutritionPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("nutrition")}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle>Meals</CardTitle>
            <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2"/> Add Meal</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4">
              <div className="border p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Breakfast</h3>
                <p className="text-sm text-muted-foreground">Not logged</p>
              </div>
              <div className="border p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Lunch</h3>
                <p className="text-sm text-muted-foreground">Not logged</p>
              </div>
              <div className="border p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Dinner</h3>
                <p className="text-sm text-muted-foreground">Not logged</p>
              </div>
              <div className="border p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Snacks</h3>
                <p className="text-sm text-muted-foreground">Not logged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Water Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-6 pt-4">
              <div className="text-4xl font-bold text-blue-500">0 / 8</div>
              <p className="text-muted-foreground">Glasses today</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Button key={i} variant="outline" size="icon" className="h-12 w-12 rounded-full">
                    💧
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
