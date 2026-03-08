# Checklist WhatsApp – quand ça ne marche pas

Coche chaque point dans l’ordre. Le premier non coché est souvent la cause du problème.

---

## 1. Twilio (console)

- [ ] Compte Twilio créé et (pour la prod) **upgradé** (payant).
- [ ] **Numéro d’envoi WhatsApp** enregistré : **Messaging** → **Senders** → **WhatsApp Senders** → un expéditeur avec statut **Online** (créé via « Create new sender » → « Continue with Facebook » → Meta Business + WABA + numéro vérifié).
- [ ] Tu as noté ce numéro au format **E.164** (ex. `+33612345678`).

---

## 2. Template (Content Template Builder)

- [ ] Template créé (ex. « texteinvitation »), type **Media**, avec **Body** `{{1}}` et **Media URL** `{{2}}`.
- [ ] **Soumis à WhatsApp** : bouton **« Submit for WhatsApp approval »** cliqué.
- [ ] Statut du template = **Approved** (pas « Not Submitted » ni « Pending »).
- [ ] Content SID noté (ex. `HXa4ab36405e77d2605fb7d524b4a1ea73`).

---

## 3. Vercel – Variables d’environnement

Toutes en **Production** (ou au moins celles utilisées), puis **Save**.

- [ ] `TWILIO_ACCOUNT_SID` = ton Account SID (commence par `AC...`).
- [ ] `TWILIO_AUTH_TOKEN` = ton Auth Token.
- [ ] `TWILIO_WHATSAPP_FROM` = **`whatsapp:+33xxxxxxxxx`**  
  → Le préfixe **`whatsapp:`** est **obligatoire**. Numéro sans espace. Exemple : `whatsapp:+33612345678`.
- [ ] `TWILIO_WHATSAPP_CONTENT_SID` = **`HXa4ab36405e77d2605fb7d524b4a1ea73`** (ton Content SID, sans espace).
- [ ] `VITE_WHATSAPP_API_URL` = **`https://ton-domaine.vercel.app/api/send-whatsapp`**  
  → HTTPS, **pas de slash à la fin**. Remplacer `ton-domaine` par ton vrai domaine (ex. `my-event-lilac`).

---

## 4. Redéploiement

- [ ] Après avoir ajouté ou modifié une variable, **Redeploy** du dernier déploiement (Deployments → ⋮ → Redeploy).
- [ ] Attendre la fin du build.

---

## 5. Test dans l’app

- [ ] Tu ouvres l’app depuis l’**URL Vercel** (pas en local sans API).
- [ ] Événement → **Documents** → **Partager aux invités** pour un document.
- [ ] Le **bouton vert « Envoyer à tous en un clic »** apparaît.
- [ ] En cliquant : pas d’alert d’erreur, ou message « Envoyé à X contacts ».
- [ ] Si une erreur s’affiche : ouvre la **console** du navigateur (F12 → Console) et note le message après `[WhatsApp API]`.

---

## Erreurs fréquentes

| Problème | Cause probable | À faire |
|----------|----------------|--------|
| Le bouton vert n’apparaît pas | `VITE_WHATSAPP_API_URL` manquant ou build sans cette variable | Vérifier la variable, puis **redéployer** |
| « Twilio non configuré » | SID, Token ou FROM manquant | Vérifier les 3 variables sur Vercel |
| Erreur 405 | URL avec slash final ou `http://` | Corriger `VITE_WHATSAPP_API_URL` (HTTPS, pas de slash), redéployer |
| Envoyé mais personne ne reçoit (sandbox) | Destinataires pas dans le sandbox | Chaque destinataire doit envoyer « join &lt;code&gt; » au numéro Twilio |
| Envoyé mais personne ne reçoit (prod) | Template pas approuvé ou mauvais numéro | Vérifier statut template = Approved et `TWILIO_WHATSAPP_FROM` = `whatsapp:+33...` |

---

**Point le plus souvent oublié :** `TWILIO_WHATSAPP_FROM` doit être **exactement** au format `whatsapp:+33xxxxxxxxx` (avec le préfixe `whatsapp:`). Sans ce préfixe, Twilio rejette l’envoi.
