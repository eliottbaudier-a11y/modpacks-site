# modpacks-site — résumé du projet (pour reprise de contexte)

## C'est quoi
Site statique (Vercel) listant des modpacks Minecraft (mods classés, filtrables, téléchargeables).
- Repo : https://github.com/eliottbaudier-a11y/modpacks-site
- Live : https://modpacks-site.vercel.app
- Stack : HTML/CSS/JS vanilla, zéro build, quelques fonctions serverless Vercel (Node) pour l'admin.

## Pages
- `/` (index.html) — bibliothèque des modpacks
- `/modpacks/<id>` (modpack.html, rewrite via vercel.json) — page d'un modpack : liste des mods, bouton "Tout télécharger"
- `/personnages` — page "Créateurs" (3 membres du serveur + 2 images de skins composées)
- `/admin` — générateur de nouveau modpack + modération (protégé par login)
- `/login` — connexion admin (identifiant `admin`, mot de passe = variable d'env `ADMIN_PASSWORD` sur Vercel)

## Comptes / accès
- GitHub : eliottbaudier-a11y
- Vercel : projet `le-ru/modpacks-site`
- Admin du site : identifiant `admin`, mot de passe stocké dans Vercel (jamais dans le repo)

## Variables d'environnement Vercel (déjà configurées, ne jamais mettre en clair dans le code)
- `ADMIN_PASSWORD` — mot de passe admin du site
- `GITHUB_TOKEN` — PAT fine-grained, accès **uniquement** au repo modpacks-site, permission Contents: Read/write (utilisé pour committer depuis l'admin)
- `GITHUB_REPO` — `eliottbaudier-a11y/modpacks-site`

## Architecture clé
- `data/modpacks.js` — liste des modpacks (id, mcVersion, loader, download…)
- `data/mods/<id>.js` — mods d'un modpack (`window.MODS_BY_PACK["<id>"] = [...]`, tableau JSON)
- `api/login.js` — vérifie identifiant/mdp, pose un cookie de session signé (HMAC)
- `middleware.js` — protège `/admin` (redirige vers `/login` si pas de session valide)
- `api/admin-mods.js` — ajoute/édite/retire des mods dans `data/mods/<id>.js` en committant sur GitHub (actions : `add`, `addBatch`, `edit`, `remove`), protégé par le mot de passe admin
- `assets/modrinth.js` — résolution Modrinth (trouve la version d'un mod compatible avec mcVersion+loader, résout les dépendances obligatoires récursivement)
- `assets/zipdownload.js` — construit un ZIP côté client (JSZip) à partir des fichiers Modrinth résolus, pour le bouton "Tout télécharger"

## Système "Tout télécharger" (deux modes coexistent)
1. **Pack legacy** (`minecraft-survival`) : `PACK.download` pointe vers un ZIP déjà uploadé en GitHub Release (492 Mo, mods du serveur actuel). Ne pas toucher, ça marche tel quel.
2. **Nouveaux packs** (sans `download`) : le bouton télécharge dynamiquement chaque mod via son URL Modrinth stockée (`furl`/`fname` sur chaque mod), construit un ZIP dans le navigateur du visiteur, le télécharge (`<NomPack>-Mods.zip`).

## Comment ajouter un mod (workflow admin)
Sur `/admin` → section 4 "Modérer un pack en ligne" → charger le pack → coller un lien Modrinth → le système résout automatiquement la version compatible + les dépendances obligatoires → ajout en un seul commit GitHub (`addBatch`).
Bouton "Vérifier les mods" : relit tous les mods du pack et signale ceux qui n'ont plus de version compatible.

## État connu / points d'attention
- Le pack `minecraft-survival` a 84 mods. Le "Vérifier les mods" a détecté que 2 (Sophisticated Backpacks, Fresh Animations) n'ont pas de version Fabric sur Modrinth — pas bloquant (ils viennent du ZIP legacy), juste à savoir.
- `GITHUB_TOKEN` (fine-grained) expire le **21 octobre 2026** — à régénérer avant cette date sinon l'admin (ajout/édition/suppression de mods) cessera de fonctionner. Le login (`/login`) et le site public ne sont pas affectés.
- Node.js a disparu une fois de la machine locale en cours de session (désinstallé par un tiers process) — réinstallé via winget. Si `npx`/`vercel` ne répond plus, vérifier `node --version`.
- Logo du header : image recadrée (Enderman + Kirby), stockée `assets/logo.png`.
- Page `/personnages` : image `assets/characters/skins.png` composée à partir de deux images fournies par l'utilisateur (personnage encapuchonné à gauche, fille à droite).

## Commandes utiles
```powershell
# déployer en prod (depuis le dossier du projet)
npx --yes vercel --prod --yes

# committer + pousser
git add -A; git commit -m "..."; git push
```
