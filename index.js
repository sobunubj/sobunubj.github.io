/* SƆBUNU - fonction d'administration (Firebase Cloud Functions, 2e génération)
   Réservée à l'administrateur : définir un nouveau mot de passe, ou supprimer le compte de connexion d'un utilisateur.
   Déploiement : voir le message qui accompagne ces fichiers. */
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp({ databaseURL: 'https://sobunu-cb99c-default-rtdb.europe-west1.firebasedatabase.app' });

exports.sobunuAdmin = onRequest({ cors: true, region: 'europe-west1' }, async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) return res.status(401).json({ error: 'Connexion requise.' });
    const jeton = await admin.auth().verifyIdToken(m[1]);
    const emailJeton = String(jeton.email || '').toLowerCase();
    let moi;
    if (/@sobunu\.app$/.test(emailJeton)) moi = emailJeton.replace('@sobunu.app', '');                       // ancien compte
    else moi = (await admin.database().ref('sobunu/emails/' + emailJeton.replace(/\./g, ',')).get()).val();   // e-mail -> NPI
    if (!/^\d{10}$/.test(String(moi || ''))) return res.status(403).json({ error: 'Compte inconnu.' });
    const role = (await admin.database().ref('sobunu/users/' + moi + '/role').get()).val();
    if (role !== 'admin') return res.status(403).json({ error: 'Réservé à l\'administrateur.' });

    const { action, npi, motDePasse } = req.body || {};
    if (!/^\d{10}$/.test(String(npi || ''))) return res.status(400).json({ error: 'NPI invalide.' });
    /* e-mail du compte visé : celui enregistré dans /mails, sinon l'ancien NPI@sobunu.app */
    const mail = (await admin.database().ref('sobunu/mails/' + npi).get()).val();
    const compte = (mail ? await admin.auth().getUserByEmail(mail).catch(() => null) : null)
      || await admin.auth().getUserByEmail(npi + '@sobunu.app').catch(() => null);

    if (action === 'reset') {
      if (!compte) return res.status(404).json({ error: 'Aucun compte de connexion pour ce NPI.' });
      if (typeof motDePasse !== 'string' || motDePasse.length < 6) return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum.' });
      await admin.auth().updateUser(compte.uid, { password: motDePasse });
      await admin.auth().revokeRefreshTokens(compte.uid);        // déconnecte ses autres appareils
    } else if (action === 'delete') {
      if (npi === moi) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte ici.' });
      if (compte) await admin.auth().deleteUser(compte.uid);
    } else {
      return res.status(400).json({ error: 'Action inconnue.' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur du serveur.' });
  }
});
