export interface ThriftbotItem {
  id: number;
  sku: string;
  title: string | null;
  description: string | null;
  price: number | null;
  cost: number | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  condition: string | null;
  target_gender: string | null;
  colors: string | null;
  materials: string | null;
  size: string | null;
  weight_lbs: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  tags: string | null;
  notes: string | null;
  zip_code: string | null;
  occasion: string | null;
  image_urls: string[];
}

export interface FillFormMessage {
  type: 'FILL_VENDOO_FORM';
  item: ThriftbotItem;
}

export interface FillResultMessage {
  type: 'FILL_RESULT';
  success: boolean;
  itemId: number;
  error?: string;
}

export interface DownloadImagesMessage {
  type: 'DOWNLOAD_IMAGES';
  imageUrls: string[];
  sku: string;
}
