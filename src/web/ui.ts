/**
 * Dependency-free local Skill Hub UI. Text from catalog/agents is always rendered
 * with textContent, never inserted as HTML. No external fonts, scripts or CDNs.
 */
export function renderWebUi(nonce: string, csrf: string): string {
  return HTML.replaceAll('__NONCE__', nonce).replace('__CSRF__', csrf);
}

const HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0b1221"><meta name="csrf-token" content="__CSRF__">
<title>Agent Commons · Skill Hub</title>
<style nonce="__NONCE__">
:root{color-scheme:dark;--bg:#0b1020;--panel:#111b2d;--panel2:#18253a;--stroke:#293850;--muted:#97a9c4;--ink:#f3f7ff;--accent:#8b9bff;--mint:#68e0c2;--warn:#ffc17c;--bad:#ff8f9e;--radius:18px;font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Arial,sans-serif}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 70% -20%,#223053 0%,transparent 47%),var(--bg);color:var(--ink);min-height:100vh}button,input,select{font:inherit}button{cursor:pointer}a{color:#b8c3ff}a:hover{text-decoration:underline}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible{outline:2px solid var(--mint);outline-offset:2px}
.layout{display:grid;grid-template-columns:238px minmax(0,1fr);min-height:100vh}.sidebar{background:#0b1424e8;border-right:1px solid var(--stroke);padding:28px 16px;position:sticky;top:0;height:100vh;display:flex;flex-direction:column}.brand{display:flex;align-items:center;gap:12px;padding:5px 12px 30px;font-weight:800;font-size:18px;letter-spacing:-.6px}.brand-mark{display:grid;place-items:center;width:40px;height:40px;background:linear-gradient(140deg,var(--accent),var(--mint));color:#0b1424;border-radius:12px;font-size:21px;font-weight:900;box-shadow:0 10px 30px #8b9bff3b}
.side-label{color:#7287a8;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:800;padding:10px 15px}.nav{display:grid;gap:6px}.nav button{border:0;text-align:left;color:#adbed6;background:transparent;padding:12px 16px;border-radius:12px;font-weight:650;transition:.18s}.nav button:hover{background:#202e44;color:#fff}.nav button.active{background:#293455;color:#e5e8ff;box-shadow:inset 3px 0 var(--accent)}.sidebar-bottom{margin-top:auto;padding:15px;border:1px solid var(--stroke);background:#111e31;border-radius:14px;color:var(--muted);font-size:12px}.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 4px #68e0c21a;margin-right:9px}
.main{padding:32px clamp(20px,4vw,64px) 65px;max-width:1650px;width:100%;margin:auto}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:36px}.eyebrow{font-size:12px;color:var(--mint);text-transform:uppercase;letter-spacing:2.4px;font-weight:800}.top-right{display:flex;gap:12px;align-items:center}.pill{white-space:nowrap;border:1px solid var(--stroke);color:var(--muted);border-radius:50px;padding:6px 12px;font-size:12px}.hero{border:1px solid #435071;background:linear-gradient(115deg,#222a49,#14293a 70%,#113b3c);border-radius:24px;padding:36px 38px;position:relative;overflow:hidden;box-shadow:0 26px 70px #060b1660}.hero:after{content:"✦";position:absolute;right:6%;top:-60px;font-size:250px;color:#b4ffe916;pointer-events:none}h1{font-size:clamp(27px,3.3vw,43px);letter-spacing:-1.6px;line-height:1.12;margin:10px 0 14px}.hero p{color:#c2d1e5;max-width:640px;margin:0 0 25px;font-size:15px}.actions{display:flex;gap:11px;flex-wrap:wrap}.btn{border:1px solid #7189ab;color:#e4edff;background:#22304a;padding:10px 17px;border-radius:11px;font-weight:700;transition:.18s}.btn:hover:not(:disabled){transform:translateY(-1px);border-color:#7786af;background:#2a3c5a}.btn.primary{background:linear-gradient(110deg,#a4aaff,#6fbad3);color:#12162c;border:0}.btn.danger{border-color:#d98591;color:#ffd4dc;background:#462431}.btn.ghost{background:transparent}.btn.small{font-size:12px;padding:7px 11px}.btn:disabled{opacity:.42;cursor:not-allowed}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:20px 0 28px}.metric{background:var(--panel);border:1px solid var(--stroke);padding:21px 23px;border-radius:var(--radius)}.metric .value{font-weight:850;font-size:32px;letter-spacing:-1.3px}.metric .label{color:var(--muted);font-size:12px}.panel{background:var(--panel);border:1px solid var(--stroke);border-radius:var(--radius);padding:23px;margin-bottom:20px}.panel h3{font-size:16px;letter-spacing:-.3px;margin:0 0 10px}.panel p,.dim{color:var(--muted)}.panel p{margin:3px 0 15px}.page{display:none}.page.active{display:block}.section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:26px 0 16px}.section-head h2{font-size:21px;letter-spacing:-.6px;margin:0}.split{display:grid;grid-template-columns:1.25fr 1fr;gap:20px}.filter-row{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 18px}.field{background:#0b1527;border:1px solid #7189ab;color:var(--ink);padding:11px 13px;border-radius:10px;min-width:180px}.field.search{flex:1;min-width:230px}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.skill-card{border:1px solid var(--stroke);background:var(--panel);border-radius:15px;padding:19px;display:flex;flex-direction:column;gap:11px}.skill-card h3{margin:0;font-size:16px}.skill-card p{margin:0;color:var(--muted);font-size:12px;min-height:36px}.skill-card .bottom{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:auto}.tag{display:inline-block;border:1px solid #394963;border-radius:7px;padding:3px 8px;color:#b9c8e1;font-size:11px}.tag.good{color:var(--mint);border-color:#3a746a}.tag.bad{color:var(--bad);border-color:#734151}.tag.warn{color:var(--warn);border-color:#866747}.row-item{border-bottom:1px solid var(--stroke);padding:14px 0;display:flex;justify-content:space-between;align-items:center;gap:12px}.row-item:last-child{border-bottom:0}.row-item strong{font-size:13px}.row-item small{display:block;color:var(--muted);font-size:12px;margin-top:4px}.agents-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.agent-card{background:#15233a;border:1px solid #2f415d;border-radius:14px;padding:16px}.agent-card .head{display:flex;gap:9px;align-items:center;justify-content:space-between}.agent-card h3{margin:0;font-size:15px}.agent-card p{font-size:12px;color:var(--muted);margin:8px 0 0}.checkbox-list{max-height:255px;overflow:auto;border:1px solid #7189ab;border-radius:12px;padding:10px 14px;background:#0d1729;display:grid;gap:7px}.check{display:flex;gap:11px;align-items:center;font-size:13px;padding:5px}.check input{accent-color:var(--accent)}.subtle{font-size:12px;color:var(--muted)}.result-box{white-space:pre-wrap;overflow-wrap:anywhere;max-height:350px;overflow:auto;background:#0a1221;border:1px solid #293952;color:#b6d6ee;padding:16px;border-radius:12px;font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}.toast{position:fixed;bottom:25px;right:25px;background:#214b48;border:1px solid #5dcfb4;color:#e5fff8;border-radius:13px;padding:12px 18px;box-shadow:0 15px 50px #0008;z-index:20;max-width:400px}.toast.error{background:#4b2530;border-color:#ee8797}.hidden{display:none!important}.modal-backdrop{position:fixed;inset:0;background:#040913bd;z-index:30;display:grid;place-items:center;padding:16px}.modal{background:#141e31;border:1px solid #7189ab;width:min(610px,100%);max-height:88vh;overflow:auto;border-radius:20px;padding:26px;box-shadow:0 20px 100px #000b}.modal h2{margin:0 0 12px;font-size:22px}.modal .copy{color:var(--muted);font-size:13px}.modal-buttons{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}.links{display:flex;gap:12px;flex-wrap:wrap}.links a{font-size:12px}.footer{font-size:12px;color:#798ca8;margin-top:28px}.empty{padding:36px;text-align:center;border:1px dashed #43506a;border-radius:14px;color:var(--muted)}.spinner{display:inline-block;border:2px solid #43546c;border-top-color:var(--mint);border-radius:50%;width:14px;height:14px;animation:spin .7s linear infinite;margin-right:8px}@keyframes spin{to{transform:rotate(360deg)}}
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.lang-select{color:var(--ink);background:var(--panel);border:1px solid #7189ab;border-radius:10px;padding:6px 8px;font:inherit;font-size:12px;min-width:0}.top-right{flex-wrap:wrap}@media(max-width:730px){.top{align-items:flex-start;flex-wrap:wrap}}.skip-link{position:absolute;left:16px;top:-100px;z-index:100;padding:12px 16px;background:var(--panel);border:2px solid var(--mint);border-radius:10px;color:var(--ink)}.skip-link:focus{top:12px}.mt-14{margin-top:14px}.mt-15{margin-top:15px}.mt-16{margin-top:16px}.mt-18{margin-top:18px}.mt-19{margin-top:19px}.modal .copy{white-space:pre-line}
@media(max-width:1050px){.split{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
@media(max-width:730px){.layout{display:block}.sidebar{position:static;height:auto;border-right:0;border-bottom:1px solid var(--stroke);padding:10px}.brand{padding:6px 10px}.nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;overflow:visible}.nav button{white-space:normal;text-align:center;padding:10px 4px;font-size:12px;min-width:0}.side-label,.sidebar-bottom{display:none}.main{padding:24px 14px}.top{margin-bottom:22px}.hero{padding:24px}.cards,.agents-grid{grid-template-columns:1fr}.metrics{gap:10px}.metric{padding:16px}.metric .value{font-size:25px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
</style></head>
<body><a class="skip-link" href="#main-content">Skip to main content</a><div class="layout">
<aside class="sidebar">
<div class="brand"><span class="brand-mark">A</span><span>Agent Commons</span></div>
<div class="side-label">Workspace</div>
<nav class="nav" aria-label="Dashboard sections">
<button data-page="overview" aria-controls="page-overview" class="active" aria-current="page"><span aria-hidden="true">⌂</span> <span>Overview</span></button>
<button data-page="catalog" aria-controls="page-catalog"><span aria-hidden="true">◈</span> <span>Skill catalog</span></button>
<button data-page="agents" aria-controls="page-agents"><span aria-hidden="true">▤</span> <span>My agents</span></button>
<button data-page="integrity" aria-controls="page-integrity"><span aria-hidden="true">◇</span> <span>Integrity</span></button>
<button data-page="backups" aria-controls="page-backups"><span aria-hidden="true">↶</span> <span>Backups</span></button>
</nav>
<div class="sidebar-bottom"><span class="status-dot"></span>Local workspace<br><span class="subtle">127.0.0.1 only · no cloud account</span></div>
</aside>
<main class="main" id="main-content" tabindex="-1">
<div class="top"><div class="eyebrow">YOUR AI WORKSPACE / CONTROL CENTER</div><div class="top-right"><span class="pill">● Local-first</span><select id="language-select" aria-label="Interface language" class="lang-select"><option value="en">English</option><option value="fr">Français</option></select><button class="btn small ghost" id="refresh">↻ Refresh</button></div></div>
<section class="page active" id="page-overview">
<div class="hero"><div class="eyebrow">ONE LIBRARY · EVERY AGENT</div><h1>Your AI toolkit.<br>One place to manage it.</h1><p>Discover skills, organize profiles and synchronize your agents. You stay in control: preview changes before applying them.</p><div class="actions"><button class="btn primary" data-go="catalog">Explore skills</button><button class="btn" data-go="agents">Manage agents</button></div></div>
<div class="metrics" id="metrics"></div>
<div class="split"><div class="panel"><h3>Connected agents</h3><p>Installed environments detected on this machine.</p><div id="overview-agents"></div></div><div class="panel"><h3>Workspace health</h3><p>Quick read of locally managed skills.</p><div id="overview-health"></div><button class="btn small" data-go="integrity">View integrity report</button></div></div>
</section>
<section class="page" id="page-catalog"><div class="section-head"><div><div class="eyebrow">PUBLIC, PINNED REFERENCES</div><h1>Explore skills</h1><div class="dim">Review upstream sources and choose what belongs in your library.</div></div></div>
<div class="filter-row"><input class="field search" id="catalog-search" type="search" placeholder="Search skills, tags, authors…" aria-label="Search skills"><select class="field" id="catalog-category" aria-label="Filter by category"><option value="">All categories</option></select><select class="field" id="catalog-status" aria-label="Filter by installation"><option value="">All statuses</option><option value="installed">Installed</option><option value="available">Not installed</option></select></div>
<div class="subtle" id="catalog-count" role="status" aria-live="polite"></div><div class="cards mt-14" id="catalog-cards"></div></section>
<section class="page" id="page-agents"><div class="eyebrow">PERSONALIZED PER AGENT</div><h1>My agents</h1><p class="dim">Create a local selection of central skills and catalog categories for each installed agent. Saving a profile never synchronizes it automatically.</p><div class="agents-grid" id="agents-grid"></div>
<div class="section-head"><h2>Profile editor</h2><span class="tag">Explicit sync only</span></div>
<div class="panel"><div class="filter-row"><select class="field" id="profile-agent" aria-label="Choose agent"></select><input class="field search" id="profile-skill-search" type="search" placeholder="Filter locally installed skills…" aria-label="Filter skills"></div><div class="split"><div><h3>Individual skills</h3><p class="subtle">Only skills already present in your shared library can be linked.</p><div class="checkbox-list" id="profile-skills"></div></div><div><h3>Category profiles</h3><p class="subtle">Categories expand to installed skills at sync time.</p><div class="checkbox-list" id="profile-categories"></div></div></div>
<div class="actions mt-19"><button class="btn primary" id="profile-save">Save profile</button><button class="btn danger" id="profile-clear">Clear saved profile</button></div></div>
<div class="panel"><h3>Synchronization</h3><p>Preview exactly what would change. Applies saved profiles to installed agents; does not change MCP settings or automatically unlink other skills.</p><div class="actions"><button class="btn" id="sync-preview">Preview sync</button><button class="btn primary" id="sync-apply">Apply saved profiles</button></div><pre class="result-box hidden" id="sync-report" role="status" aria-live="polite"></pre></div>
<div class="panel"><div class="section-head"><h3>Shared MCP servers</h3><button class="btn primary small" id="mcp-add">+ Add MCP server</button></div><p>Add MCP servers, edit agent routing or remove entries. Existing commands and environment values stay private. Every change requires a preview and confirmation; synchronization remains separate.</p><div id="mcp-items"></div><div class="actions mt-18"><button class="btn" id="full-sync-preview">Preview skills + MCP sync</button><button class="btn primary" id="full-sync-apply">Apply skills + MCP sync</button></div><pre class="result-box hidden mt-16" id="full-sync-report" role="status" aria-live="polite"></pre></div>
</section>
<section class="page" id="page-integrity"><div class="eyebrow">READ-ONLY · OFFLINE</div><h1>Skill integrity</h1><p class="dim">Inspect local managed skills for changed Git blobs, missing files, extra files, unsafe links and invalid receipts. Matching hashes do not certify that third-party code is safe.</p><div class="panel"><div class="actions"><button class="btn" id="verify-again">Run verification</button><button class="btn" id="doctor-run">Run agent diagnostics</button></div><pre class="result-box hidden mt-16" id="doctor-report" role="status" aria-live="polite"></pre><div id="integrity-items" class="mt-15"></div></div></section>
<section class="page" id="page-backups"><div class="eyebrow">RECOVERY</div><h1>Snapshots & recovery</h1><p class="dim">Review stored snapshots, create a backup or restore a previous state. Restoring replaces saved managed paths and requires explicit confirmation.</p><div class="panel"><h3>Backup now</h3><p>Create a full point-in-time snapshot of agent skills and MCP configurations.</p><button class="btn primary" id="backup-create">Create backup</button></div><div class="panel"><h3>Available snapshots</h3><div id="backup-items"></div></div></section>
<div class="footer">Agent Commons · Local web UI · No telemetry · No background sync · Source/license review ≠ code security audit</div>
</main></div>
<div id="workspace-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div><div id="modal-root"></div><div id="toast" class="toast hidden" role="status" aria-live="polite" aria-atomic="true"></div>
<script nonce="__NONCE__">
'use strict';
const csrf=document.querySelector('meta[name="csrf-token"]').content;
const $=id=>document.getElementById(id);
let state=null, mcpState=null, activePage='overview', selectedAgent='', busy=false, profileDrafts=Object.create(null);
const short=x=>String(x||'').slice(0,10);
// UI-only translation. Never store data or server content; persist only "en"/"fr".
const FR={"Skip to main content":"Aller au contenu principal","Workspace":"Espace de travail","Overview":"Accueil","Skill catalog":"Catalogue de compétences","My agents":"Mes agents","Integrity":"Intégrité","Backups":"Sauvegardes","Local workspace":"Espace local","127.0.0.1 only · no cloud account":"127.0.0.1 uniquement · sans compte cloud","YOUR AI WORKSPACE / CONTROL CENTER":"VOTRE ESPACE IA / CENTRE DE CONTRÔLE","● Local-first":"● Local uniquement","↻ Refresh":"↻ Actualiser","ONE LIBRARY · EVERY AGENT":"UNE BIBLIOTHÈQUE · TOUS LES AGENTS","Your AI toolkit.":"Vos outils IA.","One place to manage it.":"Un seul endroit pour tout gérer.","Discover skills, organize profiles and synchronize your agents. You stay in control: preview changes before applying them.":"Découvrez des compétences, organisez vos profils et synchronisez vos agents. Gardez le contrôle : prévisualisez les changements avant de les appliquer.","Explore skills":"Explorer les compétences","Manage agents":"Gérer les agents","Connected agents":"Agents connectés","Installed environments detected on this machine.":"Environnements installés détectés sur cet ordinateur.","Workspace health":"État de l'espace de travail","Quick read of locally managed skills.":"Vue rapide des compétences gérées localement.","View integrity report":"Voir le rapport d'intégrité","PUBLIC, PINNED REFERENCES":"RÉFÉRENCES PUBLIQUES ÉPINGLÉES","Review upstream sources and choose what belongs in your library.":"Examinez les sources et choisissez ce qui entre dans votre bibliothèque.","All categories":"Toutes les catégories","All statuses":"Tous les statuts","Installed":"Installé","Not installed":"Non installé","PERSONALIZED PER AGENT":"PERSONNALISÉ PAR AGENT","Create a local selection of central skills and catalog categories for each installed agent. Saving a profile never synchronizes it automatically.":"Choisissez des compétences et des catégories pour chaque agent installé. Enregistrer un profil ne déclenche jamais de synchronisation automatique.","Profile editor":"Éditeur de profils","Explicit sync only":"Synchronisation explicite uniquement","Individual skills":"Compétences individuelles","Only skills already present in your shared library can be linked.":"Seules les compétences déjà présentes dans la bibliothèque peuvent être liées.","Category profiles":"Profils par catégorie","Categories expand to installed skills at sync time.":"Les catégories sont développées en compétences installées lors de la synchronisation.","Save profile":"Enregistrer le profil","Clear saved profile":"Effacer le profil","Synchronization":"Synchronisation","Preview exactly what would change. Applies saved profiles to installed agents; does not change MCP settings or automatically unlink other skills.":"Prévisualisez les modifications. Applique les profils aux agents installés sans modifier les paramètres MCP ni retirer automatiquement d'autres compétences.","Preview sync":"Prévisualiser la synchronisation","Apply saved profiles":"Appliquer les profils","Shared MCP servers":"Serveurs MCP partagés","+ Add MCP server":"+ Ajouter un serveur MCP","Add MCP servers, edit agent routing or remove entries. Existing commands and environment values stay private. Every change requires a preview and confirmation; synchronization remains separate.":"Ajoutez des serveurs MCP, modifiez leur affectation aux agents ou supprimez-les. Les commandes et variables existantes restent privées. Chaque modification nécessite un aperçu et une confirmation.","Preview skills + MCP sync":"Prévisualiser compétences + MCP","Apply skills + MCP sync":"Synchroniser compétences + MCP","READ-ONLY · OFFLINE":"LECTURE SEULE · HORS LIGNE","Skill integrity":"Intégrité des compétences","Inspect local managed skills for changed Git blobs, missing files, extra files, unsafe links and invalid receipts. Matching hashes do not certify that third-party code is safe.":"Vérifiez les fichiers modifiés, manquants, supplémentaires, les liens dangereux et les reçus invalides. Des empreintes conformes ne garantissent pas la sécurité du code tiers.","Run verification":"Lancer la vérification","Run agent diagnostics":"Diagnostiquer les agents","RECOVERY":"RÉCUPÉRATION","Snapshots & recovery":"Instantanés et récupération","Review stored snapshots, create a backup or restore a previous state. Restoring replaces saved managed paths and requires explicit confirmation.":"Examinez les instantanés, créez une sauvegarde ou restaurez un état précédent. La restauration remplace des chemins gérés et exige une confirmation explicite.","Backup now":"Sauvegarder maintenant","Create a full point-in-time snapshot of agent skills and MCP configurations.":"Créez un instantané complet des compétences et configurations MCP.","Create backup":"Créer une sauvegarde","Available snapshots":"Instantanés disponibles","Search skills, tags, authors…":"Rechercher compétences, tags, auteurs…","Search skills":"Rechercher des compétences","Filter by category":"Filtrer par catégorie","Filter by installation":"Filtrer selon l'installation","Choose agent":"Choisir un agent","Filter locally installed skills…":"Filtrer les compétences locales…","Filter skills":"Filtrer les compétences","Interface language":"Langue de l'interface","Agent Commons · Local web UI · No telemetry · No background sync · Source/license review ≠ code security audit":"Agent Commons · Interface Web locale · Sans télémétrie · Sans synchronisation en arrière-plan · Vérification des sources/licences ≠ audit de sécurité","Public skills":"Compétences publiques","Shared skills":"Compétences partagées","Active agents":"Agents actifs","MCP servers":"Serveurs MCP","View details":"Voir les détails","Archived":"Archivé","No skills match these filters.":"Aucune compétence ne correspond à ces filtres.","No supported agents detected on this machine.":"Aucun agent compatible détecté sur cet ordinateur.","Managed skills checked":"Compétences contrôlées","Integrity warnings":"Alertes d'intégrité","Local backups":"Sauvegardes locales","License":"Licence","Pinned Git revision":"Révision Git épinglée","Status":"Statut","Installed revision":"Révision installée","Verified managed installation":"Installation gérée vérifiée","Review upstream source":"Consulter la source","License evidence":"Justificatif de licence","Close":"Fermer","Preview pinned update":"Prévisualiser la mise à jour","Preview removal":"Prévisualiser la suppression","Preview installation":"Prévisualiser l'installation","Cancel":"Annuler","Apply change":"Appliquer","Preview change":"Prévisualiser","New MCP server":"Nouveau serveur MCP","Add MCP server":"Ajouter un serveur MCP","Edit MCP routing":"Modifier les agents MCP","Server ID":"Identifiant du serveur","Transport":"Transport","Executable":"Exécutable","Arguments (one per line)":"Arguments (un par ligne)","HTTP(S) endpoint":"Adresse HTTP(S)","Enabled":"Activé","Include agents (empty = all)":"Inclure des agents (vide = tous)","Exclude agents":"Exclure des agents","Routing…":"Affectation…","Remove…":"Supprimer…","Restore…":"Restaurer…","Create full backup":"Créer une sauvegarde complète","Clear profile":"Effacer le profil","Apply sync":"Appliquer la synchronisation","Synchronize skills + MCP":"Synchroniser compétences + MCP","Apply full sync":"Appliquer la synchronisation complète","Restore":"Restaurer","No snapshots yet.":"Aucun instantané pour le moment.","Nothing available yet.":"Aucun élément disponible.","No shared MCP servers. Add a server to begin.":"Aucun serveur MCP partagé. Ajoutez-en un pour commencer.","No managed public-catalog skill installations found.":"Aucune compétence gérée du catalogue public trouvée.","Workspace and integrity results updated.":"Espace de travail et résultats d'intégrité actualisés.","Refreshing local workspace…":"Actualisation de l'espace local…","Workspace refresh failed.":"Échec de l'actualisation de l'espace de travail.","Invalid MCP server identifier.":"Identifiant MCP invalide.","Profile saved (not synced)":"Profil enregistré (non synchronisé)","Choose at least one skill or category.":"Choisissez au moins une compétence ou catégorie.","Saved profile cleared":"Profil enregistré effacé","Snapshot restored":"Instantané restauré","Profiles synchronized":"Profils synchronisés","Full synchronization completed":"Synchronisation complète terminée","Reviewing pinned skill…":"Examen de la compétence épinglée…","No changes.":"Aucune modification.","Local operation failed. Check Agent Commons CLI diagnostics for details.":"Échec d'une opération locale. Consultez le diagnostic CLI pour les détails.","Type confirmation text":"Saisir le texte de confirmation","This existing directory cannot be updated or removed by the managed catalog installer. Agent Commons preserves local and modified data.":"Ce dossier ne peut être ni mis à jour ni supprimé par le catalogue. Agent Commons préserve les données locales et modifiées.","Do not paste tokens in commands or URLs. Use environment references in the central manifest for secrets.":"Ne collez pas de jetons dans les commandes ou URL. Utilisez des références de variables d'environnement pour les secrets.","Existing commands, secrets and custom options are preserved. Only agent routing can change.":"Les commandes, secrets et options personnalisées sont préservés. Seule l'affectation des agents peut changer."};

Object.assign(FR,{
  'MCP editor unavailable. Check the manifest, then Refresh.':'Éditeur MCP indisponible. Vérifiez le manifeste, puis actualisez.',
  'This only removes the saved selection; existing links stay untouched.':'Supprime uniquement le profil enregistré, sans modifier les liens existants.',
  'Capture agent skill and MCP state now. This may take a moment on large local libraries.':'Enregistrez maintenant les compétences et les configurations MCP. Les grandes bibliothèques peuvent prendre un moment.',
  'This replaces managed paths with their historical state. Create a fresh backup first, and verify that this is the intended snapshot.':'Remplace les chemins gérés par leur état précédent. Créez d’abord une sauvegarde et vérifiez l’instantané sélectionné.',
  'Create a recovery snapshot and write the updated manifest.':'Créer un instantané de récupération et enregistrer le manifeste modifié.',
  'Agent configuration synchronization remains a separate explicit action.':'La synchronisation des agents reste une action explicite et distincte.',
  'The operation will revalidate local files and create a recovery snapshot where supported. No third-party scripts are executed.':'L’opération revérifie les fichiers locaux et crée un instantané de récupération si possible. Aucun script tiers n’est exécuté.',
  'Preview reported errors; apply is blocked.':'Des erreurs ont été relevées : application bloquée.',
  'Preview reported errors.':'Des erreurs ont été relevées dans l’aperçu.',
  'PREVIEW':'APERÇU','APPLIED':'APPLIQUÉ','not found':'introuvable',
  'intact':'intact','installed':'installé','available':'disponible',
  'untracked':'non suivi','missing':'manquant','unsafe':'dangereux',
  'modified':'modifié','local':'local','unmanaged':'non géré',
  'outdated':'obsolète','attention':'attention','unverified':'non vérifié',
  'Disabled':'Désactivé','Failed':'Échec','No issues':'Aucun problème',
  'not needed':'inutile','none':'aucun','no receipt':'sans reçu',
  'Remove':'Supprimer','Update':'Mettre à jour','Install':'Installer',
  'Uninstall':'Désinstaller','Create':'Créer','Configure':'Configurer',
  'Agent configuration synchronization remains a separate explicit action.':'La synchronisation des agents reste une opération distincte.',
  'The operation will revalidate local files and create a recovery snapshot where supported. No third-party scripts are executed.':'Les fichiers locaux sont revérifiés et un instantané est créé si possible. Aucun script tiers n’est exécuté.',
  'Synchronization changes agent skill links and creates a recovery snapshot when needed. MCP configurations remain untouched.':'La synchronisation modifie les liens de compétences et crée un instantané si nécessaire. Les configurations MCP restent inchangées.',
  'This changes compatible agent skill links and merges MCP server entries. A recovery snapshot is created when there are changes. Conflicts are preserved.':'Les liens de compétences sont mis à jour et les entrées MCP fusionnées. Un instantané est créé en cas de changement. Les conflits sont conservés.',
  'Health: OK':'Santé : OK','Link capability: OK':'Gestion des liens : OK',
  'No changes.':'Aucun changement.'
});
// Translate only anchored UI patterns; preserve captured IDs/names unchanged.
const FR_PATTERNS=[
  [/^(\d+) skills · pinned upstream metadata$/,n=>n+' compétences · références épinglées'],
  [/^(\d+) linked skills · (\d+) MCP servers$/, (a,b)=>a+' compétences liées · '+b+' serveurs MCP'],
  [/^(\d+) reviewed-catalog installations$/,n=>n+' installations vérifiées du catalogue'],
  [/^(\d+) items needing attention$/,n=>n+' éléments à examiner'],
  [/^(\d+) available snapshots$/,n=>n+' instantanés disponibles'],
  [/^(\d+) linked · (\d+) local skills · (\d+) MCP servers$/, (a,b,c)=>a+' liées · '+b+' compétences locales · '+c+' serveurs MCP'],
  [/^(\d+) files checked · (.+)$/, (a,b)=>a+' fichiers vérifiés · '+(b==='no receipt'?'sans reçu':b)],
  [/^(.+) · (Enabled|Disabled) · (\d+) args · (\d+) env keys( · overrides preserved)?$/, (transport,enabled,args,keys,overrides)=>transport+' · '+(enabled==='Enabled'?'Activé':'Désactivé')+' · '+args+' arguments · '+keys+' variables d’environnement'+(overrides?' · personnalisations préservées':'')],
  [/^View details for (.+)$/,name=>'Voir les détails de '+name],
  [/^Edit routing for (.+)$/,name=>'Modifier les agents de '+name],
  [/^Remove MCP server (.+)$/,name=>'Supprimer le serveur MCP '+name],
  [/^Restore snapshot (.+)$/,id=>'Restaurer l’instantané '+id],
  [/^Restore (snapshot-.+)$/,id=>'Restaurer '+id],
  [/^Type (.+) to confirm\.$/,token=>'Saisissez '+token+' pour confirmer.'],
  [/^Routing: (.+)$/,name=>'Affectation : '+name],
  [/^Confirm MCP (create|configure|delete)$/,op=>'Confirmer MCP : '+({create:'création',configure:'configuration',delete:'suppression'}[op])],
  [/^(.+) saved\. Snapshot: (.+)$/, (name,id)=>name+' enregistré. Instantané : '+(id==='not needed'?'inutile':id)],
  [/^Backup created: (.+)$/,id=>'Sauvegarde créée : '+id],
  [/^(.+) (installed|updated|uninstalled)$/, (id,verb)=>id+' '+({installed:'installé',updated:'mis à jour',uninstalled:'désinstallé'}[verb])],
  [/^(.+) · (Create a recovery snapshot and write the updated manifest\.|No changes\.)$/, (id,desc)=>id+' · '+translateText(desc)],
  [/^Preview: (\d+) skill result\(s\)\. Synchronization changes agent skill links and creates a recovery snapshot when needed\. MCP configurations remain untouched\.$/,n=>'Aperçu : '+n+' résultats de compétences. La synchronisation modifie les liens des agents et crée un instantané si nécessaire. Les paramètres MCP restent inchangés.'],
  [/^Commit: (.+)$/,commit=>'Commit : '+commit],
  [/^Files: (\d+)$/,count=>'Fichiers : '+count],
  [/^Bytes: (\d+)$/,bytes=>'Octets : '+bytes],
  [/^From: (.+)$/,commit=>'Depuis : '+commit],
  [/^To: (.+)$/,commit=>'Vers : '+commit],
  [/^Added: (\d+)$/,count=>'Ajoutés : '+count],
  [/^Changed: (\d+)$/,count=>'Modifiés : '+count],
  [/^Removed: (\d+)$/,count=>'Supprimés : '+count]
];
function translateText(english){
  if(Object.hasOwn(FR,english))return FR[english];
  if(english.includes('\n'))return english.split('\n').map(translateText).join('\n');
  for(const [pattern,format] of FR_PATTERNS){
    const match=english.match(pattern);
    if(match)return format(...match.slice(1));
  }
  return english;
}
const originalText=new WeakMap(),originalAttributes=new WeakMap();
let language='en';
function tr(english){return language==='fr'?translateText(english):english}
function translateUI(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const n=walker.currentNode;
    if(n.parentElement?.closest('script,style,.result-box,[data-no-i18n],.skill-card h3,.skill-card p,.agent-card h3'))continue;
    if(!originalText.has(n))originalText.set(n,n.textContent);
    const base=originalText.get(n);
    const clean=base.trim();
    n.textContent=base.replace(clean,tr(clean));
  }
  document.querySelectorAll('[placeholder],[aria-label]').forEach(el=>{
    if(!originalAttributes.has(el))originalAttributes.set(el,{placeholder:el.getAttribute('placeholder'),label:el.getAttribute('aria-label')});
    const base=originalAttributes.get(el);
    if(base.placeholder!==null)el.setAttribute('placeholder',tr(base.placeholder));
    if(base.label!==null)el.setAttribute('aria-label',tr(base.label));
  });
}
function setLanguage(next){
  language=next==='fr'?'fr':'en';
  document.documentElement.lang=language;
  $('language-select').value=language;
  try{localStorage.setItem('agent-commons-ui-language',language)}catch{}
  translateUI();
}
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(cls)e.className=cls;return e};
const rawNode=(tag,text,cls)=>{const e=node(tag,text,cls);e.dataset.noI18n='true';return e};
const clear=e=>e.replaceChildren();
let toastSequence=0;
const showToast=(message,error=false)=>{const sequence=++toastSequence;const t=$('toast');t.setAttribute('role',error?'alert':'status');t.setAttribute('aria-live',error?'assertive':'polite');t.textContent=message;t.className='toast'+(error?' error':'');translateUI();setTimeout(()=>{if(toastSequence===sequence)t.classList.add('hidden')},4300)};
async function request(url,body){const opts=body===undefined?{method:'GET'}:{method:'POST',headers:{'content-type':'application/json','x-agent-commons-csrf':csrf},body:JSON.stringify(body)};const response=await fetch(url,opts);let data;try{data=await response.json()}catch{throw Error('Invalid server response')}if(!response.ok)throw Error(data.error||'Request failed');return data}
function go(page){const target=$('page-'+page);if(!target)return;activePage=page;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e===target));document.querySelectorAll('[data-page]').forEach(e=>{const current=e.dataset.page===page;e.classList.toggle('active',current);if(current)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current')});window.scrollTo({top:0,behavior:'instant'});const heading=target.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}}
document.querySelectorAll('[data-page],[data-go]').forEach(e=>e.addEventListener('click',()=>go(e.dataset.page||e.dataset.go)));
let modalReturnFocus=null;
function unmountDialog(){clear($('modal-root'));document.querySelector('.layout').inert=false}
function closeDialog(){unmountDialog();const target=modalReturnFocus;modalReturnFocus=null;if(target?.isConnected&&!target.disabled&&!(target.closest('.page')&&!target.closest('.page.active')))target.focus();else document.querySelector('.nav button.active')?.focus()}
function showDialog(bg,box,initial){if(modalReturnFocus===null)modalReturnFocus=document.activeElement;unmountDialog();const title=box.querySelector('h2');if(title){title.id='modal-title';box.setAttribute('aria-labelledby','modal-title');box.removeAttribute('aria-label')}const description=box.querySelector('p.copy');if(description){description.id='modal-description';box.setAttribute('aria-describedby','modal-description')}bg.append(box);$('modal-root').append(bg);document.querySelector('.layout').inert=true;initial.focus();translateUI()}
document.addEventListener('keydown',event=>{const dialog=$('modal-root').querySelector('[role="dialog"]');if(!dialog)return;if(event.key==='Escape'){event.preventDefault();closeDialog();return}if(event.key!=='Tab')return;const focusable=[...dialog.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length>0);if(!focusable.length){event.preventDefault();dialog.focus();return}const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus()}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus()}});
function modal(title,details,actionLabel,onConfirm,requiresText){const root=$('modal-root');clear(root);const bg=node('div',null,'modal-backdrop');const box=node('section',null,'modal');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);const h=node('h2',title);box.append(h);const p=node('p',details,'copy');box.append(p);let input=null;if(requiresText){box.append(node('p','Type '+requiresText+' to confirm.','subtle'));input=node('input');input.className='field';input.placeholder=requiresText;input.setAttribute('aria-label','Type confirmation text');box.append(input)}const actions=node('div',null,'modal-buttons');const cancel=node('button','Cancel','btn');const approve=node('button',actionLabel,'btn danger');if(input)approve.disabled=true;if(input)input.addEventListener('input',()=>approve.disabled=input.value!==requiresText);cancel.addEventListener('click',closeDialog);approve.addEventListener('click',async()=>{approve.disabled=true;try{await onConfirm();closeDialog()}catch(err){showToast(err.message,true);approve.disabled=false}});actions.append(cancel,approve);box.append(actions);showDialog(bg,box,input||cancel);bg.addEventListener('click',e=>{if(e.target===bg)closeDialog()})}
function labelStatus(s){const b=node('span',s,'tag '+(s==='intact'||s==='installed'?'good':s==='unsafe'||s==='modified'?'bad':s==='untracked'||s==='missing'?'warn':''));return b}
function row(title,detail,right){const e=node('div',null,'row-item');const l=node('div');l.append(node('strong',title),node('small',detail));e.append(l);if(right)e.append(right);return e}
function renderMetrics(){const installed=state.inventory.agents.filter(a=>a.installed);const values=[['Public skills',state.catalog.length],['Shared skills',state.inventory.centralSkills.length],['Active agents',installed.length],['MCP servers',state.inventory.centralMcpServers.length]];clear($('metrics'));values.forEach(([name,count])=>{const card=node('div',null,'metric');card.append(node('div',count,'value'),node('div',name,'label'));$('metrics').append(card)})}
function renderOverview(){renderMetrics();clear($('overview-agents'));const agents=state.inventory.agents.filter(a=>a.installed);if(!agents.length)$('overview-agents').append(node('p','No supported agents detected on this machine.','dim'));agents.slice(0,8).forEach(a=>{const element=row(a.name,a.linkedSkills.length+' linked skills · '+a.mcpServers.length+' MCP servers',labelStatus('installed'));element.querySelector('strong').dataset.noI18n='true';$('overview-agents').append(element)});clear($('overview-health'));const bad=state.integrity.results.filter(s=>s.status!=='intact');$('overview-health').append(row('Managed skills checked',state.integrity.scanned+' reviewed-catalog installations',labelStatus(bad.length?'attention':'intact')));$('overview-health').append(row('Integrity warnings',bad.length+' items needing attention',bad.length?labelStatus('untracked'):labelStatus('intact')));$('overview-health').append(row('Local backups',state.inventory.backups.length+' available snapshots',null))}
function renderCatalog(){const categories=$('catalog-category');const selected=categories.value;clear(categories);const all=node('option','All categories');all.value='';categories.append(all);state.categories.forEach(c=>{const op=rawNode('option',c.label);op.value=c.id;categories.append(op)});categories.value=selected;filterCatalog()}
function filterCatalog(){if(!state)return;const q=$('catalog-search').value.trim().toLowerCase(),cat=$('catalog-category').value,status=$('catalog-status').value;const results=state.catalog.filter(s=>(!q||[s.id,s.name,s.description,s.author,s.category,...s.tags].join(' ').toLowerCase().includes(q))&&(!cat||s.category===cat)&&(!status||(status==='installed'?s.installed:!s.installed)));$('catalog-count').textContent=results.length+' skills · pinned upstream metadata';const target=$('catalog-cards');clear(target);if(!results.length){target.append(node('div','No skills match these filters.','empty'));translateUI();return}results.forEach(s=>{const card=node('article',null,'skill-card');const header=node('div');header.append(rawNode('span',s.category,'tag'));if(s.lifecycle==='archived')header.append(node('span','Archived','tag warn'));card.append(header,rawNode('h3',s.name),rawNode('p',s.description));const bottom=node('div',null,'bottom');const audit=state.integrity.results.find(item=>item.skill===s.id);bottom.append(labelStatus(!s.installed?'available':audit?.status==='intact'?'installed':audit?.status||'local'));const button=node('button','View details','btn small');button.setAttribute('aria-label','View details for '+s.name);button.addEventListener('click',()=>skillDetails(s));bottom.append(button);card.append(bottom);target.append(card)});translateUI()}
function skillDetails(s){
  const root=$('modal-root');clear(root);
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',s.name);
  const audit=state.integrity.results.find(item=>item.skill===s.id);
  const managed=!!s.installed&&audit?.status==='intact';
  box.append(rawNode('div',s.category+' · '+s.author,'eyebrow'),rawNode('h2',s.name),rawNode('p',s.description,'copy'));
  const details=node('div');
  const licenseRow=row('License',s.license);licenseRow.querySelector('small').dataset.noI18n='true';
  details.append(licenseRow,row('Pinned Git revision',short(s.ref)),
    row('Status',!s.installed?'Not installed':managed?'Verified managed installation':'Local installation · '+(audit?.status||'unverified'),
      labelStatus(!s.installed?'available':audit?.status||'unmanaged')));
  if(managed)details.append(row('Installed revision',short(audit.commit),labelStatus(audit.commit===s.ref?'intact':'outdated')));
  box.append(details);
  if(s.installed&&!managed)box.append(node('p','This existing directory cannot be updated or removed by the managed catalog installer. Agent Commons preserves local and modified data.','copy'));
  const links=node('div',null,'links'),link=node('a','Review upstream source');
  link.href=s.source;link.target='_blank';link.rel='noopener noreferrer';links.append(link);
  const license=node('a','License evidence');license.href=s.licenseEvidence;license.target='_blank';license.rel='noopener noreferrer';links.append(license);box.append(links);
  const actions=node('div',null,'modal-buttons'),close=node('button','Close','btn');
  close.onclick=closeDialog;actions.append(close);
  if(managed){
    if(audit.commit!==s.ref&&s.lifecycle!=='archived'){
      const update=node('button','Preview pinned update','btn');
      update.onclick=()=>{unmountDialog();previewSkill('update',s.id)};actions.append(update);
    }
    const remove=node('button','Preview removal','btn danger');
    remove.onclick=()=>{unmountDialog();previewSkill('uninstall',s.id)};actions.append(remove);
  }else if(!s.installed&&s.lifecycle!=='archived'){
    const install=node('button','Preview installation','btn primary');
    install.onclick=()=>{unmountDialog();previewSkill('install',s.id)};actions.append(install);
  }
  box.append(actions);showDialog(bg,box,close);
  bg.onclick=e=>{if(e.target===bg)closeDialog()}
}
async function previewSkill(op,id){if(busy)return;busy=true;showToast('Reviewing pinned skill…');try{const preview=await request('/api/preview?op='+encodeURIComponent(op)+'&id='+encodeURIComponent(id));const payload=preview.preview;const lines=op==='install'?['Commit: '+short(payload.commit),'Files: '+payload.files.length,'Bytes: '+payload.totalBytes]:op==='update'?['From: '+short(payload.previousCommit),'To: '+short(payload.proposedCommit),'Added: '+payload.added.length,'Changed: '+payload.changed.length,'Removed: '+payload.removed.length]:['Commit: '+short(payload.commit),'Files: '+payload.files.length,'Bytes: '+payload.totalBytes];const action=op==='install'?'Install':op==='update'?'Update':'Uninstall';modal(action+' '+id,lines.join('\n')+'\n\nThe operation will revalidate local files and create a recovery snapshot where supported. No third-party scripts are executed.',action,async()=>{await request('/api/action',{action:op,id,approved:true});showToast(id+' '+(op==='install'?'installed':op==='update'?'updated':'uninstalled'));await refresh()},op==='uninstall'?id:undefined)}catch(err){showToast(err.message,true);closeDialog()}finally{busy=false}}
function renderAgents(){clear($('agents-grid'));const agents=state.inventory.agents;agents.forEach(a=>{const e=node('div',null,'agent-card');const h=node('div',null,'head');h.append(rawNode('h3',a.name),labelStatus(a.installed?'installed':'not found'));e.append(h,node('p',a.linkedSkills.length+' linked · '+a.localPhysicalSkills.length+' local skills · '+a.mcpServers.length+' MCP servers'));$('agents-grid').append(e)});const select=$('profile-agent');const was=selectedAgent;clear(select);agents.filter(a=>a.installed).forEach(a=>{const op=rawNode('option',a.name);op.value=a.id;select.append(op)});selectedAgent=agents.some(a=>a.id===was&&a.installed)?was:(select.options[0]?.value||'');select.value=selectedAgent;renderProfileEditor()}
function renderMcp(){
  const target=$('mcp-items');clear(target);
  if(!mcpState){target.append(node('div','MCP editor unavailable. Check the manifest, then Refresh.','empty'));return}
  if(!mcpState.servers.length){target.append(node('div','No shared MCP servers. Add a server to begin.','empty'));return}
  mcpState.servers.forEach(s=>{
    const buttons=node('div',null,'actions');
    const edit=node('button','Routing…','btn small');edit.setAttribute('aria-label','Edit routing for '+s.name);edit.onclick=()=>mcpDialog('configure',s);
    const remove=node('button','Remove…','btn danger small');remove.setAttribute('aria-label','Remove MCP server '+s.name);remove.onclick=()=>mcpChange({operation:'delete',name:s.name});
    buttons.append(edit,remove);
    const element=row(s.name,s.transport+' · '+(s.enabled?'Enabled':'Disabled')+' · '+s.argsCount+' args · '+s.envKeyCount+' env keys'+(s.hasOverrides?' · overrides preserved':''),buttons);element.querySelector('strong').dataset.noI18n='true';target.append(element);
  })
}
function mcpField(label,value=''){
  const wrapper=node('label',null,'check'),caption=node('span',label,'subtle'),input=node('input');
  input.className='field';input.value=value;
  wrapper.append(caption,input);return {wrapper,input}
}
function mcpAgentPicker(label,selected=[]){
  const wrap=node('div'),list=node('div',null,'checkbox-list');wrap.append(node('h3',label),list);
  mcpState.agents.forEach(a=>{const row=node('label',null,'check'),input=node('input');
    input.type='checkbox';input.value=a.id;input.checked=selected.includes(a.id);
    row.append(input,rawNode('span',a.name));list.append(row)});
  return {wrap,get:()=>[...list.querySelectorAll('input:checked')].map(x=>x.value)}
}
async function mcpChange(payload){
  try{
    const preview=await request('/api/action',{action:'mcp-preview',...payload,expectedRevision:mcpState.revision});
    const p=preview.plan;
    modal('Confirm MCP '+p.operation,p.name+' · '+(p.changed?'Create a recovery snapshot and write the updated manifest.':'No changes.')+'\nAgent configuration synchronization remains a separate explicit action.','Apply change',async()=>{
      const result=await request('/api/action',{action:'mcp-apply',...payload,expectedRevision:p.expectedRevision,approved:true});
      showToast(p.name+' saved. Snapshot: '+(result.result.snapshotId||'not needed'));await refresh()
    },p.operation==='delete'?p.name:undefined);
  }catch(err){showToast(err.message,true);closeDialog()}
}
function mcpDialog(operation,server){
  if(!mcpState)return;
  const root=$('modal-root');clear(root);
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.setAttribute('aria-label',operation==='create'?'Add MCP server':'Edit MCP routing');
  box.append(node('h2',operation==='create'?'New MCP server':'Routing: '+server.name));
  box.append(node('p',operation==='create'?'Do not paste tokens in commands or URLs. Use environment references in the central manifest for secrets.':'Existing commands, secrets and custom options are preserved. Only agent routing can change.','copy'));
  const name=mcpField('Server ID',server?.name||'');box.append(name.wrapper);
  if(operation==='configure')name.input.disabled=true;
  let transport,command,args,url;
  if(operation==='create'){
    const transportRow=node('label',null,'check');
    transport=node('select');transport.className='field';
    ['stdio','http','sse'].forEach(v=>{const opt=node('option',v);opt.value=v;transport.append(opt)});
    transportRow.append(node('span','Transport','subtle'),transport);box.append(transportRow);
    command=mcpField('Executable','npx');args=mcpField('Arguments (one per line)','');
    url=mcpField('HTTP(S) endpoint','https://');
    box.append(command.wrapper,args.wrapper,url.wrapper);
    const toggle=()=>{const isLocal=transport.value==='stdio';command.wrapper.classList.toggle('hidden',!isLocal);args.wrapper.classList.toggle('hidden',!isLocal);url.wrapper.classList.toggle('hidden',isLocal)};
    transport.onchange=toggle;toggle()
  }
  const enabledRow=node('label',null,'check'),enabled=node('input');
  enabled.type='checkbox';enabled.checked=server?.enabled!==false;
  enabledRow.append(enabled,node('span','Enabled'));box.append(enabledRow);
  const include=mcpAgentPicker('Include agents (empty = all)',server?.agents||[]),
    exclude=mcpAgentPicker('Exclude agents',server?.excludeAgents||[]);
  box.append(include.wrap,exclude.wrap);
  const buttons=node('div',null,'modal-buttons'),cancel=node('button','Cancel','btn'),preview=node('button','Preview change','btn primary');
  buttons.append(cancel,preview);box.append(buttons);bg.append(box);root.append(bg);
  cancel.onclick=closeDialog;bg.onclick=e=>{if(e.target===bg)closeDialog()};
  preview.onclick=()=>{
    const route={agents:include.get(),excludeAgents:exclude.get(),enabled:enabled.checked};
    const payload={operation,name:name.input.value.trim()};
    if(operation==='create'){
      const spec={type:transport.value,...route};
      if(transport.value==='stdio'){spec.command=command.input.value.trim();spec.args=args.input.value.split('\n').map(x=>x.trim()).filter(Boolean)}
      else spec.url=url.input.value.trim();
      payload.spec=spec;
    }else payload.routing=route;
    unmountDialog();mcpChange(payload)
  };
  showDialog(bg,box,name.input.disabled?cancel:name.input)
}
function readSelections(container){return [...container.querySelectorAll('input[type="checkbox"]:checked')].map(e=>e.value)}
function choicesInto(container,items,selected){clear(container);if(!items.length){container.append(node('p','Nothing available yet.','dim'));return}items.forEach(item=>{const row=node('label',null,'check');const input=node('input');input.type='checkbox';input.value=item.id;input.checked=selected.includes(item.id);row.append(input,rawNode('span',item.label));container.append(row)})}
function renderProfileEditor(){if(!state)return;const saved=state.profiles.profiles[selectedAgent]||{skills:[],categories:[]};const draft=profileDrafts[selectedAgent]||(profileDrafts[selectedAgent]={skills:[...saved.skills],categories:[...saved.categories]});const query=$('profile-skill-search').value.toLowerCase().trim();choicesInto($('profile-skills'),state.inventory.centralSkills.filter(id=>!query||id.toLowerCase().includes(query)).map(id=>({id,label:id})),draft.skills);choicesInto($('profile-categories'),state.categories.map(c=>({id:c.id,label:c.label})),draft.categories);for(const [container,key] of [[$('profile-skills'),'skills'],[$('profile-categories'),'categories']]){container.querySelectorAll('input[type="checkbox"]').forEach(check=>check.addEventListener('change',()=>{const all=new Set(draft[key]);if(check.checked)all.add(check.value);else all.delete(check.value);draft[key]=[...all].sort()}))}$('profile-save').disabled=!selectedAgent;$('profile-clear').disabled=!state.profiles.profiles[selectedAgent]}
function formatSync(r){const lines=['Mode: '+(r.dryRun?'PREVIEW':'APPLIED'),'Agents: '+r.detectedAgentsCount,'Skill operations: '+r.skillResults.length,'MCP operations: '+r.mcpResults.length,'Snapshot: '+(r.snapshotId||'none')];r.skillResults.forEach(s=>{if(s.action!=='already-synced')lines.push('['+s.agentId+'] '+s.skillName+': '+s.action)});r.errors.forEach(e=>lines.push('ERROR: '+e));if(!r.skillResults.length&&!r.errors.length)lines.push('No skill changes proposed.');return lines.join('\n')}
function showSync(r){const p=$('sync-report');p.classList.remove('hidden');p.textContent=formatSync(r)}
function renderIntegrity(){clear($('integrity-items'));if(!state.integrity.scanned){$('integrity-items').append(node('div','No managed public-catalog skill installations found.','empty'));return}state.integrity.results.forEach(r=>{const e=row(r.skill,r.checkedFiles+' files checked · '+(r.commit?short(r.commit):'no receipt'),labelStatus(r.status));e.querySelector('strong').dataset.noI18n='true';$('integrity-items').append(e);if(r.issues.length){const issues=node('div',r.issues.map(i=>i.type+': '+i.reason+(i.path?' ('+i.path+')':'')).join('\n'),'result-box');$('integrity-items').append(issues)}})}
function renderBackups(){clear($('backup-items'));if(!state.inventory.backups.length){$('backup-items').append(node('div','No snapshots yet.','empty'));return}state.inventory.backups.forEach(b=>{const btn=node('button','Restore…','btn danger small');btn.setAttribute('aria-label','Restore snapshot '+b.id);btn.onclick=()=>modal('Restore '+b.id,'This replaces managed paths with their historical state. Create a fresh backup first, and verify that this is the intended snapshot.','Restore',async()=>{await request('/api/action',{action:'restore',snapshot:b.id,approved:true});showToast('Snapshot restored');await refresh()},b.id);$('backup-items').append(row(b.id,b.createdAt+' · '+b.reason+' · '+b.entriesCount+' entries',btn))})}
function renderAll(){renderOverview();renderCatalog();renderAgents();renderMcp();renderIntegrity();renderBackups();translateUI()}
async function refresh(announce=false){if(announce)$('workspace-status').textContent='Refreshing local workspace…';try{state=await request('/api/state');try{mcpState=await request('/api/mcp')}catch(err){mcpState=null;showToast(err.message,true)}profileDrafts=Object.create(null);renderAll();if(state.warnings?.length)showToast(state.warnings[0],true);if(announce){$('workspace-status').textContent='Workspace and integrity results updated.';translateUI()}}catch(err){showToast(err.message,true);if(announce){$('workspace-status').textContent='Workspace refresh failed.';translateUI()}}}
$('language-select').onchange=e=>setLanguage(e.target.value);
$('refresh').onclick=()=>refresh(true);
$('mcp-add').onclick=()=>mcpDialog('create');
$('catalog-search').oninput=filterCatalog;$('catalog-category').onchange=filterCatalog;$('catalog-status').onchange=filterCatalog;
$('profile-agent').onchange=e=>{selectedAgent=e.target.value;$('profile-skill-search').value='';renderProfileEditor()};
$('profile-skill-search').oninput=renderProfileEditor;
$('profile-save').onclick=async()=>{if(!selectedAgent)return;const draft=profileDrafts[selectedAgent]||{skills:[],categories:[]};const skills=draft.skills;const categories=draft.categories;if(!skills.length&&!categories.length){showToast('Choose at least one skill or category.',true);return}try{await request('/api/action',{action:'profile-save',agent:selectedAgent,skills,categories,approved:true});showToast('Profile saved (not synced)');await refresh()}catch(err){showToast(err.message,true)}};
$('profile-clear').onclick=()=>{if(!selectedAgent)return;modal('Clear profile','This only removes the saved selection; existing links stay untouched.','Clear profile',async()=>{await request('/api/action',{action:'profile-clear',agent:selectedAgent,approved:true});showToast('Saved profile cleared');await refresh()})};
$('sync-preview').onclick=async()=>{try{showSync(await request('/api/action',{action:'sync-preview'}));go('agents')}catch(err){showToast(err.message,true)}};
$('sync-apply').onclick=async()=>{try{const p=await request('/api/action',{action:'sync-preview'});showSync(p);if(p.errors.length)throw Error('Preview reported errors; apply is blocked.');modal('Apply saved profiles','Preview: '+p.skillResults.length+' skill result(s). Synchronization changes agent skill links and creates a recovery snapshot when needed. MCP configurations remain untouched.','Apply sync',async()=>{const r=await request('/api/action',{action:'sync-apply',approved:true});showSync(r);if(r.errors.length)throw Error('Sync returned errors: '+r.errors.join('; '));showToast('Profiles synchronized');await refresh()},'SYNC')}catch(err){showToast(err.message,true)}};
$('doctor-run').onclick=async()=>{try{const r=await request('/api/doctor');const p=$('doctor-report');p.classList.remove('hidden');p.textContent=['Health: '+(r.healthy?'OK':'Attention'),'Link capability: '+(r.linkCapabilityVerified?'OK':'Failed'),'Central MCP: '+r.centralMcpStatus,...r.issues].join('\n')||'No issues';}catch(err){showToast(err.message,true)}};
$('full-sync-preview').onclick=async()=>{try{const r=await request('/api/action',{action:'sync-all-preview'});const p=$('full-sync-report');p.classList.remove('hidden');p.textContent=formatSync(r)}catch(err){showToast(err.message,true)}};
$('full-sync-apply').onclick=async()=>{try{const p=await request('/api/action',{action:'sync-all-preview'});const report=$('full-sync-report');report.classList.remove('hidden');report.textContent=formatSync(p);if(p.errors.length)throw Error('Preview reported errors.');modal('Synchronize skills + MCP','This changes compatible agent skill links and merges MCP server entries. A recovery snapshot is created when there are changes. Conflicts are preserved.','Apply full sync',async()=>{const result=await request('/api/action',{action:'sync-all-apply',approved:true});report.textContent=formatSync(result);if(result.errors.length)throw Error('Full sync returned errors: '+result.errors.join('; '));showToast('Full synchronization completed');await refresh()},'SYNC ALL')}catch(err){showToast(err.message,true)}};
$('verify-again').onclick=()=>refresh(true);
$('backup-create').onclick=()=>modal('Create full backup','Capture agent skill and MCP state now. This may take a moment on large local libraries.','Create backup',async()=>{const r=await request('/api/action',{action:'backup',approved:true});showToast('Backup created: '+r.id);await refresh()});
try{language=localStorage.getItem('agent-commons-ui-language')||'en'}catch{language='en'}
setLanguage(language);
refresh();
</script></body></html>`;
