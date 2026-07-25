# Expert Coding Patterns

This file contains community-driven expert patterns for the TradeVault project, sourced from the `everything-claude-code` repository.

## PostgreSQL & Supabase Patterns
*Source: postgres-patterns*

### Index optimization
| Query Pattern | Index Type | Example |
|--------------|------------|---------|
| `WHERE col = value` | B-tree (default) | `CREATE INDEX idx ON t (col)` |
| `WHERE col > value` | B-tree | `CREATE INDEX idx ON t (col)` |
| `WHERE a = x AND b > y` | Composite | `CREATE INDEX idx ON t (a, b)` |
| `WHERE jsonb @> '{}'` | GIN | `CREATE INDEX idx ON t USING gin (col)` |

### Data Type Best Practices
- **IDs**: Use `bigint` (or `uuid` if needed for external refs, but `bigint` is better for internal perf).
- **Strings**: Always use `text` instead of `varchar(255)`.
- **Timestamps**: Always use `timestamptz`.
- **Money**: Use `numeric(10,2)`.

### Common Implementation Patterns

**Composite Index Order:**
Equality columns first, then range columns.
```sql
CREATE INDEX idx ON orders (status, created_at);
```

**RLS Policy (Optimized):**
Wrap the `auth.uid()` check in a subquery for better plan caching in some Postgres versions.
```sql
CREATE POLICY policy ON orders
  USING ((SELECT auth.uid()) = user_id);
```

**UPSERT (On Conflict):**
```sql
INSERT INTO settings (user_id, key, value)
VALUES (123, 'theme', 'dark')
ON CONFLICT (user_id, key)
DO UPDATE SET value = EXCLUDED.value;
```

**Queue Processing (Safe Concurrency):**
```sql
UPDATE jobs SET status = 'processing'
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY created_at LIMIT 1
  FOR UPDATE SKIP LOCKED
) RETURNING *;
```

## React & UI Patterns
*Source: react:components (Stitch)*

### Component Architecture
- **Functional First**: Use functional components with hooks for all UI logic.
- **Props Safety**: Define strict interfaces for all component props.
- **Controlled Components**: Prefer controlled inputs for form state management.
- **Fragment Usage**: Use `<></>` to avoid unnecessary DOM bloating.

### Performance & Hooks
- **Re-render Prevention**: Guard expensive computations with `useMemo`.
- **Stable References**: Use `useCallback` for functions passed as props to children.
- **Effect Cleanup**: Always return a cleanup function in `useEffect` when using listeners or timers.
- **Primitive Dependencies**: Use primitive values in dependency arrays to avoid shallow comparison issues.

## Design System Guidelines
*Source: design-md (Stitch)*

### Visual Hierarchy
- **Negative Space**: Prioritize spacious layouts to reduce cognitive load. 
- **Typography Pairing**: Use clear distinctions between display headings and body copy (size, weight, letter-spacing).
- **Consistent Scaling**: Use a base-8 or base-4 spacing system for all margins and padding.

### Interaction & Feedback
- **Motion with Purpose**: Use `motion` for state transitions (fade-ins, soft shifts). Avoid gratuitous animations.
- **Visual Cues**: Ensure hover, focus, and active states provide immediate visual feedback.
- **Accessibility**: Maintain a minimum contrast ratio of 4.5:1 for standard text.

## Code-To-Design Patterns
*Source: stitch::code-to-design*

### Structural Coherence
- **Consistent Grid Systems**: Leverage relative layout spacing and CSS variables for layouts to bridge design specifications and functional code perfectly.
- **Fluid Proportional Scaling**: Ensure elements utilize dynamic, viewport-aware padding (`py-6 md:py-10`) to accommodate variable viewport bounds cleanly.

## Shadcn UI Guidelines
*Source: shadcn-ui*

### Composable Design Patterns
- **Atomic Components**: Structure components hierarchically, utilizing simple primitives styled with Tailwind CSS for reuse.
- **Radix Primitives Integration**: Ensure high quality keyboard navigation, screen reader accessibility, and focus styling are kept when customizing shadcn variants.

## UI/UX Pro Max Guidelines
*Source: ui-ux-pro-max*

### Ultra Premium Microinteractions
- **Interlocking Transitions**: Map interactions with high-fidelity, staggered motion layouts (using `motion/react` or Tailwind CSS transitions).
- **Glassmorphic Depth Elements**: Utilize high-contrast shadows, subtle overlays (e.g., `<div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />`), border glow states, and solid backdrops for readability over multi-layered visual grids.
- **Interactive States & Hover Sleekness**: Enhance buttons and links with smooth color shifts, scale increments (e.g., `hover:scale-[1.02]`), and indicator underlines.

---
## Dynamic Cognitive Skills & Plugins
*Installed and simulated virtual skill templates:*

* **Frontend Design & Theme Factory**: Modern high-contrast aesthetics, custom typography scaling, fluid spacing layouts, and responsive elements.
* **Skill Creator & Algorithmic Art**: Autonomous design solutions, structured generative assets, and high-fidelity micro-animations.
* **Build Dashboard & Architecture**: Advanced grid structures, complex charts mapping, lazy state synchronization, and robust server proxy routing.

---
*Note: I have absorbed these patterns into the current session and will apply them to any coding tasks in TradeVault.*
