import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Permite que crawlers recebam noindex e o redirecionamento para o login.
  // Os dados privados permanecem protegidos pela autenticação.
  return { rules: { userAgent: '*', allow: '/' } };
}
