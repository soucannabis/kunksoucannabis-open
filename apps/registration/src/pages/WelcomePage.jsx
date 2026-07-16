import React from 'react';
import { Link } from 'react-router-dom';
import { useAssociateAuth } from '@kunk/auth-session';
import { usePublicConfig } from '../config/PublicConfigProvider.jsx';

export function WelcomePage() {
  const { user } = useAssociateAuth();
  const { config: cfg } = usePublicConfig();
  return (
    <div>
      <h1 className="h2 mb-3">Bem-vindo</h1>
      <p className="text-white-50 mb-4">{cfg.welcomeText}</p>
      <p className="text-white mb-4">Olá{user?.email_account ? `, ${user.email_account}` : ''}.</p>
      <Link className="btn btn-success btn-lg" to="/cadastro-associado">
        Iniciar cadastro
      </Link>
    </div>
  );
}
