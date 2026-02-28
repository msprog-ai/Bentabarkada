

## Remove Mock/Dummy Data from Listings

### What will change

The site currently shows 8 hardcoded dummy listings (iPhone, sofa, sneakers, etc.) alongside real user-uploaded items. We'll remove those dummy items so only real database listings appear. Rach's uploaded items are stored in the database and will remain untouched.

### Changes

**1. Update `useListings` hook (`src/hooks/useListings.tsx`)**
- Initialize listings state as an empty array instead of `mockListings`
- Remove the line that appends `mockListings` to database results
- Remove the `mockListings` import
- Show an empty state when there are no database listings (instead of falling back to mock data)

**2. Update empty state on Index page**
- The existing "No items found" message already handles this -- no changes needed there

**3. Keep `mockData.ts` for categories**
- The `categories` array in `mockData.ts` is still used by `CategoryFilter` and `PostItemForm`, so the file stays but the `mockListings` export becomes unused (can be removed for cleanup)

### Technical Details

In `useListings.tsx`:
- Change `useState<ListingItem[]>(mockListings)` to `useState<ListingItem[]>([])`
- Change `setListings([...transformedListings, ...mockListings])` to `setListings(transformedListings)`
- Handle the case where `dbListings` is empty (currently only sets listings when `length > 0`, leaving mock data as default) -- add an `else` branch to set empty array
- Remove the `mockListings` import

