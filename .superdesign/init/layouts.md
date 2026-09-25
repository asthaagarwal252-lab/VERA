# Layouts

## `AppShell`

- Source: `src/App.tsx`
- Description: fixed desktop instrument rail; responsive workspace with mobile bottom navigation.

```tsx
return <main className="shell">
  <aside className="rail">{/* brand, station navigation, local-first state */}</aside>
  <section className="workspace">{/* proof instrument and scrollable learning sections */}</section>
</main>
```

## `Footer`

- Source: `src/App.tsx`
- Description: product footer with return-to-instrument anchor.

```tsx
<footer><div className="brand"><FlaskConical size={19}/><span>VERA</span></div><p>Student Proof Station / Built for Midnight Preview &amp; Preprod</p><a href="#requirement">Return to instrument ↑</a></footer>
```

