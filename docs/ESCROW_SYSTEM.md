# PayPal Escrow System Documentation

## Overview

Your freelance app now includes a **complete escrow system** that holds client payments until work is completed and approved. This protects both parties:

- **Clients**: Money is held until work is completed
- **Freelancers**: Payment is guaranteed once work is approved

## How It Works

### Phase 1: Authorization (Funds Held in Escrow)
```
Client creates order → Orders $100 worth of work → Client authorizes PayPal payment
↓
System receives authorization ID and holds $100 in escrow (not captured yet)
```

### Phase 2: Work Completion
```
Freelancer completes work → Uploads deliverables → Order marked as "complete"
↓
Client reviews and can approve partial or full payment release
```

### Phase 3: Release & Capture
```
Client releases $40 for initial deliverable → System captures $40 from escrow
↓
Client releases remaining $60 → System captures $60 from escrow
↓
All funds captured, escrow complete
```

## Database Schema

New columns added to `orders` table:

| Column | Type | Purpose |
|--------|------|---------|
| `authorized_amount` | numeric(10,2) | Total amount held in escrow |
| `approved_release_amount` | numeric(10,2) | Total client approved for capture |
| `captured_amount` | numeric(10,2) | Total actually captured from PayPal |
| `escrow_status` | text | Status: `pending` → `authorized` → `partial` → `released` |
| `order_completion_date` | timestamp | When order work was completed |
| `final_payment_released_at` | timestamp | When final payment was captured |

## API Endpoints

### 1. Create Order
**POST** `/api/paypal/create-order`
```json
{
  "orderId": "order-uuid"
}
```
**Response:**
```json
{
  "orderID": "paypal-order-id",
  "approveUrl": "https://www.sandbox.paypal.com/checkoutnow?token=..."
}
```

### 2. Authorize & Hold Payment
**POST** `/api/paypal/authorize-order`
```json
{
  "orderId": "order-uuid",
  "paypalOrderId": "paypal-order-id"
}
```
**Response:**
```json
{
  "ok": true,
  "authorizationId": "auth-id",
  "authorizedAmount": 100.00,
  "escrowStatus": "authorized",
  "message": "Funds authorized and held in escrow. Awaiting order completion."
}
```

### 3. Release & Capture Payment
**POST** `/api/paypal/release-payment`
```json
{
  "orderId": "order-uuid",
  "authorizationId": "auth-id",
  "amountToRelease": 40.00
}
```
**Response:**
```json
{
  "ok": true,
  "capturedAmount": 40.00,
  "totalCaptured": 40.00,
  "authorizedAmount": 100.00,
  "remainingInEscrow": 60.00,
  "escrowStatus": "partial",
  "paymentStatus": "partial",
  "message": "Partial release approved. Captured: 40.00. Total captured: 40.00. Remaining in escrow: 60.00"
}
```

## Implementation Flow (Frontend)

### Step 1: Payment Authorization UI
```typescript
// Show client the order amount and PayPal button
const handlePaymentStart = async () => {
  const response = await fetch('/api/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify({ orderId: order.id })
  })
  const data = await response.json()
  
  // Redirect client to PayPal approval URL
  window.location.href = data.approveUrl
}
```

### Step 2: Capture Return Token
```typescript
// After PayPal redirects user back with token
const handlePaymentReturn = async (paypalOrderId) => {
  const response = await fetch('/api/paypal/authorize-order', {
    method: 'POST',
    body: JSON.stringify({ 
      orderId: order.id,
      paypalOrderId: paypalOrderId 
    })
  })
  
  const data = await response.json()
  // Funds are now held in escrow!
  // Update UI to show: "Payment authorized. Awaiting order completion."
}
```

## Sandbox Card Testing
This checkout flow uses PayPal Sandbox hosted checkout, so card details are entered on PayPal’s sandbox page rather than directly in the app.

- Set `PAYPAL_MODE=sandbox` and `NEXT_PUBLIC_PAYPAL_MODE=sandbox`.
- Use sandbox buyer accounts or generated cards from PayPal:
  https://developer.paypal.com/tools/sandbox/card-testing/
- Use a future expiry date and correct CVV (3 digits, or 4 digits for Amex).
- Example test card numbers:
  - American Express: `371449635398431`, `376680816376961`
  - Diners Club: `36461510000039`, `36461510000013`
  - Maestro: `6304000000000000`
- Use PayPal rejection triggers to simulate declines, 3D Secure challenges, and other card error scenarios.

