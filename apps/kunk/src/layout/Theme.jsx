import React, { useState } from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import { Outlet, useLocation } from 'react-router-dom';
import { useOperatorAuth } from '@kunk/auth-session';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import QuickNavMenu from './QuickNavMenu.jsx';
import ThemeSettings from './ThemeSettings.jsx';
import ActivityNotifications from '../components/ActivityNotifications.jsx';
import { pageTitleFromPath } from '../auth/roleRedirect.js';
import '../styles/themeStyles.css';

export default function Theme() {
  const { roles } = useOperatorAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const title = pageTitleFromPath(location.pathname);

  return (
    <CssVarsProvider disableTransitionOnChange>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          minHeight: '100dvh',
          bgcolor: 'var(--kunk-app-bg)',
          backgroundImage: 'var(--kunk-bg-image)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <Header />
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          onTagsModalOpen={() => setTagsModalOpen(true)}
          isAdmin={roles.includes('Administrador')}
        />
        <Box
          component="main"
          className="MainContent"
          sx={{
            px: { xs: 2, md: 2 },
            bgcolor: 'transparent',
            pt: {
              xs: 'calc(12px + var(--Header-height))',
              sm: 'calc(12px + var(--Header-height))',
              md: 3,
            },
            pb: { xs: 2, sm: 2, md: 3 },
            flex: 1,
            display: 'flex',
            marginRight: '2%',
            flexDirection: 'column',
            minWidth: 0,
            height: '100dvh',
            gap: 1,
            marginLeft: sidebarCollapsed ? '60px' : '220px',
            transition: 'margin-left 0.3s',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              mb: 1,
              gap: 2,
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              width: '100%',
              textAlign: 'left',
              marginBottom: '30px',
            }}
            className="namePage"
          >
            <Button
              sx={{
                backgroundColor: 'var(--kunk-accent)',
                '&:hover': { backgroundColor: 'var(--kunk-accent-hover)' },
              }}
              variant="soft"
            >
              <Typography sx={{ color: '#fff' }} level="h4" component="h4">
                {title}
              </Typography>
            </Button>
            <QuickNavMenu />
            <ActivityNotifications />
            <ThemeSettings />
          </Box>
          <Outlet />
        </Box>
      </Box>

      <Modal open={tagsModalOpen} onClose={() => setTagsModalOpen(false)}>
        <ModalDialog>
          <ModalClose />
          <Typography level="h4">Tags</Typography>
          <Typography level="body-lg">Module under development</Typography>
        </ModalDialog>
      </Modal>
    </CssVarsProvider>
  );
}
