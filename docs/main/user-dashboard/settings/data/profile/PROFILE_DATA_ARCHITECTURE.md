# Profile — Data Architecture

> Describes every data source, hook, endpoint, and data flow that powers the Profile section of Settings (`/settings/profile` and `/settings/profile/edit/**`).
>
> **Status as of 2026-03-21**

---

## Route Overview

| Route | Component | Purpose |
|---|---|---|
| `/settings/profile` | `ProfilePageClient` | View profile — avatar, Big Three, attribute tiles |
| `/settings/profile/edit` | `EditProfilePage` | Edit hub — 6 field rows |
| `/settings/profile/edit/name` | `NameEditor` | Update display name |
| `/settings/profile/edit/gender` | `GenderPicker` | Set gender (Female/Male/Non-binary) |
| `/settings/profile/edit/birth-date` | `BirthDateEditor` | Set birth date |
| `/settings/profile/edit/birth-time` | `BirthTimeEditor` | Set birth time |
| `/settings/profile/edit/birth-place` | `BirthPlaceEditor` | Set birth place with autocomplete |
| `/settings/profile/edit/relationship` | `RelationshipPicker` | Set relationship status |

---

## Data Flows

### Flow A — Profile Read

```
useUserProfile()
  └─ GET /api/dashboard/profile
       └─ identity.subjects (birth_date, birth_time, birth_place_name, is_placeholder)
          identity.profiles (display_name, gender, relationship_status)
       → UserProfile { userId, isPlaceholder, sunSign, timezone, birthDate }
       → ProfilePageClient (avatar, attribute tiles, zodiac wheel)
```

### Flow B — Profile Write

```
useUpdateProfile()
  └─ PATCH /api/dashboard/profile
       └─ identity.subjects (birth_date, birth_time, birth_place, lat/lng)
          identity.profiles (display_name, gender, relationship_status)
       → invalidates ['user-profile'], ['today'], ['birth-chart']
```

### Flow C — Location Autocomplete

```
BirthPlaceEditor (debounced 300ms)
  └─ GET /api/location/autocomplete?q=...&limit=6
       → [{ name, lat, lng }] suggestions
```

---

## Hooks

### `useUserProfile()`
`src/hooks/use-profile.ts`

```typescript
useQuery<UserProfile>({
  queryKey: ['user-profile'],
  queryFn: () => astroFetchJson('/api/dashboard/profile'),
  staleTime: 5 * 60 * 1000,  // 5 min
})
```

**`UserProfile` shape:**
```typescript
interface UserProfile {
  userId: string
  isPlaceholder: boolean
  sunSign: string | null   // e.g. 'scorpio', null when placeholder
  timezone: string
  birthDate: string | null // YYYY-MM-DD
}
```

Note: `moonSign` and `ascendantSign` are **not** in `UserProfile` — they are computed from the full birth chart via `useBirthChart()`.

### `useUpdateProfile()`
`src/hooks/use-profile.ts`

```typescript
useMutation<UserProfile, Error, UpdateProfileInput>({
  mutationFn: (input) => astroFetchJson('/api/dashboard/profile', { method: 'PATCH', ... }),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    void queryClient.invalidateQueries({ queryKey: ['today'] })
    void queryClient.invalidateQueries({ queryKey: ['birth-chart'] })
  }
})
```

---

## Endpoint

### `GET /api/dashboard/profile`
**Auth:** Required.

**Returns:** `UserProfile` — computed from `identity.subjects` (primary subject) + `identity.profiles`.

### `PATCH /api/dashboard/profile`
**Auth:** Required.

**Accepts:** Partial profile update — any combination of `name`, `gender`, `birthDate`, `birthTime`, `birthPlace`, `birthPlaceLat`, `birthPlaceLng`, `relationshipStatus`.

**Side effects:** Recomputes `sunSign` when `birthDate` changes.

### `GET /api/location/autocomplete?q=...&limit=6`
**Auth:** None required.

**Returns:** `[{ name: string, lat: number, lng: number }]` — location suggestions from geocoding provider.

---

## Profile Attribute Tiles

`ProfilePageClient` renders 6 attribute tiles:

| Tile | Source | Status |
|---|---|---|
| Sun Sign | Computed from `birthDate` in API | ✅ Live |
| Moon Sign | `useBirthChart().data?.bigThree.moon.sign` | ✅ Live (shows "—" when no chart) |
| Element | Derived from sun sign via `ZODIAC_ATTRS` lookup | ✅ Static lookup, correct |
| Ascendant | `useBirthChart().data?.bigThree.ascendant.sign` | ✅ Live (shows "—" when no chart) |
| Ruling Planet | Derived from sun sign via `ZODIAC_ATTRS` lookup | ✅ Static lookup, correct |
| Polarity / Modality | Derived from sun sign via `ZODIAC_ATTRS` lookup | ✅ Static lookup, correct |

---

## Database Tables

| Table | Schema | Columns Used |
|---|---|---|
| `profiles` | `identity` | `display_name`, `gender`, `relationship_status`, `primary_subject_id` |
| `subjects` | `identity` | `birth_date`, `birth_time`, `birth_place_name`, `latitude`, `longitude`, `is_placeholder`, `personalization_timezone` |

---

*Moon/Ascendant now read from birth chart data. No further architecture changes pending.*
