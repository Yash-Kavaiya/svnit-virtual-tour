// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { el, trapFocus, clear } from '../../src/ui/dom.js';

describe('dom', () => {
  it('el builds a tree with props and children', () => {
    const n = el('div', { className: 'x', dataset: { k: '1' } }, el('span', {}, 'hi'));
    expect(n.className).toBe('x');
    expect(n.dataset.k).toBe('1');
    expect(n.querySelector('span').textContent).toBe('hi');
  });

  it('el attaches event handlers passed as onX', () => {
    let clicked = 0;
    const b = el('button', { onClick: () => (clicked += 1) }, 'go');
    b.dispatchEvent(new Event('click'));
    expect(clicked).toBe(1);
  });

  it('clear empties a node', () => {
    const box = el('div', {}, el('span', {}, 'a'), el('span', {}, 'b'));
    clear(box);
    expect(box.childNodes.length).toBe(0);
  });

  it('trapFocus returns a release function', () => {
    const box = el('div', {}, el('button', {}, 'a'), el('button', {}, 'b'));
    document.body.append(box);
    const release = trapFocus(box);
    expect(typeof release).toBe('function');
    release();
  });
});
