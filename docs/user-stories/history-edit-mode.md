# History edit mode

- As a user I can **enter edit mode on the History page** via an Edit button (pencil icon) in a button group.
- In edit mode, numeric fields (weight, carbs, protein, fat) are editable.
- **Desktop:** Hovering over a numeric cell shows a tinted background (light gray, slightly rounded); clicking the cell shows an inline input scaled to fit the cell.
- **Mobile:** All editable fields are visually highlighted (no hover), so the user can see what is editable.
- Exiting edit mode (e.g. toggling the same button to a "Done"/checkmark state) returns to read-only view.
- Edits are persisted using the existing `POST /api/logs` (same contract as the Log page: `date`, optional `weight`, `carbs_g`, `protein_g`, `fat_g`).
