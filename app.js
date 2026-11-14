/* ==========================================================================
   SƆBUNU - app.js
   Un seul fichier JavaScript pour tout le site.
   Connexion : Firebase Authentication. Données : Firebase Realtime Database (règles dans
   database_rules.json), avec une copie locale (localStorage) pour l'affichage rapide.
   ========================================================================== */
'use strict';

/* --------------------------------------------------------------------------
   1. RÉGLAGES MODIFIABLES
   -------------------------------------------------------------------------- */
const CONFIG = {
  JOURS_INACTIVITE: 365,     // au-delà, le compte est verrouillé
  DEVISE: 'FCFA',
  HEURE_DEBUT: 5,            // la journée de transport commence à 5h...
  HEURE_FIN: 19,             // ...et s'achève à 19h
  DUREE_ANNONCE_MS: 60000,   // la fenêtre "journée ouverte" reste affichée 1 minute
  /* SYNCHRONISATION ENTRE APPAREILS (transporteur, acheteur, modérateur sur des téléphones différents).
     Collez ici l'adresse de votre Firebase Realtime Database, par exemple
     'https://sobunu-default-rtdb.europe-west1.firebasedatabase.app'  (sans "/" final).
     Laissez '' pour travailler seulement en local sur cet appareil (ancien fonctionnement). */
  SYNC_URL: 'https://sobunu-cb99c-default-rtdb.europe-west1.firebasedatabase.app/',
  /* CONNEXION SÉCURISÉE (Firebase Authentication) : console Firebase > Paramètres du projet > Général > « Clé API Web » (commence par AIza) */
  API_KEY: "AIzaSyBPBvnMUPlARBeys6c_kQ9-n1gU1svRnWU",
  /* Adresse de la fonction « sobunuAdmin » (nouveau mot de passe d'un compte, suppression complète) : voir functions/index.js. Vide = désactivé. */
  FUNCTIONS_URL: '',
  MONTANT_PAR_SAC: 1000,     // FCFA par sac : sert au montant du dédouanement de l'acheteur
  SEUIL_REMISE: 200,         // à partir de ce nombre de sacs (inclus)...
  TAUX_REMISE: 6 / 7,        // ...le montant est calculé à 85,71 % (350 sacs -> 300 000 FCFA)
  /* CARROUSEL D'IMAGES (pages acheteur, admin, moderateur, transporteur) */
  CARROUSEL_DELAI_MS: 60000, // une nouvelle image toutes les minutes
  CARROUSEL_MIN: 5,          // nombre minimum d'images affichées (complété par des images par défaut)
  CARROUSEL_MAX: 10,         // nombre maximum d'images personnalisées par page
  /* RÉINITIALISATION DES INSCRIPTIONS : à la 1re ouverture du site avec cet identifiant, tous les comptes
     (et mots de passe, codes de zone réservée, session, journée déclarée) de l'appareil sont effacés,
     puis les nouvelles inscriptions sont de nouveau possibles. Pour recommencer à zéro plus tard,
     changez simplement cette valeur (ex. '2027-01-15'). */
  REINIT_ID: '2026-11-10-auth'
};

/* Images (ou emojis) du menu : remplacez par un chemin d'image si vous voulez,
   par exemple  accueil: 'images/accueil.png'  */
const NAV_ICONS = {
  menu: 'img/Menu.png', accueil: 'img/home.png', apropos: 'img/apropos.png',
  services: 'img/service.png', admin: 'img/admin.png', moderateur: 'img/moderateur.png',
  marche: 'img/marche.png', acheteur: 'img/acheteur.png', transporteur: 'img/transporteur.png',
  profil: 'img/profil.png', contact: 'img/mail.png', connexion: 'img/connexion.png', inscription: 'img/inscription.png', deconnexion: 'img/deconnexion.png'
};

const ROLES = {
  admin: 'Administrateur',
  moderateur: 'Modérateur',
  moderateur_attente: 'Modérateur (en attente de validation)',
  acheteur: 'Acheteur',
  transporteur: 'Transporteur'
};

/* Logo par défaut (dessin SVG intégré). Il est remplacé si l'admin change le logo. */
const LOGO_DEFAUT = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
  '<circle cx="100" cy="100" r="95" fill="#fefbf8" stroke="#f28c00" stroke-width="4"/>' +
  '<circle cx="100" cy="80" r="30" fill="#f28c00"/>' +
  '<path d="M55 88h90v50H55z" fill="#0b1a4a"/>' +
  '<path d="M55 138q45-18 90 0v10H55z" fill="#1f9d3a"/>' +
  '<text x="100" y="178" text-anchor="middle" font-size="22" font-family="Arial" font-weight="700" fill="#0b1a4a">SƆBUNU</text></svg>');

/* --------------------------------------------------------------------------
   2. TRADUCTIONS (français = texte écrit dans le HTML, anglais ci-dessous)
   Pour ajouter une langue : ajoutez un objet (ex. fon: {...}) et une <option>
   dans la page profil.
   -------------------------------------------------------------------------- */
const I18N = {
  en: {
    nav_menu: 'Menu', nav_home: 'Home', nav_about: 'About', nav_services: 'Services',
    nav_admin: 'Admin', nav_mod: 'Moderator', nav_market: 'Market', nav_buyer: 'Buyer',
    nav_carrier: 'Carrier', nav_profile: 'Profile', nav_contact: 'Contact',
    nav_login: 'Log in', nav_register: 'Sign up', nav_logout: 'Log out',
    start: 'Start', create_account: 'Create an account', sign_up: 'Sign up',
    sign_in: 'Log in', logout: 'Log out', save: 'Save', scan: 'Scan QR code',
    add_carrier: 'Add a carrier', language: 'Language', my_info: 'My information',
    send: 'Send', change_photo: 'Change photo', change_logo: 'Change logo',
    delete_buyer: 'Delete buyer account',
    delete_account: 'Delete an account',
    tarif_title: 'Transport price', tarif_sacs: 'Number of bags', tarif_amount: 'Amount (FCFA)'
  },

  /* ---- BAATƆNUM (bariba, nord Bénin) ----
     Complétez les traductions entre les guillemets avec un locuteur natif ou le
     dictionnaire de la CNLB (https://www.webonary.work/baatonum/).
     Tant qu'une ligne est vide '', le texte reste en français. */
  bba: {
  nav_menu: 'Wiru',      // Menu
  nav_home: 'Yɛ̃nnu',      // Accueil
  nav_about: 'Yen gari',     // À propos
  nav_services: 'Sɔ̃mburu',  // Services
  nav_admin: 'Wiru gi',     // Admin
  nav_mod: 'Bwãbu',       // Modérateur
  nav_market: 'Yaburu',    // Marché
  nav_buyer: 'Dweo',     // Acheteur
  nav_carrier: 'Gbãro gi',   // Transporteur
  nav_profile: 'Nen seeda',   // Profil
  nav_contact: 'Waanabu',   // Contact
  nav_login: 'Duubu',     // Connexion
  nav_register: 'Tusiabu',  // Inscription
  nav_logout: 'Yaribu',    // Se déconnecter
  start: 'Gbikiru',         // Commencer
  create_account: 'Ayeru ko bu',// Création de compte
  sign_up: 'Yĩsiru wɛ̃bu',       // S'inscrire
  sign_in: 'Duubu',       // Se connecter
  logout: 'Yaribu',        // Se déconnecter
  save: 'Yiibu',          // Enregistrer
  scan: 'A QR seeda swa',          // Scanner le code QR
  add_carrier: 'Gbãro gin sosibu',   // Ajouter transporteur
  language: 'Barun',      // Langue
  my_info: 'Nɛ̃n garin gɔsiabu',       // Modifier mes informations
  send: 'A mɔrisio',          // Envoyer
  change_photo: 'Nɛ̃n wuswa kɔsibu',  // Changer la photo
  change_logo: 'Seeda kɔsibu',   // Changer le logo
  delete_buyer: 'Dweo ayeru goobu',  // Supprimer le compte acheteur
  tarif_title: 'Gbãro gobi',   // Montant du transport
  tarif_sacs: 'Saakin geeru',    // Nombre de sacs
  tarif_amount: 'Yen geeru'   // Montant (FCFA)
  }
};

/* --------------------------------------------------------------------------
   3. PETITS OUTILS
   -------------------------------------------------------------------------- */
const $ = (sel, racine = document) => racine.querySelector(sel);
const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];
const argent = n => (Number(n) || 0).toLocaleString('fr-FR') + ' ' + CONFIG.DEVISE;
const normTel = t => String(t || '').replace(/[\s+\-().]/g, '');
/* E-mail : toujours en minuscules. Dans la base, la clé d'un e-mail remplace les points par des virgules (un point est interdit dans une clé Firebase). */
const normEmail = e => String(e || '').trim().toLowerCase();
const emailValide = e => /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(e) && e.length < 120 && !/@sobunu\.app$/i.test(e);
const cleMail = e => normEmail(e).replace(/\./g, ',');
const emailTechnique = e => /@sobunu\.app$/i.test(String(e || ''));   // anciens comptes : NPI@sobunu.app (sans vrai e-mail)
const aujourdhui = () => dateLocale();   // jour local de l'appareil (et non UTC : décalage d'1 h au Bénin)
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Date locale AAAA-MM-JJ (suit l'heure de l'appareil) et date en toutes lettres : "lundi 10 Novembre 2026" */
const dateLocale = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function dateLongue(iso) {
  const [a, m, j] = String(iso).split('-').map(Number);
  const d = new Date(a, m - 1, j);
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return jours[d.getDay()] + ' ' + j + ' ' + mois[m - 1] + ' ' + a;
}
/* La journée déclarée par l'admin n'est "ouverte" que le jour même, entre HEURE_DEBUT et HEURE_FIN */
function journeeOuverte(j) {
  if (!j || j.date !== dateLocale()) return false;
  const h = new Date().getHours();
  return h >= CONFIG.HEURE_DEBUT && h < CONFIG.HEURE_FIN;
}

