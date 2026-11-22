# Remove the false visibility promise (P04)

**Before:** Account → Business Visibility off → React state changes → the UI says
the business is hidden, but discovery, public links and booking rules are unchanged.

**After:** Account offers no visibility switch until a real pause control exists.
The listing, existing bookings, and Firestore access rules are unchanged.

The next P04 slice must define what “paused” means and enforce it in discovery,
public links, and new booking authorization while preserving existing participant
access. It must not reuse the schema-version marker as a user visibility setting.

`pnpm --filter ./apps/mobile test:business-visibility` renders the actual Account
component with provider, dual-role, requester, and guest fixtures. It verifies the
switch is absent, other menus still render, and requesters can still open enrollment.
For native sign-off, open Account as a provider and verify that the Business tab,
public profile, existing bookings and menus remain available. No deployment is needed.
