import { HUD } from './HUD.js';
import { Minimap } from './Minimap.js';
import { InfoPanel } from './InfoPanel.js';
import { Directory } from './Directory.js';
import { SettingsPanel } from './SettingsPanel.js';
import { Credits } from './Credits.js';
import { Interaction } from '../player/Interaction.js';
import { Teleport } from '../player/Teleport.js';
import { TourPanel } from './TourPanel.js';
import { CameraRig } from '../tour/CameraRig.js';
import { resolveTour } from '../tour/route.js';
import { events } from '../core/events.js';

// Owns all in-world UI and wires it to the campus scene + player.
export class GameUI {
  constructor({ root, fadeEl, api, onEnterInterior }) {
    this.api = api;
    this.onEnterInterior = onEnterInterior;
    const campus = api.campus;

    this.hud = new HUD(root).mount();
    this.hud.setCampus(campus);

    this.teleport = new Teleport({ player: api.player, overlayEl: fadeEl });

    this.minimap = new Minimap({
      root,
      campus,
      onPoiClick: (poi) => this.#goToPoi(poi),
    }).mount();

    this.infoPanel = new InfoPanel(root);

    const landmarkNames = (api.landmarks?.pickables ?? [])
      .map((o) => o.userData?.landmark)
      .filter(Boolean);
    this.directory = new Directory({
      root,
      campus,
      landmarks: landmarkNames,
      onPick: (r) => this.#goToDirectoryPick(r),
    });

    this.settingsPanel = new SettingsPanel(root);
    this.credits = new Credits(root);

    this.tourPanel = new TourPanel(root);
    this.rig = new CameraRig({ camera: api.camera });
    this._tourActive = false;

    // interaction raycasting
    const pickables = [
      ...(api.buildings?.pickables ?? []),
      ...(api.landmarks?.pickables ?? []),
    ];
    this.interaction = new Interaction({
      camera: api.camera,
      pickables,
      maxDist: 45,
      onHover: (obj) => this.#onHover(obj),
      onSelect: (obj) => this.#onSelect(obj),
    });

    this._tip = null;
    this.#bindKeys();
    this.#bindEvents();
  }

  #bindKeys() {
    this._onKey = (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyM') this.minimap.toggleFull();
      if (e.code === 'KeyB') {
        this.directory.isOpen ? this.directory.close() : this.#openExclusive(this.directory);
      }
    };
    window.addEventListener('keydown', this._onKey);
  }

  #openExclusive(panel) {
    this.closePanels();
    this.api.player.releasePointer?.();
    panel.open();
  }

  #bindEvents() {
    this._h = {
      'ui:directory': () => this.#openExclusive(this.directory),
      'ui:settings': () => this.#openExclusive(this.settingsPanel),
      'ui:credits': () => this.#openExclusive(this.credits),
      'tour:start': () => this.startTour(),
    };
    for (const [k, fn] of Object.entries(this._h)) events.on(k, fn);
  }

  startTour() {
    if (this._tourActive) return;
    this.closePanels();
    this.api.player.releasePointer?.();
    this.api.player.setMode('tour');
    this._tourActive = true;
    this.hud.node.hidden = true;
    this.minimap.node.hidden = true;

    const stops = resolveTour(this.api.campus, this.api.buildings);
    this.tourPanel.bind(this.rig, stops);
    this.rig.play(stops, {
      onStop: (i, stop) => this.tourPanel.show(i, stop),
      onEnd: () => this.endTour(),
    });
  }

  endTour() {
    if (!this._tourActive) return;
    this._tourActive = false;
    this.rig.stop();
    this.tourPanel.hide();
    this.hud.node.hidden = false;
    this.minimap.node.hidden = false;
    // drop the player where the camera ended, on the ground
    const c = this.api.camera.position;
    this.api.player.setMode('walk');
    this.api.player.teleport({ x: c.x, y: 1.7, z: c.z }, this.api.player.heading);
  }

  get tourActive() {
    return this._tourActive;
  }

  #onHover(obj) {
    const name = obj?.userData?.landmark?.name ?? this.#recordFor(obj)?.name;
    this.hud.setHint?.(name ? `Look at: ${name}` : '');
  }

  #recordFor(obj) {
    if (!obj) return null;
    const id = obj.userData?.buildingId;
    if (id && this.api.buildings?.byId.has(id)) return this.api.buildings.byId.get(id).record;
    if (obj.userData?.landmark) {
      return {
        name: obj.userData.landmark.name,
        category: obj.userData.landmark.kind === 'temple' ? 'amenity' : 'amenity',
        meta: { description: this.#landmarkBlurb(obj.userData.landmark) },
      };
    }
    return null;
  }

  #landmarkBlurb(l) {
    if (l.kind === 'gate') return 'The main entrance to the SVNIT campus from Dumas Road.';
    if (l.kind === 'temple') return 'A small campus shrine — a quiet corner of the campus.';
    if (l.kind === 'memorial') {
      return 'Statue of Sardar Vallabhbhai Patel, the "Iron Man of India", after whom the institute is named.';
    }
    return '';
  }

  #onSelect(obj) {
    const record = this.#recordFor(obj);
    if (!record) return;
    this.api.player.releasePointer?.();
    this.infoPanel.open(record, { onEnterInterior: this.onEnterInterior });
  }

  async #goToPoi(poi) {
    const centre = {
      x: (this.api.campus.bounds.minX + this.api.campus.bounds.maxX) / 2,
      z: (this.api.campus.bounds.minZ + this.api.campus.bounds.maxZ) / 2,
    };
    await this.teleport.go({ x: poi.x, z: poi.z }, centre);
  }

  async #goToDirectoryPick(r) {
    if (r.kind === 'landmark') {
      const obj = (this.api.landmarks?.pickables ?? []).find((o) => o.userData?.landmark?.name === r.name);
      if (obj) {
        const p = obj.getWorldPosition({ x: 0, y: 0, z: 0, set() {}, copy() {} }) ?? obj.position;
        await this.teleport.go({ x: p.x ?? obj.position.x, z: p.z ?? obj.position.z });
      }
      return;
    }
    const entry = this.api.buildings?.byId.get(r.ref.id);
    const door = entry?.doorWorldPos;
    if (door) {
      await this.teleport.go(
        { x: door.x, z: door.z },
        { x: r.ref.centroid[0], z: r.ref.centroid[1] },
      );
    } else {
      await this.teleport.go({ x: r.ref.centroid[0], z: r.ref.centroid[1] });
    }
  }

  setInteriorMode(inside) {
    this._interior = inside;
    this.hud.node.hidden = inside;
    this.minimap.node.hidden = inside;
    if (inside) this.closePanels();
  }

  update(dt) {
    if (this._interior) return;
    if (this._tourActive) {
      this.rig.update(dt);
      return;
    }
    this.interaction.update();
    this.hud.update({ position: this.api.player.position, heading: this.api.player.heading });
    this.minimap.update({ position: this.api.player.position, heading: this.api.player.heading });
  }

  anyPanelOpen() {
    return (
      this.infoPanel.isOpen ||
      this.directory.isOpen ||
      this.settingsPanel.isOpen ||
      this.credits.isOpen
    );
  }

  closePanels() {
    this.infoPanel.close();
    this.directory.close();
    this.settingsPanel.close();
    this.credits.close();
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    for (const [k, fn] of Object.entries(this._h)) events.off(k, fn);
    this.interaction.dispose();
    this.hud.dispose();
    this.minimap.dispose();
    this.infoPanel.dispose();
    this.directory.dispose();
    this.settingsPanel.dispose();
    this.credits.dispose();
  }
}