function toast(message, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* Traduit une erreur en message compréhensible */
function messageErreur(err) {
  const c = (err && err.code) || '';
  const t = {
    'auth/email-already-in-use': 'Cet e-mail est déjà utilisé par un autre compte.',
    'sobunu/npi-utilise': 'Ce NPI est déjà inscrit.',
    'sobunu/tel-utilise': 'Ce téléphone est déjà utilisé.',
    'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).',
    'auth/invalid-credential': 'Identifiant ou mot de passe incorrect.',
    'auth/wrong-password': 'Identifiant ou mot de passe incorrect.',
    'auth/user-not-found': 'Identifiant ou mot de passe incorrect.',
    'auth/invalid-email': 'Identifiant ou mot de passe incorrect.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    'auth/network-request-failed': 'Pas de connexion internet.',
    'sobunu/admin-invalide': 'NPI ou mot de passe de l\'administrateur principal incorrect.',
    'sobunu/pas-admin': 'Ce compte n\'est pas celui de l\'administrateur principal.',
    'sobunu/session': 'Session expirée : reconnectez-vous.'
  };
  if (t[c]) return t[c];
  if (/^sobunu\//.test(c) && err.message && err.message !== c) return err.message;
  return 'Erreur : ' + (c || (err && err.message) || 'inconnue');
}

/* Mot de passe (ancien système local, plus utilisé pour la connexion) : on n'enregistre jamais le mot de passe en clair, mais son empreinte SHA-256 */
async function hasher(texte) {
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(unescape(encodeURIComponent(texte))); // secours (moins sûr)
}

/* Réduit une image choisie par l'utilisateur pour ne pas saturer le stockage */
function redimensionner(fichier, max = 220, format = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = reject;
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * ratio);
        c.height = Math.round(img.height * ratio);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        // PNG : on garde la transparence (sinon le fond devient noir avec le JPEG)
        resolve(format === 'image/png' ? c.toDataURL('image/png') : c.toDataURL(format, 0.8));
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

/* Ajoute un bouton « œil » qui affiche / masque le mot de passe d'un champ */
function ajouterOeil(input) {
  if (!input || input.dataset.oeil) return;
  input.dataset.oeil = '1';
  const boite = document.createElement('div');
  boite.className = 'champ-mdp';
  input.parentNode.insertBefore(boite, input);
  boite.appendChild(input);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'oeil';
  b.setAttribute('aria-label', 'Afficher le mot de passe');
  b.setAttribute('aria-pressed', 'false');
  b.textContent = '👁️';
  b.onclick = () => {
    const voir = input.type === 'password';
    input.type = voir ? 'text' : 'password';
    b.textContent = voir ? '🙈' : '👁️';
    b.setAttribute('aria-pressed', String(voir));
    b.setAttribute('aria-label', voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  };
  boite.appendChild(b);
}

/* Fenêtre qui demande un texte (utilisée pour "Ajouter transporteur") */
function demanderTexte(titre, placeholder) {
  return new Promise(resolve => {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="modal-box"><h3></h3><input type="text" class="champ" style="width:100%">' +
      '<div class="boutons" style="margin-top:14px"><button class="btn" id="ok">Valider</button>' +
      '<button class="btn btn-2" id="non">Annuler</button></div></div>';
    $('h3', m).textContent = titre;
    $('input', m).placeholder = placeholder || '';
    document.body.appendChild(m);
    const fin = v => { m.remove(); resolve(v); };
    $('#ok', m).onclick = () => fin($('input', m).value.trim());
    $('#non', m).onclick = () => fin(null);
    $('input', m).focus();
  });
}

/* Fenêtre avec plusieurs champs. champs = [{id, placeholder, type, maxlength, inputmode}]
   Renvoie { id: valeur, ... } ou null si on annule. */
function demanderChamps(titre, info, champs) {
  return new Promise(resolve => {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="modal-box"><h3></h3><p style="margin:8px 0"><small></small></p><div id="dc-champs"></div>' +
      '<div class="boutons" style="margin-top:14px;justify-content:center"><button class="btn" id="ok" type="button">Valider</button>' +
      '<button class="btn btn-2" id="non" type="button">Annuler</button></div></div>';
    $('h3', m).textContent = titre;
    $('small', m).textContent = info || '';
    champs.forEach(c => {
      const i = document.createElement('input');
      i.className = 'champ'; i.id = 'dc-' + c.id; i.type = c.type || 'text';
      i.placeholder = c.placeholder || ''; i.autocomplete = 'off';
      if (c.maxlength) i.maxLength = c.maxlength;
      if (c.inputmode) i.inputMode = c.inputmode;
      i.style.cssText = 'width:100%;margin-bottom:8px';
      $('#dc-champs', m).appendChild(i);
    });
    document.body.appendChild(m);
    const fin = v => { m.remove(); resolve(v); };
    $('#ok', m).onclick = () => { const r = {}; champs.forEach(c => { r[c.id] = $('#dc-' + c.id, m).value; }); fin(r); };
    $('#non', m).onclick = () => fin(null);
    $('input', m).focus();
  });
}

/* --------------------------------------------------------------------------
   4. "BASE DE DONNÉES" (localStorage)
   Un utilisateur ressemble à :
   { npi, nom, tel, mdp, role, photo, lang, derniereConnexion,
     sacs, tours, jour,                 <- transporteur
     transporteurs[], sacsDeclares, somme  <- acheteur }
   -------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
   3 bis. SYNCHRONISATION (Firebase Realtime Database, via son interface REST)
   Le localStorage reste une copie locale rapide ; le serveur est la référence commune.
   - Les modifications d'une fiche n'envoient que les champs changés (jamais tout l'objet).
   - Un tour validé utilise des compteurs ATOMIQUES (increment) : deux scans simultanés s'additionnent.
   - Toutes les 3 s, chaque page relit les fiches : un scan apparaît donc partout.
   -------------------------------------------------------------------------- */
/* Fiche complète : tous les comptes d'un même rôle ont exactement les mêmes champs, qu'ils soient nouveaux ou anciens.
   (Firebase supprime les listes/objets vides : on les remet en forme à chaque lecture.) */
function ficheComplete(u) {
  if (!u || typeof u !== 'object') return u;
  const nb = k => { u[k] = Number(u[k]) || 0; };
  const obj = k => { if (!u[k] || typeof u[k] !== 'object' || Array.isArray(u[k])) u[k] = {}; };
  if (!u.lang) u.lang = 'fr';
  if (u.role === 'transporteur') {
    u.sacs = [2, 3, 4, 8, 10].includes(Number(u.sacs)) ? Number(u.sacs) : 2;
    nb('tours'); nb('gainJour'); nb('sacsJour');
    if (!u.jour) u.jour = aujourdhui();
    obj('toursAch'); obj('gainAch'); obj('sacsAch'); obj('sacsPar');
  }
  if (u.role === 'acheteur') {
    if (!Array.isArray(u.transporteurs)) u.transporteurs = Object.values(u.transporteurs || {});
    obj('tarifs');
    nb('sacsDeclares'); nb('somme'); obj('sacsValides'); obj('sacsRefuses');
    if (!Array.isArray(u.declarations)) u.declarations = u.declaration ? [u.declaration] : [];
  }
  return u;
}

const SACS_LISTE = [2, 3, 4, 8, 10];   // nombres de sacs proposés par la liste déroulante
/* Nombre de sacs par tour d'un transporteur CHEZ un acheteur donné (t.sacsPar = { NPI acheteur: nombre }).
   - nombre de la liste : valable tout de suite
   - autre nombre : valable seulement une fois validé par l'acheteur (a.sacsValides) ; 0 = en attente ou refusé
   - aucun choix chez cet acheteur : on garde l'ancien nombre unique du transporteur */
function sacsPour(t, npiA) {
  const p = Number((t.sacsPar || {})[npiA]) || 0;
  if (!p) return Number(t.sacs) || 0;
  if (SACS_LISTE.includes(p)) return p;
  const a = DB.trouver(npiA);
  return a && Number((a.sacsValides || {})[t.npi]) === p ? p : 0;
}
/* '' (rien choisi) | 'liste' | 'valide' | 'attente' | 'refuse' */
function statutSacs(t, npiA) {
  const p = Number((t.sacsPar || {})[npiA]) || 0;
  if (!p) return '';
  if (SACS_LISTE.includes(p)) return 'liste';
  const a = DB.trouver(npiA);
  if (a && Number((a.sacsValides || {})[t.npi]) === p) return 'valide';
  if (a && Number((a.sacsRefuses || {})[t.npi]) === p) return 'refuse';
  return 'attente';
}

const Sync = {
  file: Promise.resolve(), enCours: 0, enPull: null,
  actif() { return !!String(CONFIG.SYNC_URL || '').trim(); },
  /* Adresse de base nettoyée : espaces, "/" final, ".json" ou "/sobunu" collés par erreur */
  base() {
    return String(CONFIG.SYNC_URL || '').trim().replace(/\.json$/i, '').replace(/\/+$/, '').replace(/\/sobunu$/i, '');
  },
  url(chemin) { return this.base() + '/sobunu' + chemin + '.json'; },
  erreur(msg, code) { const e = new Error(msg || 'Pas de connexion au serveur partagé : réessayez.'); e.code = code || 'sobunu/reseau'; return e; },
  /* Erreur de configuration (adresse) : affichée une seule fois par page, pour qu'elle ne passe pas inaperçue */
  configInvalide(msg) {
    if (!this._alerte) { this._alerte = true; try { toast(msg, 'err'); } catch (e) { /* page pas encore prête */ } }
    return this.erreur(msg, 'sobunu/config');
  },
  async lireErreur(r) { try { const d = await r.clone().json(); return String((d && d.error) || ''); } catch (e) { return ''; } },
  /* publique = true : requête sans jeton (seuls /adminActif et /phones/... sont lisibles ainsi) */
  async req(methode, chemin, corps, publique) {
    if (!/^https:\/\/[^\/\s]+\.(firebaseio\.com|firebasedatabase\.app)$/i.test(this.base())) {
      throw this.configInvalide('Adresse Firebase invalide dans CONFIG.SYNC_URL : elle doit ressembler à https://nom-default-rtdb.europe-west1.firebasedatabase.app');
    }
    const appeler = async jeton => {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const delai = ctrl ? setTimeout(() => ctrl.abort(), 15000) : null;   // réseau faible : on abandonne après 15 s
      try {
        return await fetch(this.url(chemin) + (jeton ? '?auth=' + encodeURIComponent(jeton) : ''),
          { method: methode, headers: { 'Content-Type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps), signal: ctrl ? ctrl.signal : undefined });
      } catch (e) { throw this.erreur(); }
      finally { if (delai) clearTimeout(delai); }
    };
    let jeton = null;
    if (!publique) {
      jeton = await Auth.jeton();
      if (!jeton) throw this.erreur('Session expirée : reconnectez-vous.', 'sobunu/session');
    }
    let r = await appeler(jeton);
    if ((r.status === 401 || r.status === 403) && !publique) {
      const msg = await this.lireErreur(r);
      if (!/permission denied/i.test(msg)) {           // jeton expiré : on le renouvelle une seule fois
        jeton = await Auth.rafraichir();
        if (jeton) r = await appeler(jeton);
      }
    }
    if (r.status === 401 || r.status === 403) {
      const msg = await this.lireErreur(r);
      if (/permission denied/i.test(msg)) throw this.erreur('Action refusée par Firebase : règles non publiées, ou action non autorisée pour votre rôle.', 'sobunu/refuse');
      throw this.erreur('Session expirée : reconnectez-vous.', 'sobunu/session');
    }
    if (r.status === 404) throw this.configInvalide('Base Firebase introuvable (404) : vérifiez l\'adresse CONFIG.SYNC_URL et que la Realtime Database est bien créée.');
    if (!r.ok) throw this.erreur('Le serveur partagé a refusé la demande (' + r.status + '). Réessayez.');
    try { return await r.json(); } catch (e) { throw this.erreur('Réponse inattendue du serveur partagé.'); }
  },
  /* Les écritures partent une par une, dans l'ordre (ex. remise à zéro du jour AVANT le +1 du tour) */
  enfiler(fn) {
    this.enCours++;
    const p = this.file.then(fn);
    this.file = p.catch(() => {});
    return p.finally(() => { this.enCours--; });
  },
  ecrire(methode, chemin, corps) { return this.enfiler(() => this.req(methode, chemin, corps)); },

  /* Firebase supprime les listes/objets vides et peut rendre un objet en tableau : on remet les fiches en forme */
  normaliser(u) {
    if (!u || typeof u !== 'object') return null;
    const obj = v => {
      if (Array.isArray(v)) { const o = {}; v.forEach((x, i) => { if (x != null) o[i] = x; }); return o; }
      return v && typeof v === 'object' ? v : {};
    };
    if (u.role === 'acheteur') {
      u.transporteurs = Object.values(u.transporteurs || {});
      u.tarifs = obj(u.tarifs);
      if (u.declarations) u.declarations = Object.values(u.declarations);
    }
    if (u.role === 'transporteur') { u.toursAch = obj(u.toursAch); u.gainAch = obj(u.gainAch); u.sacsAch = obj(u.sacsAch); }
    return ficheComplete(u);
  },
  async tirerUsers() {
    await this.file;                                  // on attend nos propres envois avant de relire
    const d = await this.req('GET', '/users');
    if (this.enCours > 0) return false;               // un envoi vient de partir : on ne l'écrase pas
    const local = {};
    DB.users().forEach(u => { local[u.npi] = u; });
    const liste = Object.values(d || {}).map(u => this.normaliser(u)).filter(Boolean);
    liste.forEach(u => { if (local[u.npi] && local[u.npi].photo) u.photo = local[u.npi].photo; });   // les photos restent locales
    const txt = JSON.stringify(liste);
    try { if (localStorage.getItem('sobunu_users') !== txt) localStorage.setItem('sobunu_users', txt); } catch (e) { /* stockage plein : ignoré */ }
    return true;
  },
  async tirerJournee() {
    const j = await this.req('GET', '/journee');
    if (this.enCours > 0) return;
    const txt = j && j.date ? JSON.stringify(j) : null;
    try {
      if (txt === null) localStorage.removeItem('sobunu_journee');
      else if (localStorage.getItem('sobunu_journee') !== txt) localStorage.setItem('sobunu_journee', txt);
    } catch (e) { /* ignoré */ }
  },
  tirer() {                                           // une seule relecture à la fois
    if (!this.enPull) this.enPull = Promise.all([this.tirerUsers(), this.tirerJournee()]).finally(() => { this.enPull = null; });
    return this.enPull;
  },
  async tirerPhoto(npi) {
    const p = await this.req('GET', '/photos/' + npi);
    const u = DB.trouver(npi);
    if (p && u && !u.photo) { u.photo = p; DB.enregistrer(u, true); }
  },

  /* Envoie une fiche : création complète, ou seulement les champs qui ont changé */
  pousser(user, avant) {
    const { photo, ...corps } = user;
    const ancien = avant ? Object.fromEntries(Object.entries(avant).filter(([k]) => k !== 'photo')) : null;
    const taches = [];
    if (!ancien) taches.push(() => this.req('PUT', '/users/' + user.npi, corps));
    else {
      const diff = {};
      Object.keys(corps).forEach(k => { if (JSON.stringify(corps[k]) !== JSON.stringify(ancien[k])) diff[k] = corps[k]; });
      Object.keys(ancien).forEach(k => { if (!(k in corps)) diff[k] = null; });
      if (Object.keys(diff).length) taches.push(() => this.req('PATCH', '/users/' + user.npi, diff));
    }
    if (photo && (!avant || avant.photo !== photo)) taches.push(() => this.req('PUT', '/photos/' + user.npi, photo));
    return this.enfiler(async () => { for (const f of taches) await f(); });
  },
  effacer(npi, tel) {
    return this.enfiler(async () => {
      let mail = null;
      try { mail = await this.req('GET', '/mails/' + npi, undefined, true); } catch (e) { /* ignoré */ }
      await this.req('DELETE', '/users/' + npi);
      await this.req('DELETE', '/zones/' + npi);
      await this.req('DELETE', '/photos/' + npi);
      if (tel) await this.req('DELETE', '/phones/' + normTel(tel));
      await this.req('DELETE', '/mails/' + npi);                                                    // NPI -> e-mail
      if (typeof mail === 'string' && mail) await this.req('DELETE', '/emails/' + cleMail(mail));   // e-mail -> NPI
    });
  },

  /* Un tour validé : +1 tour, + les sacs, + le gain, au total ET pour l'acheteur concerné.
     Les "increment" sont calculés par le serveur : aucun scan ne peut en écraser un autre. */
  async compterTour(t, npiA, prix, sacs) {
    const inc = n => ({ '.sv': { increment: n } });
    const auj = aujourdhui();
    if (t.jour !== auj) {                             // nouvelle journée : remise à zéro (une seule fois)
      const zeros = m => Object.fromEntries(Object.keys(m || {}).map(k => [k, 0]));
      await this.ecrire('PATCH', '/users/' + t.npi, {
        jour: auj, tours: 0, gainJour: 0, sacsJour: 0,
        gainAch: zeros(t.gainAch), toursAch: zeros(t.toursAch), sacsAch: zeros(t.sacsAch)
      });
    }
    const corps = { tours: inc(1), sacsJour: inc(sacs), gainJour: inc(prix) };
    corps['toursAch/' + npiA] = inc(1);
    corps['sacsAch/' + npiA] = inc(sacs);
    corps['gainAch/' + npiA] = inc(prix);
    await this.ecrire('PATCH', '/users/' + t.npi, corps);
  }
};

const DB = {
  lire(cle, defaut) {
    try { const v = JSON.parse(localStorage.getItem(cle)); return v === null ? defaut : v; }
    catch (e) { return defaut; }
  },
  ecrire(cle, valeur) {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); return true; }
    catch (e) { toast('Stockage plein : image trop lourde ?', 'err'); return false; }
  },
  users() { return this.lire('sobunu_users', []); },
  trouver(npi) { return this.users().find(u => u.npi === npi) || null; },
  trouverParTel(tel) { return this.users().find(u => normTel(u.tel) === normTel(tel)) || null; },
  /* sansSync = true : écriture locale seulement (ex. remise à zéro d'affichage du jour) */
  enregistrer(user, sansSync) {
    const liste = this.users();
    const i = liste.findIndex(u => u.npi === user.npi);
    const avant = i >= 0 ? liste[i] : null;
    if (i >= 0) liste[i] = user; else liste.push(user);
    const ok = this.ecrire('sobunu_users', liste);
    if (ok && !sansSync && Sync.actif()) {
      Sync.pousser(user, avant).catch(e => toast((e && e.message) || 'Modification non enregistrée sur le serveur.', 'err'));
    }
    return ok;
  },
  supprimer(npi) {
    const tel = (this.trouver(npi) || {}).tel;
    this.ecrire('sobunu_users', this.users().filter(u => u.npi !== npi));
    if (Sync.actif()) Sync.effacer(npi, tel).catch(e => toast((e && e.message) || 'Suppression non enregistrée sur le serveur.', 'err'));
  },
  courant() { const npi = this.lire('sobunu_session', null); return npi && Auth.lire() ? this.trouver(npi) : null; },   // pas de jeton = pas de session
  ouvrirSession(npi) { this.ecrire('sobunu_session', npi); },
  fermerSession() { localStorage.removeItem('sobunu_session'); localStorage.removeItem('sobunu_auth'); },
  parRole(role) { return this.users().filter(u => u.role === role); }
};

/* --------------------------------------------------------------------------
   4 ter. CONNEXION SÉCURISÉE : Firebase Authentication (API REST)
   Chaque compte = un utilisateur Firebase  e-mail + mot de passe (anciens comptes : NPI@sobunu.app).
   Le mot de passe n'est plus stocké dans la base : seul Firebase le connaît.
   Chaque requête vers la base part avec le jeton de l'utilisateur (renouvelé automatiquement).
   -------------------------------------------------------------------------- */
const AUTH_MSG = {
  'sobunu/auth-off': 'Activez « E-mail/Mot de passe » dans Firebase > Authentication > Méthode de connexion.',
  'sobunu/cle-api': 'Clé API Web absente ou invalide : renseignez CONFIG.API_KEY dans app.js.',
  'sobunu/desactive': 'Ce compte est désactivé.'
};
function codeAuth(m) {
  m = String(m || '');
  if (/EMAIL_EXISTS/.test(m)) return 'auth/email-already-in-use';
  if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(m)) return 'auth/invalid-credential';
  if (/TOO_MANY_ATTEMPTS/.test(m)) return 'auth/too-many-requests';
  if (/WEAK_PASSWORD/.test(m)) return 'auth/weak-password';
  if (/OPERATION_NOT_ALLOWED|PASSWORD_LOGIN_DISABLED/.test(m)) return 'sobunu/auth-off';
  if (/API key|API_KEY|keyInvalid/i.test(m)) return 'sobunu/cle-api';
  if (/USER_DISABLED/.test(m)) return 'sobunu/desactive';
  return 'auth/' + (m || 'inconnue');
}
const Auth = {
  CLE: 'sobunu_auth', _rafr: null,
  email(npi) { return npi + '@sobunu.app'; },
  lire() { return DB.lire(this.CLE, null); },
  ecrire(s) { if (s) DB.ecrire(this.CLE, s); else localStorage.removeItem(this.CLE); },
  err(code) { const e = new Error(AUTH_MSG[code] || code); e.code = code; return e; },
  garder(npi, d) {
    const avant = this.lire() || {};
    this.ecrire({ npi: npi || avant.npi || null, email: normEmail(d.email) || avant.email || null, idToken: d.idToken, refreshToken: d.refreshToken, exp: Date.now() + Number(d.expiresIn || 3600) * 1000 - 60000 });
  },
  definirNpi(npi) { const s = this.lire(); if (s) { s.npi = npi; this.ecrire(s); } },
  /* e-mail de connexion du compte ouvert (anciennes sessions : NPI@sobunu.app) */
  emailCourant(npi) { const s = this.lire(); return (s && s.email) || this.email(npi); },
  async api(action, corps) {
    const cle = String(CONFIG.API_KEY || '').trim();
    if (!/^AIza[\w-]{30,}$/.test(cle)) throw this.err('sobunu/cle-api');
    let r;
    try {
      r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:' + action + '?key=' + encodeURIComponent(cle),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    } catch (e) { throw this.err('auth/network-request-failed'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw this.err(codeAuth(d && d.error && d.error.message));
    return d;
  },
  async signUp(email, mdp, npi) { const d = await this.api('signUp', { email: email, password: mdp, returnSecureToken: true }); this.garder(npi, d); return d; },
  async signIn(email, mdp, npi) { const d = await this.api('signInWithPassword', { email: email, password: mdp, returnSecureToken: true }); this.garder(npi, d); return d; },
  async changerMdp(npi, nouveau, idToken) { const d = await this.api('update', { idToken: idToken, password: nouveau, returnSecureToken: true }); this.garder(npi, d); },
  async changerEmail(npi, email, idToken) { const d = await this.api('update', { idToken: idToken, email: email, returnSecureToken: true }); this.garder(npi, d); },
  /* Envoie par e-mail le lien de réinitialisation du mot de passe (message envoyé par Firebase) */
  async mdpOublie(email) { await this.api('sendOobCode', { requestType: 'PASSWORD_RESET', email: email }); },
  async supprimer() { const j = await this.jeton(); if (j) await this.api('delete', { idToken: j }); },
  async jeton() {
    const s = this.lire();
    if (!s) return null;
    return Date.now() < s.exp ? s.idToken : this.rafraichir();
  },
  /* Renouvelle le jeton (valable 1 h). Si Firebase refuse définitivement (mot de passe changé ailleurs, compte supprimé), on déconnecte. */
  rafraichir() {
    if (this._rafr) return this._rafr;
    this._rafr = (async () => {
      const s = this.lire();
      if (!s) return null;
      let r;
      try {
        r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(String(CONFIG.API_KEY || '').trim()),
          { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(s.refreshToken) });
      } catch (e) { throw Sync.erreur(); }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 400 || r.status === 401) { DB.fermerSession(); throw Sync.erreur('Session expirée : reconnectez-vous.', 'sobunu/session'); }
        throw Sync.erreur();
      }
      this.garder(s.npi, { idToken: d.id_token, refreshToken: d.refresh_token, expiresIn: d.expires_in });
      return d.id_token;
    })().finally(() => { this._rafr = null; });
    return this._rafr;
  }
};

/* Annule toutes les inscriptions de cet appareil (une seule fois par valeur de CONFIG.REINIT_ID).
   On garde le logo, la langue et les messages du formulaire de contact. */
(function reinitialiserInscriptions() {
  try {
    if (localStorage.getItem('sobunu_reinit') === CONFIG.REINIT_ID) return;
    const aEffacer = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sobunu_(users|creds|session|journee|zone_|auth)/.test(k)) aEffacer.push(k);
    }
    aEffacer.forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('sobunu_zone');
    sessionStorage.removeItem('sobunu_annonce');
    localStorage.setItem('sobunu_reinit', CONFIG.REINIT_ID);
  } catch (e) { /* stockage indisponible : on ignore */ }
})();

/* --------------------------------------------------------------------------
   4 bis. COMPTES : Firebase Authentication (mot de passe) + fiche dans la base (Sync)
   -------------------------------------------------------------------------- */
