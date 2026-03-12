# Freezy Bite — Full Project Explanation

This document describes the **Freezy Bite** e-commerce project: a freeze-dried snacks store with a customer-facing website and an admin dashboard, backed by a Next.js API and PostgreSQL.

---

## 1. What the project is

**Freezy Bite** is a full-stack e-commerce application for selling freeze-dried fruits and candy. It has:

- **Storefront** — Public website where customers browse products (Fruits, Candy, Offers), add to cart, and checkout (including guest checkout).
- **Admin dashboard** — Protected area for staff to manage products, orders, offers, customers, content, and settings. Access is role-based (Super Admin, Admin, Manager, Staff).
- **Backend** — Next.js 16 app that serves both the REST API and the static HTML/CSS/JS of the storefront and admin.

The stack is **Next.js 16**, **React 19**, **Drizzle ORM**, **PostgreSQL** (e.g. Neon), **JWT** for auth, and **plain HTML/JS** for the frontend (no React on the storefront).

---

## 2. Repository and run structure

- **Root** — The project lives in a folder (e.g. `ecommerce-backend copy 2/`). There is no root `package.json`; everything runs from **backend/**.
- **Backend** — This is the main app:
  - **Next.js** server (`next dev` / `next start`).
  - **Drizzle** for DB (schema, migrations, seed).
  - **Static files** in `backend/public/` (storefront + admin HTML/CSS/JS).
  - **API routes** in `backend/src/app/api/`.

**Important:** Run and build from **backend/**:

```bash
cd backend
npm install
npm run db:push    # apply schema
npm run db:seed    # optional: seed data
npm run dev        # http://localhost:3000
```

**Environment:** `backend/.env` must define at least `DATABASE_URL` (PostgreSQL). Optional: `JWT_SECRET` (admin and storefront JWTs), email/Resend, etc.

---

## 3. Technology stack

| Layer        | Technology |
|-------------|------------|
| Runtime     | Node.js    |
| Framework   | Next.js 16 |
| UI (API app)| React 19   |
| Database    | PostgreSQL (e.g. Neon) |
| ORM         | Drizzle ORM |
| Auth        | JWT (jsonwebtoken), bcrypt |
| Frontend    | Vanilla HTML/CSS/JS (no React on storefront/admin) |
| Styling     | Custom CSS (e.g. `home.css`, `dashboard.css`, `checkout.css`) |

---

## 4. Database (Drizzle schema)

All tables are defined in **`backend/db/schema.ts`** and used via **`backend/db/index.ts`** (Drizzle client). Dialect: **PostgreSQL**. Migrations / push: **`backend/drizzle.config.ts`** (uses `DATABASE_URL`).

### Admin / dashboard

- **admin_users** — Dashboard login: email, password hash, name, role (Super Admin, Admin, Manager, Staff), `access` (JSON array of allowed pages), `is_active`.
- **employees** — Employee records (name, email, phone, position, department, status, etc.).
- **messages** — Contact/support messages (sender, subject, message, read/archived/deleted flags).
- **offers** — Promotional offers: `product_sku`, name, image, original/sale price, discount %, dates, `is_active`.
- **website_content** — CMS key-value store (e.g. hero, FAQ, policies) by `section_key`.

### E-commerce core

- **products** — SKU, name, description, price, stock, min_stock, **images** (array of URLs), category, attributes, status (active/soft-deleted).
- **users** — Customers: email, optional password hash (guests have null), full_name, phone, address, total_orders, total_spent, status.
- **orders** — user_id (nullable for guest), status, total_amount, payment fields (Stripe session, payment method, deposit, etc.).
- **order_items** — order_id, product_id, quantity, price_at_purchase.
- **cart_items** — user_id, product_id, quantity (server-side cart for logged-in users).
- **reviews** — product_id, user_id, rating, comment.

---

## 5. Backend API (Next.js routes)

All API routes live under **`backend/src/app/api/`**. Next.js rewrites in **`next.config.js`** map `/` to `/home.html` and clean URLs (e.g. `/offers` → `/offers.html`, `/admin/orders` → `/admin/orders.html`). Static files are served from **`backend/public/`**.

### Public storefront APIs (no admin JWT)

- **GET /api/settings** — Website content/settings (from `website_content`).
- **GET /api/products**, **GET /api/products/[id]** — List and get product(s); filters and pagination on list.
- **GET /api/offers** — Active offers only.
- **POST /api/email** — Contact/email.
- **GET/POST /api/reviews** — List and create reviews.
- **GET/POST/DELETE /api/cart** — Cart by `userId` (query or body).
- **GET /api/cart/summary** — Subtotal, tax (e.g. 14%), total (EGP) for a user’s cart.
- **POST /api/checkout** — Create order: either from DB cart (userId) or guest payload (items + guest info). Validates stock, creates order + order_items, updates stock, clears cart when applicable.
- **POST /api/auth/login**, **POST /api/auth/signup**, **POST /api/auth/logout** — Customer auth (JWT, 7d).
- **GET /api/orders/history** — Orders for a customer (`userId`).
- **GET /api/orders/[id]**, **PUT /api/orders/[id]** — Single order get/update.

### Admin APIs (under /api/admin/)

All require admin JWT (Bearer) in practice; `/api/admin/auth/me` and login enforce it.

- **Auth:** POST login, GET me, PUT password.
- **CRUD:** users, settings, products (with soft delete), orders, offers, messages, employees, customers, content.
- **Other:** GET stats, GET/PUT inventory (bulk stock), GET analytics.

Admin login returns a JWT that includes `userId`, `email`, `role`, `isAdmin: true`. The dashboard stores it (e.g. in localStorage) and sends it as `Authorization: Bearer <token>` on admin API calls.

---

## 6. Storefront (customer site)

**Location:** **`backend/public/`** (HTML, CSS, JS) and **`backend/public/scripts/`**, **`backend/public/styles/`**.

### Main pages

- **home.html** — Home: hero, moods, sample product cards, offers grid, favorites, “Why freeze-dried”, FAQ. Cart drawer and auth modal. Uses **home.js** (cart, burger, profile, add-to-cart, offers fetch).
- **fruits.html**, **candy.html** — Category product grids; load products (e.g. from API or embedded data), add to cart (cart in **localStorage**).
- **offers.html** — Fetches **GET /api/offers** and renders offer cards (discount, size selector, add to cart).
- **checkout.html** — Order summary (from **localStorage** cart `fb_cart_v1`), customer form, optional InstaPay; submit creates order (e.g. **POST /api/checkout** or similar).
- **order-success.html** — Thank-you page (e.g. query params: orderId, name, email).
- **about.html**, **contact.html**, **terms.html**, **privacy.html**, **returns.html** — Legal/info; some load **home.js** for header, cart, auth modal.
- **splash.html** — Loading/splash.

### Storefront behavior

- **Cart** — Stored in **localStorage** under `fb_cart_v1` (object: key = SKU or `SKU__size`, value = quantity). **home.js**, **checkout.js**, **candy.js**, etc. read/write it. Cart drawer and badge are updated by **home.js** (`updateCartBadges()`).
- **Auth** — Optional customer login (JWT in localStorage, e.g. `fb_auth_token`, `fb_auth_user`). Guest checkout is supported; checkout can send guest details + cart items to the backend.
- **Product sizes** — Optional per-product sizes (e.g. 50g, 100g) are stored in **localStorage** (`fb_product_sizes`, set from dashboard); **site-settings.js** exposes `getProductSizesForSku(sku)`.
- **Offers / products** — Loaded from **GET /api/offers** and **GET /api/products**. Cards can show multiple images (up to 10) with a small gallery (main image + thumbs) in **home.js** and **offers.html** (and sample cards on home).
- **Header** — Burger menu, profile (auth modal), cart (drawer). **home.js** wires these and uses programmatic navigation for burger links; cart/profile work on all pages that include **home.js** and the cart/auth markup.

---

## 7. Admin dashboard

**Location:** **`backend/public/admin/`** (HTML, CSS, JS). Shared scripts: **`backend/public/admin/scripts/auth.js`**, **dashboard.js**, etc.

### Entry and auth

- **login.html** — Admin login form; calls **POST /api/admin/auth/login**. Optional: “Enter without logging in” (bypass) and “Try Demo Accounts” (pre-defined emails/passwords). On success, stores JWT and user in localStorage and redirects to **index.html**.
- **auth.js** — Reads JWT, checks **GET /api/admin/auth/me**, redirects to login if not authenticated. Handles logout and token removal. Optional bypass flag skips redirect so the dashboard can be used without login (e.g. for demos).

### Main pages (all under /admin/)

- **index.html** — Overview/dashboard (stats, recent orders, etc.).
- **products.html** — Product list and CRUD; supports multiple images (up to 10) and size options (per-SKU list, stored in localStorage).
- **orders.html** — Order list and detail.
- **offers.html** — Offers CRUD.
- **customers.html** — Customer (users) list.
- **users.html** — Admin users management.
- **employees.html** — Employees.
- **messages.html** — Contact messages.
- **inventory.html** — Stock management.
- **content.html** — Website content/CMS.
- **analytics.html** — Analytics.
- **settings.html** — Store settings.
- **trash.html** — Deleted items (e.g. orders/products) with restore and permanent delete.
- **my-account.html** — Current admin profile/settings.

Dashboard calls **DashboardAPI** (or equivalent) that uses **GET/POST/PUT/DELETE** to **/api/admin/*** with the stored JWT in the `Authorization` header.

---

## 8. Auth flows (summary)

- **Storefront customers** — Optional. Login/signup via **/api/auth/login** and **/api/auth/signup**; JWT stored in localStorage. Guests have no token; checkout can still create orders with guest info.
- **Admin** — Login via **/api/admin/auth/login** (email + password against `admin_users`). JWT contains `userId`, `email`, `role`, `isAdmin`. Used for all **/api/admin/** requests. Optional bypass (no backend change) allows opening the dashboard without login for demos.

---

## 9. Cart and checkout flow

- **Cart (storefront)** — Client-side cart in **localStorage** (`fb_cart_v1`). Keys can be SKU or `SKU__size`; values are quantities. No backend cart is required for the current storefront flow.
- **Checkout** — **checkout.html** reads the same localStorage cart, fetches product prices (e.g. **GET /api/products**) to compute totals, and submits the order (e.g. **POST /api/checkout**) with either:
  - **userId** (checkout from DB cart), or  
  - **items** (SKU + qty + optional size) + **guest** (name, email, phone, address).  
  Backend creates/updates user if guest, creates order + order_items, decrements product stock, and returns orderId for the success page.

---

## 10. Products and offers

- **Products** — Stored in **products** (id, sku, name, price, stock, **images** array, category, status). Admin can add up to 10 images per product. Optional “sizes” per product are stored in the frontend only (localStorage `fb_product_sizes`).
- **Offers** — Stored in **offers** (product_sku, name, image, original/sale price, discount %, is_active). Public **GET /api/offers** returns only active offers. Admin CRUD at **/api/admin/offers**. Offer cards on the site can show multiple images when the API returns an `images` array (e.g. from the linked product).

