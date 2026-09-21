/* =========================================================================
   DONNÉES CENTRALES DU SITE — c'est le seul fichier à modifier pour :
   • renommer le site
   • ajouter / modifier des catégories
   • ajouter un nouveau modpack (serveur)
   Les mods de chaque modpack vivent dans data/mods/<id>.js
   ========================================================================= */

/* --- Nom du site (affiché dans l'en-tête et sur la page d'accueil) --- */
window.SITE = {
  name: "Modpacks",
  tagline: "La bibliothèque des modpacks du serveur — chaque pack, ses mods, ses liens."
};

/* --- Catégories (partagées par tous les modpacks). Ajoute les tiennes ici. --- */
window.CATEGORIES = [{"name": "Génération du monde", "emoji": "🌍"}, {"name": "Structures & lieux", "emoji": "🏛️"}, {"name": "Nouveaux mobs", "emoji": "🐾"}, {"name": "Blocs & décoration", "emoji": "🧱"}, {"name": "Combat & équipement", "emoji": "⚔️"}, {"name": "Exploration & aventure", "emoji": "🧭"}, {"name": "Agriculture & nourriture", "emoji": "🌾"}, {"name": "Villages & vie quotidienne", "emoji": "🏘️"}, {"name": "QoL / Vanilla amélioré", "emoji": "🎒"}, {"name": "Ambiance & immersion", "emoji": "🎵"}, {"name": "Performance", "emoji": "⚙️"}, {"name": "Mods client uniquement", "emoji": "🖥️"}, {"name": "Mods en réflexion", "emoji": "🔧"}];

/* --- Couleur de chaque catégorie (utilisée pour les pastilles). --- */
window.CATEGORY_COLORS = {
 "Génération du monde":"#63a94a","Structures & lieux":"#b98a4e","Nouveaux mobs":"#cf6a5a",
 "Blocs & décoration":"#c9a24a","Combat & équipement":"#8d95a3","Exploration & aventure":"#9a7bd0",
 "Agriculture & nourriture":"#d3a53a","Villages & vie quotidienne":"#37a06a","QoL / Vanilla amélioré":"#3f9a92",
 "Ambiance & immersion":"#6f7fd0","Performance":"#e08a2a","Mods client uniquement":"#4f9ecb","Mods en réflexion":"#8b8f96"
};

/* --- LES MODPACKS ---------------------------------------------------------
   Pour AJOUTER un serveur : copie un bloc { ... }, change les valeurs,
   puis crée data/mods/<id>.js avec ses mods. C'est tout.
   Champs :
     id          identifiant dans l'URL  → /modpacks/<id>   (lettres, chiffres, tirets)
     name        nom affiché
     mcVersion   version de Minecraft     ex : "1.21.1"
     loader      "Fabric" | "Forge" | "NeoForge" | "Quilt" | …
     tagline     petite phrase (optionnel)
     description texte d'intro sur la page du pack
     status      "active" | "dev" | "archived"
     modsCount   nombre de mods (affiché sur la carte d'accueil)
     cover       image de couverture (optionnel) ex : "/covers/<id>.jpg"
     download    lien de téléchargement du pack (optionnel)
     discord     lien Discord (optionnel)
   Un champ vide est simplement masqué.
--------------------------------------------------------------------------- */
window.MODPACKS = [
  {
    id: "minecraft-survival",
    name: "Survival Modpack",
    mcVersion: "1.21.1",
    loader: "Fabric",
    tagline: "Survival vanilla+",
    description: "Le catalogue des mods pensés pour le serveur — chacun expliqué, classé et suivi. Cherche, filtre par catégorie ou par statut, et ouvre la page Modrinth d'un clic.",
    status: "active",
    modsCount: 84,
    cover: "/covers/minecraft-survival.jpg",
    download: "https://github.com/eliottbaudier-a11y/modpacks-site/releases/download/pack-1.21.1/Pack_mods_1_21_1.zip",
    discord: ""
  }
  // ← copie ce bloc pour ajouter un nouveau serveur (n'oublie pas la virgule au-dessus)
];