const Compte = {
  _erreur(code, message) { const e = new Error(message || code); e.code = code; return e; },

  /* Inscription : 1) compte Firebase (e-mail + mot de passe), 2) liens NPI <-> e-mail, 3) index du téléphone, 4) fiche.
     Tout est annulé si une étape échoue. */
  async inscrire(user, mdp, email) {
    email = normEmail(email);
    const cle = cleMail(email);
    let authNouveau = true;
    try { await Auth.signUp(email, mdp, user.npi); }
    catch (e) {
      if (e.code !== 'auth/email-already-in-use') throw e;
      /* Le compte Firebase existe : s'il n'a plus de fiche (supprimée par l'admin), son titulaire peut se réinscrire avec le même mot de passe */
      try { await Auth.signIn(email, mdp, user.npi); authNouveau = false; }
      catch (e2) {
        if (e2.code !== 'auth/invalid-credential') throw e2;     // réseau, trop de tentatives... : on garde la vraie erreur
        throw this._erreur('sobunu/email-auth-existe', 'Cet e-mail existe encore dans Firebase Authentication avec un autre mot de passe (compte supprimé du site mais pas de Firebase).');
      }
    }
    const etat = { cle: false, mail: false, tel: false, fiche: false };
    try {
      await Sync.tirerUsers();
      if (DB.trouver(user.npi)) {
        /* Compte Firebase NOUVEAU + ce NPI est encore relié à CET e-mail : c'est l'ancienne fiche du même titulaire (son compte Firebase a été supprimé).
           Elle est inutilisable : on la supprime et on recommence l'inscription. */
        let lie = null;
        if (authNouveau) { try { lie = await Sync.req('GET', '/emails/' + cle); } catch (e) { /* ignoré */ } }
        if (lie !== user.npi) throw this._erreur('sobunu/npi-utilise');
        await Sync.ecrire('DELETE', '/users/' + user.npi);
        try { await Sync.ecrire('DELETE', '/photos/' + user.npi); } catch (e) { /* ignoré */ }
        try { await Sync.ecrire('DELETE', '/zones/' + user.npi); } catch (e) { /* ignoré */ }
        DB.ecrire('sobunu_users', DB.users().filter(u => u.npi !== user.npi));
      }
      if (DB.trouverParTel(user.tel)) throw this._erreur('sobunu/tel-utilise');
      /* Compte Firebase déjà existant (mêmes identifiants) : si l'e-mail est encore rattaché à une fiche bien vivante, il est vraiment pris.
         Compte Firebase NOUVEAU : l'e-mail n'existait plus dans Authentication, donc tout ancien lien /emails restant est périmé et sera remplacé. */
      if (!authNouveau) {
        let ancien = null;
        try { ancien = await Sync.req('GET', '/emails/' + cle); } catch (e) { /* ignoré */ }
        if (typeof ancien === 'string' && ancien !== user.npi && DB.trouver(ancien)) throw this._erreur('auth/email-already-in-use');
      }
      try { await Sync.ecrire('PUT', '/emails/' + cle, user.npi); }          // e-mail -> NPI (remplace un ancien lien périmé)
      catch (e) { throw e.code === 'sobunu/refuse' ? this._erreur('sobunu/email-refuse', 'Firebase a refusé l\'enregistrement de cet e-mail : publiez la dernière version de database_rules.json (Realtime Database > Règles).') : e; }
      etat.cle = true;
      await Sync.ecrire('PUT', '/mails/' + user.npi, email);                 // NPI -> e-mail (sert à se connecter avec le NPI)
      etat.mail = true;
      try { await Sync.ecrire('PUT', '/phones/' + normTel(user.tel), user.npi); }
      catch (e) { throw e.code === 'sobunu/refuse' ? this._erreur('sobunu/tel-utilise') : e; }
      etat.tel = true;
      if (!DB.enregistrer(user, true)) throw this._erreur('sobunu/stockage', 'Stockage plein : photo trop lourde ?');
      await Sync.pousser(user, null);
      etat.fiche = true;
      if (user.role === 'admin') await Sync.ecrire('PUT', '/adminActif', true);
    } catch (e) {
      try {
        if (etat.fiche) await Sync.effacer(user.npi, etat.tel ? user.tel : null);
        else {
          if (etat.tel) await Sync.ecrire('DELETE', '/phones/' + normTel(user.tel));
          if (etat.mail) await Sync.ecrire('DELETE', '/mails/' + user.npi);
          if (etat.cle) await Sync.ecrire('DELETE', '/emails/' + cle);
        }
        DB.ecrire('sobunu_users', DB.users().filter(u => u.npi !== user.npi));
        if (authNouveau) await Auth.supprimer();
      } catch (e3) { /* nettoyage au mieux */ }
      Auth.ecrire(null);
      throw e;
    }
    DB.ouvrirSession(user.npi);
  },

  /* Connexion par E-MAIL, par NPI ou par téléphone.
     - e-mail : connexion directe, puis le NPI est retrouvé grâce à l'index /emails
     - NPI / téléphone : on retrouve l'e-mail grâce à /mails (téléphone -> NPI grâce à /phones) */
  async connecter(identifiant, mdp) {
    const id = String(identifiant || '').trim();
    let npi = null;
    if (id.indexOf('@') > 0) {
      const email = normEmail(id);
      await Auth.signIn(email, mdp, null);
      let n = null;
      try { n = await Sync.req('GET', '/emails/' + cleMail(email)); }
      catch (e) { Auth.ecrire(null); throw e; }
      if (typeof n !== 'string' || !/^\d{10}$/.test(n)) {
        Auth.ecrire(null);
        throw this._erreur('sobunu/pas-de-fiche', 'Aucun compte SƆBUNU n\'est rattaché à cet e-mail. Essayez avec votre NPI.');
      }
      Auth.definirNpi(n);
      npi = n;
    } else {
      const parNpi = async n => {                      // e-mail du NPI (ancien compte : NPI@sobunu.app)
        let mail = null;
        try { mail = await Sync.req('GET', '/mails/' + n, undefined, true); } catch (e2) { /* ignoré */ }
        await Auth.signIn(typeof mail === 'string' && mail ? mail : Auth.email(n), mdp, n);
        return n;
      };
      try {
        if (!/^\d{10}$/.test(id)) throw this._erreur('auth/invalid-credential');
        npi = await parNpi(id);
      } catch (e) {
        if (e.code !== 'auth/invalid-credential') throw e;
        let n = null;
        try { n = await Sync.req('GET', '/phones/' + normTel(id), undefined, true); } catch (e2) { /* ignoré */ }
        if (typeof n !== 'string' || !/^\d{10}$/.test(n)) throw e;
        npi = await parNpi(n);
      }
    }
    try { await Sync.tirerUsers(); }
    catch (e) { Auth.ecrire(null); throw e; }
    DB.ouvrirSession(npi);
    try { await Sync.tirerPhoto(npi); } catch (e) { /* la photo n'est pas indispensable */ }
    return npi;
  },
  supprimerCompte(npi) {
    DB.supprimer(npi);
    localStorage.removeItem('sobunu_zone_' + npi);
    if (String(CONFIG.FUNCTIONS_URL || '').trim()) this.adminAction('delete', npi).catch(() => { /* le compte Firebase restera réutilisable */ });
  },
  async deconnecter() { DB.fermerSession(); },
  /* Téléphone : l'index /phones garantit l'unicité côté serveur */
  async changerTel(ancien, nouveau) {
    if (normTel(ancien) === normTel(nouveau)) return;
    const u = DB.courant();
    try { await Sync.ecrire('PUT', '/phones/' + normTel(nouveau), u.npi); }
    catch (e) { throw e.code === 'sobunu/refuse' ? this._erreur('sobunu/tel-utilise') : e; }
    try { await Sync.ecrire('DELETE', '/phones/' + normTel(ancien)); } catch (e) { /* ancien index : sans importance */ }
  },
  async verifierMdp(mdp) { const u = DB.courant(); if (!u) throw this._erreur('auth/user-not-found'); await Auth.signIn(Auth.emailCourant(u.npi), mdp, u.npi); },
  async changerMdp(actuel, nouveau) {
    const u = DB.courant(); if (!u) throw this._erreur('auth/user-not-found');
    const d = await Auth.signIn(Auth.emailCourant(u.npi), actuel, u.npi);   // vérifie le mot de passe actuel
    await Auth.changerMdp(u.npi, nouveau, d.idToken);
  },
  /* Ajouter ou changer son e-mail (les anciens comptes NPI@sobunu.app en ajoutent un ici) */
  async changerEmail(mdp, nouveau) {
    const u = DB.courant(); if (!u) throw this._erreur('auth/user-not-found');
    const email = normEmail(nouveau), cle = cleMail(email);
    if (!emailValide(email)) throw this._erreur('auth/invalid-email', 'Adresse e-mail invalide.');
    const ancien = Auth.emailCourant(u.npi);
    const d = await Auth.signIn(ancien, mdp, u.npi);                         // vérifie le mot de passe + jeton frais
    if (normEmail(ancien) === email) return false;
    try { await Sync.ecrire('PUT', '/emails/' + cle, u.npi); }              // 1) on réserve le nouvel e-mail
    catch (e) { throw e.code === 'sobunu/refuse' ? this._erreur('auth/email-already-in-use') : e; }
    try { await Auth.changerEmail(u.npi, email, d.idToken); }               // 2) on change l'e-mail de connexion
    catch (e) { try { await Sync.ecrire('DELETE', '/emails/' + cle); } catch (e2) { /* ignoré */ } throw e; }
    await Sync.ecrire('PUT', '/mails/' + u.npi, email);                      // 3) NPI -> nouvel e-mail
    if (!emailTechnique(ancien)) { try { await Sync.ecrire('DELETE', '/emails/' + cleMail(ancien)); } catch (e) { /* ancien index : sans importance */ } }
    return true;
  },
  /* Actions réservées à l'administrateur, exécutées par la fonction Firebase « sobunuAdmin » */
  async adminAction(action, npi, motDePasse) {
    const url = String(CONFIG.FUNCTIONS_URL || '').trim();
    if (!url) throw this._erreur('sobunu/fonction', 'Fonction d\'administration non installée : renseignez CONFIG.FUNCTIONS_URL (voir functions/index.js).');
    const jeton = await Auth.jeton();
    let r;
    try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jeton }, body: JSON.stringify({ action: action, npi: npi, motDePasse: motDePasse }) }); }
    catch (e) { throw Sync.erreur(); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw this._erreur('sobunu/fonction', d.error || ('Erreur ' + r.status));
    return d;
  },
  async definirCode(hash) {
    const npi = DB.courant().npi;
    await Sync.ecrire('PUT', '/zones/' + npi, hash);
    DB.ecrire('sobunu_zone_' + npi, hash);
  },
  async lireCode() {
    const npi = DB.courant().npi;
    const h = await Sync.req('GET', '/zones/' + npi);
    if (h) DB.ecrire('sobunu_zone_' + npi, h); else localStorage.removeItem('sobunu_zone_' + npi);
    return DB.lire('sobunu_zone_' + npi, null);
  },
  async ouvrirJournee(date) {
    const j = { date: date, ts: Date.now() };
    await Sync.ecrire('PUT', '/journee', j);
    DB.ecrire('sobunu_journee', j);
  },

  /* Valide un tour : +1 tour, + les sacs du tour, + le gain (montant fixé par l'acheteur).
     Chaque scan s'AJOUTE aux totaux : total du transporteur ET détail de l'acheteur concerné. */
  async validerTour(npi, npiA, npiMod) {
    if (Sync.actif()) await Sync.tirerUsers();               // sacs, liste et montants les plus récents
    const t = DB.trouver(npi), a = DB.trouver(npiA), m = DB.trouver(npiMod);
    if (!m || m.role !== 'moderateur' || !a || m.acheteur !== npiA) throw this._erreur('sobunu/pas-rattache', 'Vous n\'êtes rattaché à aucun acheteur : demandez-lui de vous ajouter.');
    if (!t || t.role !== 'transporteur') throw this._erreur('sobunu/qr', 'QR non reconnu.');
    if (!a || (!(a.transporteurs || []).includes(npi) && !(t.sacsPar || {})[npiA])) throw this._erreur('sobunu/pas-dans-liste', 'Ce transporteur n\'est pas dans la liste de cet acheteur.');
    const sacs = sacsPour(t, npiA);                          // nombre de sacs pris chez CET acheteur
    if (!sacs) throw this._erreur('sobunu/sacs-attente', 'Le nombre de sacs de ' + t.nom + ' n\'est pas encore validé par ' + a.nom + ' : tour non validé.');
    const prix = (a.tarifs || {})[sacs] || 0;
    if (!prix) throw this._erreur('sobunu/pas-de-tarif', a.nom + ' n\'a pas défini de montant pour ' + sacs + ' sacs : tour non validé.');

    if (Sync.actif()) {                                      // compteurs atomiques sur le serveur, puis relecture
      await Sync.compterTour(t, npiA, prix, sacs);
      await Sync.tirerUsers();
      return { transporteur: DB.trouver(npi), prix: prix, sacs: sacs };
    }

    majJour(t);
    t.toursAch = t.toursAch || {};
    t.gainAch = t.gainAch || {};
    t.sacsAch = t.sacsAch || {};
    t.tours = (t.tours || 0) + 1;
    t.toursAch[npiA] = (t.toursAch[npiA] || 0) + 1;
    t.sacsAch[npiA] = (t.sacsAch[npiA] || 0) + sacs;
    t.sacsJour = (t.sacsJour || 0) + sacs;
    t.gainAch[npiA] = (t.gainAch[npiA] || 0) + prix;
    t.gainJour = (t.gainJour || 0) + prix;
    DB.enregistrer(t);
    return { transporteur: t, prix: prix, sacs: sacs };
  }
};

/* Total des déclarations d'un acheteur (historique, ou ancienne déclaration unique) */
function totauxDeclarations(u) {
  const l = Array.isArray(u.declarations) && u.declarations.length ? u.declarations : (u.declaration ? [u.declaration] : []);
  return {
    nb: l.length,
    sacs: l.reduce((s, d) => s + (Number(d.sacs) || 0), 0),
    montant: l.reduce((s, d) => s + (Number(d.montant) || 0), 0)
  };
}

/* Le "nombre de tours" est remis à zéro chaque jour : c'est le gain JOURNALIER */
function majJour(u) {
  if (u.role === 'transporteur' && u.jour !== aujourdhui()) {
    u.jour = aujourdhui();
    u.tours = 0;
    u.gainJour = 0;
    u.sacsJour = 0;
    u.gainAch = Object.fromEntries(Object.keys(u.gainAch || {}).map(k => [k, 0]));       // gains remis à 0 pour chaque acheteur
    u.toursAch = Object.fromEntries(Object.keys(u.toursAch || {}).map(k => [k, 0]));   // tours remis à 0 pour chaque acheteur
    u.sacsAch = Object.fromEntries(Object.keys(u.sacsAch || {}).map(k => [k, 0]));     // sacs remis à 0 pour chaque acheteur
    DB.enregistrer(u, true);   // affichage local seulement : la remise à zéro du serveur se fait au 1er tour du jour (voir Sync.compterTour)
  }
  return u;
}
const gain = u => u.gainJour || 0;   // total versé aujourd'hui par les acheteurs

/* Un transporteur peut travailler avec plusieurs acheteurs : ses tours du jour sont comptés SÉPARÉMENT par acheteur
   (t.toursAch = { NPI_acheteur: nombre de tours }) et le gain journalier de chaque acheteur =
   tours avec cet acheteur x montant que cet acheteur a fixé pour le nombre de sacs du transporteur. */
function detailAcheteurs(t) {
  const m = t.toursAch || {};
  /* tous les acheteurs qui ont ce transporteur dans leur liste, plus ceux avec qui il a déjà fait des tours */
  const npis = new Set(Object.keys(m).filter(k => m[k]));
  DB.parRole('acheteur').forEach(a => { if ((a.transporteurs || []).includes(t.npi) || (t.sacsPar || {})[a.npi]) npis.add(a.npi); });
  return [...npis].map(npi => ligneAcheteur(t, npi)).filter(Boolean);
}
/* Chiffres d'un transporteur chez UN seul acheteur (tours, sacs, montant par tour, gain) */
function ligneAcheteur(t, npi) {
  const a = DB.trouver(npi);
  if (!a) return null;
  const tours = (t.toursAch || {})[npi] || 0;
  const prix = (a.tarifs || {})[sacsPour(t, npi)] || 0;
  const g = (t.gainAch || {})[npi];                       // gain cumulé, ajouté à chaque tour scanné
  return { npi: npi, nom: a.nom, tours: tours, sacs: (t.sacsAch || {})[npi] || 0, prix: prix, gain: g !== undefined ? g : tours * prix };
}
/* Totaux du jour = somme des tours et somme des gains de chaque acheteur */
function totauxJour(t) {
  const lignes = detailAcheteurs(t);
  return {
    lignes: lignes,
    tours: lignes.reduce((s, l) => s + l.tours, 0),
    gain: lignes.reduce((s, l) => s + l.gain, 0),
    sacs: t.sacsJour || 0
  };
}
/* Affiche le détail par acheteur, le nombre de tours total et le gain journalier total */
function completerFiche(zone, t) {
  const tot = totauxJour(t);
  const lignes = tot.lignes;
  const dd = $('[data-champ="gain"]', zone);
  if (dd) dd.innerHTML = '<b style="color:var(--vert)">' + argent(tot.gain) + '</b>';
  const dt = $('[data-champ="tours"]', zone);
  if (dt) dt.textContent = tot.tours;
  const ds = $('[data-champ="sacsJour"]', zone); if (ds) ds.textContent = tot.sacs;
  const zs = $('#total-sacs-jour', zone); if (zs) zs.textContent = tot.sacs;     // zone d'affichage : sacs transportés
  const zt = $('#total-tours', zone); if (zt) zt.textContent = tot.tours;       // zone d'affichage : tours total
  const zg = $('#total-gain', zone);  if (zg) zg.textContent = argent(tot.gain); // zone d'affichage : gain journalier total
  const z = $('#detail-ach', zone);
  if (z) z.innerHTML = lignes.length
    ? lignes.map(l => '<div class="ach-ligne"><strong>' + esc(l.nom) + '</strong>' +
        '<span>Tours : ' + l.tours + '</span>' +
        '<span>Sacs transportés : ' + l.sacs + '</span>' +
        '<span>Montant par tour : ' + (l.prix ? argent(l.prix) : '<em>non défini</em>') + '</span>' +
        '<span>Gain journalier : <b style="color:var(--vert)">' + argent(l.gain) + '</b></span></div>').join('')
    : '<p><em>Aucun acheteur ne vous a encore ajouté</em></p>';
}

/* Page modérateur : on n'affiche QUE les chiffres du transporteur chez l'acheteur du modérateur
   (jamais ses tours, sacs ou gains chez les autres acheteurs). */
function completerFicheAcheteur(zone, t, acheteur) {
  const l = acheteur ? ligneAcheteur(t, acheteur.npi) : null;
  const set = (champ, html) => { const el = $('[data-champ="' + champ + '"]', zone); if (el) el.innerHTML = html; };
  set('tours', l ? l.tours : 0);
  set('sacsJour', l ? l.sacs : 0);
  set('gain', '<b style="color:var(--vert)">' + argent(l ? l.gain : 0) + '</b>');
  const z = $('#detail-ach', zone);
  if (z) z.innerHTML = l
    ? '<div class="ach-ligne"><strong>' + esc(l.nom) + '</strong>' +
      '<span>Tours : ' + l.tours + '</span>' +
      '<span>Sacs transportés : ' + l.sacs + '</span>' +
      '<span>Montant par tour : ' + (l.prix ? argent(l.prix) : '<em>non défini</em>') + '</span>' +
      '<span>Gain journalier : <b style="color:var(--vert)">' + argent(l.gain) + '</b></span></div>'
    : '<p><em>Vous n\'êtes rattaché à aucun acheteur.</em></p>';
}

/* --------------------------------------------------------------------------
   5. LOGO, LANGUE
   -------------------------------------------------------------------------- */
function appliquerLogo() {
  // Priorité : logo choisi par l'admin > fichier logo.png à côté des pages > dessin intégré
  const choisi = DB.lire('sobunu_logo', null);
  $$('.logo-site').forEach(img => {
    img.onerror = null;
    if (choisi) {
      img.onerror = () => { img.onerror = null; img.src = LOGO_DEFAUT; };
      img.src = choisi;
    } else {
      /* logo.png absent -> logo de l'application (icon-512.png) -> dessin intégré */
      img.onerror = () => { img.onerror = () => { img.onerror = null; img.src = LOGO_DEFAUT; }; img.src = 'icon-512.png'; };
      img.src = 'logo.png';
    }
  });
}

