

## Shopee/Lazada-Style Shipping Options

### Overview
Replace the current "buyer books" / "seller books" delivery method with a courier-based shipping system like Shopee, Lazada, and TikTok Shop. Sellers select which couriers they support when posting an item, and buyers choose from those available couriers at checkout.

### How It Works

1. **Seller posts item** -- picks which couriers they support (e.g., J&T Express, Flash Express, Ninja Van)
2. **Buyer checks out** -- sees only the couriers the seller enabled, picks one
3. **Order is placed** -- the selected courier is saved with the order
4. **Seller ships** -- enters tracking number for the chosen courier

### Changes

**1. Add a `shipping_couriers` table (database migration)**
Stores available courier options with estimated fees:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | e.g., "J&T Express" |
| logo_url | text | Optional courier logo |
| estimated_days | text | e.g., "3-5 days" |
| base_fee | numeric | Default shipping fee |
| is_active | boolean | Admin can enable/disable |

Seed with Philippine couriers: J&T Express, Flash Express, Ninja Van, LBC Express, GoGo Xpress.

**2. Add a `listing_couriers` junction table (database migration)**
Links listings to their supported couriers:

| Column | Type |
|--------|------|
| id | uuid |
| listing_id | uuid (FK) |
| courier_id | uuid (FK) |
| shipping_fee | numeric (nullable, override) |

RLS: Anyone can read; only listing owner can insert/delete.

**3. Add `courier_id` column to `orders` table (database migration)**
Store which courier the buyer selected at checkout. Also keep `delivery_provider` for display.

**4. Update `PostItemForm` -- add courier selection**
- After the location fields, add a "Shipping Options" section
- Fetch couriers from `shipping_couriers` table
- Show checkboxes for each courier with name, estimated days, and base fee
- Seller must enable at least one courier
- On submit, insert rows into `listing_couriers` for each selected courier

**5. Replace `DeliveryMethodSelector` with `CourierSelector`**
New component for checkout that:
- Takes listing IDs from cart, queries `listing_couriers` joined with `shipping_couriers`
- Shows only couriers available across ALL cart items (intersection)
- Displays courier name, estimated delivery time, and fee
- Styled like Shopee's shipping selector (radio cards with courier logo, name, fee, ETA)

**6. Update `Checkout.tsx`**
- Replace `DeliveryMethodSelector` with the new `CourierSelector`
- Store selected `courier_id` instead of `delivery_method`
- Pass courier info to `createOrder`

**7. Update `useOrders` hook**
- Add `courier_id` to the `createOrder` function parameters
- Save courier name as `delivery_provider` on the order for easy display

**8. Update `DeliveryStatusTracker` and `SellerDashboard`**
- Show the selected courier name (from `delivery_provider`) instead of "buyer-booked" / "seller-booked"
- Tracking number input stays the same -- seller enters it after shipping

### Courier List (Seeded Data)

| Courier | Est. Days | Base Fee |
|---------|-----------|----------|
| J&T Express | 3-5 days | 85 |
| Flash Express | 2-4 days | 90 |
| Ninja Van | 3-5 days | 85 |
| LBC Express | 2-3 days | 100 |
| GoGo Xpress | 3-7 days | 75 |

### Technical Details

- `shipping_couriers` has public SELECT policy (anyone can view), no INSERT/UPDATE/DELETE for regular users
- `listing_couriers` has public SELECT, owner-only INSERT/DELETE via join to listings table
- The old `delivery_method` column on orders remains for backward compatibility but new orders will use `courier_id`
- Cart checkout finds the intersection of couriers across all sellers' items -- if no common courier exists, a message prompts the buyer to check out items separately

