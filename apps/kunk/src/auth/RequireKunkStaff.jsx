import React from 'react';
import { Navigate } from 'react-router-dom';
import { useOperatorAuth } from '@kunk/auth-session';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';

export function RequireKunkStaff({ children }) {
  const { user, loading, hasRequiredRole } = useOperatorAuth();

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography level="body-md">Carregando sessão…</Typography>
      </Box>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
