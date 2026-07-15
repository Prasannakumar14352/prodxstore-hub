/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as affiliates from "../affiliates.js";
import type * as aiTestimonials from "../aiTestimonials.js";
import type * as aiTestimonialsGen from "../aiTestimonialsGen.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as coupons from "../coupons.js";
import type * as dataExport from "../dataExport.js";
import type * as deliveryAssets from "../deliveryAssets.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as razorpay from "../razorpay.js";
import type * as reviews from "../reviews.js";
import type * as reviewsAi from "../reviewsAi.js";
import type * as settings from "../settings.js";
import type * as socialProof from "../socialProof.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  affiliates: typeof affiliates;
  aiTestimonials: typeof aiTestimonials;
  aiTestimonialsGen: typeof aiTestimonialsGen;
  analytics: typeof analytics;
  auth: typeof auth;
  coupons: typeof coupons;
  dataExport: typeof dataExport;
  deliveryAssets: typeof deliveryAssets;
  email: typeof email;
  http: typeof http;
  orders: typeof orders;
  products: typeof products;
  razorpay: typeof razorpay;
  reviews: typeof reviews;
  reviewsAi: typeof reviewsAi;
  settings: typeof settings;
  socialProof: typeof socialProof;
  storage: typeof storage;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