function langueActuelle() {
  const u = DB.courant();
  return (u && u.lang) || DB.lire('sobunu_lang', 'fr');
}

function appliquerLangue() {
  const lang = langueActuelle();
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => {
    if (el.dataset.fr === undefined) el.dataset.fr = el.textContent; // on garde le français d'origine
    const traduction = I18N[lang] && I18N[lang][el.dataset.i18n];
    el.textContent = traduction || el.dataset.fr;
  });
}

/* --------------------------------------------------------------------------
   5 bis. CARROUSEL D'IMAGES (pages acheteur, admin, moderateur, transporteur)
   - Une page l'affiche avec :  <div id="carrousel" data-carrousel="NOM_DE_LA_PAGE"></div>
   - Les images se gèrent dans admin.html > « Images des pages ». Elles sont réduites (smartphone) puis
     stockées dans Firebase : /sobunu/carrousel/<page>/img/<id>, avec un numéro de version /sobunu/carrousel/<page>/v.
     Les appareils ne retéléchargent les images que si ce numéro a changé.
   - L'image affichée change toutes les CONFIG.CARROUSEL_DELAI_MS (1 minute).
   - S'il y a moins de CONFIG.CARROUSEL_MIN images personnalisées, des images par défaut complètent.
   -------------------------------------------------------------------------- */
const Carrousel = {
  PAGES: { acheteur: 'Acheteur', admin: 'Administrateur', moderateur: 'Modérateur', transporteur: 'Transporteur' },
  mem: {}, attente: {}, defauts: {},
  cle(p) { return 'sobunu_carrousel_' + p; },

  /* Copie locale d'une page : { v: numéro de version, imgs: { id: image en base64 } } */
  lire(p) {
    if (!this.mem[p]) {
      const c = DB.lire(this.cle(p), null);
      this.mem[p] = c && c.imgs ? c : { v: 0, imgs: {} };
    }
    return this.mem[p];
  },
  garder(p, c) {
    this.mem[p] = c;
    try { localStorage.setItem(this.cle(p), JSON.stringify(c)); } catch (e) { /* stockage plein : la copie reste en mémoire */ }
  },

  /* Compare le numéro de version du serveur ; ne télécharge les images que s'il a changé. Renvoie true si la copie a changé. */
  tirer(p) {
    if (!Sync.actif() || !Auth.lire()) return Promise.resolve(false);
    if (!this.attente[p]) {
      this.attente[p] = (async () => {
        const c = this.lire(p);
        const v = await Sync.req('GET', '/carrousel/' + p + '/v');
        if (typeof v !== 'number') {                         // plus rien sur le serveur
          if (!Object.keys(c.imgs).length) return false;
          this.garder(p, { v: 0, imgs: {} });
          return true;
        }
        if (v === c.v) return false;
        const imgs = (await Sync.req('GET', '/carrousel/' + p + '/img')) || {};
        this.garder(p, { v: v, imgs: imgs });
        return true;
      })().finally(() => { delete this.attente[p]; });
    }
    return this.attente[p];
  },

  /* Images affichées : les images de l'admin (ordre d'ajout), complétées par des images par défaut jusqu'au minimum */
  slides(p) {
    const c = this.lire(p);
    const liste = Object.keys(c.imgs).sort().filter(id => typeof c.imgs[id] === 'string')
      .map(id => ({ id: id, src: c.imgs[id], perso: true }));
    for (let k = 0; liste.length < CONFIG.CARROUSEL_MIN; k++) liste.push({ id: 'defaut' + k, src: this.defaut(p, k), perso: false });
    return liste;
  },

  /* Image par défaut (dessin SVG intégré, aucun fichier à fournir) */
  defaut(p, k) {
    const cle = p + (k % 5);
    if (this.defauts[cle]) return this.defauts[cle];
    const couleurs = [['#f28c00', '#7030a0'], ['#1f9d3a', '#0b1a4a'], ['#7030a0', '#f28c00'], ['#0b1a4a', '#1f9d3a'], ['#f28c00', '#0b1a4a']];
    const icones = ['🚚', '📦', '💰', '🔍', '✅'];
    const titres = {
      acheteur: ['Suivez vos sacs', 'Gérez vos transporteurs', 'Déclarez vos sacs', 'Payez le dédouanement', 'Tout au même endroit'],
      admin: ['Supervisez la plateforme', 'Validez les modérateurs', 'Suivez les déclarations', 'Répondez aux messages', 'Gérez les comptes'],
      moderateur: ['Scannez les codes QR', 'Validez chaque tour', 'Suivez les transporteurs', 'Un scan, un tour', 'Simple et rapide'],
      transporteur: ['Votre code QR personnel', 'Suivez vos tours', 'Suivez vos gains', 'Présentez votre code', 'Bonne route']
    };
    const i = k % 5;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + couleurs[i][0] + '"/><stop offset="1" stop-color="' + couleurs[i][1] + '"/></linearGradient></defs>' +
      '<rect width="800" height="450" fill="url(#g)"/>' +
      '<text x="400" y="215" text-anchor="middle" font-size="120">' + icones[i] + '</text>' +
      '<text x="400" y="320" text-anchor="middle" font-size="44" font-family="Arial,sans-serif" font-weight="700" fill="#fff">' + ((titres[p] || titres.acheteur)[i]) + '</text>' +
      '<text x="400" y="375" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" fill="#fff" fill-opacity=".85">SƆBUNU</text></svg>';
    return (this.defauts[cle] = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg));
  },

  /* ----- modifications (administrateur) : le serveur d'abord, puis la copie locale ----- */
  nouvelId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5).padEnd(3, '0'); },

  /* Réduit l'image (largeur de smartphone) jusqu'à ce qu'elle soit assez légère pour Firebase */
  async preparer(fichier) {
    for (const max of [800, 640, 480, 360]) {
      const data = await redimensionner(fichier, max, 'image/jpeg');
      if (data.length < 300000) return data;
    }
    throw new Error('Image trop lourde : choisissez une image plus petite.');
  },
  async publier(p, c) {                                        // nouveau numéro de version : les autres appareils rechargent
    c.v = Date.now();
    if (Sync.actif()) await Sync.ecrire('PUT', '/carrousel/' + p + '/v', c.v);
    this.garder(p, c);
  },
  async ajouter(p, fichiers) {
    const c = this.lire(p);
    const place = CONFIG.CARROUSEL_MAX - Object.keys(c.imgs).length;
    if (place <= 0) throw new Error('Maximum ' + CONFIG.CARROUSEL_MAX + ' images par page : supprimez-en une d\'abord.');
    const liste = [...fichiers].slice(0, place);
    const copie = { v: c.v, imgs: Object.assign({}, c.imgs) };
    for (const f of liste) {
      const data = await this.preparer(f);
      const id = this.nouvelId();
      if (Sync.actif()) await Sync.ecrire('PUT', '/carrousel/' + p + '/img/' + id, data);
      copie.imgs[id] = data;
    }
    await this.publier(p, copie);
    return liste.length;
  },
  async remplacer(p, id, fichier) {
    const c = this.lire(p);
    const data = await this.preparer(fichier);
    if (Sync.actif()) await Sync.ecrire('PUT', '/carrousel/' + p + '/img/' + id, data);
    const copie = { v: c.v, imgs: Object.assign({}, c.imgs) };
    copie.imgs[id] = data;
    await this.publier(p, copie);
  },
  async supprimer(p, id) {
    const c = this.lire(p);
    if (Sync.actif()) await Sync.ecrire('DELETE', '/carrousel/' + p + '/img/' + id);
    const copie = { v: c.v, imgs: Object.assign({}, c.imgs) };
    delete copie.imgs[id];
    await this.publier(p, copie);
  }
};

function styleCarrousel() {
  if (document.getElementById('style-carrousel')) return;
  const s = document.createElement('style');
  s.id = 'style-carrousel';
  s.textContent = `
    .car{position:relative;width:100%;max-width:720px;margin:0 auto 22px;aspect-ratio:16/9;border-radius:14px;overflow:hidden;
         box-shadow:var(--ombre);background:var(--bouton);touch-action:pan-y;user-select:none;-webkit-user-select:none}
    .car-piste{position:absolute;inset:0}
    .car-piste img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .8s;pointer-events:none}
    .car-piste img.actif{opacity:1}
    .car-nav{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;padding:0;border:0;border-radius:50%;
             background:rgba(255,255,255,.78);color:var(--marine);font-size:1.4rem;line-height:1;cursor:pointer;box-shadow:var(--ombre)}
    .car-prec{left:8px} .car-suiv{right:8px}
    .car-points{position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:6px}
    .car-points button{width:10px;height:10px;padding:0;border:0;border-radius:5px;background:rgba(255,255,255,.7);
                       box-shadow:0 0 2px rgba(0,0,0,.5);cursor:pointer;transition:width .2s}
    .car-points button.actif{width:20px;background:var(--orange)}
    @media (max-width:860px){ .car{margin-bottom:14px;border-radius:12px} .car-nav{width:30px;height:30px} }
    .car-liste{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:12px 0}
    .car-item{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px dotted var(--bord);border-radius:12px;background:var(--bouton)}
    .car-item img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#fff}
    .car-item.defaut img{opacity:.6}
    .car-item small{color:#777}
    .car-item .boutons{margin-top:0;gap:6px}
    .car-item .btn{flex:1;padding:6px 8px;font-size:.85rem;text-align:center}`;
  document.head.appendChild(s);
}

/* Affiche le carrousel dans une zone <div data-carrousel="page"> */
function monterCarrousel(zone) {
  const page = zone.dataset.carrousel;
  const delai = CONFIG.CARROUSEL_DELAI_MS;
  zone.classList.add('car');
  zone.setAttribute('role', 'region');
  zone.setAttribute('aria-label', 'Images');
  zone.innerHTML = '<div class="car-piste"></div>' +
    '<button type="button" class="car-nav car-prec" aria-label="Image précédente">‹</button>' +
    '<button type="button" class="car-nav car-suiv" aria-label="Image suivante">›</button>' +
    '<div class="car-points"></div>';
  const piste = $('.car-piste', zone), points = $('.car-points', zone);
  let slides = Carrousel.slides(page);
  let idx = slides.length ? Math.floor(Date.now() / delai) % slides.length : 0;   // même image au même moment, même après rechargement
  let minuteur = null;

  function montrer(i) {
    if (!slides.length) return;
    idx = (i + slides.length) % slides.length;
    $$('img', piste).forEach((im, k) => im.classList.toggle('actif', k === idx));
    $$('button', points).forEach((b, k) => b.classList.toggle('actif', k === idx));
  }
  function rendre() {
    slides = Carrousel.slides(page);
    zone.hidden = !slides.length;
    piste.innerHTML = '';
    points.innerHTML = '';
    slides.forEach((s, k) => {
      const im = document.createElement('img');
      im.alt = 'Image ' + (k + 1) + ' sur ' + slides.length;
      im.draggable = false;
      im.src = s.src;
      piste.appendChild(im);
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Image ' + (k + 1));
      b.onclick = () => { montrer(k); relancer(); };
      points.appendChild(b);
    });
    montrer(Math.min(idx, slides.length - 1));
  }
  function actualiserDepuisServeur() {
    Carrousel.tirer(page).then(change => { if (change) rendre(); }).catch(e => console.warn('[carrousel]', e.message));
  }
  function suivant() { actualiserDepuisServeur(); montrer(idx + 1); }
  function relancer() { clearInterval(minuteur); minuteur = setInterval(suivant, delai); }

  $('.car-prec', zone).onclick = () => { montrer(idx - 1); relancer(); };
  $('.car-suiv', zone).onclick = () => { montrer(idx + 1); relancer(); };
  let x0 = null;                                                                  // glisser le doigt : image suivante / précédente
  zone.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  zone.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) { montrer(idx + (dx < 0 ? 1 : -1)); relancer(); }
  });
  document.addEventListener('carrousel-maj', e => { if (e.detail && e.detail.page === page) rendre(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) actualiserDepuisServeur(); });

  rendre();
  relancer();
  actualiserDepuisServeur();
}

/* Section « Images des pages » de admin.html : choisir une page, puis ajouter / remplacer / supprimer ses images */
function gestionCarrousel() {
  const sel = $('#car-page');
  if (!sel) return;
  const liste = $('#car-liste');
  let occupe = false;

  function afficher() {
    const page = sel.value;
    $('#car-gestion').hidden = !page;
    if (!page) return;
    const c = Carrousel.lire(page);
    const nbPerso = Object.keys(c.imgs).length;
    $('#car-compte').textContent = nbPerso + ' image(s) personnalisée(s) sur ' + CONFIG.CARROUSEL_MAX + ' au maximum' +
      (nbPerso < CONFIG.CARROUSEL_MIN ? ' · complétées par ' + (CONFIG.CARROUSEL_MIN - nbPerso) + ' image(s) par défaut pour atteindre ' + CONFIG.CARROUSEL_MIN + '.' : '.');
    liste.innerHTML = '';
    Carrousel.slides(page).forEach((s, k) => {
      const item = document.createElement('div');
      item.className = 'car-item' + (s.perso ? '' : ' defaut');
      const im = document.createElement('img');
      im.alt = 'Image ' + (k + 1);
      im.src = s.src;
      item.appendChild(im);
      const nom = document.createElement('small');
      nom.textContent = s.perso ? 'Image ' + (k + 1) : 'Image par défaut (remplacée dès que vous ajoutez les vôtres)';
      item.appendChild(nom);
      if (s.perso) {
        const bt = document.createElement('div');
        bt.className = 'boutons';
        const fichier = document.createElement('input');
        fichier.type = 'file';
        fichier.accept = 'image/*';
        fichier.hidden = true;
        fichier.onchange = () => { if (fichier.files[0]) agir(() => Carrousel.remplacer(page, s.id, fichier.files[0]), 'Image remplacée.'); };
        const bR = document.createElement('button');
        bR.type = 'button'; bR.className = 'btn btn-2'; bR.textContent = 'Remplacer';
        bR.onclick = () => fichier.click();
        const bS = document.createElement('button');
        bS.type = 'button'; bS.className = 'btn btn-danger'; bS.textContent = 'Supprimer';
        bS.onclick = () => { if (confirm('Supprimer cette image de la page « ' + Carrousel.PAGES[page] + ' » ?')) agir(() => Carrousel.supprimer(page, s.id), 'Image supprimée.'); };
        bt.append(fichier, bR, bS);
        item.appendChild(bt);
      }
      liste.appendChild(item);
    });
  }

  async function agir(action, message) {
    if (occupe) return toast('Une opération est déjà en cours : patientez.', 'err');
    const page = sel.value;
    occupe = true;
    $('#car-compte').textContent = 'Enregistrement en cours…';
    try { await action(); toast(message); }
    catch (e) { toast((e && e.message) || 'Image illisible : choisissez un fichier PNG ou JPG.', 'err'); }
    finally {
      occupe = false;
      afficher();
      document.dispatchEvent(new CustomEvent('carrousel-maj', { detail: { page: page } }));   // met à jour le carrousel de cette page admin si besoin
    }
  }

  sel.onchange = async () => {
    afficher();
    if (!sel.value) return;
    const page = sel.value;
    try { if (await Carrousel.tirer(page)) { if (sel.value === page) afficher(); } }
    catch (e) { toast((e && e.message) || 'Images du serveur indisponibles.', 'err'); }
  };
  $('#car-ajout').onchange = e => {
    const fichiers = [...e.target.files];
    e.target.value = '';
    if (!sel.value || !fichiers.length) return;
    const page = sel.value;
    agir(async () => { const n = await Carrousel.ajouter(page, fichiers); if (n < fichiers.length) toast('Seulement ' + n + ' image(s) ajoutée(s) : maximum ' + CONFIG.CARROUSEL_MAX + ' par page.', 'err'); },
      'Image(s) ajoutée(s).');
  };
}

/* --------------------------------------------------------------------------
   6. NAVBAR VERTICALE (construite par JavaScript, identique sur toutes les pages)
   -------------------------------------------------------------------------- */
function icone(cle) {
  const v = NAV_ICONS[cle] || '';
  return /[\/.]/.test(v) ? '<img src="' + v + '" alt="">' : '<span class="emoji">' + v + '</span>';
}
function lien(href, cle, i18n, libelle) {
  const actif = location.pathname.endsWith(href) ? ' actif' : '';
  return '<a class="nav-lien' + actif + '" href="' + href + '">' + icone(cle) +
    '<span data-i18n="' + i18n + '">' + libelle + '</span></a>';
}
function groupe(cle, i18n, libelle, liens) {
  const ouvert = liens.includes('actif') ? ' ouvert' : '';
  return '<div class="groupe' + ouvert + '"><button class="nav-btn" type="button">' + icone(cle) +
    '<span data-i18n="' + i18n + '">' + libelle + '</span><i class="fleche">▾</i></button>' +
    '<div class="sous">' + liens + '</div></div>';
}

function construireNav() {
  const u = DB.courant();
  const r = u ? u.role : '';
  /* Chaque compte ne voit que ses propres pages */
  const liensRole = (r === 'admin' ? lien('admin.html', 'admin', 'nav_admin', 'Admin') : '') +
    (r === 'moderateur' ? lien('moderateur.html', 'moderateur', 'nav_mod', 'Modérateur') : '') +
    (r === 'acheteur' ? lien('acheteur.html', 'acheteur', 'nav_buyer', 'Acheteur') : '') +
    (r === 'transporteur' ? lien('transporteur.html', 'transporteur', 'nav_carrier', 'Transporteur') : '');
  const html =
    '<button class="burger" id="burger" aria-label="Menu">☰</button>' +
    '<aside class="nav" id="nav">' +
      '<div class="nav-tete"><img class="logo-site" alt="Logo"><strong class="titre">SƆBUNU</strong></div>' +
      groupe('menu', 'nav_menu', 'Menu',
        lien('accueil.html', 'accueil', 'nav_home', 'Accueil') +
        lien('a-propos.html', 'apropos', 'nav_about', 'À propos')) +
      liensRole +
      lien('profil.html', 'profil', 'nav_profile', 'Profil') +
      lien('contact.html', 'contact', 'nav_contact', 'Contact') +
      '<div class="nav-pied">' +
        (u
          ? '<small>' + esc(u.nom) + '<br>' + ROLES[u.role] + '</small><button class="btn btn-2" id="nav-deco" data-i18n="nav_logout">Déconnexion</button>'
          : lien('connexion.html', 'connexion', 'nav_login', 'Connexion') +
            lien('inscription.html', 'inscription', 'nav_register', 'Inscription')) +
      '</div>' +
    '</aside>';
  $('#nav-root').innerHTML = html;

  // ouvrir / fermer les listes déroulantes
  $$('.nav-btn').forEach(b => b.onclick = () => b.parentElement.classList.toggle('ouvert'));
  // menu mobile
  $('#burger').onclick = () => $('#nav').classList.toggle('ouvert');
  // un toucher / clic en dehors de la navbar la referme (smartphone et tablette)
  if (!window.__navFermeture) {
    window.__navFermeture = true;
    document.addEventListener('pointerdown', e => {
      const nav = $('#nav');
      if (!nav || !nav.classList.contains('ouvert')) return;
      if (e.target.closest('#nav') || e.target.closest('#burger')) return;
      nav.classList.remove('ouvert');
    });
  }
  if ($('#nav-deco')) $('#nav-deco').onclick = deconnexion;
}

