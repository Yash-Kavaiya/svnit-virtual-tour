// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsPanel } from '../../src/ui/SettingsPanel.js';
import { Settings } from '../../src/core/Settings.js';

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    Settings.set('quality', Settings.defaults.quality);
    Settings.set('timeOfDay', Settings.defaults.timeOfDay);
  });

  it('changing quality persists via Settings', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const p = new SettingsPanel(root);
    p.open();
    const sel = root.querySelector('[data-setting="quality"]');
    sel.value = 'low';
    sel.dispatchEvent(new Event('change'));
    expect(Settings.get('quality')).toBe('low');
    expect(JSON.parse(localStorage.getItem('svnit.settings')).quality).toBe('low');
    p.close();
  });

  it('reflects external Settings changes', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const p = new SettingsPanel(root);
    p.open();
    Settings.set('timeOfDay', 'night');
    const seg = root.querySelector('[data-setting="timeOfDay"][data-value="night"]');
    expect(seg.getAttribute('aria-pressed')).toBe('true');
    p.close();
  });
});
