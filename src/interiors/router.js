import { computeReturn } from './InteriorBase.js';
import { createLibraryInterior } from './LibraryInterior.js';
import { createLectureHallInterior } from './LectureHallInterior.js';
import { createAdminLobbyInterior } from './AdminLobbyInterior.js';
import { events } from '../core/events.js';

const FACTORIES = {
  library: createLibraryInterior,
  'lecture-hall': createLectureHallInterior,
  admin: createAdminLobbyInterior,
};

export function interiorKeyForRecord(record) {
  const name = (record?.name ?? '').toLowerCase();
  if (name.includes('library')) return 'library';
  if (name.includes('administration') || name.includes('admin')) return 'admin';
  if (name.includes('lt-') || name.includes('lecture') || name.includes('seminar')) {
    return 'lecture-hall';
  }
  return null;
}

// Manages entering/leaving interiors without tearing down the campus scene.
export class InteriorRouter {
  constructor({ domElement, campusView, onViewChange }) {
    this.domElement = domElement;
    this.campusView = campusView;
    this.onViewChange = onViewChange;
    this.active = null;
    this._return = null;

    events.on('interior:request', (record) => this.enterForRecord(record));
    events.on('interior:exit', () => this.exit());
  }

  get inInterior() {
    return !!this.active;
  }

  enterForRecord(record) {
    const key = interiorKeyForRecord(record);
    if (!key || this.active) return;
    this.enter(key);
  }

  enter(key) {
    const factory = FACTORIES[key];
    if (!factory) return;
    const player = this.campusView.api.player;
    this._return = computeReturn(player.position.clone(), player.heading);
    player.releasePointer?.();

    this.active = factory({ domElement: this.domElement });
    this.onViewChange(this.active);
    events.emit('interior:enter', key);
    try {
      const p = this.domElement.requestPointerLock?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      /* needs a user gesture */
    }
  }

  exit() {
    if (!this.active) return;
    this.active.dispose();
    this.active = null;
    this.onViewChange(this.campusView);
    if (this._return) {
      this.campusView.api.player.teleport(this._return.returnPos, this._return.returnHeading);
    }
    events.emit('interior:left');
  }

  dispose() {
    this.active?.dispose();
    this.active = null;
  }
}