async function deconnexion() {
  try { await Compte.deconnecter(); } catch (e) { /* on quitte quand même */ }
  DB.fermerSession();
  reinitSession();
  location.href = 'index.html';
}
/* Nouvelle connexion / déconnexion : la zone réservée se reverrouille et l'annonce de journée pourra s'afficher à nouveau */
function reinitSession() {
  try { sessionStorage.removeItem('sobunu_zone'); sessionStorage.removeItem('sobunu_annonce'); } catch (e) { /* ignoré */ }
}

/* --------------------------------------------------------------------------
   7. PROTECTION DES PAGES
   <body data-auth="1" data-roles="admin"> : il faut être connecté et avoir ce rôle.
   Chaque rôle ne voit que ses pages (chaque page est réservée à son rôle).
   -------------------------------------------------------------------------- */
function garde() {
  const b = document.body;
  const u = DB.courant();
  const roles = (b.dataset.roles || '').split(',').filter(Boolean);
  if (b.dataset.auth === '1' && !u) { location.href = 'connexion.html'; return false; }
  if (u && roles.length && !roles.includes(u.role)) {
    alert('Accès réservé : ' + roles.map(r => ROLES[r]).join(', '));
    location.href = 'accueil.html';
    return false;
  }
  if (u) { u.derniereConnexion = Date.now(); DB.enregistrer(u); } // activité = compte actif
  return true;
}

/* --------------------------------------------------------------------------
   8. QR CODE : création et scan
   Le QR contient un petit texte JSON : {"app":"SOBUNU","npi":"1234567890"}
   -------------------------------------------------------------------------- */
function creerQR(zone, npi) {
  zone.innerHTML = '';
  if (typeof QRCode === 'undefined') { zone.textContent = 'QR indisponible (internet requis)'; return; }
  new QRCode(zone, { text: JSON.stringify({ app: 'SOBUNU', npi: npi }), width: 180, height: 180 });
}

function npiDepuisQR(texte) {
  try { const o = JSON.parse(texte); if (o.app === 'SOBUNU') return o.npi; } catch (e) { /* pas un QR SƆBUNU */ }
  return null;
}

/* Ouvre la caméra du téléphone dans une fenêtre et renvoie le texte lu.
   Remarque : la caméra ne fonctionne qu'en HTTPS ou sur localhost. */
let scanneur = null;
function ouvrirScanner(quandLu) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = '<div class="modal-box"><h3>Scanner le code QR</h3><div id="lecteur"></div>' +
    '<button class="btn btn-2" id="fermer-scan" style="margin-top:12px">Fermer</button></div>';
  document.body.appendChild(m);

  const fermer = async () => {
    try { if (scanneur) { await scanneur.stop(); scanneur.clear(); } } catch (e) { /* déjà arrêté */ }
    scanneur = null;
    m.remove();
  };
  $('#fermer-scan', m).onclick = fermer;

  if (typeof Html5Qrcode === 'undefined') {
    $('#lecteur', m).textContent = 'Scanner indisponible (internet requis).';
    return;
  }
  let dejaLu = false;
  scanneur = new Html5Qrcode('lecteur');
  scanneur.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 230, height: 230 } },
    async texte => {
      if (dejaLu) return;            // la caméra relit le même QR 10 fois par seconde : un seul scan = un seul tour
      dejaLu = true;
      await fermer();
      quandLu(texte);
    }, () => { /* rien lu pour l'instant */ })
    .catch(err => { $('#lecteur', m).textContent = 'Caméra inaccessible : ' + err; });
}

/* --------------------------------------------------------------------------
   9. AFFICHAGE COMMUN D'UN UTILISATEUR
   Tout élément <span data-champ="nom"> reçoit la valeur correspondante.
   -------------------------------------------------------------------------- */
function remplirChamps(zone, u) {
  const valeurs = {
    npi: u.npi, nom: u.nom, tel: u.tel, role: ROLES[u.role],
    sacs: u.sacs, sacsJour: u.sacsJour || 0, tours: u.tours, gain: argent(gain(u)),
    sacsDeclares: totauxDeclarations(u).sacs, somme: argent(totauxDeclarations(u).montant)
  };
  $$('[data-champ]', zone).forEach(el => {
    const v = valeurs[el.dataset.champ];
    if (el.tagName === 'SELECT') el.value = v; else el.textContent = v === undefined ? '' : v;
  });
}

function remplirSelect(select, liste, texteVide) {
  const avant = select.value;                          // on garde le choix en cours lors d'un rafraîchissement
  select.innerHTML = '<option value="">' + texteVide + '</option>' +
    liste.map(u => '<option value="' + esc(u.npi) + '">' + esc(u.nom) + ' (' + esc(u.npi) + ')</option>').join('');
  if (avant && [...select.options].some(o => o.value === avant)) select.value = avant;
}

/* ==========================================================================
   10. LOGIQUE DE CHAQUE PAGE  (clé = valeur de <body data-page="...">)
   ========================================================================== */
const PAGES = {};
/* Chaque page peut définir « actualiser » : appelée toutes les 3 s, au retour sur l'onglet
   et dès qu'un autre onglet modifie les données. */
let actualiser = null;

/* ---------- INSCRIPTION ---------- */
PAGES.inscription = function () {
  ajouterOeil($('#mdp')); ajouterOeil($('#mdp2'));
  let photo = '';
  $('#photo').onchange = async e => {
    if (!e.target.files[0]) return;
    photo = await redimensionner(e.target.files[0]);
    $('#apercu').src = photo;
    $('#apercu').hidden = false;
  };

  $('#form-inscription').onsubmit = async e => {
    e.preventDefault();
    const npi = $('#npi').value.trim();
    const nom = $('#nom').value.trim();
    const tel = $('#tel').value.trim();
    const email = normEmail($('#email').value);
    const mdp = $('#mdp').value;
    const role = $('#role').value;

    if (!/^\d{10}$/.test(npi)) return toast('Le NPI doit contenir 10 chiffres.', 'err');
    if (nom.length < 3) return toast('Entrez votre nom et prénom.', 'err');
    if (normTel(tel).length < 8) return toast('Numéro de téléphone invalide.', 'err');
    if (!emailValide(email)) return toast('Entrez une adresse e-mail valide.', 'err');
    if (mdp.length < 6) return toast('Mot de passe : 6 caractères minimum.', 'err');
    if (mdp !== $('#mdp2').value) return toast('Les mots de passe ne correspondent pas.', 'err');
    if (!role) return toast('Choisissez un rôle.', 'err');

    /* Un futur modérateur s'inscrit comme tout le monde ; l'administrateur le valide ensuite */
    const user = { npi, nom, tel, role: role === 'moderateur' ? 'moderateur_attente' : role, photo, lang: 'fr', derniereConnexion: Date.now() };   // pas de mot de passe ici
    if (role === 'transporteur') Object.assign(user, { sacs: 2, tours: 0, gainJour: 0, jour: aujourdhui() });
    if (role === 'acheteur') Object.assign(user, { transporteurs: [], tarifs: {}, sacsDeclares: 0, somme: 0 });
    ficheComplete(user);   // mêmes champs que tous les autres comptes du même rôle

    try {
      if (role === 'admin') {
        /* Un seul administrateur : le premier inscrit. Les règles Firebase refusent aussi tout second administrateur. */
        const existe = await Sync.req('GET', '/adminActif', undefined, true);
        if (existe) return toast('Un administrateur existe déjà : ce rôle n\'est plus disponible à l\'inscription.', 'err');
      }
      await Compte.inscrire(user, mdp, email);
      toast(role === 'moderateur' ? 'Compte créé ! Un administrateur doit maintenant vous valider comme modérateur.' : 'Compte créé ! Bienvenue.');
      setTimeout(() => location.href = 'accueil.html', 1200);
    } catch (err) {
      console.error(err);
      toast(messageErreur(err), 'err');
      if (err && err.code === 'sobunu/email-auth-existe' &&
          confirm(messageErreur(err) + '\n\nEnvoyer un lien de réinitialisation à ' + email + ' ? Après avoir choisi un mot de passe, revenez vous inscrire avec ce mot de passe.')) {
        try { await Auth.mdpOublie(email); toast('Lien envoyé : consultez votre messagerie (et les courriers indésirables).'); }
        catch (e2) { toast(messageErreur(e2), 'err'); }
      }
    }
  };
};

