# Table Assignment System - Usage Examples

## Overview

The new table assignment system automatically assigns tables to reservations based on availability and party size. This prevents double-booking and ensures optimal table utilization.

## How It Works

### Automatic Flow

1. **Customer submits reservation** → Status: `PENDING`
2. **System checks table availability** for date/time/party size
3. **If tables available** → Auto-assign tables + Status: `CONFIRMED`
4. **If no tables available** → Keep as `PENDING` for manual review by staff
5. **Staff can manually assign/reassign** tables in dashboard

### Key Features

- ✅ Prevents overbooking automatically
- ✅ Supports single table or combination of tables
- ✅ Smart algorithm finds optimal table combinations
- ✅ Manual override available for staff
- ✅ Performance-optimized with database indexes

## Usage Examples

### Example 1: Basic Reservation with Auto-Assignment

```typescript
import { createReservation } from "@/actions/Reservation";

const result = await createReservation({
  branchId: "branch_123",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "+1234567890",
  date: "2025-10-15",
  time: "19:00-21:00",
  guests: 4,
  timeSlotId: "timeslot_123",
  // autoAssignTables: true (default)
});

// Result if tables available:
// {
//   success: true,
//   data: { ...reservation with tables assigned... },
//   message: "Reservation confirmed with table assignment",
//   autoAssigned: true
// }

// Result if no tables available:
// {
//   success: true,
//   data: { ...reservation without tables... },
//   message: "Reservation created - pending table assignment",
//   autoAssigned: false
// }
```

### Example 2: Disable Auto-Assignment (Manual Review Only)

```typescript
const result = await createReservation({
  branchId: "branch_123",
  customerName: "Jane Smith",
  customerEmail: "jane@example.com",
  date: "2025-10-15",
  time: "20:00-22:00",
  guests: 10,
  timeSlotId: "timeslot_123",
  autoAssignTables: false, // Staff will assign manually
  notes: "VIP guest - requires special seating",
});

// Result:
// {
//   success: true,
//   data: { ...reservation... },
//   message: "Reservation created - pending table assignment",
//   autoAssigned: false
// }
```

### Example 3: Check Table Availability Before Creating Reservation

```typescript
import { findAvailableTables } from "@/actions/Table";

// Check if we can accommodate the party
const availabilityCheck = await findAvailableTables(
  "branch_123",
  new Date("2025-10-15"),
  "timeslot_123",
  8 // party size
);

if (availabilityCheck.success) {
  console.log(`Can accommodate party of 8`);
  console.log(`Will use ${availabilityCheck.data.tableIds.length} table(s)`);
  console.log(`Total capacity: ${availabilityCheck.data.totalCapacity}`);

  // Proceed with reservation...
} else {
  console.log(`Cannot accommodate: ${availabilityCheck.error}`);
  // Show alternative dates/times to customer
}
```

### Example 4: Get Available Capacity for a Time Slot

```typescript
import { getAvailableCapacity } from "@/actions/Table";

const capacity = await getAvailableCapacity(
  "branch_123",
  new Date("2025-10-15"),
  "timeslot_123"
);

if (capacity.success) {
  console.log(`Available capacity: ${capacity.data} people`);

  if (capacity.data >= requestedPartySize) {
    // Proceed with reservation
  } else {
    // Suggest alternative time slots
  }
}
```

### Example 5: Manually Assign Tables (Staff Dashboard)

```typescript
import { assignTablesToReservation } from "@/actions/Reservation";

// Staff selects specific tables for a pending reservation
const result = await assignTablesToReservation(
  "reservation_123",
  ["table_1", "table_2"] // Manually selected table IDs
);

if (result.success) {
  // Update reservation status to CONFIRMED
  await updateReservationStatus("reservation_123", "CONFIRMED");
}
```

### Example 6: Check Individual Table Availability

```typescript
import { isTableAvailable } from "@/actions/Table";

const available = await isTableAvailable(
  "table_5",
  new Date("2025-10-15"),
  "timeslot_123"
);

if (available) {
  console.log("Table 5 is available");
} else {
  console.log("Table 5 is already reserved");
}
```

