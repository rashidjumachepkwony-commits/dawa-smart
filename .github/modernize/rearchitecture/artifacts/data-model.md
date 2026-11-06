# Existing Data Model

This is an inventory of the SQL migrations and browser stores present in the repository, not a schema redesign. The live Supabase schema and applied migration history were not queried. The migration set defines 20 PostgreSQL tables.

## Browser-Local Stores

`app.html` opens IndexedDB database `YetuPharmcareDB` at version 5 and declares these object stores, keyed by `id`: `products`, `sales`, `saleItems`, `patients`, `batches`, `controlledLogs`, `labTests`, `expenses`, and `users`. It creates a `pharmacy_id` index over the local `pharmacyId` property when creating a store. Queue, license, tenant, and Supabase configuration state are stored separately in localStorage by the corresponding modules.

## PostgreSQL Entity Inventory

Shared record conventions in the original business tables include timestamps, a `deleted_at` tombstone, and integer `revision`; the multi-tenant migration adds nullable UUID `pharmacy_id` foreign keys to business tables. These conventions are not universal: `users`, pharmacy memberships, M-Pesa records, and stock movement records have differing fields.

| Table | Primary fields and database relationships |
|---|---|
| `users` | UUID `id`; `username`, `password_hash`, `full_name`, `email`, `phone`, `role`, `status`, `pharmacy`, `verified`, `created_at`, `updated_at`. `role` and `status` have check constraints. |
| `products` | Text `id`; `name`, `sku`, `category`, `unit`, `buying_price`, `selling_price`, `quantity`, `expiry_date`, `generic`, `controlled`, `badge`, `created_at`, `updated_at`, `deleted_at`, `revision`, later `pharmacy_id` UUID and nullable `drug_id` → `drugs.id`. |
| `batches` | Text `id`; nullable `product_id` → `products.id` (cascade delete), `product_name`, `batch_number`, `expiry_date`, `quantity`, `buying_price`, `selling_price`, `supplier`, `received_date`, `created_at`, `updated_at`, `deleted_at`, `revision`, later `pharmacy_id`. |
| `sales` | Text `id`; `customer`, `customer_phone`, `customer_id_number`, `subtotal`, `original_subtotal`, `vat`, required `total`, `payment`, `change_amount`, constrained `method`, `cashier`, `receipt_number`, `customer_id`, `credit_amount`, `negotiated`, `original_total`, `is_backdated`, `sale_date`, `created_at`, `updated_at`, `deleted_at`, `revision`, later `pharmacy_id`. |
| `sale_items` | Text `id`; nullable `sale_id` → `sales.id` (cascade delete), `product_id`, required `quantity`, required `price`, `original_price`, `buying_price`, `name`, `controlled`, `is_negotiated`, `created_at`, `updated_at`, `deleted_at`, `revision`, later `pharmacy_id`. |
| `patients` | Text `id`; required `first_name`, `last_name`, `phone`, `email`, `dob`, constrained `gender`, `credit`, `credit_limit`, `history`, `insurance`, `created_at`, `updated_at`, `deleted_at`, `revision`, later `pharmacy_id`. |
| `lab_tests` | Text `id`; `patient_name`, `test_type`, `requested_by`, `notes`, constrained `status`, `results`, `test_date`, `created_at`, `updated_at`, `deleted_at`, `revision`, later `pharmacy_id`. `patient_name` is not a patient foreign key. |
| `expenses` | Text `id`; `type`, required `amount`, `description`, `expense_date`, `created_at`, `updated_at`, `deleted_at`, `revision`, later `pharmacy_id`. |
| `controlled_logs` | Text `id`; `product_id`, `action`, `user_name`, `quantity`, `timestamp`, `created_at`, `updated_at`, `deleted_at`, `revision`, later `pharmacy_id`. |
| `pharmacies` | UUID `id`; `name`, `slug`, `address`, `phone`, `kra_pin`, text `owner_id` after the auth-ID migration, constrained `status`, `created_at`, `updated_at`. The initial owner FK to `auth.users` is dropped by the later migration. |
| `pharmacy_members` | UUID `id`; UUID `pharmacy_id` → `pharmacies.id` (cascade delete), text `auth_user_id` after the auth-ID migration, `email`, constrained `role`, constrained `status`, UUID `invited_by`, `created_at`, `updated_at`. Unique indexes cover `(pharmacy_id, auth_user_id)` and `(pharmacy_id, email)`. |
| `suppliers` | Text `id`; `name`, `phone`, `email`, `address`, `license_number`, constrained `status`, UUID `pharmacy_id`, `created_at`, `updated_at`, `deleted_at`, `revision`. |
| `drug_categories` | Text `id`; `name`, `description`, constrained `status`, UUID `pharmacy_id`, `created_at`, `updated_at`, `deleted_at`, `revision`. |
| `drug_forms` | Text `id`; `name`, `description`, constrained `status`, UUID `pharmacy_id`, `created_at`, `updated_at`, `deleted_at`, `revision`. |
| `drugs` | Text `id`; `drug_name`, `generic_name`, `brand_name`, `strength`, `category_id` → `drug_categories.id` (set null), `form_id` → `drug_forms.id` (set null), `route_of_administration`, `manufacturer`, `barcode`, `registration_number`, constrained `prescription_status`, `description`, `reorder_level`, constrained `status`, UUID `pharmacy_id`, `created_at`, `updated_at`, `deleted_at`, `revision`. |
| `drug_batches` | Text `id`; `drug_id` → `drugs.id` (cascade), `batch_number`, `manufacturing_date`, required `expiry_date`, `quantity_received`, `quantity_remaining`, `purchase_price`, `selling_price`, `total_cost`, `supplier_id` → `suppliers.id` (set null), `supplier_name`, `supplier_phone`, `received_date`, constrained `status`, UUID `pharmacy_id`, `created_at`, `updated_at`, `deleted_at`, `revision`. |
| `drug_stock_movements` | Text `id`; `drug_id` → `drugs.id` (cascade), nullable `batch_id` → `drug_batches.id` (set null), constrained `movement_type`, required `quantity`, `quantity_before`, `quantity_after`, `unit_price`, `reference_id`, `reference_type`, `notes`, `user_name`, UUID `pharmacy_id`, `created_at`. |
| `report_archives` | Text `id`; required `report_name`, required `report_type`, `start_date`, `end_date`, `generated_by`, `generated_at`, required JSONB `report_data`, `total_sales`, `cash_sales`, `mpesa_sales`, `card_sales`, `credit_sales`, `total_expenses`, `gross_profit`, `net_profit`, `cost_of_goods_sold`, `pdf_storage_path`, `is_deleted`, UUID `pharmacy_id` → `pharmacies.id`, `created_at`, `updated_at`. |
| `mpesa_configs` | UUID `id`; required UUID `pharmacy_id` → `pharmacies.id` (cascade), `paybill_number`, `till_number`, constrained required `account_type`, required `business_shortcode`, required `consumer_key`, required `consumer_secret`, required `passkey`, constrained `environment`, `callback_url`, `result_url`, `timeout_url`, `is_enabled`, `min_amount`, `max_amount`, UUID `created_by`, `created_at`, `updated_at`. A unique index enforces one configuration per pharmacy. |
| `mpesa_transactions` | UUID `id`; required UUID `pharmacy_id` → `pharmacies.id` (cascade), nullable text `sale_id` → `sales.id` (set null), required `phone_number`, required `amount`, `merchant_request_id`, `checkout_request_id`, `mpesa_receipt_number`, `result_code`, `result_description`, constrained required `payment_status`, `transaction_date`, JSONB `transaction_metadata`, `created_at`, `updated_at`. |

