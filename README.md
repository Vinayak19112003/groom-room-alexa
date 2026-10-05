# Groom Room Voice — groom-room-alexa

A simulated **Alexa+** pet-grooming booking experience for **Groom Room by Asha**, a dog & cat grooming studio in Indiranagar, Bengaluru. Built for the **Build, Ship, Shape: Amazon Developer Hackathon** (Alexa+ track).

> This is a **simulated** Alexa+ experience built as a web app — it does not run on a real Alexa device and makes no Amazon API calls.

## What it does

- Tap a sample phrase or type your own request — the glowing ring moves through
  Listening → Thinking → Speaking states with live timed transcription.
- A small NLU layer parses **intent**, **pet name**, **service**, **day**, and
  **time of day** from the utterance.
- When every slot is present, Alexa books **instantly** and shows a confirmation
  card: pet, service, date & time, duration, INR price, and booking reference.
  Saturday bookings carry the ₹200 studio-deposit note.
- When a slot is missing, she asks **exactly one follow-up at a time**:
  day chips (Tuesday–Sunday) or time-of-day chips (Morning / Afternoon / Evening).
- “What slots are free on Sunday?” is answered as an availability query.
- Every turn is logged in the session transcript; **Book another** resets the flow.

## Run it

```bash
npm install
npm run dev
```

## Stack

React 18 + Vite. No backend, no keys, no build-time secrets — all state lives in the browser.

## Note on provenance

This repository is a clean-room reimplementation of the Groom Room Voice demo,
which was originally built in Lovable. It was reimplemented here file-by-file
because Lovable's GitHub export was unavailable at submission time. Behavior —
ring states, slot parsing, one-at-a-time follow-ups, confirmation cards,
pricing (INR), and transcript logging — was verified against the original app.
