import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ProductRow } from "@/types/commerce";

const DEFAULT_SPECS: [string, string][] = [
  ["Working Temperature", "-10°C to 55°C"],
  ["Detection Range", "Up to 8 meters"],
  ["Wireless Frequency", "2.4 GHz / 868 MHz"],
  ["Operating Voltage", "3V (2× AAA) / 12V DC"],
  ["Ingress Protection", "IP44"],
  ["Cloud Platform", "Tuya Cloud / Smart Life"],
  ["Warranty", "12 months manufacturer"],
];

export function ProductSpecTabs({ product }: { product: ProductRow }) {
  const custom =
    product.specs && typeof product.specs === "object"
      ? Object.entries(product.specs as Record<string, string>)
      : [];

  const formattedCustom = custom.map(([k, v]) => {
    let label = k;
    if (k === "protocol") label = "Wireless Protocol";
    else if (k === "power") label = "Power Supply";
    else if (k === "ecosystem") label = "Smart Ecosystem";
    return [label, String(v)] as [string, string];
  });

  const specs: [string, string][] = [
    ["Manufacturer", product.manufacturer ?? "—"],
    ["Category", product.category],
    ...formattedCustom,
  ];

  if (formattedCustom.length === 0) {
    specs.push(...DEFAULT_SPECS);
  }

  specs.push(["SKU", (product.id || "PROD").slice(0, 8).toUpperCase()]);

  return (
    <section className="mt-12 rounded-xl border bg-card p-4 sm:p-6">
      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Product Overview</TabsTrigger>
          <TabsTrigger value="specs">Technical Specifications</TabsTrigger>
        </TabsList>
        <TabsContent
          value="overview"
          className="mt-6 prose prose-sm max-w-none text-muted-foreground leading-relaxed"
        >
          <p>{product.description}</p>
          <p className="mt-3">
            Engineered for seamless integration with the Tuya Smart / Smart Life ecosystem, this
            device delivers low-latency cloud response, robust mesh connectivity, and
            enterprise-grade reliability.
          </p>
        </TabsContent>
        <TabsContent value="specs" className="mt-6 overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <tbody>
              {specs.map(([k, v], i) => (
                <tr key={`${k}-${i}`} className={i % 2 ? "bg-muted/40" : ""}>
                  <td className="px-4 py-2.5 font-medium w-1/3">{k}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
      </Tabs>
    </section>
  );
}
