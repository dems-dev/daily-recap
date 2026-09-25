"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BooksPage() {
  const t = useTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("books")}</h1>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Book</Button>
      </div>

      <Tabs defaultValue="reading">
        <TabsList>
          <TabsTrigger value="reading">Currently Reading</TabsTrigger>
          <TabsTrigger value="want">Want to Read</TabsTrigger>
          <TabsTrigger value="finished">Finished</TabsTrigger>
        </TabsList>
        <TabsContent value="reading" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center p-8 text-muted-foreground">Not reading any books right now.</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="want" className="pt-4">
          <div className="text-center p-8 text-muted-foreground">No books in wishlist.</div>
        </TabsContent>
        <TabsContent value="finished" className="pt-4">
          <div className="text-center p-8 text-muted-foreground">No finished books yet.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