/* ---------- CONNEXION ---------- */
PAGES.connexion = function () {
  ajouterOeil($('#mdp'));
  const montrer = id => { ['#form-connexion', '#bloc-oubli', '#bloc-verif'].forEach(s => { $(s).hidden = s !== id; }); };

  $('#form-connexion').onsubmit = async e => {
    e.preventDefault();
    let npi;
    try { npi = await Compte.connecter($('#identifiant').value, $('#mdp').value); }
    catch (err) { console.error(err); return toast(messageErreur(err), 'err'); }

    reinitSession();
    const u = DB.trouver(npi);
    if (!u) {                                  // fiche introuvable (ex : compte supprimé par l'administrateur)
      await Compte.deconnecter();
      return toast('Ce compte n\'existe plus. Contactez l\'administrateur.', 'err');
    }
    /* Compte inactif depuis plus d'un an : verrouillé, seul l'administrateur peut le rouvrir (l'administrateur lui-même n'est jamais verrouillé) */
    const inactif = Date.now() - (u.derniereConnexion || 0) > CONFIG.JOURS_INACTIVITE * 86400000;
    if (u.role !== 'admin' && (u.verrouille || inactif)) {
      if (!u.verrouille) { try { await Sync.ecrire('PATCH', '/users/' + u.npi, { verrouille: true }); } catch (err) { console.warn(err); } }
      await Compte.deconnecter();
      return montrer('#bloc-verif');
    }
    location.href = 'accueil.html';
  };

  $('#lien-oubli').onclick = e => { e.preventDefault(); montrer('#bloc-oubli'); const v = $('#identifiant').value.trim(); if (v) $('#oubli-email').value = v; };
  /* Envoi du lien de réinitialisation : par e-mail, ou par NPI (on retrouve alors l'e-mail du compte) */
  $('#form-oubli').onsubmit = async e => {
    e.preventDefault();
    const v = $('#oubli-email').value.trim();
    let mail = normEmail(v);
    try {
      if (/^\d{10}$/.test(v)) {
        const m = await Sync.req('GET', '/mails/' + v, undefined, true);
        if (typeof m !== 'string' || !m) return toast('Ce compte n\'a pas d\'e-mail enregistré : contactez l\'administrateur.', 'err');
        mail = m;
      } else if (!emailValide(mail)) return toast('Entrez une adresse e-mail valide (ou votre NPI).', 'err');
      try { await Auth.mdpOublie(mail); }
      catch (err) { if (err.code === 'auth/network-request-failed' || /^sobunu\//.test(err.code)) throw err; console.warn(err); }   // adresse inconnue : même réponse (on ne révèle rien)
    } catch (err) { console.error(err); return toast(messageErreur(err), 'err'); }
    toast('Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d\'être envoyé (vérifiez aussi les courriers indésirables).');
  };
  $('#oubli-retour').onclick = e => { e.preventDefault(); montrer('#form-connexion'); };
  $('#verif-retour').onclick = e => { e.preventDefault(); montrer('#form-connexion'); };
};

/* ---------- ACCUEIL ---------- */
PAGES.accueil = function () {
  const u = DB.courant();
  $('#bienvenue').textContent = 'Bonjour ' + u.nom + ' 👋';
  $('#role-actuel').textContent = 'Connecté en tant que : ' + ROLES[u.role];
  const raccourcis = {
    transporteur: ['transporteur.html', 'Voir mes tours et mon code QR'],
    moderateur: ['moderateur.html', 'Scanner les transporteurs'],
    acheteur: ['acheteur.html', 'Gérer mes transporteurs'],
    admin: ['admin.html', 'Administrer les acheteurs']
  }[u.role];
  if (raccourcis) {
    $('#raccourci').href = raccourcis[0];
    $('#raccourci').textContent = raccourcis[1];
  } else {                                              // modérateur pas encore validé
    $('#raccourci').hidden = true;
    $('#role-actuel').textContent += ' — un administrateur doit valider votre compte avant que vous accédiez à la page modérateur.';
  }
  actualiser = () => {
    $('#stat-transp').textContent = DB.parRole('transporteur').length;
    $('#stat-ach').textContent = DB.parRole('acheteur').length;
    $('#stat-tours').textContent = DB.parRole('transporteur').reduce((s, t) => s + (majJour(t).tours || 0), 0);
  };
  actualiser();
};

/* ---------- TRANSPORTEUR ---------- */
PAGES.transporteur = function () {
  const courant = DB.courant();                         // la page affiche directement le transporteur connecté
  const selA = $('#acheteur-choix'), selS = $('#sacs'), blocAutre = $('#bloc-autre'), champAutre = $('#sacs-autre'), statut = $('#sacs-statut');
  const cleChoix = 'sobunu_ach_choisi_' + courant.npi;

  function remplirAcheteurs() {
    remplirSelect(selA, DB.parRole('acheteur'), '-- Choisir l\'acheteur --');
    if (!selA.value) {                                   // on reprend le dernier acheteur choisi sur cet appareil
      const memo = DB.lire(cleChoix, '');
      if (memo && [...selA.options].some(o => o.value === memo)) selA.value = memo;
    }
  }
  function majStatut() {
    const npiA = selA.value, a = npiA && DB.trouver(npiA);
    if (!a) { statut.textContent = 'Choisissez d\'abord l\'acheteur chez qui vous prenez vos sacs : ils seront comptés sur sa page.'; return; }
    const p = Number((courant.sacsPar || {})[npiA]) || 0, st = statutSacs(courant, npiA);
    statut.textContent = !p ? 'Aucun nombre de sacs choisi chez ' + a.nom + '.'
      : p + ' sacs par tour chez ' + a.nom +
        (st === 'attente' ? ' — en attente de validation par l\'acheteur (aucun tour ne peut être validé avant).'
          : st === 'refuse' ? ' — refusé par l\'acheteur : proposez un autre nombre.'
          : st === 'valide' ? ' — validé par l\'acheteur.' : '.');
  }
  function afficherSacs() {                             // reflète le choix enregistré pour l'acheteur sélectionné
    const npiA = selA.value, p = npiA ? Number((courant.sacsPar || {})[npiA]) || 0 : 0;
    if (!p) { selS.value = ''; blocAutre.hidden = true; champAutre.value = ''; }
    else if (SACS_LISTE.includes(p)) { selS.value = String(p); blocAutre.hidden = true; champAutre.value = ''; }
    else { selS.value = 'autre'; blocAutre.hidden = false; champAutre.value = p; }
    majStatut();
  }
  /* Le nombre est enregistré sur la fiche du transporteur, PAR acheteur : la page de cet acheteur le lit directement */
  function enregistrerSacs(n) {
    const frais = DB.trouver(courant.npi);              // données les plus récentes (un tour a pu être validé à l'instant)
    if (frais) Object.assign(courant, frais);
    courant.sacsPar = Object.assign({}, courant.sacsPar, { [selA.value]: n });
    if (SACS_LISTE.includes(n)) courant.sacs = n;
    DB.enregistrer(courant);
    afficherSacs();
  }

  selA.onchange = () => { DB.ecrire(cleChoix, selA.value); afficherSacs(); };

  selS.onchange = () => {
    if (!selA.value) { selS.value = ''; return toast('Choisissez d\'abord l\'acheteur chez qui vous avez pris les sacs.', 'err'); }
    if (selS.value === 'autre') { blocAutre.hidden = false; champAutre.focus(); return; }   // nombre hors liste : saisie ci-dessous
    blocAutre.hidden = true;
    if (!selS.value) return;
    const n = Number(selS.value), a = DB.trouver(selA.value);
    enregistrerSacs(n);
    toast(n + ' sacs enregistrés : ils seront comptés chez ' + a.nom + '.');
  };

  $('#sacs-envoyer').onclick = () => {
    if (!selA.value) return toast('Choisissez d\'abord l\'acheteur chez qui vous avez pris les sacs.', 'err');
    const n = Number(champAutre.value);
    if (!Number.isInteger(n) || n < 1 || n > 500) return toast('Entrez un nombre de sacs entier (de 1 à 500).', 'err');
    const a = DB.trouver(selA.value);
    enregistrerSacs(n);
    toast(SACS_LISTE.includes(n) ? n + ' sacs enregistrés chez ' + a.nom + '.' : 'Nombre envoyé à ' + a.nom + ' : il doit le valider sur sa page.');
  };

  function afficher() {
    majJour(courant);
    remplirChamps($('#fiche'), courant);
    completerFiche($('#fiche'), courant);
    creerQR($('#qr'), courant.npi);
  }
  remplirAcheteurs();
  afficher();
  afficherSacs();

  /* Mise à jour en direct : tours, gains, nouveaux acheteurs et validation du nombre de sacs par l'acheteur */
  actualiser = () => {
    const t = DB.trouver(courant.npi);
    if (!t) { DB.fermerSession(); location.href = 'connexion.html'; return; }   // compte supprimé
    majJour(t);
    Object.assign(courant, t);
    const a = document.activeElement;
    const enSaisie = a === selA || a === selS || a === champAutre;              // on ne change rien pendant que l'utilisateur choisit
    if (!enSaisie) remplirAcheteurs();
    remplirChamps($('#fiche'), courant);
    completerFiche($('#fiche'), courant);
    if (enSaisie) majStatut(); else afficherSacs();
  };
};

/* ---------- MODÉRATEUR ---------- */
/* Un modérateur est le « bras droit » d'UN acheteur : c'est l'acheteur qui le rattache (page acheteur).
   Chaque scan compte donc toujours pour cet acheteur. */
PAGES.moderateur = function () {
  const sel = $('#choix');
  const liste = () => { remplirSelect(sel, DB.parRole('transporteur').map(majJour), '-- Choisir un transporteur --'); };
  liste();
  const monNpi = DB.courant().npi;
  const monAcheteur = () => {
    const m = DB.trouver(monNpi);
    return m && m.acheteur ? DB.trouver(m.acheteur) : null;
  };
  function afficherAcheteur() {
    const a = monAcheteur();
    $('#mon-acheteur').innerHTML = a
      ? 'Vous travaillez pour : <b>' + esc(a.nom) + '</b> <small>(NPI ' + esc(a.npi) + ')</small>'
      : '<em>Vous n\'êtes rattaché à aucun acheteur. Donnez votre NPI (' + esc(monNpi) + ') à l\'acheteur : il vous ajoutera dans « Mes modérateurs ».</em>';
    $('#scan').disabled = !a;
  }
  afficherAcheteur();

  function afficher(npi) {
    const t = DB.trouver(npi);
    $('#fiche').hidden = !t;
    if (!t) return;
    remplirChamps($('#fiche'), majJour(t));
    const aMod = monAcheteur(), nbMod = aMod ? sacsPour(t, aMod.npi) : t.sacs;      // sacs par tour chez l'acheteur du modérateur
    const champSacs = $('[data-champ="sacs"]', $('#fiche'));
    if (champSacs) champSacs.textContent = nbMod || 'En attente de validation par l\'acheteur';
    completerFicheAcheteur($('#fiche'), t, aMod);   // uniquement les chiffres chez l'acheteur du modérateur
  }
  sel.onchange = () => afficher(sel.value);

  $('#scan').onclick = () => {
    const a = monAcheteur();
    if (!a) return toast('Vous n\'êtes rattaché à aucun acheteur.', 'err');
    ouvrirScanner(async texte => {
      const npi = npiDepuisQR(texte);
      const t = npi && DB.trouver(npi);
      if (!t || t.role !== 'transporteur') return toast('QR non reconnu.', 'err');
      try {
        const r = await Compte.validerTour(npi, a.npi, monNpi);
        liste(); sel.value = npi; afficher(npi);
        toast('Tour validé pour ' + r.transporteur.nom + ' (' + a.nom + ') : +' + r.sacs + ' sacs, +' + argent(r.prix));
      } catch (e) {
        console.error('[tour]', e);
        toast((e && e.message) || 'Tour non validé.', 'err');
      }
    });
  };

  /* Nouveaux inscrits, rattachement par l'acheteur et tours validés ailleurs apparaissent sans recharger */
  actualiser = () => {
    liste();
    afficherAcheteur();
    if (sel.value) afficher(sel.value);
  };
};

/* ---------- ACHETEUR ---------- */
PAGES.acheteur = function () {
  let moi = DB.courant();
  if (moi.role === 'admin') {   // l'admin n'a pas de liste propre : on lui montre tous les transporteurs
    moi.transporteurs = DB.parRole('transporteur').map(t => t.npi);
  }
  const sel = $('#choix');
  const estAdmin = moi.role === 'admin';
  moi.tarifs = moi.tarifs || {};

  /* --- Montant du transport défini par l'acheteur, selon le nombre de sacs --- */
  function afficherTarifs() {
    $('#tarif-montant').value = moi.tarifs[$('#tarif-sacs').value] || '';
    const noms = { 2: 'Deux sacs', 3: 'Trois sacs', 4: 'Quatre sacs', 8: 'Huit sacs', 10: 'Dix sacs' };
    $('#tarifs-resume').innerHTML = [2, 3, 4, 8, 10].map(n =>
      '<dt>' + noms[n] + '</dt><dd>' + (moi.tarifs[n] ? argent(moi.tarifs[n]) : '<em>non défini</em>') + '</dd>').join('');
  }
  if (estAdmin) $('#bloc-tarifs').hidden = true;
  else {
    afficherTarifs();
    $('#tarif-sacs').onchange = afficherTarifs;
    $('#tarif-enregistrer').onclick = () => {
      const montant = Number($('#tarif-montant').value);
      if (!(montant > 0)) return toast('Entrez un montant supérieur à 0.', 'err');
      moi.tarifs[$('#tarif-sacs').value] = Math.round(montant);
      DB.enregistrer(moi);
      afficherTarifs();
      toast('Montant enregistré.');
    };
  }

  /* --- Déclaration du nombre de sacs de l'acheteur + montant du dédouanement (calculé en direct) --- */
  const montantDecl = n => {
    n = Number(n) || 0;
    const base = n * CONFIG.MONTANT_PAR_SAC;
    return Math.round(n >= CONFIG.SEUIL_REMISE ? base * CONFIG.TAUX_REMISE : base);
  };
  /* Zones d'affichage du haut : total des sacs déclarés à l'administrateur + total payé pour le dédouanement */
  function afficherTotauxDecl() {
    const tot = totauxDeclarations(moi);
    $('#total-sacs').textContent = tot.sacs;
    $('#total-somme').textContent = argent(tot.montant);
  }
  /* Historique des déclarations (la déclaration unique d'avant est reprise comme première ligne) */
  function historiqueDecl() {
    if (!Array.isArray(moi.declarations)) moi.declarations = moi.declaration ? [moi.declaration] : [];
    return moi.declarations;
  }
  function afficherRecap() {
    const corps = $('#recap-corps'), pied = $('#recap-pied');
    if (!corps) return;
    const liste = historiqueDecl();
    if (!liste.length) {
      corps.innerHTML = '<tr><td colspan="4" class="vide">Aucune déclaration pour le moment.</td></tr>';
      pied.innerHTML = '';
      return;
    }
    corps.innerHTML = liste.map((d, i) =>
      '<tr><td>' + (i + 1) + '</td><td>' + esc(dateLongue(d.jour)) + '</td><td class="num">' + esc(d.sacs) +
      '</td><td class="num">' + esc(argent(d.montant)) + '</td></tr>').reverse().join('');
    const totSacs = liste.reduce((s, d) => s + (Number(d.sacs) || 0), 0);
    const totMont = liste.reduce((s, d) => s + (Number(d.montant) || 0), 0);
    pied.innerHTML = '<tr><td colspan="2">Total (' + liste.length + ' déclaration' + (liste.length > 1 ? 's' : '') +
      ')</td><td class="num">' + totSacs + '</td><td class="num">' + esc(argent(totMont)) + '</td></tr>';
  }
  function afficherDeclaration() {
    const n = Math.floor(Number($('#decl-sacs').value));
    $('#decl-montant').textContent = argent(montantDecl(n > 0 ? n : 0));
    $('#decl-info').textContent = n >= CONFIG.SEUIL_REMISE ? '(à partir de ' + CONFIG.SEUIL_REMISE + ' sacs : montant calculé à 85,7 %)' : '';
  }
  if (!estAdmin) {
    const d = moi.declaration;
    if (d) {
      $('#decl-sacs').value = d.sacs;
      $('#decl-derniere').textContent = 'Dernière déclaration : ' + d.sacs + ' sacs le ' + dateLongue(d.jour) + ' (' + argent(d.montant) + ').';
    }
    afficherDeclaration();
    afficherRecap();
    $('#decl-sacs').oninput = afficherDeclaration;
    $('#decl-enregistrer').onclick = () => {
      const n = Number($('#decl-sacs').value);
      if (!Number.isInteger(n) || n < 1) return toast('Entrez un nombre de sacs valide (entier, 1 minimum).', 'err');
      const nouvelle = { jour: dateLocale(), sacs: n, montant: montantDecl(n) };
      historiqueDecl().push(nouvelle);     // d'abord l'historique, puis la « dernière déclaration »
      moi.declaration = nouvelle;
      DB.enregistrer(moi);
      afficherRecap();
      $('#decl-derniere').textContent = 'Dernière déclaration : ' + n + ' sacs le ' + dateLongue(moi.declaration.jour) + ' (' + argent(moi.declaration.montant) + ').';
      afficherTotauxDecl();
      toast('Déclaration enregistrée.');
    };
  } else { $('#bloc-declaration').hidden = true; if ($('#bloc-recap')) $('#bloc-recap').hidden = true; }

  function liste() {
    const npis = new Set(moi.transporteurs || []);                                   // ma liste + ceux qui prennent leurs sacs chez moi
    DB.parRole('transporteur').forEach(t => { if ((t.sacsPar || {})[moi.npi]) npis.add(t.npi); });
    const mes = [...npis].map(DB.trouver.bind(DB)).filter(Boolean).map(majJour);
    remplirSelect(sel, mes, '-- Choisir un transporteur --');
    afficherTotauxDecl();
    /* Totaux du jour de tous mes transporteurs (mis à jour à chaque scan du modérateur) */
    let tr = 0, sa = 0, ga = 0;
    mes.forEach(t => {
      if (estAdmin) { tr += t.tours || 0; sa += t.sacsJour || 0; ga += t.gainJour || 0; }
      else { tr += (t.toursAch || {})[moi.npi] || 0; sa += (t.sacsAch || {})[moi.npi] || 0; ga += (t.gainAch || {})[moi.npi] || 0; }
    });
    if ($('#jour-tours')) { $('#jour-tours').textContent = tr; $('#jour-sacs').textContent = sa; $('#jour-gain').textContent = argent(ga); }
  }
  function afficher(npi) {
    const t = DB.trouver(npi);
    $('#fiche').hidden = !t;
    if (!t) return;
    majJour(t);
    remplirChamps($('#fiche'), t);
    /* Gain journalier = nombre de tours x montant défini par l'acheteur pour le nombre de sacs par tour */
    const dd = $('[data-champ="gain"]', $('#fiche'));
    if (!estAdmin) {
      const nbSacs = sacsPour(t, moi.npi);                          // nombre de sacs pris chez MOI
      const prix = moi.tarifs[nbSacs];
      $('[data-champ="sacs"]', $('#fiche')).textContent = nbSacs || 'En attente de validation';
      const toursMoi = (t.toursAch || {})[moi.npi] || 0;           // tours effectués AVEC CET ACHETEUR seulement
      $('[data-champ="tours"]', $('#fiche')).textContent = toursMoi;
      $('[data-champ="sacsAch"]', $('#fiche')).textContent = (t.sacsAch || {})[moi.npi] || 0;
      const gMoi = (t.gainAch || {})[moi.npi];
      const total = gMoi !== undefined ? gMoi : toursMoi * (prix || 0);   // gain cumulé à chaque tour scanné
      dd.innerHTML = '<b style="color:var(--vert)">' + argent(total) + '</b>' +
        (prix ? '' : ' <small><em>(' + (nbSacs ? 'montant non défini pour ' + nbSacs + ' sacs' : 'nombre de sacs à valider') + ')</em></small>');
    } else {
      dd.innerHTML = '<b style="color:var(--vert)">' + dd.textContent + '</b>';
      $('[data-champ="sacsAch"]', $('#fiche')).textContent = t.sacsJour || 0;
    }
  }
  function sauver() { if (moi.role !== 'admin') DB.enregistrer(moi); }

  /* --- Mes modérateurs : mes « bras droits », seuls autorisés à valider les tours pour moi --- */
  let modChoisi = null;   // NPI du modérateur touché (sélectionné)
  function afficherMods() {
    const zone = $('#mod-liste');
    if (!zone) return;
    const mods = DB.parRole('moderateur').filter(m => m.acheteur === moi.npi);
    if (!mods.some(m => m.npi === modChoisi)) modChoisi = null;
    zone.innerHTML = mods.length
      ? mods.map(m => '<div class="ach-ligne mod-ligne' + (m.npi === modChoisi ? ' choisi' : '') + '" data-mod="' + esc(m.npi) + '"><strong>' + esc(m.nom) + '</strong><span>NPI : ' + esc(m.npi) + ' — Tél. : ' + esc(m.tel) +
          '</span></div>').join('')
      : '<p><em>Aucun modérateur rattaché pour le moment.</em></p>';
    const btn = $('#mod-retirer-ach');
    if (btn) btn.disabled = !modChoisi;
    $$('[data-mod]', zone).forEach(l => l.onclick = () => {
      modChoisi = (modChoisi === l.dataset.mod) ? null : l.dataset.mod;
      afficherMods();
    });
  }
  if ($('#mod-retirer-ach')) $('#mod-retirer-ach').onclick = () => {
    const m = modChoisi && DB.trouver(modChoisi);
    if (!m) return toast('Touchez d\'abord un modérateur dans la liste.', 'err');
    if (!confirm('Retirer ' + m.nom + ' de vos modérateurs ?')) return;
    delete m.acheteur;
    DB.enregistrer(m);
    modChoisi = null;
    afficherMods();
    toast('Modérateur retiré.');
  };
  if (estAdmin) { if ($('#bloc-moderateurs')) $('#bloc-moderateurs').hidden = true; }
  else {
    afficherMods();
    $('#mod-ajouter').onclick = async () => {
      const npi = await demanderTexte('Ajouter un modérateur', 'NPI du modérateur (10 chiffres)');
      if (!npi) return;
      if (Sync.actif()) { try { await Sync.tirerUsers(); } catch (e) { return toast(messageErreur(e), 'err'); } }
      const m = DB.trouver(npi);
      if (!m || (m.role !== 'moderateur' && m.role !== 'moderateur_attente')) return toast('Aucun modérateur avec ce NPI.', 'err');
      if (m.role === 'moderateur_attente') return toast('Ce modérateur n\'a pas encore été validé par l\'administrateur.', 'err');
      if (m.acheteur === moi.npi) return toast('Déjà dans votre liste.', 'err');
      if (m.acheteur && DB.trouver(m.acheteur)) return toast('Ce modérateur est déjà rattaché à un autre acheteur.', 'err');
      m.acheteur = moi.npi;
      DB.enregistrer(m);
      afficherMods();
      toast(m.nom + ' est maintenant votre modérateur.');
    };
  }

  /* --- Sacs pris chez moi : chaque transporteur indique l'acheteur chez qui il prend ses sacs.
         Un nombre hors de la liste doit être validé ici (avec le montant par tour) avant que les tours soient comptés. --- */
  const libStatut = { liste: '', valide: ' — validé', attente: ' — en attente de validation', refuse: ' — refusé' };
  function afficherSacsPris() {
    const zone = $('#sacs-pris');
    if (!zone) return;
    if (estAdmin) { $('#bloc-sacs-pris').hidden = true; return; }
    const l = DB.parRole('transporteur').filter(t => (t.sacsPar || {})[moi.npi]);
    zone.innerHTML = l.length ? l.map(t => {
      const st = statutSacs(t, moi.npi), n = t.sacsPar[moi.npi], id = esc(t.npi);
      const boutons = st === 'attente'
        ? '<button class="btn" type="button" data-act="valider" data-npi="' + id + '">Valider</button><button class="btn btn-danger" type="button" data-act="refuser" data-npi="' + id + '">Refuser</button>'
        : st === 'refuse' ? '<button class="btn btn-2" type="button" data-act="valider" data-npi="' + id + '">Valider quand même</button>' : '';
      return '<div class="ach-ligne"><strong>' + esc(t.nom) + '</strong><span>NPI : ' + id + ' — Tél. : ' + esc(t.tel) + '</span>' +
        '<span>Sacs par tour : <b>' + esc(n) + '</b>' + libStatut[st] + '</span>' +
        (boutons ? '<div class="boutons" style="margin-top:6px">' + boutons + '</div>' : '') + '</div>';
    }).join('') : '<p><em>Aucun transporteur n\'a encore indiqué de sacs pris chez vous.</em></p>';
  }
  if ($('#sacs-pris')) $('#sacs-pris').onclick = async e => {
    const b = e.target.closest('button[data-act]');
    const t = b && DB.trouver(b.dataset.npi);
    const n = t && Number((t.sacsPar || {})[moi.npi]);
    if (!t || !n || estAdmin) return;
    moi.sacsValides = moi.sacsValides || {}; moi.sacsRefuses = moi.sacsRefuses || {};
    if (b.dataset.act === 'valider') {
      const actuel = moi.tarifs[n];
      const saisi = await demanderTexte('Montant par tour pour ' + n + ' sacs (FCFA)', actuel ? 'Actuel : ' + actuel : 'Ex. 1500');
      if (saisi === null) return;
      const montant = saisi === '' ? actuel : Math.round(Number(saisi));
      if (!(montant > 0)) return toast('Entrez un montant supérieur à 0.', 'err');
      moi.tarifs[n] = montant;
      moi.sacsValides[t.npi] = n;
      delete moi.sacsRefuses[t.npi];
      toast(n + ' sacs validés pour ' + t.nom + ' (' + argent(montant) + ' par tour).');
    } else {
      moi.sacsRefuses[t.npi] = n;
      if (Number(moi.sacsValides[t.npi]) === n) delete moi.sacsValides[t.npi];
      toast('Nombre de sacs refusé pour ' + t.nom + '.');
    }
    DB.enregistrer(moi);
    afficherSacsPris(); afficherTarifs(); liste();
  };

  liste();
  afficherSacsPris();
  sel.onchange = () => afficher(sel.value);

  $('#ajouter').onclick = async () => {
    const npi = await demanderTexte('Ajouter un transporteur', 'NPI du transporteur (10 chiffres)');
    if (!npi) return;
    const t = DB.trouver(npi);
    if (!t || t.role !== 'transporteur') return toast('Aucun transporteur avec ce NPI.', 'err');
    if (moi.transporteurs.includes(npi)) return toast('Déjà dans votre liste.', 'err');
    moi.transporteurs.push(npi);
    sauver(); liste(); sel.value = npi; afficher(npi);
    toast(t.nom + ' ajouté.');
  };

  /* Scan du QR du transporteur : on affiche ses informations (NPI, nom, sacs) et, pour CET acheteur,
     son nombre de tours et son gain journalier. Le tour lui-même est validé par le modérateur. */
  $('#scan').onclick = () => ouvrirScanner(texte => {
    const npi = npiDepuisQR(texte);
    const t = npi && DB.trouver(npi);
    if (!t || t.role !== 'transporteur') return toast('QR non reconnu.', 'err');
    if (!moi.transporteurs.includes(npi)) { moi.transporteurs.push(npi); sauver(); }
    liste(); sel.value = npi; afficher(npi);
    toast('Transporteur : ' + t.nom);
  });

  /* mise à jour en direct (le modérateur peut valider un tour à tout moment) */
  actualiser = () => {
    if (!estAdmin) {
      const frais = DB.trouver(moi.npi);
      if (!frais) { DB.fermerSession(); location.href = 'connexion.html'; return; }   // compte supprimé
      Object.assign(moi, frais);
      moi.tarifs = moi.tarifs || {};
    }
    liste();
    afficherMods();
    afficherSacsPris();
    if (sel.value) afficher(sel.value);
  };
};

/* ---------- ADMIN ---------- */
PAGES.admin = function () {
  const sel = $('#choix');
  /* Tous les comptes sauf l'administrateur : ils peuvent tous être supprimés */
  function liste() {
    const moi = DB.courant();
    const comptes = DB.users().filter(x => x.role !== 'admin' && (!moi || x.npi !== moi.npi))
      .map(x => ({ npi: x.npi, nom: x.nom + ' — ' + (ROLES[x.role] || x.role) }));
    remplirSelect(sel, comptes, '-- Choisir un compte --');
  }
  liste();
  const fb = Compte;

  /* --- Journée de transport : l'annonce s'affiche 1 minute chez les utilisateurs connectés (5h - 19h) --- */
  function etatJournee() {
    const j = DB.lire('sobunu_journee', null);
    const h = new Date().getHours();
    let t = 'Aucune journée déclarée aujourd\'hui.';
    if (j && j.date === dateLocale()) {
      const nom = dateLongue(j.date);
      t = h < CONFIG.HEURE_DEBUT ? 'Journée du ' + nom + ' déclarée : ouverture à ' + CONFIG.HEURE_DEBUT + 'h.'
        : h >= CONFIG.HEURE_FIN ? 'Journée du ' + nom + ' terminée (fermeture à ' + CONFIG.HEURE_FIN + 'h).'
        : 'Journée du ' + nom + ' ouverte jusqu\'à ' + CONFIG.HEURE_FIN + 'h.';
    }
    $('#journee-etat').textContent = t;
  }
  etatJournee();
  $('#journee-ouvrir').onclick = async () => {
    try { await fb.ouvrirJournee(dateLocale()); }
    catch (err) { console.error(err); return toast(messageErreur(err), 'err'); }
    etatJournee();
    toast('Journée déclarée ouverte.');
  };

  /* --- Récapitulatif des déclarations (sacs + dédouanement) de tous les acheteurs, groupé par date --- */
  function afficherRecapDecl() {
    const corps = $('#recap-corps'), pied = $('#recap-pied');
    const filtre = $('#recap-date').value;                       // AAAA-MM-JJ ou vide
    const lignes = [];
    DB.parRole('acheteur').forEach(a => {
      const l = Array.isArray(a.declarations) && a.declarations.length ? a.declarations : (a.declaration ? [a.declaration] : []);
      l.forEach(d => lignes.push({ jour: d.jour, nom: a.nom, npi: a.npi, sacs: Number(d.sacs) || 0, montant: Number(d.montant) || 0 }));
    });
    const retenues = lignes.filter(x => x.jour && (!filtre || x.jour === filtre));
    if (!retenues.length) {
      corps.innerHTML = '<tr><td colspan="4" class="vide">' + (filtre ? 'Aucune déclaration à cette date.' : 'Aucune déclaration pour le moment.') + '</td></tr>';
      pied.innerHTML = '';
      return;
    }
    const jours = [...new Set(retenues.map(x => x.jour))].sort().reverse();   // du plus récent au plus ancien
    let html = '', totSacs = 0, totMont = 0;
    jours.forEach(j => {
      const du = retenues.filter(x => x.jour === j);
      const s = du.reduce((t, x) => t + x.sacs, 0), m = du.reduce((t, x) => t + x.montant, 0);
      totSacs += s; totMont += m;
      html += '<tr class="jour"><td colspan="4">' + esc(dateLongue(j)) + '</td></tr>';
      du.forEach(x => {
        html += '<tr><td>' + esc(x.nom) + '</td><td>' + esc(x.npi) + '</td><td class="num">' + x.sacs + '</td><td class="num">' + esc(argent(x.montant)) + '</td></tr>';
      });
      html += '<tr class="total-jour"><td colspan="2">Total du jour (' + du.length + ' déclaration' + (du.length > 1 ? 's' : '') + ')</td><td class="num">' + s + '</td><td class="num">' + esc(argent(m)) + '</td></tr>';
    });
    corps.innerHTML = html;
    pied.innerHTML = '<tr><td colspan="2">' + (filtre ? 'Total du ' + esc(dateLongue(filtre)) : 'Total général') + '</td><td class="num">' + totSacs + '</td><td class="num">' + esc(argent(totMont)) + '</td></tr>';
  }
  $('#recap-date').onchange = afficherRecapDecl;
  $('#recap-toutes').onclick = () => { $('#recap-date').value = ''; afficherRecapDecl(); };
  /* --- Groupe WhatsApp : le lien est enregistré ici (zone réservée) et sert à l'envoi discret du PDF --- */
  const WA_CLE = 'sobunu_wa_groupe';
  const lienWAValide = v => /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?(\?.*)?$/.test(v);
  async function lireLienWA() {
    if (Sync.actif()) {
      try {
        const v = await Sync.req('GET', '/whatsapp');
        if (typeof v === 'string' && v) DB.ecrire(WA_CLE, v); else localStorage.removeItem(WA_CLE);
      } catch (e) { /* hors ligne : on garde la copie locale */ }
    }
    return DB.lire(WA_CLE, '');
  }
  lireLienWA().then(v => { $('#wa-lien').value = v || ''; });
  $('#wa-enregistrer').onclick = async () => {
    const v = $('#wa-lien').value.trim();
    if (v && !lienWAValide(v)) return toast('Lien invalide : il doit commencer par https://chat.whatsapp.com/', 'err');
    try {
      if (Sync.actif()) await Sync.ecrire('PUT', '/whatsapp', v);
      if (v) DB.ecrire(WA_CLE, v); else localStorage.removeItem(WA_CLE);
    } catch (err) { console.error(err); return toast(messageErreur(err), 'err'); }
    toast(v ? 'Lien du groupe WhatsApp enregistré.' : 'Lien du groupe WhatsApp supprimé.');
  };

  /* PDF du récapitulatif (sacs déclarés + montant du dédouanement), tel qu'affiché (filtre de date compris) */
  function fabriquerPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) return null;
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    const filtre = $('#recap-date').value;
    doc.setFontSize(15);
    doc.text('SOBUNU - Récapitulatif des déclarations des acheteurs', 40, 44);
    doc.setFontSize(10);
    doc.text(filtre ? 'Date : ' + dateLongue(filtre) : 'Toutes les dates', 40, 62);
    doc.text('Édité le ' + dateLongue(dateLocale()), 40, 76);
    if (typeof doc.autoTable !== 'function') return null;
    doc.autoTable({
      html: '#recap-table', startY: 90, theme: 'grid', styles: { fontSize: 9 },
      headStyles: { fillColor: [11, 26, 74] },
      didParseCell: d => { d.cell.text = d.cell.text.map(t => String(t).replace(/[\u202f\u00a0]/g, ' ')); }   // espaces insécables : illisibles dans un PDF
    });
    const nom = 'recapitulatif-declarations-' + (filtre || dateLocale()) + '.pdf';
    return new File([doc.output('blob')], nom, { type: 'application/pdf' });
  }

  /* Envoi discret : partage du PDF (le groupe est choisi dans WhatsApp) ; sinon le PDF est enregistré sur l'appareil */
  async function envoyerWhatsApp(lien) {
    let fichier = null;
    try { fichier = fabriquerPDF(); } catch (e) { console.warn('[pdf]', e); }
    if (!fichier) return;                                         // bibliothèque PDF absente (hors ligne) : on imprime seulement
    const texte = 'Récapitulatif des déclarations (sacs et dédouanement) - SOBUNU';
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
      try { await navigator.share({ files: [fichier], title: texte, text: texte }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }     // annulé par l'utilisateur
    }
    const a = document.createElement('a');                        // repli : téléchargement du PDF
    a.href = URL.createObjectURL(fichier); a.download = fichier.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    const ouvrir = $('#wa-ouvrir');
    ouvrir.href = lien; ouvrir.hidden = false;
    toast('PDF enregistré : ouvrez le groupe WhatsApp et joignez-le.');
  }

  $('#recap-imprimer').onclick = async () => {
    const lien = DB.lire(WA_CLE, '');
    if (lien && lienWAValide(lien)) await envoyerWhatsApp(lien);
    window.print();
  };
  afficherRecapDecl();

  /* --- Messages reçus par le formulaire de contact : lecture, réponse par e-mail, suivi --- */
  let messagesContact = [];
  const zoneMsg = $('#msg-liste');
  async function chargerMessages() {
    if (Sync.actif()) {
      const obj = (await Sync.req('GET', '/contacts')) || {};
      messagesContact = Object.keys(obj).filter(id => obj[id] && typeof obj[id] === 'object').map(id => Object.assign({ id }, obj[id]));
    } else {
      messagesContact = DB.lire('sobunu_messages', []).map((m, i) => Object.assign({ id: 'l' + i }, m));
    }
    afficherMessages();
  }
  function afficherMessages() {
    const filtre = $('#msg-filtre').value;
    const nonTraites = messagesContact.filter(m => !m.repondu).length;
    $('#msg-compte').textContent = messagesContact.length
      ? nonTraites + ' message' + (nonTraites > 1 ? 's' : '') + ' à traiter sur ' + messagesContact.length
      : '';
    const liste = messagesContact.filter(m => filtre === 'tous' || !m.repondu)
      .sort((x, y) => String(y.date).localeCompare(String(x.date)));
    zoneMsg.innerHTML = liste.length ? liste.map(m => {
      const d = m.date ? new Date(m.date) : null;
      const quand = d && !isNaN(d) ? d.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '';
      return '<div class="msg-ligne' + (m.repondu ? ' traite' : '') + '" data-id="' + esc(m.id) + '">' +
        '<div class="msg-tete"><strong>' + esc(m.nom) + '</strong> <a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' +
        '<small>' + esc(quand) + '</small>' + (m.repondu ? '<span class="msg-etat">✔ Traité</span>' : '<span class="msg-etat nouveau">● À traiter</span>') + '</div>' +
        '<p class="msg-texte">' + esc(m.message) + '</p>' +
        '<label>Votre réponse</label><textarea rows="3" data-rep placeholder="Écrivez votre réponse ici…"></textarea>' +
        '<div class="boutons"><button class="btn" type="button" data-act="repondre">✉️ Répondre par e-mail</button>' +
        (m.repondu ? '' : '<button class="btn btn-2" type="button" data-act="traite">Marquer comme traité</button>') +
        '<button class="btn btn-danger" type="button" data-act="suppr">Supprimer</button></div></div>';
    }).join('') : '<p><em>' + (filtre === 'tous' ? 'Aucun message reçu.' : 'Aucun message à traiter.') + '</em></p>';
  }
  async function majMessage(m, champs) {
    if (Sync.actif()) await Sync.ecrire('PATCH', '/contacts/' + m.id, champs);
    else { const l = DB.lire('sobunu_messages', []); const i = Number(String(m.id).slice(1)); if (l[i]) Object.assign(l[i], champs); DB.ecrire('sobunu_messages', l); }
    Object.assign(m, champs);
  }
  async function supprimerMessage(m) {
    if (Sync.actif()) await Sync.ecrire('DELETE', '/contacts/' + m.id);
    else { const l = DB.lire('sobunu_messages', []); l.splice(Number(String(m.id).slice(1)), 1); DB.ecrire('sobunu_messages', l); }
    messagesContact = messagesContact.filter(x => x !== m);
  }
  zoneMsg.onclick = async e => {
    const bouton = e.target.closest('[data-act]');
    if (!bouton) return;
    const ligne = bouton.closest('[data-id]');
    const m = messagesContact.find(x => String(x.id) === ligne.dataset.id);
    if (!m) return;
    try {
      if (bouton.dataset.act === 'repondre') {
        const rep = $('[data-rep]', ligne).value.trim();
        if (!rep) return toast('Écrivez d\'abord votre réponse.', 'err');
        const original = String(m.message || '').slice(0, 600);
        const corps = rep + '\n\n--\nVotre message du ' + (m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '') + ' :\n> ' + original.replace(/\n/g, '\n> ');
        location.href = 'mailto:' + encodeURIComponent(m.email).replace(/%40/g, '@') +
          '?subject=' + encodeURIComponent('Réponse à votre message - SOBUNU') + '&body=' + encodeURIComponent(corps);
        await majMessage(m, { repondu: true, dateReponse: new Date().toISOString() });
        toast('Votre application de messagerie s\'ouvre avec la réponse.');
      } else if (bouton.dataset.act === 'traite') {
        await majMessage(m, { repondu: true, dateReponse: new Date().toISOString() });
        toast('Message marqué comme traité.');
      } else if (bouton.dataset.act === 'suppr') {
        if (!confirm('Supprimer ce message de ' + m.nom + ' ?')) return;
        await supprimerMessage(m);
        toast('Message supprimé.');
      }
      afficherMessages();
    } catch (err) { console.error(err); toast(messageErreur(err), 'err'); }
  };
  $('#msg-filtre').onchange = afficherMessages;
  $('#msg-actualiser').onclick = () => chargerMessages().then(() => toast('Messages actualisés.')).catch(err => { console.error(err); toast(messageErreur(err), 'err'); });
  chargerMessages().catch(err => { console.error(err); zoneMsg.innerHTML = '<p><em>Impossible de charger les messages : ' + esc(messageErreur(err)) + '</em></p>'; });

  /* --- Modérateurs : inscrits comme les autres comptes, puis validés par l'administrateur --- */
  const selMod = $('#choix-mod');
  function listeMod() {
    const mods = DB.users().filter(x => x.role === 'moderateur' || x.role === 'moderateur_attente');
    const avantMod = selMod.value;
    selMod.innerHTML = '<option value="">-- Choisir un modérateur --</option>' + mods.map(x =>
      '<option value="' + esc(x.npi) + '">' + esc(x.nom) + ' (' + esc(x.npi) + ') — ' + (x.role === 'moderateur' ? 'validé' : 'en attente') + '</option>').join('');
    if (avantMod && [...selMod.options].some(o => o.value === avantMod)) selMod.value = avantMod;
  }
  function changerRole(role, message) {
    const x = DB.trouver(selMod.value);
    if (!x) return toast('Choisissez un modérateur dans la liste.', 'err');
    if (x.role === role) return toast('Ce compte est déjà dans cet état.', 'err');
    x.role = role;
    DB.enregistrer(x);
    listeMod();
    selMod.value = x.npi;
    toast(message);
  }
  listeMod();
  $('#mod-valider').onclick = () => changerRole('moderateur', 'Modérateur validé.');
  $('#mod-retirer').onclick = () => changerRole('moderateur_attente', 'Rôle de modérateur retiré (compte en attente).');

  /* --- Comptes : nouveau mot de passe (défini par l'administrateur) et déverrouillage des comptes inactifs --- */
  const selReset = $('#reset-compte'), selVerrou = $('#choix-verrou');
  function majSelect(s, html) {
    if (s.innerHTML === html) return;
    const v = s.value; s.innerHTML = html;
    if (v && [...s.options].some(o => o.value === v)) s.value = v;
  }
  function listeComptes() {
    const moi = DB.courant();
    const autres = DB.users().filter(x => moi && x.npi !== moi.npi);
    const opt = x => '<option value="' + esc(x.npi) + '">' + esc(x.nom) + ' (' + esc(x.npi) + ') — ' + esc(ROLES[x.role] || x.role) + '</option>';
    majSelect(selReset, '<option value="">-- Choisir un compte --</option>' + autres.map(opt).join(''));
    majSelect(selVerrou, '<option value="">-- Choisir un compte verrouillé --</option>' + autres.filter(x => x.verrouille).map(opt).join(''));
  }
  listeComptes();
  $('#reset-valider').onclick = async () => {
    const npi = selReset.value, n = $('#reset-mdp').value;
    if (!npi) return toast('Choisissez un compte.', 'err');
    if (n.length < 6) return toast('Mot de passe : 6 caractères minimum.', 'err');
    try { await Compte.adminAction('reset', npi, n); }
    catch (err) { console.error(err); return toast(messageErreur(err), 'err'); }
    $('#reset-mdp').value = '';
    toast('Nouveau mot de passe défini : communiquez-le au titulaire du compte.');
  };
  $('#verrou-debloquer').onclick = () => {
    const x = DB.trouver(selVerrou.value);
    if (!x) return toast('Choisissez un compte verrouillé.', 'err');
    x.verrouille = false; x.derniereConnexion = Date.now();
    DB.enregistrer(x);
    listeComptes();
    toast('Compte déverrouillé.');
  };

  function afficherFiche() {
    const a = DB.trouver(sel.value);
    $('#fiche').hidden = !a || a.role === 'admin';
    if (!a || a.role === 'admin') return;
    remplirChamps($('#fiche'), a);
    const ach = a.role === 'acheteur';                       // déclarations et QR : propres aux acheteurs
    $$('.ach-seul').forEach(el => { el.hidden = !ach; });
    $('#qr').hidden = !ach;
    if (ach) creerQR($('#qr'), a.npi);
  }
  sel.onchange = afficherFiche;

  $('#logo-fichier').onchange = async e => {
    if (!e.target.files[0]) return;
    try {
      let data = await redimensionner(e.target.files[0], 400, 'image/png');
      if (data.length > 1500000) data = await redimensionner(e.target.files[0], 250, 'image/png'); // PNG trop lourd : on réduit
      if (DB.ecrire('sobunu_logo', data)) { appliquerLogo(); toast('Logo modifié.'); }
    } catch (err) { toast('Image illisible : choisissez un fichier PNG, JPG ou SVG.', 'err'); }
  };
  $('#logo-reset').onclick = () => { localStorage.removeItem('sobunu_logo'); appliquerLogo(); toast('Logo par défaut rétabli.'); };

  $('#supprimer').onclick = () => {
    const a = DB.trouver(sel.value);
    if (!a) return toast('Choisissez un compte.', 'err');
    if (a.role === 'admin') return toast('Le compte administrateur ne peut pas être supprimé.', 'err');
    if (!confirm('Supprimer définitivement le compte de ' + a.nom + ' (' + (ROLES[a.role] || a.role) + ') ?')) return;
    Compte.supprimerCompte(a.npi);   // fiche + mot de passe + code de zone : le NPI redevient libre
    $('#fiche').hidden = true;
    liste(); listeMod(); listeComptes(); afficherRecapDecl();
    toast('Compte supprimé.');
  };

  gestionCarrousel();

  /* nouveaux acheteurs / modérateurs inscrits, journée déclarée : mise à jour sans recharger */
  actualiser = () => {
    liste(); listeMod(); listeComptes(); etatJournee(); afficherRecapDecl();
    afficherFiche();
  };
};

