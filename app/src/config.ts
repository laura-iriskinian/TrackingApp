// Nom provisoire : le changer ici suffit pour toute l'app (penser aussi à index.html et au manifest dans vite.config.ts)
export const APP_NAME = 'NextRep'

// Clés de l'ancienne app « Suivi sport », servie sur le même domaine : on les lit, on ne les modifie jamais
export const LEGACY_KEY = 'suivi-sport-v1'
export const LEGACY_PREFS_KEY = 'suivi-sport-prefs'

export const THEME_KEY = 'nextrep-theme'

// Serveur Supabase (projet hébergé dans l'Union européenne). Tant que ces deux valeurs sont vides,
// l'app fonctionne sans compte et rien ne quitte le téléphone. La clé « anon » est publique par nature :
// la sécurité repose sur les règles de la base (voir supabase/schema.sql). Ne jamais mettre ici la clé « service_role ».
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const SERVER_REGION = 'Union européenne (Francfort, Allemagne)'

// Adresse de contact affichée dans les mentions légales et la politique de confidentialité
export const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL ?? ''

// Version du texte de consentement aux données de santé : à changer si le texte change
export const CONSENT_VERSION = '2026-10-29'
