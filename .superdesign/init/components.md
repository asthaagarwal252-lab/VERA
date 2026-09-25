# Components

VERA currently uses inline components rather than a shared component directory.

## `Tag`

- Source: `src/App.tsx`
- Description: compact semantic status label for private/public/pending state.

```tsx
function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'safe' | 'public' | 'pending' }) { return <span className={`tag ${tone}`}>{children}</span> }
```