## Relationships and Persistence Behavior

- A pharmacy has many memberships; a membership is keyed to a pharmacy and a legacy text auth identifier. The auth-ID migration removes the original auth-user foreign keys for `owner_id` and `auth_user_id`.
- A product can link to a drug catalogue entry; legacy `batches` are product-linked while `drug_batches` are drug- and supplier-linked.
- Sales have sale items; M-Pesa transactions optionally reference a sale.
- Drug catalogue entries reference categories and dosage forms. Drug batches reference drugs and suppliers. Stock movements reference drugs and optionally a batch.
- Lab tests retain a patient name string rather than a patient foreign key.
- The database defines `receive_drug_batch`, `deduct_drug_stock`, `get_drug_stock_summary`, and `identify_expired_batches` functions in the drug-management migration. The functions represent database-side stock operations; normal SPA CRUD and sync operations also occur separately.
- The SPA's IndexedDB wrapper opens read/write transactions per store operation. The Worker processes a sync batch operation-by-operation; the reviewed code does not establish a single database transaction spanning the whole HTTP batch.
- The sync boundary currently forwards local store names as entity names, while the Worker allowlist and SQL tables use snake_case for several corresponding entities; the repository contains no translation layer for `saleItems`, `labTests`, or `controlledLogs`, and `users` is not in the Worker allowlist.

## Migration-Chain Caveats

The two `20240101000003_*` files and two `20240101000005_*` files share 14-digit migration version prefixes. The file `20240101000003_fix_auth_user_id_type.sql` drops and recreates `pharmacy_members.auth_user_id` and `pharmacies.owner_id` as text columns after removing their foreign keys; this sequence does not copy existing values into the recreated columns. Applying it to populated tables therefore risks losing those identifiers. Confirm database state and backup/rollout requirements before applying migrations; no migration was run as part of this analysis.
