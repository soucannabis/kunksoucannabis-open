/**
 * Camadas da área de conteúdo (página):
 *   menu < modal da página < menus/selects do modal < pesquisar global < toast
 *
 * Dialogs da página não cobrem o Sidebar (left + pointer-events),
 * para o menu continuar usável com modal aberto.
 */

/** Menu lateral — abaixo dos dialogs da área de conteúdo. */
export const SIDEBAR_Z = 14000;

/** Dialogs/Modals de página — acima do menu; abaixo do Pesquisar. */
export const CONTENT_AREA_DIALOG_Z = 15000;

/** Menus/Selects/Autocompletes portaled — acima do Dialog da página. */
export const CONTENT_AREA_OVERLAY_Z = CONTENT_AREA_DIALOG_Z + 1;

/** Botão + dialog do Pesquisar global — acima dos modais de página e do menu. */
export const GLOBAL_SEARCH_Z = 16000;

export const contentAreaSelectProps = {
  MenuProps: {
    sx: { zIndex: CONTENT_AREA_OVERLAY_Z },
  },
};

export const contentAreaAutocompleteSlotProps = {
  popper: { sx: { zIndex: CONTENT_AREA_OVERLAY_Z } },
};

/**
 * Dialogs na área de conteúdo: não cobrem o menu lateral
 * (left + pointer-events para cliques no Sidebar).
 */
export const contentAreaDialogSx = {
  zIndex: CONTENT_AREA_DIALOG_Z,
  left: 'var(--kunk-sidebar-offset, 220px)',
  right: 0,
  width: 'auto',
  pointerEvents: 'none',
  '& .MuiBackdrop-root': {
    pointerEvents: 'auto',
  },
  '& .MuiDialog-container': {
    pointerEvents: 'none',
  },
  '& .MuiDialog-paper': {
    pointerEvents: 'auto',
  },
};

/** Props padrão para Dialogs de página (foco não prende o menu/pesquisar). */
export const contentAreaDialogProps = {
  disableEnforceFocus: true,
  disableAutoFocus: true,
  sx: contentAreaDialogSx,
};

/** MUI Modal (não Dialog) na área de conteúdo. */
export const contentAreaModalSx = {
  zIndex: CONTENT_AREA_DIALOG_Z,
  left: 'var(--kunk-sidebar-offset, 220px)',
  right: 0,
  width: 'auto',
};
