# Profile — Gap Analysis vs Production Plan

> **Status as of 2026-03-21**

---

## Summary Verdict

The Profile section is **production-ready**. All edit fields write to the live API. No blocking gaps.

| # | Gap | Status |
|---|---|---|
| — | No blocking gaps | ✅ |

---

## What Is Currently Working Correctly

| Feature | Status |
|---|---|
| `useUserProfile()` → `GET /api/dashboard/profile` | ✅ Live |
| `useUpdateProfile()` → `PATCH /api/dashboard/profile` | ✅ Live |
| Name, Gender, Birth Date, Birth Time, Birth Place, Relationship editors | ✅ All write to API |
| `queryClient.invalidateQueries` on profile update | ✅ Invalidates `['user-profile']`, `['today']`, `['birth-chart']` |
| Location autocomplete (`GET /api/location/autocomplete`) | ✅ Live — debounced 300ms |
| Sun Sign computed from birth date | ✅ Server-side computation |
| Moon Sign tile | ✅ Live — reads from `useBirthChart().bigThree.moon.sign` |
| Ascendant tile | ✅ Live — reads from `useBirthChart().bigThree.ascendant.sign` |
| Element, Planet, Polarity, Modality tiles | ✅ Correct — static zodiac lookup |

---

## Non-Blocking Notes

### Moon/Ascendant Show "—" for Placeholder Users
If the user hasn't entered birth data (`isPlaceholder: true`), the Moon and Ascendant tiles show "—" because `useBirthChart()` returns `null`. This is correct behavior — these values can't be computed without birth data.

### `UserProfile` Does Not Include `moonSign` / `ascendantSign`
The `UserProfile` type (from `GET /api/dashboard/profile`) only includes `sunSign`. Moon and ascendant come from `useBirthChart()` (the full chart endpoint). This is intentional — the profile endpoint is lightweight; the full chart is a heavier computation cached separately.

---

*No action required. Profile section is production-grade.*