```
### Step 3: Mark Order Complete (Admin)
```typescript
// When work is done, mark order as complete
const markOrderComplete = async () => {
  await supabase
    .from('orders')
    .update({ 
      status: 'completed',
      order_completion_date: new Date()
    })
    .eq('id', orderId)
}
```

### Step 4: Client Releases Payment
```typescript
// Show slider/input for client to decide release amount
const handleReleasePayment = async (amountToRelease) => {
  const response = await fetch('/api/paypal/release-payment', {
    method: 'POST',
    body: JSON.stringify({
      orderId: order.id,
      authorizationId: order.paypal_authorization_id,
      amountToRelease: amountToRelease
    })
  })
  
  const data = await response.json()
  // Update UI:
  // Total Captured: $40.00
  // Remaining in Escrow: $60.00
  // Show button for final release
}
```

## Status Flow Diagram

```
Order Created
    ↓
Payment Pending ──→ [Client authorizes PayPal payment]
    ↓
Escrow (authorized) ──→ [Freelancer completes work]
    ↓
Ready for Release ──→ [Client approves partial or full release]
    ↓
Partial Captured ──→ [More approvals/releases]
    ↓
Fully Released ──→ [All funds captured]
```

## Escrow Status Values

| Status | Meaning | Action |
|--------|---------|--------|
| `pending` | Awaiting payment authorization | Client needs to authorize |
| `authorized` | Funds held in escrow | Freelancer begins work |
| `partial` | Some funds captured, more pending | Client can approve more releases |
| `released` | All authorized funds captured | Transaction complete |
| `failed` | Payment issue or refund | Investigate and retry |

## Error Handling

### Authorization Fails
- User hasn't approved in PayPal yet
- Invalid authorization ID
- PayPal API error

### Capture Fails
- Trying to capture more than authorized
- Authorization expired (PayPal holds for ~3 days by default)
- Invalid amount format

## Security Notes

1. **Authorization Hold Period**: PayPal holds authorizations for 3-10 days
   - You should capture funds before expiration
   - Implement a scheduled task to remind clients

2. **Partial Captures**: Once captured, funds cannot be re-authorized
   - Plan release amounts carefully
   - Consider milestone-based releases (25%, 50%, 75%, 100%)

3. **Voiding Authorizations**: If no release happens:
   - Authorization expires automatically
   - No manual void needed
   - Funds are released back to client

## Testing

Run the escrow flow demonstration:
```bash
node scripts/test-escrow-flow.mjs
```

Test a single payment authorization:
```bash
node scripts/test-paypal.mjs 1.00
```

## PayPal Transaction Reports

This app now supports PayPal Transaction Search reporting through a server-side route.

### New API Endpoint
- **GET** `/api/paypal/transactions`
- **POST** `/api/paypal/transactions`

### Supported query parameters
- `start_date` (required)
- `end_date` (required)
- `transaction_status`
- `transaction_id`
- `page_size`
- `page`
- `fields`
- Any other PayPal Reporting query parameter

### Example
```ts
const response = await fetch(
  '/api/paypal/transactions?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z&transaction_status=SUCCESS&page_size=100'
)
const result = await response.json()
```

### Sample POST body
```json
{
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-31T23:59:59Z",
  "transaction_status": "SUCCESS",
  "page_size": 100
}
```

### Notes
- PayPal transaction data can lag up to three hours.
- The API supports up to three years of history.
- Use the route for admin reporting and reconciliation.

## Recommended UI Components

### Client Order View
- Show authorized amount
- Display current escrow balance
- Allow sliding release amount selector (0% to 100%)
- Show released vs. captured history
- Confirm button with amount

### Admin Dashboard
- View all escrow orders by status
- See which are awaiting release
- Monitor expiring authorizations
- Handle disputes/refunds

### Freelancer Dashboard
- See pending releases
- Track how much is captured vs. pending
- Request client release if order is complete

## Next Steps

1. **Apply migration**: `migrations/add_escrow_columns_to_orders.sql`
2. **Create UI components** for payment flow (above)
3. **Add release interface** in order details page
4. **Implement webhooks** for PayPal transaction notifications
5. **Add dispute handling** for expired authorizations

## FAQ

**Q: What if the client doesn't release payment?**
A: The authorization expires after 3-10 days, funds go back to their account automatically.

**Q: Can a client partial release multiple times?**
A: Yes! Each release captures only the approved amount. You can call the release endpoint multiple times.

**Q: What about refunds?**
A: Only captured funds can be refunded. Uncaptured authorizations expire automatically.

**Q: Does this work with PayPal Balance?**
A: Yes, all captured funds go to your business PayPal account for withdrawal.

---

**Last Updated**: June 2, 2026  
**System**: PayPal Sandbox (Can upgrade to Live mode by changing PAYPAL_MODE)
