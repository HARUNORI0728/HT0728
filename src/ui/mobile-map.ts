type Drawer = 'info' | 'actions';
type MenuView = 'map' | 'commands' | 'forecast';
type MapViewport = { width: number; height: number; cornerBottom: number };

/** Reuse the battle UI in short landscape layouts, restoring its original DOM order on rotation. */
export function mountMobileMap(onViewport: (viewport: MapViewport | null) => void) {
  const layout = matchMedia('(orientation: landscape) and (max-height: 540px)');
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
    const cornerBottom = Math.max(
      toggles.info.offsetTop + toggles.info.offsetHeight,
      toggles.actions.offsetTop + toggles.actions.offsetHeight,
    ) - stage.offsetTop + 2;
    onViewport({ width, height, cornerBottom });
  }

  function reflow() {
    for (const toggle of Object.values(toggles)) toggle.hidden = !layout.matches;
    if (layout.matches) {
      drawers.info.append(goal, bonus, info);
      drawers.actions.append(hud, menu);
      show(view === 'map' ? null : 'actions');
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
  new ResizeObserver(measure).observe(stage);
  reflow();

  return {
    close,
    updateMenu(next: MenuView) {
      view = next;
      show(next === 'map' ? null : 'actions');
    },
  };
}
