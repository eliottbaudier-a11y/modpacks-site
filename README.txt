SITE MULTI-MODPACKS — mode d'emploi rapide
==========================================

ARBORESCENCE
  index.html                     → page d'accueil (bibliothèque des modpacks)
  modpack.html                   → modèle d'une page modpack (ne pas dupliquer)
  admin.html                     → générateur (ouvre /admin sur le site en ligne)
  assets/style.css               → tout le design (partagé)
  assets/app.js                  → logique d'une page modpack (partagée)
  assets/home.js                 → logique de la page d'accueil
  data/modpacks.js               → *** LE FICHIER À MODIFIER *** : site, catégories, liste des modpacks
  data/mods/minecraft-survival.js→ les 84 mods du serveur actuel
  covers/                        → images de couverture (optionnel)
  vercel.json                    → jolies URLs /modpacks/<id>

AJOUTER UN NOUVEAU SERVEUR (2 fichiers, zéro HTML/CSS/JS)
  1. Crée data/mods/<id>.js à partir du modèle existant, mets-y tes mods.
  2. Ajoute un objet { id, name, mcVersion, loader, description, ... } dans
     la liste window.MODPACKS de data/modpacks.js.
  → La nouvelle page /modpacks/<id> est générée automatiquement, même design.
  (Ou utilise /admin : il fabrique ces deux fichiers pour toi.)

APERÇU EN LOCAL
  Les jolies URLs ont besoin d'un serveur. Le plus simple :
     npx vercel dev
  (ou teste directement une fois déployé sur Vercel).

LE BOUTON "TOUT TÉLÉCHARGER"
  Le zip du pack (492 Mo) est trop gros pour GitHub. Héberge-le en
  "GitHub Release" puis mets son lien dans le champ "download" du modpack
  dans data/modpacks.js. (Détails dans le message.)
