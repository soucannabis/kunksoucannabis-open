import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Box, Typography, Grid } from '@mui/material';
import { useOperatorAuth } from '@kunk/auth-session';
import { useKunkConfig } from '../config/KunkConfigProvider.jsx';
import { KUNK_APP_ROLES } from '../app/menuConfig.js';
import { hasAnyRole, roleHomePath } from '../auth/roleRedirect.js';

/** Credenciais do sample seed (`kunk-api/sample-data`). */
const TEST_CREDENTIALS = {
  username: 'admin@demo.kunk.local',
  password: 'DemoAdmin123!',
};

function parseRoles(permissions) {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions;
  try {
    const parsed = JSON.parse(permissions);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return String(permissions)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function validatePassword(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    specialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
}

export function LoginPage() {
  const { user, loading, hasRequiredRole, login, roles } = useOperatorAuth();
  const { config } = useKunkConfig();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [passwordError, setPasswordError] = useState('');
  const [busy, setBusy] = useState(false);

  const primary = config.darkPrimary || '#5a7a5b';
  const logo = config.logo || '/kunkLogo.png';
  const showTestLogin = import.meta.env.DEV;

  if (!loading && user && hasRequiredRole) {
    return <Navigate to={roleHomePath(roles)} replace />;
  }
  if (!loading && user && !hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'password' && passwordError) setPasswordError('');
  }

  async function performLogin(username, password) {
    setBusy(true);
    setError(null);
    setPasswordError('');
    try {
      const res = await login(username.trim(), password);
      const userRoles = parseRoles(res.data?.user?.permissions || res.data?.user?.roles);
      if (!hasAnyRole(userRoles, KUNK_APP_ROLES)) {
        navigate('/unauthorized');
        return;
      }
      navigate(roleHomePath(userRoles));
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('network') || msg === 'Failed to fetch') {
        navigate('/not-connected');
        return;
      }
      if (msg.toLowerCase().includes('senha') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('credenciais')) {
        setPasswordError('Senha inválida.');
        setError(null);
      } else {
        setError(msg || 'E-mail ou senha inválidos');
        setPasswordError(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.length || !passwordValidation.uppercase || !passwordValidation.specialChar) {
      setPasswordError('A senha deve ter pelo menos 8 caracteres, uma letra maiúscula e um caractere especial');
      setError(null);
      return;
    }
    await performLogin(formData.username, formData.password);
  }

  async function handleTestLogin() {
    setFormData({ ...TEST_CREDENTIALS });
    await performLogin(TEST_CREDENTIALS.username, TEST_CREDENTIALS.password);
  }

  return (
    <Grid container style={{ height: '100vh' }}>
      <Grid item xs={12} md={6}>
        <Container
          component="main"
          maxWidth="xs"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Box
            sx={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography component="h1" sx={{ color: primary }} variant="h5">
              Login
            </Typography>
            {error ? (
              <Typography color="error" sx={{ mt: 2 }} role="alert">
                {error}
              </Typography>
            ) : null}
            {passwordError ? (
              <Typography color="error" sx={{ mt: 2 }} role="alert">
                {passwordError}
              </Typography>
            ) : null}
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="username"
                label="E-mail"
                name="username"
                autoComplete="username"
                autoFocus
                value={formData.username}
                onChange={handleChange}
                sx={{ backgroundColor: '#fff' }}
              />
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                name="password"
                label="Senha"
                type="password"
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                sx={{ backgroundColor: '#fff' }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={busy}
                sx={{
                  backgroundColor: primary,
                  '&:hover': { bgcolor: 'var(--kunk-accent-hover, #303B30)' },
                  mt: 3,
                  mb: showTestLogin ? 1 : 2,
                }}
              >
                {busy ? 'Entrando…' : 'Entrar'}
              </Button>
              {showTestLogin ? (
                <Button
                  type="button"
                  fullWidth
                  variant="outlined"
                  disabled={busy}
                  onClick={handleTestLogin}
                  sx={{
                    color: primary,
                    borderColor: primary,
                    '&:hover': { borderColor: primary, bgcolor: 'rgba(90, 122, 91, 0.08)' },
                    mb: 1,
                  }}
                >
                  Entrar como teste
                </Button>
              ) : null}
              <Button
                component={Link}
                to="/nova-senha"
                fullWidth
                sx={{ color: primary, textTransform: 'none', mb: 2 }}
              >
                Esqueci a senha
              </Button>
            </Box>
          </Box>
        </Container>
      </Grid>
      <Grid
        item
        xs={false}
        md={6}
        style={{
          position: 'relative',
          backgroundImage: `url(${logo})`,
          backgroundSize: '90%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#183f19c4',
          }}
        />
      </Grid>
    </Grid>
  );
}
