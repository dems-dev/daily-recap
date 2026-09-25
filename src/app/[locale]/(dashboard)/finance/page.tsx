"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInvalidate, useJson } from "@/hooks/use-json";
import { MonthSwitcher, useMoney } from "@/components/finance/shared";
import { TransactionDialog, type Transaction } from "@/components/finance/TransactionDialog";
import { TransactionsTab, type FinanceMonth } from "@/components/finance/TransactionsTab";
import { BudgetTab } from "@/components/finance/BudgetTab";
import { SavingsTab } from "@/components/finance/SavingsTab";
import { RecurringTab } from "@/components/finance/RecurringTab";
import { WishlistTab } from "@/components/finance/WishlistTab";

export default function FinancePage() {
  const t = useTranslations("Finance");
  const [tab, setTab] = useState("transactions");
  // null until the server tells us the current month in the user's timezone.
  const [month, setMonth] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState<{ tx: Transaction | null } | null>(null);

  const { data, loading, error } = useJson<FinanceMonth>(
    month ? `/api/finance?month=${month}` : "/api/finance",
    refreshKey
  );
  if (data && month === null) setMonth(data.month);

  const money = useMoney(data?.currency);
  const invalidate = useInvalidate();
  // Local key for this page's own data; global invalidate for the dashboard, recap and other tabs.
  const refresh = () => {
    setRefreshKey((k) => k + 1);
    invalidate();
  };

  // New transactions default to today if we're viewing this month, else the 1st of the viewed month.
  const defaultDate = data ? (data.today.startsWith(data.month) ? data.today : `${data.month}-01`) : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {month && (tab === "transactions" || tab === "budget") && <MonthSwitcher month={month} onChange={setMonth} />}
          <Button className="gap-2" onClick={() => setDialog({ tx: null })} disabled={!data}>
            <Plus className="h-4 w-4" /> {t("addTransaction")}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{t("loadFailed")}</p>}

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="transactions">{t("transactions")}</TabsTrigger>
          <TabsTrigger value="budget">{t("budget")}</TabsTrigger>
          <TabsTrigger value="savings">{t("savingsGoals")}</TabsTrigger>
          <TabsTrigger value="recurring">{t("recurring")}</TabsTrigger>
          <TabsTrigger value="wishlist">{t("wishlist")}</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="pt-4">
          <TransactionsTab
            data={data}
            loading={loading}
            money={money}
            onEdit={(tx) => setDialog({ tx })}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="budget" className="pt-4">
          {month && <BudgetTab month={month} refreshKey={refreshKey} money={money} onChanged={refresh} />}
        </TabsContent>
        <TabsContent value="savings" className="pt-4">
          <SavingsTab />
        </TabsContent>
        <TabsContent value="recurring" className="pt-4">
          <RecurringTab onAdd={() => setDialog({ tx: null })} />
        </TabsContent>
        <TabsContent value="wishlist" className="pt-4">
          <WishlistTab />
        </TabsContent>
      </Tabs>

      <TransactionDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        transaction={dialog?.tx}
        defaultDate={defaultDate}
        onSaved={refresh}
      />
    </div>
  );
}
