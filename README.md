# ServeGood

Restaurant discovery for Andheri, Mumbai: verified diner reviews, audited hygiene
scores, and a delivery price comparison for one identical basket, with clearly
labelled sponsored placement as the revenue model.

```
fe/        React 19 + Vite + TypeScript + Tailwind v4 (landing page and the full app)
backend/   Java 21 + Spring Boot 3.5 + Spring Security (JWT) + JPA + Flyway + PostgreSQL
DESIGN.md  Visual system (colours, type, components) used by every page
MOTION.md  Animation rules for the landing page
```

## Run it locally

### 1. PostgreSQL

Install PostgreSQL 14 or newer, then create a database and user:

```sql
CREATE USER servegood WITH PASSWORD 'choose-a-password';
CREATE DATABASE servegood OWNER servegood;
```

Flyway creates every table on first start. The schema needs the `pg_trgm`
extension, which the database owner can enable on PostgreSQL 13+.

### 2. Backend (port 8081)

Set the environment variables listed in [backend/.env.example](backend/.env.example),
at minimum `DB_PASSWORD`, `JWT_SECRET`, and either `ADMIN_EMAIL`/`ADMIN_PASSWORD` or
`SEED_DEMO=true` with `SEED_DEMO_PASSWORD`. Then:

```bash
cd backend
./mvnw spring-boot:run
```

On Windows use `mvnw.cmd`. The Maven wrapper downloads Maven on first use.

- API base: `http://localhost:8081/api`
- Swagger UI: `http://localhost:8081/swagger-ui.html`
- Tests: `./mvnw test`

### 3. Frontend (port 5173)

```bash
cd fe
npm install
npm run dev
```

`VITE_API_BASE_URL` (see [fe/.env.example](fe/.env.example)) points the app at the API.

## Roles and where they land

| Role | Dashboard | Created by |
|---|---|---|
| Consumer | `/dashboard` | Self sign-up |
| Restaurant owner | `/restaurant-dashboard` | Self sign-up; each restaurant needs admin approval |
| Reviewer | `/reviewer` | An admin (Users → Add staff account) |
| Admin | `/admin` | `ADMIN_EMAIL`/`ADMIN_PASSWORD` on first start, then other admins |

## Business rules the code enforces

- Ratings are recomputed only from **VERIFIED** reviews (`RestaurantService.recomputeRatings`);
  advertising code never touches them.
- Sponsored placements are served from their own endpoint (`/api/ads`), rendered in a
  separate strip with a "Sponsored" label, and never enter ranked search results.
- Hygiene scores come only from admin-approved audits: eight weighted categories, a
  0-100 score, tiers at 85 (Verified Clean) and 70 (Standard Good), valid for 12 months.
  Diners' "cleanliness seen" ratings are shown separately.
- Delivery prices are entered by people and labelled with who recorded them and when.
  Nothing is shown as live unless it came from a connected provider API. To connect one,
  implement `DeliveryQuoteClient` (backend `service/delivery`) and set that provider to `API`.
- Owners can only manage restaurants linked to them; reviewers can only audit restaurants
  assigned to them. Both are checked in services, not only by URL.
- Passwords are BCrypt-hashed. Refresh tokens are httpOnly cookies, stored only as SHA-256
  hashes, rotated on every use, with reuse detection.

## Not included yet

- **Email delivery**: `LoggingEmailSender` writes emails, including password-reset links,
  to the backend log. Add an SMTP or provider implementation of `EmailSender` for production.
- **Payments**: campaign payment status is set by an admin; no payment gateway is connected.
- **Cloud file storage**: uploads go to `UPLOAD_DIR` through `LocalStorageService`; implement
  `StorageService` for S3, GCS or similar.
