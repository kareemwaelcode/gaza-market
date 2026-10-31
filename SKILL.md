---
name: gaza-market-project
description: General development rules and workflow for Gaza Market. Covers project analysis, planning, frontend development, public platform, Market advertisements workflow, dashboards, future Laravel API integration, UI/UX, code quality, performance, security, offline support, testing, bilingual RTL/LTR support, themes, and Lucide Icons.
---

# Gaza Market Project

## Project Overview

The project is **Gaza Market / سوق غزة**.

It is a community platform for Gaza that brings together multiple services and helps citizens discover businesses, products, prices, buying and selling opportunities, locations, services, and offers.

The platform connects:
- Citizens and buyers.
- Store owners and business owners.
- Other people who want to publish permitted marketplace advertisements.

The platform is intended for the Gaza Strip.

The current frontend uses:
- HTML
- CSS
- JavaScript
- Bootstrap
- Lucide Icons

The planned backend uses:
- PHP Laravel 13
- MySQL

Do not introduce another framework or icon library unless the user explicitly approves it.

---

# Current Project Stage

The project is currently in the **frontend development and testing stage**.

The following frontend areas have already been developed:
- Public platform.
- User dashboard.
- Store-owner/activity dashboard.

The user dashboard frontend is considered completed.

The current primary focus is the **public Gaza Market platform**.

Backend development has not started yet. Do not start backend development unless the user explicitly asks for it.

The current priority is:

**Analyze → Improve → Test → Optimize the public platform**

The frontend must be prepared to connect cleanly to the future Laravel API without unnecessary restructuring. Use clear data structures, predictable states, and API-friendly boundaries, but do not build backend code or invent API endpoints before authorization.

---

# Main Project Areas

## 1. Public Platform

The public-facing website used by visitors and users. It includes:
- Home page.
- Price browsing and comparison.
- Product and store discovery.
- Business and location discovery.
- Search and filters.
- Offers and marketplace advertisements.
- Product and store information.
- User interactions, reports, and confirmations.
- Points/rewards where already implemented.
- Language and theme switching.
- Responsive mobile experience.
- Offline/PWA functionality where applicable.

This is the current primary development focus.

## 2. User Dashboard

The user dashboard allows users to manage their accounts and user-related functionality.

Its frontend is considered completed. Do not redesign or modify it unless the user explicitly requests it or the requested public-platform feature requires a clearly identified integration point. Preserve existing functionality.

## 3. Store Owner Dashboard

The store-owner/activity dashboard is one shared dashboard architecture for all business types.

All business types use the same dashboard architecture. The dashboard changes according to the selected business type through the central type configuration.

Do not create separate dashboards for every business type.

## 4. Admin Dashboard

The admin dashboard is used by platform administrators to manage the platform and review business/activity requests and other administrative content.

Keep its architecture and permissions separate from the public platform and store-owner dashboard. Do not modify it unless the requested task relates to it. For the Market workflow, the admin dashboard is involved only in the review/approval/rejection action and only to the extent the user authorizes.

---

# Core Development Philosophy

These rules apply to:
- Public platform.
- User dashboard.
- Store-owner dashboard.
- Admin dashboard.
- Shared components.
- Frontend architecture.
- Future backend integration.

The required workflow is:

**Understand → Inspect → Plan → Implement one stage → Test → Review → Ask for approval → Continue**

Do not skip these steps.

---

# Before Starting Any Task

Before making changes:

1. Inspect the project and understand its structure.
2. Identify which project area is being modified.
3. Understand the purpose and expected behavior of the requested feature.
4. Inspect all relevant existing files carefully.
5. Check whether the functionality already exists.
6. Understand existing components, dependencies, naming, and data flow.
7. Identify files to modify and files to create.
8. Identify possible conflicts, regressions, and side effects.
9. Prepare a clear implementation plan.
10. Explain the plan and wait for approval before coding.

Do not start changing code before understanding the existing project and relevant files.

---

# Planning

Before implementation, explain:
- What will change.
- Which files are involved, based on project inspection.
- What will be created.
- What will be modified.
- What existing functionality will remain unchanged.
- The implementation stages and their order.
- How each stage will be tested.
- Any risks, assumptions, or unresolved questions.

Do not invent file paths before inspecting the repository. Do not implement multiple major stages at once.

---

