/** Re-export full demo catalog — see mock-catalog.ts */
export {
  MOCK_PRODUCTS,
  MOCK_PRODUCT_COUNT,
  getMockProductBySlug,
  saveLocalProduct,
  deleteLocalProduct,
  initializeMockProductsOnClient,
  syncServerProducts,
  ensureTuyaCatalogLoaded,
  isDemoOrTestProduct,
} from "@/lib/mock-catalog";
