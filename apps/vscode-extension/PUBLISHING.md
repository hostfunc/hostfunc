# Publishing the hostfunc VS Code extension

This is the release runbook for shipping `apps/vscode-extension` to the **Visual Studio Marketplace**
(VS Code) and **Open VSX** (Cursor, Windsurf, VSCodium). The extension is a private workspace package
— it does **not** use changesets or npm; it ships as a `.vsix`.

---

## One-time setup

### 1. Visual Studio Marketplace publisher

1. Create/own an Azure DevOps organization, then create a **Marketplace publisher** with ID
   **`hostfunc`** at <https://marketplace.visualstudio.com/manage>. This must match the `publisher`
   field in `package.json`.
2. Create an Azure DevOps **Personal Access Token** (PAT):
   - Organization: **All accessible organizations**
   - Scopes: **Marketplace → Manage**
3. Store it as the `VSCE_PAT` GitHub Actions secret (and locally as `$VSCE_PAT` when publishing by
   hand).

### 2. Open VSX

1. Sign in at <https://open-vsx.org> (GitHub), sign the publisher agreement.
2. Create the **`hostfunc`** namespace: `npx ovsx create-namespace hostfunc -p <token>`.
3. Generate an access token from your Open VSX profile; store it as the `OVSX_PAT` GitHub Actions
   secret.

### 3. Marketplace metadata (before the first publish)

`vsce` requires a real PNG icon (≥128×128) — the `icon` field is intentionally omitted from
`package.json` until the asset exists. Before the first publish:

- Add `assets/icons/hostfunc-marketplace.png` (a 128×128+ PNG of the orbit mark on the ink
  background) and restore `"icon": "assets/icons/hostfunc-marketplace.png"` in `package.json`.
- Optionally add `galleryBanner` (color `#0a0908`, theme `dark`) and `keywords`.
- Confirm `repository`, `license`, and `displayName` are set (they are).

---

## Cutting a release

1. **Bump the version** in `apps/vscode-extension/package.json` (semver). No changeset is needed —
   this package is private.
2. Commit: `chore(vscode): release vX.Y.Z`.
3. **Tag** with the `vscode-v` prefix and push:
   ```bash
   git tag vscode-vX.Y.Z
   git push origin vscode-vX.Y.Z
   ```
4. The **Publish VS Code extension** workflow (`.github/workflows/vscode-extension-publish.yml`)
   builds the workspace deps, packages the `.vsix`, and publishes to both marketplaces.

The tag is the source of truth — CI verifies it matches `package.json`'s version and fails otherwise.

### Manual publish (fallback)

```bash
# from repo root — build deps first (esbuild bundles @hostfunc/api-client)
pnpm --filter hostfunc-vscode... build
cd apps/vscode-extension

# package
pnpm package                       # → hostfunc.vsix

# VS Marketplace
npx @vscode/vsce publish --no-dependencies --packagePath hostfunc.vsix -p "$VSCE_PAT"

# Open VSX
npx ovsx publish hostfunc.vsix -p "$OVSX_PAT"
```

> `--no-dependencies` is required: the extension is bundled by esbuild, so `vsce` must not try to
> resolve the pnpm workspace `node_modules`.

---

## Verifying a release

- VS Marketplace listing: <https://marketplace.visualstudio.com/items?itemName=hostfunc.hostfunc-vscode>
- Open VSX listing: <https://open-vsx.org/extension/hostfunc/hostfunc-vscode>
- Install end-to-end: `code --install-extension hostfunc.hostfunc-vscode`, then run the
  sign-in → deploy → run loop against `https://hostfunc.io`.

## Rollback / unpublish

- A bad version cannot be overwritten — bump the patch and re-release.
- To remove a version: `npx @vscode/vsce unpublish hostfunc.hostfunc-vscode@X.Y.Z` (use sparingly;
  prefer rolling forward).
