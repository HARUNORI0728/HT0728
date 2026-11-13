// The small sound-settings button (title, map, camp) and its panel: BGM volume, effect volume, mute.
import { audio } from './engine';

const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

/** Wires every `.sndBtn` to the #snd panel. */
export function mountAudioUi() {
  const panel = document.getElementById('snd')!;
  const bgm = panel.querySelector<HTMLInputElement>('#sndBgm')!, sfx = panel.querySelector<HTMLInputElement>('#sndSfx')!;
  const mute = panel.querySelector<HTMLButtonElement>('#sndMute')!;
  const bgmV = panel.querySelector<HTMLElement>('#sndBgmV')!, sfxV = panel.querySelector<HTMLElement>('#sndSfxV')!;
  const sync = () => {
    const s = audio.settings;
    bgm.value = String(s.bgm); sfx.value = String(s.sfx);
    bgmV.textContent = String(s.bgm); sfxV.textContent = String(s.sfx);
    mute.setAttribute('aria-pressed', String(s.mute));
    mute.textContent = s.mute ? '消音中（タップで解除）' : '消音する';
    panel.classList.toggle('muted', s.mute);
    for (const b of document.querySelectorAll<HTMLElement>('.sndBtn')) {
      b.innerHTML = (s.mute ? ICON_OFF : ICON_ON) + '<span>音</span>';
      b.setAttribute('aria-label', s.mute ? '音の設定（消音中）' : '音の設定');
    }
  };
  const open = () => { sync(); panel.hidden = false; };
  const close = () => { panel.hidden = true; };
  for (const b of document.querySelectorAll<HTMLButtonElement>('.sndBtn')) b.onclick = e => { e.stopPropagation(); open(); };
  bgm.oninput = () => { audio.set({ bgm: Number(bgm.value) }); sync(); };
  sfx.oninput = () => { audio.set({ sfx: Number(sfx.value) }); sync(); };
  sfx.onchange = () => audio.sfx('decide'); // a sample at the new level
  mute.onclick = () => { audio.set({ mute: !audio.settings.mute }); sync(); };
  panel.querySelector<HTMLButtonElement>('#sndClose')!.onclick = close;
  panel.onclick = e => { if (e.target === panel) close(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
  sync();
}
