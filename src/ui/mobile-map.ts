type Drawer = 'info' | 'actions';
type MenuView = 'map' | 'select' | 'commands' | 'forecast';
export type MapViewport = {
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  cornerBottom: number;
};

/**
 * Reuse the battle UI in phone layouts (short landscape, or narrow portrait), restoring its original DOM order otherwise.
 * Landscape: drawers float over the map. Portrait: the HUD stays as a slim strip on top and one drawer sits under the map
 * as a bottom sheet (the map shrinks instead of being covered); a selected unit also opens its small command sheet.
 */
export function mountMobileMap(onViewport: (viewport: MapViewport | null) => void) {
  const layout = matchMedia('(orientation: landscape) and (max-height: 540px), (orientation: portrait) and (max-width: 560px)');
  const portrait = matchMedia('(orientation: portrait) and (max-width: 560px)');
  const find = (id: string) => document.getElementById(id)!;
  const stage = find('stage'), info = find('info'), hud = find('hud'), menu = find('menu');
  const goal = find('goal'), bonus = find('bonusGoal'), backdrop = find('mapBackdrop');
  const toggles = { info: find('mapInfoToggle'), actions: find('mapActionsToggle') };
  const drawers = { info: find('mapInfoDrawer'), actions: find('mapActionsDrawer') };
  const positions = [info, hud, menu, goal, bonus].map(element => {
    const home = document.createComment('');
    element.before(home);
    return { element, home };
  });
  let opened: Drawer | null = null;
  let view: MenuView = 'map';

  function show(next: Drawer | null, focusDrawer = false) {
    if (!layout.matches) return;
    const previous = opened;
    const restoreFocus = previous && drawers[previous].contains(document.activeElement);
    opened = next;
    const forecast = next === 'actions' && view === 'forecast';
    if (forecast && info.parentElement !== drawers.actions) drawers.actions.append(info);
    if (!forecast && info.parentElement !== drawers.info) drawers.info.append(info);
    backdrop.hidden = next === null;
    for (const name of ['info', 'actions'] as const) {
      drawers[name].hidden = next !== name;
      toggles[name].setAttribute('aria-expanded', String(next === name));
    }
    if (next && (next !== previous || focusDrawer)) drawers[next].scrollTop = 0;
    if (next && focusDrawer) drawers[next].focus({ preventScroll: true });
    else if (restoreFocus && previous !== next) toggles[previous].focus({ preventScroll: true });
  }

  function measure() {
    if (!layout.matches) return;
    const { clientWidth: width, clientHeight: height } = stage;
    if (!width || !height) return;
    const cornerBottom = Math.max(0, Math.max(
      toggles.info.getBoundingClientRect().bottom,
      toggles.actions.getBoundingClientRect().bottom,
    ) - stage.getBoundingClientRect().top + 2);
    onViewport({ width, height, orientation: portrait.matches ? 'portrait' : 'landscape', cornerBottom });
  }

  function reflow() {
    for (const toggle of Object.values(toggles)) toggle.hidden = !layout.matches;
    if (layout.matches) {
      drawers.info.append(goal, bonus, info);
      if (portrait.matches) { positions[1].home.after(hud); drawers.actions.append(menu); } else drawers.actions.append(hud, menu);
      show(wanted());
      measure();
    } else {
      opened = null;
      backdrop.hidden = true;
      for (const name of ['info', 'actions'] as const) {
        drawers[name].hidden = true;
        toggles[name].setAttribute('aria-expanded', 'false');
      }
      for (const { element, home } of positions) home.after(element);
      onViewport(null);
    }
  }

  const wanted = (): Drawer | null => view === 'map' || view === 'select' && !portrait.matches ? null : 'actions';

  function close() {
    if (!opened) return false;
    show(null);
    return true;
  }

  for (const name of ['info', 'actions'] as const) {
    toggles[name].addEventListener('click', event => show(opened === name ? null : name, event.detail === 0));
  }
  backdrop.addEventListener('click', close);
  layout.addEventListener('change', reflow);
  portrait.addEventListener('change', reflow);
  new ResizeObserver(measure).observe(stage);
  reflow();

  return {
    close,
    updateMenu(next: MenuView) {
      view = next;
      show(wanted());
    },
  };
}
