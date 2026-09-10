# Intégration continue

Le workflow GitHub Actions se trouve dans [`docs/ci-workflow.yml`](./ci-workflow.yml).

Il n'est pas versionné sous `.github/workflows/` car le jeton de push utilisé
n'a pas le scope `workflow`. Pour l'activer :

```bash
mkdir -p .github/workflows
cp docs/ci-workflow.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "ci: activer le workflow"
git push
```

(depuis un compte / jeton disposant du scope `workflow`, ou via l'interface GitHub).

## Ce que fait le pipeline

Sur chaque `push` sur `main` et chaque pull request :

1. `npm run typecheck` — `tsc --noEmit`
2. `npm run lint` — ESLint (0 erreur ; quelques warnings tolérés)
3. `npm test` — tests unitaires (`node --test`, natif) : `money.ts`, `format.ts`,
   parité des 10 catalogues i18n
4. `npm run build` — build Next.js de production

Le secret `NEXT_PUBLIC_SUPABASE_ANON_KEY` doit être défini dans les secrets du dépôt.

## En local

```bash
npm run verify   # typecheck + lint + test
npm run build
```
