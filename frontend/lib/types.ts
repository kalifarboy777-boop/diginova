/** Types des réponses de l'API Laravel. Montants : entiers XOF. Dates : ISO 8601. */

export type CoverType = "chart" | "grid" | "chat" | "sheet" | "doc" | "notion" | "book" | "brand";
export type License = "PERSONAL" | "COMMERCIAL";
export type PaymentMethod = "WAVE" | "ORANGE_MONEY" | "MTN_MOMO" | "MOOV_MONEY" | "CARD";
export type OrderStatus = "PENDING" | "AWAITING_CONFIRMATION" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED" | "NEEDS_REVIEW";
export type Role = "CLIENT" | "CREATOR" | "MODERATOR" | "ADMIN";

export interface CategoryRef {
  name: string;
  label: string;
  slug: string;
}

export interface ProductCard {
  id: number;
  slug: string;
  title: string;
  category?: CategoryRef;
  price: number;
  compare_at_price: number | null;
  rating: number;
  rating_count: number;
  cover_type: CoverType;
  cover_url: string | null;
  badge: string | null;
  seller?: { name: string; slug: string };
  is_favorite?: boolean;
}

export interface ProductDetail extends ProductCard {
  short_description: string | null;
  description: string | null;
  commercial_price: number;
  subcategory: { name: string; slug: string } | null;
  sales_count: number;
  tags: string[];
  formats: string[];
  includes: { title: string; description: string; format: string }[];
  faq: { q: string; a: string }[];
  version: string;
  version_updated_at: string | null;
  compatibility: string | null;
  language: string;
  total_size: number;
  file_count: number;
  preview_pages: number;
  video_url: string | null;
  video_duration: string | null;
  images: string[];
  /** Pourcentages de 5★ à 1★. */
  rating_distribution: number[];
  published: boolean;
  seller: {
    name: string;
    slug: string;
    initials: string;
    verified: boolean;
    plan: string;
    city: string | null;
    member_since: number;
    product_count: number;
    rating: number;
    sales: number;
  };
}

export interface Review {
  id: number;
  author: string;
  initials: string;
  rating: number;
  comment: string | null;
  verified: boolean;
  created_at: string;
  seller_reply: string | null;
  seller_replied_at: string | null;
  product?: { title: string; slug: string };
}

export interface Bundle {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  highlights: string[];
  price: number;
  value: number;
  discount_percent: number;
  cover_type: CoverType;
  featured: boolean;
  products?: ProductCard[];
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; last_page: number; per_page?: number; from?: number; to?: number };
}

export interface CartLine {
  id: number;
  type: "product" | "bundle";
  license: License;
  price: number;
  compare_at_price: number | null;
  group: string | null;
  product: (ProductCard & { commercial_price: number; seller: { name: string; slug: string } }) | null;
  bundle: Bundle | null;
}

export interface Cart {
  items: CartLine[];
  count: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon: { code: string; label: string } | null;
  coupon_error: string | null;
  upsell: { bundle: { id: number; slug: string; title: string; price: number; value: number }; message: string } | null;
}

export interface User {
  id: number;
  name: string;
  first_name: string;
  initials: string;
  email: string;
  phone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  role: Role;
  avatar_url: string | null;
  has_password: boolean;
  is_creator: boolean;
  seller: { name: string; slug: string; plan: string; verified: boolean } | null;
}

export interface OrderItem {
  id: number;
  title: string;
  license: License;
  list_price: number;
  unit_price: number;
  bundle: string | null;
  product: { slug: string; cover_type: CoverType; category: string | null } | null;
  library_item_id: number | null;
}

export interface Order {
  id: number;
  number: string;
  status: OrderStatus;
  status_label: string;
  email: string;
  phone: string | null;
  subtotal: number;
  discount: number;
  total: number;
  coupon: string | null;
  payment_method: PaymentMethod | null;
  payment_method_label: string | null;
  payment_phone: string | null;
  created_at: string;
  paid_at: string | null;
  expires_at: string | null;
  items_count: number;
  summary: string | null;
  items: OrderItem[];
  has_invoice: boolean | null;
}

export interface LibraryItem {
  id: number;
  product: {
    id: number;
    slug: string;
    title: string;
    cover_type: CoverType;
    category: string | null;
    category_name: string | null;
    category_slug: string | null;
    version: string;
    version_updated_at: string | null;
  };
  license: License;
  license_label: string;
  granted_at: string;
  download_count: number;
  download_limit: number;
  has_update: boolean;
  revoked: boolean;
  order_number: string | null;
  order_id: number | null;
  reviewed?: boolean;
  files?: { id: number; name: string; size: number; format: string; version: string }[];
}

export interface OrderStatusPayload {
  id: number;
  number: string;
  status: OrderStatus;
  total: number;
  method: PaymentMethod | null;
  method_label: string | null;
  payment_phone: string | null;
  expires_at: string | null;
  server_time: string;
  instructions: string | null;
  redirect_url: string | null;
  reference: string | null;
  attempts: number;
}
