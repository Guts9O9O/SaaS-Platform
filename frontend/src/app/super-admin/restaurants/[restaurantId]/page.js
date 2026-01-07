"use client";

import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import OverviewTab from "./components/OverviewTab";
import AdminTab from "./components/AdminTab";
import SubscriptionTab from "./components/SubscriptionTab";
import TablesTab from "./components/TablesTab";
import QrCodesTab from "./components/QrCodesTab";

export default function SuperAdminRestaurantDetailPage() {
  const { restaurantId } = useParams();

  return (
    <div className="text-white">
      <h1 className="text-2xl font-semibold mb-6">
        Restaurant Management
      </h1>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-neutral-900 border border-neutral-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="qr">QR Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="admin" className="mt-6">
          <AdminTab restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <SubscriptionTab restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="tables" className="mt-6">
          <TablesTab restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="qr" className="mt-6">
          <QrCodesTab restaurantId={restaurantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