# One Stage at a Time

Work on one major stage at a time.

After completing a stage:

1. Explain what was completed.
2. List the exact files changed.
3. Provide clear testing instructions.
4. Report test results and any limitations.
5. Wait for the user to test and approve.
6. Fix confirmed problems before continuing.

Never automatically continue to the next major stage without user approval.

---

# No Guessing

If an important requirement is unclear, ask the user before implementation.

This applies especially to:
- Design and UX.
- Business rules and status transitions.
- Data fields and validation.
- Images and image presentation.
- Regions and location data.
- API behavior and payload shape.
- Permissions and ownership.
- Pricing, limits, and rewards.
- Navigation and page behavior.

Do not treat old screenshots as authoritative for current design, fields, regions, or business rules unless the user explicitly says so.

---

# Problems and Errors

If a problem is discovered:

1. Tell the user first.
2. Explain the cause when it is known.
3. Explain the proposed solution.
4. Describe risks and side effects.
5. Wait for approval if the solution changes existing behavior, data, or architecture.

Do not silently hide problems, remove functionality, change business rules, or apply risky workarounds.

---

# Scope Control

Only change what the user requested.

Do not:
- Modify unrelated files.
- Refactor unrelated code.
- Redesign unrelated pages.
- Delete existing functionality.
- Replace working architecture without approval.
- Change business rules or existing data behavior without approval.
- Start backend implementation without explicit authorization.

Do not remove existing code unless the user explicitly requests or approves it.

---

# Public Platform Development

Prioritize:
- Clear navigation.
- Fast loading.
- Simple UX.
- Product, price, and store discovery.
- Search and filtering.
- Price comparison.
- User interactions.
- Mobile usability and responsive design.
- Accessibility.
- Performance.
- Offline support where applicable.
- Compatibility with a future Laravel API.

The public platform must feel like a real production platform, not merely a static frontend.

---

# Public Platform Architecture

Organize the public platform around reusable functionality.

Examples:
- Header and navigation.
- Search and location selector.
- Price, product, store, and advertisement cards.
- Filters and categories.
- Modals, alerts, and confirmation states.
- Empty, loading, and error states.
- Shared UI components.

Reuse existing components where appropriate. Do not duplicate functionality unnecessarily. Do not introduce a new architecture or refactor shared components without first explaining the need and obtaining approval.

---

# Store and Business Architecture

The platform supports multiple business types.

Business-specific behavior should use configuration where appropriate. Do not hardcode one business type into shared components when the same component can support multiple types.

Do not assume a business is always a workspace, restaurant, cafe, pharmacy, or grocery store. Business-specific information must come from the appropriate configuration or data source.

---

# Store Owner Dashboard Architecture

The store-owner dashboard is **ONE shared dashboard for ALL business types**.

Supported types may include:
- Workspace.
- Restaurant.
- Cafe.
- Restaurant + Cafe.
- Store and store sub-types.
- Future business types.

The architecture is:

```text
Shared Dashboard
       ↓
  Business Type
       ↓
 Central Type Config
       ↓
Type-specific data, pages, features, fields, services and actions
```

Do not create separate dashboards for every business type. Keep shared layout and components common; use the central type configuration for type-specific behavior.

---

# Market Page — New Advertisement Workflow

## Purpose

The Market page (السوق) is a public marketplace area where users can publish buying and selling advertisements for products.

The user starts this work in the frontend. The implementation must be prepared for future Laravel 13 API integration, but **do not implement backend code** until the user explicitly authorizes backend development.

The user may provide screenshots from an older website as references for understanding the intended workflow. Those screenshots are **old references only**:
- Use them to understand the idea and interaction flow.
- Do not copy their old design automatically.
- Do not assume their fields, regions, layout, or styling are still correct.
- A better, modern design may be proposed.
- The current project's actual region/area data must be inspected and reused. Never derive the region list from old screenshots.

The user may provide additional screenshots, including a reference for how multiple advertisement images should be presented. Inspect those references before finalizing the visual treatment. Do not assume an exact gallery/carousel/sidebar presentation if the reference or user wording is ambiguous.

## Main User Flow

