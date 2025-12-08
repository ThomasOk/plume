/**
 * Fichier d'exploration du SDK Better Auth
 *
 * But : Comprendre comment découvrir les méthodes disponibles sans documentation
 */

import { authClient } from '@/lib/authClient';

// ============================================
// MÉTHODE 1 : Exploration via TypeScript
// ============================================

// Étape 1 : Regarder ce qui est disponible sur authClient
// Dans VS Code, tapez "authClient." et regardez l'autocomplete
const exploreAuthClient = () => {
  // authClient. <- mettre le curseur ici et faire Ctrl+Space

  // Vous verrez :
  // - signIn
  // - signUp
  // - signOut
  // - useSession
  // - etc.
};

// Étape 2 : Explorer signIn
const exploreSignIn = () => {
  // authClient.signIn. <- autocomplete ici

  // Vous verrez :
  // - email
  // - social
  // - etc.
};

// Étape 3 : Explorer signIn.social
const exploreSocialSignIn = async () => {
  // authClient.signIn.social({ <- autocomplete dans les accolades

  // TypeScript vous montrera les paramètres attendus :
  await authClient.signIn.social({
    provider: 'google', // Type: 'google' | 'github' | ... (enum)
    // callbackURL?: string
    // ...autres options
  });
};

// ============================================
// MÉTHODE 2 : Inspecter les types
// ============================================

// Hoverer sur authClient pour voir son type
type AuthClientType = typeof authClient;

// Hoverer sur signIn pour voir sa signature
type SignInType = typeof authClient.signIn;

// Hoverer sur social pour voir ses paramètres
type SocialSignInType = typeof authClient.signIn.social;

// ============================================
// MÉTHODE 3 : Regarder le code source du package
// ============================================

// Dans VS Code :
// Cmd+Click (Mac) ou Ctrl+Click (Windows) sur "authClient"
// Cela ouvre le fichier d'où provient l'import

// Ensuite, Cmd+Click sur "createAuthClient"
// Cela ouvre le fichier de Better Auth

// ============================================
// MÉTHODE 4 : Console.log pour l'exploration
// ============================================

export const exploreAtRuntime = () => {
  console.log('authClient keys:', Object.keys(authClient));
  console.log('signIn keys:', Object.keys(authClient.signIn));

  // Voir la structure complète
  console.log('Full authClient:', authClient);
};

// ============================================
// EXEMPLE PRATIQUE : Implémentation réelle
// ============================================

export const handleGoogleSignIn = async () => {
  try {
    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard', // Optionnel
    });

    console.log('Sign in result:', result);
  } catch (error) {
    console.error('Sign in error:', error);
  }
};

// ============================================
// BONUS : Regarder les types générés
// ============================================

// Better Auth génère des types basés sur votre configuration serveur
// Vous pouvez les inspecter comme ceci :

type InferredSession = typeof authClient.$Infer.Session;
// Cela vous montre la structure exacte de votre session

export {};