---

## 11. Scripts and tooling

- **backend/package.json** — `dev`, `build`, `start`, `lint`, `db:seed`, `db:push`, `db:studio`.
- **backend/scripts/** — One-off scripts (e.g. **create-admin.ts**, **reset-admins.ts**, **reset-password.ts**). Run with `npx tsx scripts/<name>.ts`.
- **backend/db/seed.ts** — Seeds admin users (including demo accounts), sample customers, employees, products, offers. Optional **clear-products.ts** for clearing product data.

---

## 12. Summary diagram (conceptual)

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (customer)                                               │
│  • home.html, fruits.html, candy.html, offers.html, checkout     │
│  • Cart: localStorage (fb_cart_v1)                                │
│  • Optional: customer JWT (fb_auth_token)                           │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js (backend)                                               │
│  • Serves: / → home.html, /offers → offers.html, /admin/* → admin │
│  • API: /api/products, /api/offers, /api/checkout, /api/auth/*   │
│  • Admin API: /api/admin/* (JWT)                                  │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL (Drizzle)                                            │
│  • products, users, orders, order_items, cart_items, reviews      │
│  • admin_users, employees, messages, offers, website_content     │
└─────────────────────────────────────────────────────────────────┘
```

---

This document reflects the structure and behavior of the Freezy Bite project as implemented in the codebase. For deployment, set `DATABASE_URL` (and optionally `JWT_SECRET`), run migrations/seed, and start the Next.js server from **backend/**.
