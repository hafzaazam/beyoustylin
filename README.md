# Salon Harmony

Create a Salon / Parlour Management Web App (Admin Panel Only) using:

Backend: PHP (Core PHP or Laravel-style structure)

Database: MySQL (phpMyAdmin compatible)

Frontend: Clean responsive UI (Bootstrap or Tailwind)

Architecture: MVC pattern preferred

🧠 SYSTEM OVERVIEW

This is a multi-resource booking system where:

Bookings depend on Staff (workers) and Service Chairs (slots)

NO overlapping bookings allowed for:

Same staff

Same chair (slot)

Each booking includes:

Services or Deals

Staff assignment

Time slot

Customer

Invoice auto-generation

📊 ADMIN PANEL MODULES

1. Dashboard

Show:

Total bookings today

Active bookings (live orders)

Total revenue (daily/monthly)

Staff performance summary

Occupied vs available slots

📅 2. Booking / Live Order

Features:

Create booking (form)

Update booking

Assign:

Customer

Staff member

Chair/Slot

Services OR Deals

Start time

Auto Logic:

End time = based on total service duration

Prevent overlapping bookings using:
(new_start < existing_end) AND (new_end > existing_start)

Status Functions:

Pending

Confirmed

Started

Completed

Canceled

Delete

Live Order:

Walk-in customer

Directly create booking and mark as Completed

Auto-generate invoice instantly

💄 3. Services (Salon Services)

Fields:

Name

Category (Hair, Facial, Makeup, etc.)

Price

Duration (minutes)

Status

Functions:

Create

Update

Available / Disable

Delete

🎁 4. Deals (Service Bundles)

Features:

Create bundle of multiple services

Set custom discounted price

Calculate total duration automatically

Functions:

Create

Update

Available / Disable

Delete

👩‍🔧 5. Staff Management

Fields:

Name

Role (Hairdresser, Makeup Artist, etc.)

Phone

Status

Functions:

Create

Update

Active / Disable

Delete

👤 6. Customer Management

Fields:

Name

Phone

Optional: Email, Address

Functions:

Create

Update

Active / Disable

Delete

🧾 7. Invoice System (AUTO GENERATED)

Trigger:

On booking creation OR live order

Include:

Customer details

Booking ID

Staff name

Services / Deals list

Individual prices

Total amount

Date & time

Status

Features:

Printable invoice (PDF format)

Unique invoice number

Stored in database

🗂️ DATABASE STRUCTURE (MySQL)

Create tables:

staff

customers

services

deals

deal_services (mapping table)

chairs (slots)

bookings

booking_services

invoices

🔒 CORE LOGIC

Prevent overlapping bookings for:

Same staff

Same chair

Total booking price:
SUM of services OR deal price

Total duration:
SUM of service durations

🎨 UI REQUIREMENTS

Admin dashboard layout (sidebar + top bar)

Tables with search + filters

Forms with validation

Status badges (color-coded)

Calendar/time-slot friendly booking UI

⚙️ EXTRA (IMPORTANT)

Use AJAX for smooth booking updates

Use proper relational database constraints

Clean code structure for future SaaS scalability

Error handling for booking conflicts

🎯 FINAL GOAL

Generate a fully functional Admin Panel for Salon Booking System
with:

No overlapping bookings

Staff + slot management

Services & deals

Live orders

Automatic invoice generation

Revenue tracking

Ensure the system is production-ready and scalable.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://beyoustylin.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7d760cbf-72ab-409b-b3a5-445552489598).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
