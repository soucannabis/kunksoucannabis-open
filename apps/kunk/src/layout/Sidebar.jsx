import React, { useMemo, useRef, useState } from 'react';
import GlobalStyles from '@mui/joy/GlobalStyles';
import Avatar from '@mui/joy/Avatar';
import Box from '@mui/joy/Box';
import Divider from '@mui/joy/Divider';
import IconButton from '@mui/joy/IconButton';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton, { listItemButtonClasses } from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import Typography from '@mui/joy/Typography';
import Sheet from '@mui/joy/Sheet';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import Groups2Icon from '@mui/icons-material/Groups2';
import { useNavigate } from 'react-router-dom';
import { useOperatorAuth } from '@kunk/auth-session';
import { MENU_SECTIONS } from '../app/menuConfig.js';
import { allowedPagesForRoles, filterMenuSections } from '../lib/rolePages.js';
import { useKunkConfig } from '../config/KunkConfigProvider.jsx';
import { CacheClearButton } from '../components/CacheClearButton.jsx';
import { closeSidebar } from './utils.js';

const SECTION_ICONS = {
  acolhimento: GroupRoundedIcon,
  loja: ShoppingCartRoundedIcon,
  profissionais: Groups2Icon,
};

function Toggler({ open, renderToggle, children }) {
  return (
    <Box sx={{ position: 'relative' }}>
      {renderToggle({ open })}
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: '0.2s ease',
          '& > *': {
            overflow: open ? 'visible' : 'hidden',
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default function Sidebar({ collapsed, setCollapsed, isAdmin }) {
  const { user, roles, rolePages, logout } = useOperatorAuth();
  const { config } = useKunkConfig();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null);
  const sectionRefs = useRef({});

  const admin = isAdmin ?? roles.includes('Administrador');
  const menuSections = useMemo(() => {
    const allowed = allowedPagesForRoles(rolePages, roles);
    return filterMenuSections(MENU_SECTIONS, allowed);
  }, [rolePages, roles]);
  const menuText = config.menuText || '#ffffff';
  const menuBg = config.menuBg || 'var(--kunk-menu-bg)';
  const menuHoverBg = config.menuHoverBg || '#fff';
  const menuHoverText = config.menuHoverText || '#000';

  const handleToggleMenu = (menuId) => {
    setOpenMenu((prev) => {
      const willOpen = prev !== menuId;
      if (willOpen && collapsed) setCollapsed(false);
      if (willOpen && sectionRefs.current[menuId]) {
        setTimeout(() => {
          sectionRefs.current[menuId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
      return willOpen ? menuId : null;
    });
  };

  async function onLogout() {
    try {
      await logout();
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <Sheet
      className="Sidebar"
      data-testid="kunk-sidebar"
      sx={{
        position: 'fixed',
        transition: 'width 0.3s',
        zIndex: 10000,
        height: '100dvh',
        width: collapsed ? '60px' : 'var(--Sidebar-width)',
        top: 0,
        p: 2,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        borderRight: '1px solid',
        borderColor: 'divider',
        backgroundColor: menuBg,
        color: menuText,
      }}
    >
      <IconButton
        onClick={() => {
          setCollapsed(!collapsed);
          if (!collapsed) setOpenMenu(null);
        }}
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          color: menuText,
          backgroundColor: 'rgba(255,255,255,0.1)',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
        }}
      >
        {collapsed ? <KeyboardArrowDownIcon /> : <CloseRoundedIcon />}
      </IconButton>

      <GlobalStyles
        styles={(theme) => ({
          ':root': {
            '--Sidebar-width': '220px',
            [theme.breakpoints.up('lg')]: {
              '--Sidebar-width': '200px',
            },
          },
        })}
      />

      <Box
        className="Sidebar-overlay"
        sx={{
          position: 'fixed',
          zIndex: 9998,
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          opacity: 'var(--SideNavigation-slideIn)',
          backgroundColor: 'var(--joy-palette-background-backdrop)',
          transition: 'opacity 0.4s',
          transform: {
            xs: 'translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1) + var(--SideNavigation-slideIn, 0) * var(--Sidebar-width, 0px)))',
            lg: 'translateX(-100%)',
          },
        }}
        onClick={() => closeSidebar()}
      />

      <Box
        className="kunk-logo-frame"
        hidden={collapsed}
        sx={{ display: collapsed ? 'none' : 'flex' }}
      >
        {config.logo ? (
          <CacheClearButton>
            <img src={config.logo} alt={config.title || 'Logo'} />
          </CacheClearButton>
        ) : null}
      </Box>
      <Box sx={{ alignItems: 'center' }}>
        {!collapsed && (
          <Typography sx={{ color: menuText, textAlign: 'center' }} level="title-lg">
            {config.title || 'Kunk SouCannabis'}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          minHeight: 0,
          overflowY: 'auto',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          [`& .${listItemButtonClasses.root}`]: {
            gap: 1.5,
            color: menuText,
            '&:hover': {
              color: menuHoverText,
              fontWeight: 700,
              bgcolor: menuHoverBg,
              '& .MuiTypography-root': { color: menuHoverText, fontWeight: 700 },
              '& .MuiSvgIcon-root': { color: menuHoverText },
            },
          },
        }}
      >
        <List
          size="sm"
          sx={{
            gap: 1,
            '--List-nestedInsetStart': '30px',
            '--ListItem-radius': (theme) => theme.vars.radius.sm,
          }}
        >
          {menuSections.map((section) => {
            const Icon = SECTION_ICONS[section.id] || GroupRoundedIcon;
            const items = section.items.filter((item) => !item.adminOnly || admin);
            return (
              <React.Fragment key={section.id}>
                <Divider sx={{ backgroundColor: menuText }} />
                <ListItem
                  className="ListItem"
                  nested
                  ref={(el) => {
                    sectionRefs.current[section.id] = el;
                  }}
                >
                  <Toggler
                    open={openMenu === section.id}
                    renderToggle={({ open }) => (
                      <ListItemButton
                        className="ListItemButton"
                        onClick={() => handleToggleMenu(section.id)}
                      >
                        <Icon sx={{ color: menuText }} />
                        <ListItemContent>
                          <Typography className="ListItemButton" level="title-sm">
                            {section.label}
                          </Typography>
                        </ListItemContent>
                        <KeyboardArrowDownIcon
                          sx={{ transform: open ? 'rotate(180deg)' : 'none', color: menuText }}
                        />
                      </ListItemButton>
                    )}
                  >
                    <List sx={{ gap: 0.5 }}>
                      {items.map((item) => (
                        <ListItem key={item.id} className="ListItem" sx={{ mt: 0.5 }}>
                          <ListItemButton
                            className="ListItemButton"
                            role="menuitem"
                            onClick={() => {
                              if (item.path) navigate(item.path);
                            }}
                          >
                            {item.label}
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Toggler>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }} hidden={collapsed}>
        <Avatar size="sm" src={user?.avatar_url} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ color: menuText }} level="title-sm">
            {user ? `${user.name || ''} ${user.last_name || ''}`.trim() || user.email : 'Carregando...'}
          </Typography>
        </Box>
        <IconButton
          size="sm"
          variant="plain"
          color="neutral"
          onClick={onLogout}
          aria-label="Sair"
          sx={{ color: menuText, '&:hover': { background: 'none' } }}
        >
          <LogoutRoundedIcon sx={{ color: menuText }} />
        </IconButton>
      </Box>
    </Sheet>
  );
}
