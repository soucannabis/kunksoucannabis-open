import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAssociateAuth } from '@kunk/auth-session';
import { AlertError, PasswordInput } from '@kunk/ui';
import { ApiError } from '@kunk/api-client';

const MIN_PASSWORD_LENGTH = 8;

export function CadastroPage() {
  const { registerEmail } = useAssociateAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      await registerEmail(email.trim(), password);
      navigate('/bem-vindo');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ACCOUNT_EXISTS' || err.code === 'ACCOUNT_IN_PROGRESS') {
          setError(`${err.message} Vá para o login.`);
        } else setError(err.message);
      } else setError('Falha ao cadastrar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="text-start">
      <h1 className="h3 mb-3">Cadastro de associado</h1>
      <AlertError message={error} />
      <label className="form-label text-white">E-mail</label>
      <input
        className="form-control mb-3"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="form-label text-white">Senha</label>
      <PasswordInput
        className="form-control"
        wrapperClassName="mb-2"
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <label className="form-label text-white">Confirmar senha</label>
      <PasswordInput
        className="form-control"
        wrapperClassName="mb-3"
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
      />
      <button className="btn btn-success w-100 mb-2" type="submit" disabled={busy}>
        Se cadastrar como Associado
      </button>
      <Link className="btn btn-outline-light w-100" to="/login">
        Já tenho conta — Login
      </Link>
    </form>
  );
}

export function LoginPage() {
  const { login } = useAssociateAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Falha no login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="text-start">
      <h1 className="h3 mb-3">Login</h1>
      <AlertError message={error} />
      <label className="form-label text-white">E-mail</label>
      <input className="form-control mb-2" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="form-label text-white">Senha</label>
      <PasswordInput
        className="form-control"
        wrapperClassName="mb-3"
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-success w-100 mb-2" type="submit" disabled={busy}>
        Entrar
      </button>
      <Link className="btn btn-link text-white" to="/nova-senha">
        Esqueci a senha
      </Link>
      <Link className="btn btn-outline-light w-100 mt-2" to="/cadastro">
        Criar conta
      </Link>
    </form>
  );
}

export function NovaSenhaPage({ api }) {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState(token ? 'reset' : 'forgot');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function onForgot(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.forgotPassword(email.trim());
      setMessage('Se o e-mail existir, enviaremos instruções.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function onReset(e) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.');
      return;
    }
    try {
      await api.resetPassword(token, password);
      setMessage('Senha atualizada. Faça login.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="text-start">
      <h1 className="h3 mb-3">Nova senha</h1>
      <AlertError message={error} />
      {message && <div className="alert alert-success">{message}</div>}
      {mode === 'forgot' ? (
        <form onSubmit={onForgot}>
          <label className="form-label text-white">E-mail</label>
          <input className="form-control mb-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-success w-100" type="submit">Enviar link</button>
          <button type="button" className="btn btn-link text-white" onClick={() => setMode('reset')}>
            Já tenho o token
          </button>
        </form>
      ) : (
        <form onSubmit={onReset}>
          <label className="form-label text-white">Token</label>
          <input className="form-control mb-2" required value={token} onChange={(e) => setToken(e.target.value)} />
          <label className="form-label text-white">Nova senha</label>
          <PasswordInput
            className="form-control"
            wrapperClassName="mb-2"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="form-label text-white">Confirmar senha</label>
          <PasswordInput
            className="form-control"
            wrapperClassName="mb-3"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
          <button className="btn btn-success w-100" type="submit">Redefinir</button>
        </form>
      )}
    </div>
  );
}
