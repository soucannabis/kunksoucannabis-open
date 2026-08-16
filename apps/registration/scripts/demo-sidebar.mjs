/**
 * Navegação pelo menu lateral do Kunk nas demos.
 *
 * O submenu do Sidebar usa `grid-template-rows: 0fr` quando fechado: os itens
 * continuam no DOM e o Playwright os considera visíveis, mas o clique cai no
 * cabeçalho da seção. Por isso a abertura é verificada pela altura real da
 * lista, não pela visibilidade do item.
 */
import { clickWithCursor, log, pause } from './demo-lib.mjs';

function sectionLocator(page, sectionLabel) {
  return page
    .locator('li.ListItem')
    .filter({
      has: page.locator('.SidebarSection-label', { hasText: new RegExp(`^${sectionLabel}$`, 'i') }),
    })
    .first();
}

async function submenuHeight(section) {
  const box = await section.locator('ul').first().boundingBox();
  return box?.height ?? 0;
}

async function waitSubmenuOpen(section, timeoutMs = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if ((await submenuHeight(section)) > 20) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

export async function openSidebarSection(page, sectionLabel) {
  const section = sectionLocator(page, sectionLabel);
  await section.waitFor({ state: 'visible', timeout: 20_000 });

  if ((await submenuHeight(section)) > 20) {
    log('menu', `seção ${sectionLabel} já aberta`);
    return section;
  }

  log('menu', `abrindo seção ${sectionLabel}`);
  await clickWithCursor(section.locator('.ListItemButton.SidebarSection').first());
  if (!(await waitSubmenuOpen(section))) {
    throw new Error(`submenu da seção "${sectionLabel}" não abriu`);
  }
  await pause(page, 450, `seção ${sectionLabel} aberta`);
  return section;
}

export async function clickSidebarItem(page, sectionLabel, itemLabel) {
  const section = await openSidebarSection(page, sectionLabel);
  const item = section.getByRole('menuitem', { name: new RegExp(`^${itemLabel}$`, 'i') }).first();
  await item.waitFor({ state: 'visible', timeout: 15_000 });
  log('menu', `clicando ${sectionLabel} → ${itemLabel}`);
  await clickWithCursor(item);
  log('menu', `✓ ${sectionLabel} → ${itemLabel}`);
}