1. The user opens the Market page.
2. The user chooses the add/new-advertisement action.
3. The user selects the relevant buying/selling advertisement direction/type as defined by the approved UI and existing project conventions.
4. The user enters the product information and all required advertisement details.
5. The user may add up to three product images (the exact allowed count and validation must follow the user's confirmed requirement; the current stated target is three images).
6. The user submits the advertisement.
7. After successful submission, the user is automatically redirected to a **Pending Review** page/state.
8. The submitted advertisement is in **pending_review** status and is visible to its owner in the pending-review area, not publicly visible to other users.
9. The normal approved advertisements remain visible in the Market page below/alongside the pending-review confirmation/section, according to the approved layout.
10. The advertisement is reviewed by an administrator through the admin dashboard.
11. The intended review target is within **24 hours**. Treat this as the platform's stated review target, not a guaranteed technical SLA unless the user later defines it as one.

## Advertisement Statuses and Allowed Actions

Use explicit, consistent states. Do not treat status as a visual label only; actions and permissions must follow the state.

### Pending Review (`pending_review`)

- The owner can see their own pending advertisement.
- The owner can edit their own pending advertisement.
- The owner can delete their own pending advertisement.
- Editing must revalidate the modified data and submit the updated advertisement through the same review process. The modified version must return to **Pending Review** and must not become public until approved again.
- Other users must not see pending advertisements.
- The owner must not be able to edit or delete an advertisement after it has been approved.

### Approved (`approved`)

- The advertisement becomes publicly visible in the Market page to all users.
- The owner cannot edit the advertisement.
- The owner cannot delete the advertisement through the normal owner interface.
- A **Mark as Sold (تم البيع)** action becomes available only after approval.
- When the owner confirms **Mark as Sold**, the advertisement is removed from the public Market listings because the product has been sold.
- Do not show the Mark as Sold action while the advertisement is pending review.
- Do not implement a soft/hard deletion choice without asking the user. The required visible behavior is that the sold advertisement disappears from the Market. The storage/deletion strategy belongs to future backend design and must be discussed before implementation.

### Rejected (`rejected`)

- If the administrator rejects the advertisement, it is removed/deleted from the user's visible advertisement experience.
- The user should not see a rejection notice or rejected-advertisement record, according to the currently stated requirement.
- Do not invent a rejection reason display, appeal process, or resubmission flow.
- Preserve any audit/history requirement for the future backend as an open design consideration; do not implement or expose it without approval.

### Sold (`sold` or approved record removed from public listings)

- Once the owner marks an approved advertisement as sold, it disappears from the public Market.
- The exact persistence strategy (`sold` status, archival, or deletion) must be decided during backend planning. Do not assume physical database deletion merely because the advertisement disappears from the public page.

## Visibility and Authorization Matrix

| State | Owner can view | Owner can edit | Owner can delete | Public can view | Mark as Sold |
|---|---:|---:|---:|---:|---:|
| Pending Review | Yes | Yes | Yes | No | No |
| Approved | Yes, subject to the final owner UI | No | No | Yes | Yes |
| Rejected | No visible record/notice under current requirement | No | No | No | No |
| Sold | No longer in public Market; owner-history behavior is not yet defined | No | No | No | No |

The frontend must not rely on hiding buttons alone for security. The future backend must enforce ownership, status transitions, and permissions on every relevant request.

## Editing and Re-review

When the owner edits a pending advertisement:
1. Load the owner's own pending advertisement.
2. Allow edits only while its status is `pending_review`.
3. Validate the updated data.
4. Save/update the frontend state using the same agreed data shape.
5. Keep it in the pending-review flow.
6. It must not appear publicly until an administrator approves the updated version.

If a status changes to approved while an edit screen is open, prevent stale edits from overwriting the approved advertisement. The future backend must enforce this condition; the frontend should handle the corresponding conflict/error state when API integration is implemented.

## Images

- The current stated requirement is to support three advertisement images.
- When three images are added, visitors should be able to view all three images on the advertisement.
- The exact presentation (for example, slider/gallery or another layout) must be confirmed from the additional reference image or by asking the user.
- Provide image previews during creation/editing.
- Validate file type, file size, and image count in the frontend for usability; future backend validation remains mandatory.
- Do not store image binaries in localStorage as a production data strategy.
- Keep the frontend data model API-friendly, including a predictable image collection structure.
- Do not invent image size limits or accepted formats if the project has not defined them; inspect existing conventions or ask.

## Regions and Areas

- Region/area choices must be taken from the current Gaza Market project data/source.
- Inspect the existing location selector, region configuration, or relevant data files and reuse the existing source.
- Do not copy regions from old screenshots.
- Do not create a second conflicting region list.
- If the existing source is missing or inconsistent, report that and ask before creating or changing the canonical list.

## Market Page Layout

The Market page should contain:
- The new-advertisement entry point.
- The public list of approved advertisements.
- Appropriate search/filter/location controls only where supported by existing project patterns or approved requirements.
- Clear loading, empty, error, and success states.
- A clear pending-review state/page shown to the owner immediately after submission.
- The normal public Market advertisements should remain available on the pending-review screen/section as described by the user.

The design does not have to copy old screenshots. Inspect the current project design system and propose a cohesive, responsive, accessible design consistent with Gaza Market. Preserve Arabic RTL, English LTR, light mode, and dark mode.

Do not add unrequested features or filters.

## Future API Compatibility

Although the current task is frontend-only:
- Use explicit status values and predictable data shapes.
- Separate UI rendering from data access/business rules where the current architecture allows.
- Keep form validation understandable and consistent.
- Represent loading, success, validation failure, permission failure, and status-conflict states.
- Avoid coupling the page to hardcoded demo data in a way that blocks future API integration.
- Do not invent API routes, database tables, columns, or backend behavior.
- Before backend work, inspect the final frontend behavior and agree on the API contract with the user.

## Required Market Implementation Stages

Do not begin coding immediately after receiving the task. First inspect the repository, then present the following staged plan and wait for approval.

### Stage 1 — Inspect and Understand

- Inspect the current public Market page and its navigation entry.
- Inspect the existing add-advertisement button/modal/page if present.
- Inspect existing product/store cards, forms, modals, alerts, and reusable components.
- Inspect the current region/area source in the project.
- Inspect image upload/preview patterns already used by the project.
- Inspect language, theme, and responsive conventions.
- Identify the files that will be affected and any existing functionality that must be preserved.
- Do not modify code in this stage.

### Stage 2 — Confirm the UI and Data Contract

- Present the proposed Market page structure and user journey.
- List the advertisement fields found in the existing project and identify any missing/unclear required fields.
- Confirm the meaning/options of buying versus selling if existing UI does not make it clear.
- Confirm the exact presentation of the three images using the user's forthcoming reference.
- Define the frontend status values and the data shape needed for future API integration.
- Raise unresolved questions before implementation.
- Do not code until the user approves the plan and unresolved decisions are settled.

### Stage 3 — Build the Advertisement Form

- Implement only the approved add-advertisement form.
- Add client-side validation and image previews.
- Use existing project components and region data.
- Preserve RTL/LTR and both themes.
- Do not connect a real backend or invent API endpoints.
- Test required fields, invalid values, image count, image previews, and responsive behavior.

### Stage 4 — Build Pending Review Experience

- After submission, show a clear success/under-review confirmation and redirect the user to the pending-review page/state.
- Show the user's own pending advertisement there.
- Allow the owner to edit or delete it while pending.
- Editing must update the same advertisement data and keep it pending review.
- Keep public approved advertisements visible in the Market area below/alongside this state as approved in the design.
- Ensure pending content is never displayed in the public listing.
- Test submit, redirect, edit, re-review, delete, refresh behavior, and ownership-oriented UI states.

### Stage 5 — Build Public Market Listings

- Display approved advertisements only.
- Show all images associated with each advertisement using the approved image presentation.
- Reuse existing card and listing patterns where appropriate.
- Add only the search, filter, and location controls that have been approved.
- Test that pending, rejected, and sold advertisements do not appear publicly.

### Stage 6 — Add Approved-Advertisement Sold Action

- Show **تم البيع** only for the owner's approved advertisement.
- Confirm the action before applying it if the user approves a confirmation step.
- Remove the sold advertisement from the public listing after the action succeeds.
- Do not allow edit/delete after approval.
- Test the visibility and state transition.

### Stage 7 — Integration Readiness and Quality Review

- Review the frontend data shape and state transitions for future Laravel API integration.
- Check Arabic/English, RTL/LTR, light/dark themes, mobile/tablet/desktop.
- Check accessibility, validation, loading/empty/error states, and browser console errors.
- Run the available project tests and report exact results.
- Report any remaining assumptions or backend requirements.
- Stop and wait for user approval before moving to another major feature.

**Important:** These are planned stages, not permission to execute all stages in one run. Complete one stage, report it, and wait for the user's test and approval before proceeding.

---

# Official Icon Library

The official icon library is **Lucide Icons**.

Use Lucide for:
- Navigation and header icons.
- Buttons and actions.
- Search and filters.
- Forms, cards, tables, dropdowns, and modals.
- Alerts, empty states, and other UI controls.

Rules:
- Do not mix icon libraries.
- Do not use emoji as UI icons.
- Prefer official Lucide icon names and syntax.
- Do not replace existing icons unnecessarily.
- Do not create custom SVG icons when a suitable Lucide icon exists.
- If a required icon does not exist, tell the user before choosing another library or creating a custom icon.

Official reference: https://lucide.dev/

---

# User Experience and Visual Design

Interfaces must be:
- Clear and simple.
- Organized and consistent.
- Fast and responsive.
- Suitable for Arabic and English.
- Accessible and usable on mobile devices.

Use the existing Gaza Market design system as the starting point. A better design may be proposed when the user explicitly allows design freedom, as with the new Market page. Do not copy old screenshots blindly.

Do not add features or UI elements that were not requested.

---

# Language Support

The project supports:
- Arabic and RTL.
- English and LTR.

Every new or modified interface must support both languages and directions. Check text alignment, icons, spacing, forms, navigation, and different text lengths in both directions.

Do not hardcode a new interface for only one language.

---

# Theme Support

The project supports:
- Light Mode.
- Dark Mode.

Every new or modified interface must work correctly in both modes. Reuse existing theme variables and patterns. Do not introduce styles that work only in one theme.

---

# Responsive Design and Accessibility

- Test mobile, tablet, and desktop widths.
- Avoid horizontal overflow.
- Ensure controls are usable with touch.
- Use semantic HTML and accessible labels.
- Preserve visible focus states and keyboard navigation.
- Ensure sufficient contrast in both themes.
- Do not rely on color alone to communicate advertisement status.

---

# Existing Project Structure and Reusability

Before creating a component or file:
1. Check whether an existing component provides the required functionality.
2. Check for similar components and patterns.
3. Reuse existing structures where appropriate.
4. Avoid unnecessary duplication.

If significant duplication or an architectural issue is found:
- Explain it.
- Suggest a focused solution.
- Wait for approval before a broad refactor.

Respect existing file organization, naming, and coding conventions.

---

# Code Rules

Code must be:
- Clean.
- Organized.
- Maintainable.
- Readable.
- Consistent with the existing project.
- Prepared for future API integration where relevant.

Preserve the existing coding style and naming conventions. Do not rewrite working code unnecessarily. Avoid global side effects and duplicate event handlers. Validate user input and safely render user-provided text; do not inject untrusted content as HTML.

---

# Complete Files

Whenever modifying a file, provide the complete updated file when reporting code to the user. The file must be ready to replace directly.

Do not provide incomplete code or placeholders such as:
- `...`
- `// rest of the code`
- `TODO: implement later`

Do not omit unchanged sections from a file when the user needs a complete replacement.

---

# Performance and Scalability

Design for growth, but do not add infrastructure prematurely.

Frontend rules:
- Avoid unnecessary DOM work and repeated event listeners.
- Load scripts efficiently and defer non-critical scripts where appropriate.
- Optimize and compress images without visibly degrading quality.
- Avoid loading full, unbounded lists.
- Use pagination or incremental loading when required by the existing design and approved behavior.
- Avoid storing large image data in localStorage.
- Keep public and private data clearly separated.
- Measure before claiming a performance improvement.

When backend work is later authorized:
- Prevent N+1 queries.
- Select only required columns.
- Paginate lists.
- Add appropriate database indexes.
- Use queues for slow tasks where justified.
- Consider concurrency and transactions for state-changing operations.
- Use Redis/cache only where beneficial and with a clear invalidation strategy.
- Apply rate limiting to sensitive/public endpoints.
- Do not claim a specific supported user count without load-test evidence.

## Performance Techniques Disclosure Rule

Whenever a performance or scalability technique is introduced, modified, reused in a meaningful way, or removed, explicitly report it under:

### Performance Techniques Used

Explain:
1. Technique.
2. Location (file/class/function/query).
3. Purpose.
4. Benefit.
5. Configuration (such as cache key, TTL, invalidation, queue settings) when applicable.
6. Limitations or dependencies.

Explain technical terms in simple Arabic. Never claim a technique was implemented unless it exists in the code or verified configuration. If no performance technique was added or changed, explicitly say so.

---

# Security

Frontend safeguards improve usability but do not replace backend enforcement.

- Never place secrets, private keys, or privileged credentials in frontend code.
- Treat all browser input and local state as untrusted.
- Do not rely on hidden buttons or client-side checks for authorization.
- Render user-generated content safely to prevent XSS.
- Validate file type, size, and count in the UI; repeat validation on the future backend.
- Avoid exposing private information in URLs, logs, or public UI.
- For future backend work, enforce authentication, authorization, ownership, validation, CSRF/CORS rules as appropriate, and rate limits server-side.
- Report security risks before implementing a change that affects security or permissions.

---

# Offline and PWA Support

The project may use PWA/offline functionality.

- Preserve existing service-worker and offline behavior.
- Do not cache private or pending user data in a shared/public cache.
- Do not make an unsubmitted advertisement appear as successfully submitted while offline.
- Clearly distinguish locally saved drafts (if such functionality is approved) from successfully submitted server records.
- When API integration is added, handle offline submission and retry behavior only according to an explicitly approved design.
- Test that updates to cached assets do not leave users on a broken or stale interface.

Do not change the existing offline architecture unless the task requires it and the user approves the plan.

---

# Testing and Review

For every implementation stage:
- Test the happy path.
- Test validation failures.
- Test empty and loading states.
- Test error states.
- Test responsive layouts.
- Test Arabic/English and RTL/LTR.
- Test light/dark themes.
- Check browser console errors and network behavior.
- Run relevant existing automated tests.
- Do not claim tests passed unless they were actually run.

For the Market workflow specifically, test every status and permission combination described in the Market section. Use clearly identified mock/frontend data only while the backend is unavailable; do not present mock behavior as real server-side enforcement.

---

# Future Backend and API Integration

The planned backend is Laravel 13 and MySQL, but backend development must not begin unless the user explicitly requests it.

When backend work is authorized:
- Inspect the frontend first and understand its fields, data shapes, validation, loading states, and actions.
- Build the API to fit the agreed frontend contract as much as possible.
- Do not design an unrelated API and force unnecessary frontend changes.
- Do not add, change, or delete database tables or columns without explaining the reason and receiving approval.
- Work one table at a time when designing the database.
- Use migrations for schema changes.
- Keep controllers thin and place business logic in appropriate services.
- Use Form Requests for validation and authorization.
- Use API Resources for response shaping.
- Use Policies/Gates for permissions.
- Test important business rules and authorization on the server.
- Do not invent endpoint paths, schema, or authentication strategy.

The backend must independently enforce the Market advertisement state machine:
- Only the owner may edit/delete their own pending advertisement.
- Editing a pending advertisement keeps it pending review.
- Only an authorized administrator may approve or reject.
- Only approved advertisements are publicly readable.
- Owners cannot edit/delete after approval.
- Only the owner may mark their approved advertisement as sold.
- Rejected and sold advertisements must not appear in public listings.
- State transitions must be protected against race conditions and stale updates.

---

# Git and Version Control

Use Git to track changes and preserve a clear project history.

- Inspect `git status` before making changes.
- Do not overwrite or discard the user's uncommitted work.
- Use descriptive commit messages when the user asks for commits.
- Do not commit, push, create branches, merge, or rewrite Git history unless the user asks or approves.
- Prefer feature branches for isolated work when the user requests a Git workflow.
- Explain merge conflicts and resolve them carefully; never choose one side blindly.
- Do not include secrets, `.env` files, credentials, or generated private data in commits.

---

# Final Development Rule

The user's instructions and approved requirements are the source of truth.

Always:
1. Inspect before changing.
2. Explain before implementing.
3. Work one stage at a time.
4. Preserve existing functionality.
5. Ask instead of guessing.
6. Test and report honestly.
7. Wait for approval before continuing.

**Do not start coding the Market page until the user has sent the promised reference images, the project has been inspected, the staged plan has been presented, and the user has approved Stage 1/implementation.**