/* ---------- PROFIL ---------- */
/* Fenêtre de saisie du profil : les champs n'existent dans la page QUE pendant que la fenêtre est ouverte,
   ils démarrent vides (aucune donnée personnelle n'est préremplie ni affichée) et la fenêtre est détruite à la fermeture.
   champs = [{id, label, type, placeholder, autocomplete, inputmode, requis, oeil, options, valeur}]
   valider(valeurs) -> true : on ferme ; false : la fenêtre reste ouverte (erreur déjà signalée par toast). */
function fenetreProfil(titre, info, champs, valider) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');
  m.innerHTML = '<form class="modal-box" autocomplete="off"><h3></h3><p style="margin:6px 0 4px"><small></small></p>' +
    '<div class="mp-champs" style="text-align:left"></div>' +
    '<div class="boutons" style="justify-content:center"><button class="btn" type="submit">Enregistrer</button>' +
    '<button class="btn btn-2" type="button" data-non>Annuler</button></div></form>';
  $('h3', m).textContent = titre;
  $('small', m).textContent = info || '';
  const zone = $('.mp-champs', m);

  champs.forEach(c => {
    const l = document.createElement('label');
    l.htmlFor = 'mp-' + c.id;
    l.textContent = c.label;
    let i;
    if (c.type === 'select') {
      i = document.createElement('select');
      c.options.forEach(([val, txt]) => {
        const o = document.createElement('option');
        o.value = val; o.textContent = txt; i.appendChild(o);
      });
      i.value = c.valeur;
    } else {
      i = document.createElement('input');
      i.type = c.type || 'text';
      if (c.type !== 'file') i.className = 'champ';
      else { i.accept = 'image/*'; i.style.width = '100%'; }
      if (c.placeholder) i.placeholder = c.placeholder;
      if (c.inputmode) i.inputMode = c.inputmode;
      i.autocapitalize = 'none';
    }
    i.id = 'mp-' + c.id;
    i.autocomplete = c.autocomplete || 'off';
    if (c.requis) i.required = true;
    zone.append(l, i);
    if (c.oeil) ajouterOeil(i);
  });

  const fermer = () => { document.removeEventListener('keydown', echap); m.remove(); };
  const echap = e => { if (e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', echap);
  $('[data-non]', m).onclick = fermer;

  $('form', m).onsubmit = async e => {
    e.preventDefault();
    const btn = $('button[type="submit"]', m);
    const v = {};
    champs.forEach(c => {
      const el = $('#mp-' + c.id, m);
      v[c.id] = c.type === 'file' ? el.files[0] : el.value;
    });
    btn.disabled = true;
    let ok = false;
    try { ok = await valider(v); }
    catch (err) { console.error(err); toast(messageErreur(err), 'err'); }
    btn.disabled = false;
    if (ok) fermer();
  };

  document.body.appendChild(m);
  const premier = $('input, select', m);
  if (premier) premier.focus();
}

PAGES.profil = function () {
  let u = DB.courant();

  /* Affiche la photo et les informations du profil (nom, NPI, e-mail, téléphone) */
  function afficher() {
    u = DB.courant();
    remplirChamps($('#details'), u);
    $('#photo-profil').src = u.photo || LOGO_DEFAUT;
    const mail = Auth.emailCourant(u.npi);
    $('#email-actuel').textContent = emailTechnique(mail) ? 'Aucun e-mail enregistré' : mail;
  }
  afficher();

  /* ----- Photo ----- */
  $('#btn-photo').onclick = () => fenetreProfil('Changer la photo', '',
    [{ id: 'photo', label: 'Choisir une image', type: 'file', requis: true }],
    async v => {
      if (!v.photo) { toast('Choisissez une image.', 'err'); return false; }
      u.photo = await redimensionner(v.photo);
      DB.enregistrer(u);
      afficher();
      toast('Photo modifiée.');
      return true;
    });

  /* ----- Nom et téléphone (un champ laissé vide reste inchangé) ----- */
  $('#btn-infos').onclick = () => fenetreProfil('Modifier mes informations',
    'Laissez vide ce que vous ne souhaitez pas modifier.',
    [
      { id: 'nom', label: 'Nom et prénom', autocomplete: 'name' },
      { id: 'tel', label: 'Téléphone', type: 'tel', inputmode: 'tel', autocomplete: 'tel' }
    ],
    async v => {
      const nom = v.nom.trim(), tel = v.tel.trim();
      if (!nom && !tel) { toast('Rien à modifier.', 'err'); return false; }
      if (nom && nom.length < 3) { toast('Nom invalide.', 'err'); return false; }
      if (tel && tel !== u.tel) {
        const autre = DB.trouverParTel(tel);
        if (autre && autre.npi !== u.npi) { toast('Ce téléphone est déjà utilisé.', 'err'); return false; }
        try { await Compte.changerTel(u.tel, tel, u.npi); }
        catch (err) { console.error(err); toast(messageErreur(err), 'err'); return false; }
        u.tel = tel;
      }
      if (nom) u.nom = nom;
      DB.enregistrer(u);
      afficher();
      construireNav(); appliquerLogo(); appliquerLangue();
      toast('Informations mises à jour.');
      return true;
    });

  /* ----- E-mail (l'adresse actuelle n'est jamais affichée) ----- */
  $('#btn-email').onclick = () => {
    const sans = emailTechnique(Auth.emailCourant(u.npi));
    fenetreProfil('Mon e-mail',
      sans ? 'Aucun e-mail enregistré : ajoutez-en un pour pouvoir réinitialiser votre mot de passe par e-mail.'
           : 'Un e-mail est déjà enregistré. Saisissez-en un nouveau pour le remplacer.',
      [
        { id: 'email', label: 'Nouvel e-mail', type: 'email', inputmode: 'email', autocomplete: 'email', requis: true },
        { id: 'mdp', label: 'Mot de passe actuel', type: 'password', autocomplete: 'current-password', requis: true, oeil: true }
      ],
      async v => {
        try {
          const change = await Compte.changerEmail(v.mdp, v.email);
          if (!change) { toast('C\'est déjà votre e-mail.', 'err'); return false; }
        } catch (err) {
          console.error(err);
          const c = err && err.code;
          if (c === 'auth/wrong-password' || c === 'auth/invalid-credential') toast('Mot de passe incorrect.', 'err');
          else toast(messageErreur(err), 'err');
          return false;
        }
        afficher();
        toast('E-mail enregistré. Vous pouvez maintenant vous connecter avec.');
        return true;
      });
  };

  /* ----- Mot de passe ----- */
  $('#btn-mdp').onclick = () => fenetreProfil('Données de connexion', '',
    [
      { id: 'actuel', label: 'Mot de passe actuel', type: 'password', autocomplete: 'current-password', requis: true, oeil: true },
      { id: 'nouveau', label: 'Nouveau mot de passe', type: 'password', autocomplete: 'new-password', requis: true, oeil: true },
      { id: 'nouveau2', label: 'Confirmation', type: 'password', autocomplete: 'new-password', requis: true, oeil: true }
    ],
    async v => {
      if (v.nouveau.length < 6) { toast('6 caractères minimum.', 'err'); return false; }
      if (v.nouveau !== v.nouveau2) { toast('Les mots de passe ne correspondent pas.', 'err'); return false; }
      try { await Compte.changerMdp(v.actuel, v.nouveau); }
      catch (err) {
        console.error(err);
        const c = err && err.code;
        if (c === 'auth/wrong-password' || c === 'auth/invalid-credential') toast('Mot de passe actuel incorrect.', 'err');
        else toast(messageErreur(err), 'err');
        return false;
      }
      toast('Mot de passe modifié.');
      return true;
    });

  /* ----- Langue ----- */
  $('#btn-langue').onclick = () => fenetreProfil('Langue', '',
    [{
      id: 'langue', label: 'Langue', type: 'select', valeur: u.lang || 'fr',
      options: [['fr', 'Français'], ['en', 'English'], ['bba', 'Baatɔnum (Bariba)']]
    }],
    async v => {
      u.lang = v.langue;
      DB.enregistrer(u);
      DB.ecrire('sobunu_lang', u.lang);
      appliquerLangue();
      return true;
    });

  $('#deco').onclick = deconnexion;
};

/* ---------- CONTACT ---------- */
PAGES.contact = function () {
  /* Le visiteur n'est pas connecté : le message part sans jeton vers /contacts (règle d'écriture seule, voir firebase-rules).
     Sans serveur partagé configuré, il reste dans ce navigateur (sobunu_messages). */
  $('#form-contact').onsubmit = async e => {
    e.preventDefault();
    const form = e.target, btn = $('button[type="submit"]', form);
    const msg = {
      nom: $('#c-nom').value.trim().slice(0, 100),
      email: $('#c-email').value.trim().slice(0, 150),
      message: $('#c-message').value.trim().slice(0, 2000),
      date: new Date().toISOString(),
      repondu: false
    };
    if (!msg.nom || !msg.email || !msg.message) return toast('Remplissez tous les champs.', 'err');
    btn.disabled = true;
    try {
      if (Sync.actif()) await Sync.req('POST', '/contacts', msg, true);
      else { const l = DB.lire('sobunu_messages', []); l.push(msg); DB.ecrire('sobunu_messages', l); }
      form.reset();
      toast('Message envoyé. Merci !');
    } catch (err) {
      console.error(err);
      toast(err && err.code === 'sobunu/refuse'
        ? 'Message refusé par le serveur : les règles Firebase ne sont pas encore publiées pour /contacts.'
        : messageErreur(err), 'err');
    } finally { btn.disabled = false; }
  };
};

/* ==========================================================================
   10 bis. ANNONCE DE LA JOURNÉE OUVERTE (fenêtre d'une minute, sur toutes les pages)
   ========================================================================== */
let minuteurAnnonce = null;
function annonceJournee() {
  const u = DB.courant();
  if (!u || $('#annonce-journee')) return;
  const j = DB.lire('sobunu_journee', null);
  if (!journeeOuverte(j)) return;
  let st = null;
  try { st = JSON.parse(sessionStorage.getItem('sobunu_annonce')); } catch (e) { st = null; }
  const sauverSt = () => { try { sessionStorage.setItem('sobunu_annonce', JSON.stringify(st)); } catch (e) { /* ignoré */ } };
  if (!st || st.ts !== j.ts || st.date !== j.date) {         // première fois (ou nouvelle déclaration)
    st = { date: j.date, ts: j.ts, fin: Date.now() + CONFIG.DUREE_ANNONCE_MS };
    sauverSt();
  }
  if (Date.now() >= st.fin) return;
  const m = document.createElement('div');
  m.id = 'annonce-journee';
  m.className = 'modal';
  m.innerHTML = '<div class="modal-box"><h3>📢 Journée de transport</h3><p id="annonce-texte" style="margin:12px 0;font-weight:700"></p>' +
    '<p><small id="annonce-reste"></small></p><div class="boutons" style="justify-content:center"><button class="btn" id="annonce-fermer" type="button">Fermer</button></div></div>';
  $('#annonce-texte', m).textContent = 'La journée du ' + dateLongue(j.date) + ' est déclarée ouverte pour le transport de marchandises';
  document.body.appendChild(m);
  const fermer = () => { clearInterval(minuteurAnnonce); m.remove(); };
  const maj = () => {
    const reste = Math.ceil((st.fin - Date.now()) / 1000);
    if (reste <= 0) return fermer();
    $('#annonce-reste', m).textContent = 'Cette fenêtre se ferme dans ' + reste + ' s';
  };
  maj();
  minuteurAnnonce = setInterval(maj, 1000);
  $('#annonce-fermer', m).onclick = () => { st.fin = 0; sauverSt(); fermer(); };
}

/* ==========================================================================
   10 ter. ZONE RÉSERVÉE (pages admin, modérateur, acheteur)
   Verrouillée par un code personnel de 6 caractères (créé à la première visite,
   conservé en local sous forme d'empreinte). Le bouton "Se déconnecter"
   verrouille de nouveau la zone.
   ========================================================================== */
function zoneReservee(init) {
  const u = DB.courant();
  const fb = Compte;
  const main = $('main.contenu');
  const enfants = [...main.children];
  const hashCode = c => hasher('sobunu-zone:' + u.npi + ':' + c);
  let initFait = false, barre = null, verrou = null, essais = 0, bloqueJusqua = 0;

  const masquer = v => enfants.forEach(e => { e.style.display = v ? 'none' : ''; });
  const carteVerrou = html => {
    if (!verrou) { verrou = document.createElement('div'); verrou.className = 'carte'; main.prepend(verrou); }
    verrou.innerHTML = '<h2>🔒 Zone réservée</h2>' + html;
    return verrou;
  };

  function ouvrir() {
    try { sessionStorage.setItem('sobunu_zone', u.npi); } catch (e) { /* ignoré */ }
    if (verrou) { verrou.remove(); verrou = null; }
    masquer(false);
    barre = document.createElement('div');
    barre.className = 'boutons';
    barre.style.cssText = 'justify-content:space-between;align-items:center;margin:0 0 10px';
    barre.innerHTML = '<small>🔓 Zone réservée déverrouillée</small>' +
      '<button class="btn btn-2" id="zone-deco" type="button" title="Verrouille la zone réservée">Se déconnecter</button>';
    main.prepend(barre);
    $('#zone-deco').onclick = verrouiller;
    if (!initFait) { initFait = true; init(); appliquerLangue(); }
    document.body.classList.add('zone-prete');
  }

  function formEntree(hash) {
    const c = carteVerrou('<p>Entrez le mot de passe de la zone réservée (6 caractères).</p>' +
      '<form id="zv-form"><input class="champ" id="zv-code" type="password" maxlength="6" autocomplete="off" style="width:200px;letter-spacing:4px;text-align:center">' +
      '<div class="boutons"><button class="btn" type="submit">Déverrouiller</button>' +
      '<button class="btn btn-2" type="button" id="zv-oubli">Mot de passe oublié ?</button></div></form>');
    $('#zv-code', c).focus();
    $('#zv-form', c).onsubmit = async e => {
      e.preventDefault();
      if (Date.now() < bloqueJusqua) return toast('Trop d\'essais : patientez 30 secondes.', 'err');
      if (await hashCode($('#zv-code', c).value) === hash) { essais = 0; return ouvrir(); }
      $('#zv-code', c).value = '';
      if (++essais >= 5) { essais = 0; bloqueJusqua = Date.now() + 30000; }
      toast('Mot de passe incorrect.', 'err');
    };
    $('#zv-oubli', c).onclick = async () => {
      const r = await demanderChamps('Mot de passe oublié', 'Entrez le mot de passe de votre compte (celui de la connexion) pour choisir un nouveau mot de passe de zone réservée.',
        [{ id: 'mdp', placeholder: 'Mot de passe du compte', type: 'password' }]);
      if (!r) return;
      try { await fb.verifierMdp(r.mdp); } catch (err) { return toast('Mot de passe incorrect.', 'err'); }
      formCreation();
    };
  }

  function formCreation() {
    const c = carteVerrou('<p><b>Première connexion à cet espace :</b> créez votre mot de passe de <b>6 caractères</b> (sans espace). Il vous sera demandé à chaque ouverture de la zone réservée.</p>' +
      '<form id="zc-form"><input class="champ" id="zc-code" type="password" maxlength="6" placeholder="Mot de passe (6 caractères)" autocomplete="off" style="width:200px;margin-bottom:8px"><br>' +
      '<input class="champ" id="zc-code2" type="password" maxlength="6" placeholder="Confirmer le mot de passe" autocomplete="off" style="width:200px">' +
      '<div class="boutons"><button class="btn" type="submit">Créer mon mot de passe</button></div></form>');
    $('#zc-code', c).focus();
    $('#zc-form', c).onsubmit = async e => {
      e.preventDefault();
      const a = $('#zc-code', c).value;
      if (!/^\S{6}$/.test(a)) return toast('Le mot de passe doit contenir exactement 6 caractères, sans espace.', 'err');
      if (a !== $('#zc-code2', c).value) return toast('Les deux mots de passe ne correspondent pas.', 'err');
      try { await fb.definirCode(await hashCode(a)); }
      catch (err) { console.error(err); return toast(messageErreur(err), 'err'); }
      toast('Mot de passe de la zone réservée créé.');
      ouvrir();
    };
  }

  async function verrouiller() {
    try { sessionStorage.removeItem('sobunu_zone'); } catch (e) { /* ignoré */ }
    if (barre) { barre.remove(); barre = null; }
    masquer(true);
    carteVerrou('<p>Chargement…</p>');
    document.body.classList.add('zone-prete');
    let hash;
    try { hash = await fb.lireCode(); }
    catch (err) { console.error(err); carteVerrou('<p>Impossible de lire votre mot de passe de zone : ' + esc(messageErreur(err)) + '</p>'); return; }
    if (hash) formEntree(hash); else formCreation();
  }

  if (sessionStorage.getItem('sobunu_zone') === u.npi) ouvrir();
  else { masquer(true); verrouiller(); }
}

/* ==========================================================================
   11. DÉMARRAGE : s'exécute sur chaque page
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  /* données du serveur avant d'afficher, mais on n'attend pas plus de 5 s (réseau mobile lent : page blanche sinon) */
  if (Sync.actif() && Auth.lire()) {
    try { await Promise.race([Sync.tirer(), new Promise(r => setTimeout(r, 5000))]); }
    catch (e) { console.warn('[sync] hors ligne :', e.message); }
  }
  if (!garde()) return;
  construireNav();
  appliquerLogo();
  appliquerLangue();
  styleCarrousel();
  $$('[data-carrousel]').forEach(monterCarrousel);
  const init = PAGES[document.body.dataset.page];
  try {
    if (init) { if (document.body.dataset.zone === '1') zoneReservee(init); else init(); }
  } finally {
    document.body.classList.add('zone-prete');   // révèle la page (voir le CSS des pages à zone réservée)
  }
  appliquerLangue(); // une 2e fois pour les textes ajoutés par la page
  window.appPrete = true;
  annonceJournee();

  /* Synchronisation : toutes les 3 s, au retour sur l'onglet, et dès qu'un autre onglet écrit dans le stockage */
  const synchro = async () => {
    if (Sync.actif() && Auth.lire()) { try { await Sync.tirer(); } catch (e) { console.warn('[sync] hors ligne :', e.message); } }
    if (document.body.dataset.auth === '1' && !DB.courant()) { location.href = 'connexion.html'; return; }   // session fermée ailleurs
    annonceJournee();
    if (actualiser) { try { actualiser(); } catch (e) { console.error('[synchro]', e); } }
  };
  setInterval(synchro, 3000);
  window.addEventListener('storage', synchro);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) synchro(); });
});

/* ==========================================================================
   12. APPLICATION INSTALLABLE (PWA) : enregistre le service worker (sw.js)
   Fonctionne en HTTPS (ou sur localhost) ; ignoré silencieusement sinon.
   ========================================================================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* HTTP ou navigateur sans support : on ignore */ }); });
}
