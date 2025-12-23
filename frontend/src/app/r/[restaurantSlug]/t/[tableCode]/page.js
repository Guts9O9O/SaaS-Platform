import ClientMenu from "./ClientMenu";

export default async function TableMenuPage({ params }) {
  // ✅ Next.js 16: params must be awaited in server component
  const { restaurantSlug, tableCode } = await params;

  return (
    <ClientMenu
      restaurantSlug={restaurantSlug}
      tableCode={tableCode}
    />
  );
}