### Example 7: List All Tables with Status

```typescript
import { getTables } from "@/actions/Table";
import { isTableAvailable } from "@/actions/Table";

const tablesResult = await getTables("branch_123");

if (tablesResult.success) {
  const date = new Date("2025-10-15");
  const timeSlotId = "timeslot_123";

  for (const table of tablesResult.data) {
    const available = await isTableAvailable(table.id, date, timeSlotId);
    console.log(`Table ${table.number} (capacity: ${table.capacity}): ${available ? "Available" : "Reserved"}`);
  }
}
```

## Table Assignment Algorithm

The system uses a smart algorithm to find the best table combination:

### Strategy 1: Single Table
- First tries to find a single table that fits the party
- Minimizes table usage and maximizes future availability

### Strategy 2: Table Combination
- If no single table fits, combines multiple tables
- Uses greedy approach to find smallest combination
- Limits to maximum 3 tables to avoid excessive combinations
- Considers table capacity efficiently

### Example Scenarios

**Scenario A: Party of 4, Tables Available**
- Table 1: Capacity 2
- Table 2: Capacity 4 ✅ (Selected)
- Table 3: Capacity 6
- **Result**: Assigns Table 2 (exact fit)

**Scenario B: Party of 8, Need Combination**
- Table 1: Capacity 2
- Table 2: Capacity 4 ✅
- Table 3: Capacity 6 ✅
- **Result**: Assigns Table 2 + Table 3 (total capacity: 10)

**Scenario C: Party of 12, All Tables Busy**
- No tables available at this time
- **Result**: Reservation stays PENDING for manual review
- Staff can either:
  - Assign tables manually if they become available
  - Suggest alternative time slots to customer
  - Contact customer to reschedule

## Database Schema Changes

### Added Indexes for Performance

```prisma
model Reservation {
  // ... fields ...

  @@index([branchId, date, status])  // Fast filtering by branch/date/status
  @@index([date, timeSlotId])        // Fast availability queries
}

model ReservationTable {
  // ... fields ...

  @@unique([reservationId, tableId]) // Prevent duplicate assignments
  @@index([tableId])                 // Fast table lookup
}
```

## Migration Instructions

Since the Prisma CLI requires interactive mode, you need to run the migration manually:

```bash
# Option 1: Run migration interactively
npm run dev
# Then in another terminal:
npx prisma migrate dev --name add_reservation_indexes_and_unique_constraint

# Option 2: Apply in production
npx prisma migrate deploy
```

The migration will:
1. Add composite index on `Reservation(branchId, date, status)`
2. Add composite index on `Reservation(date, timeSlotId)`
3. Add unique constraint on `ReservationTable(reservationId, tableId)`
4. Add index on `ReservationTable(tableId)`

## Testing Checklist

Before deploying to production, test these scenarios:

- [ ] Create reservation with available tables → Should auto-assign and confirm
- [ ] Create reservation with no available tables → Should stay PENDING
- [ ] Create reservation with party size requiring multiple tables → Should combine tables
- [ ] Try to book same table twice at same time → Should prevent double booking
- [ ] Manually assign tables to PENDING reservation → Should update successfully
- [ ] Cancel reservation → Tables should become available again
- [ ] Check available capacity for time slot → Should return correct numbers
- [ ] Disable auto-assignment → Should create PENDING without checking availability

## Future Enhancements (Phase 2 & 3)

### Phase 2: Staff Dashboard
- Visual table layout/floor plan
- Drag-and-drop table assignment
- Real-time availability view
- Bulk operations

### Phase 3: Intelligence
- Table preference learning (VIP guests, window seats, etc.)
- Configurable auto-confirm rules (time windows, party sizes)
- Smart overbooking management
- Email notifications for confirmations
- SMS reminders
- Integration with payment gateway for paid time slots

## Support

If you encounter any issues with the table assignment system:
1. Check the console logs for detailed error messages
2. Verify tables are set up correctly in the database (isActive = true)
3. Ensure time slots are configured for the branch
4. Check that the date/time is in the future
5. Verify branch ID is correct
