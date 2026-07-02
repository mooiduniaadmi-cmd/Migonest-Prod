# Walkthrough: Installment Payment Plan for Hiring Experts

We have successfully implemented the new 5-month installment payment plan for hiring experts. Students now have two options to pay: a one-time fee of $399, or 5 monthly installments of $79.80.

Here is a summary of the completed changes:

## 1. Backend Payment & Escrow Webhook Logic (`server.ts`)
- **Pro-rata Distribution**: We updated the Stripe webhook logic. For the `HIRE_INSTALLMENT` subscription type, every successful monthly payment (`invoice.paid`) triggers a pro-rata distribution: 40% of the $79.80 installment is instantly credited to the expert's wallet, while the remaining balance acts as escrow/Migonest fee.
- **Installment Tracking**: The `installments_paid` field increments on each successful payment. If it reaches 5, the Stripe subscription automatically cancels as the plan is complete.
- **Lock/Unlock Functionality**: 
  - If a recurring payment fails (`invoice.payment_failed`), the webhook updates the request to `is_locked = true`.
  - Once the student resolves the payment and a successful payment comes through, `is_locked` resets to `false`, opening the journey again.

## 2. Frontend Updates
- **HiringWizardModal.tsx**: During the hiring flow (Step 3), students are now presented with a clear choice between **Pay in Full ($399)** and **5 Monthly Installments ($79.80/mo)**.
- **AdmissionView.tsx**: If a student's payment fails and their journey becomes locked (`isLocked` is true), a prominent red warning banner appears at the top of their admission journey screen. This banner states that it is illegal to continue without payment and warns of potential legal action or service termination if the pending installment is not resolved.
- **API Payloads & Types**: Updated the `/api/hire` endpoint and internal TypeScript types to pass and map the new `paymentPlan`, `installmentsPaid`, `stripeSubscriptionId`, and `isLocked` variables.

## Verification
- Code has been tested and builds successfully.
- Database schemas have been updated to support the new fields.
- Stripe sessions properly adapt between single `payment` mode and recurring `subscription` mode depending on the user's selected plan.

The feature is fully implemented. Let me know if you would like to test this on the development environment or if you have any feedback on the UI/UX text!
