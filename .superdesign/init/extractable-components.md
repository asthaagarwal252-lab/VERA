# Extractable components

## InstrumentRail

- Source: `src/App.tsx`
- Category: layout
- Description: fixed station navigation and local-first status.
- Extractable props: active station.
- Hardcoded: VERA mark, station names, instrument labelling.

## StatusTag

- Source: `src/App.tsx`
- Category: basic
- Description: colour-paired local/public/pending state label.
- Extractable props: tone, children.
- Hardcoded: mono type, tag geometry.

## PrivacyBoundary

- Source: `src/App.tsx`
- Category: basic
- Description: sealed split view of private witness values and public disclosure.
- Extractable props: private/public item lists, disclosure label.
- Hardcoded: seal motif, safe/public token colors.

