// Lógica de combate de las 7 defensas nuevas: Lancero, Monje, Ingeniero, Maestro de asedio, Rey Midas, Nigromante y Druida.
// Se mezcla en GameScene.prototype (Object.assign), por eso todos los métodos usan `this` = la escena.
// Los textos y costes están en src/data/towers2.js.
import { W, MAP_Y, PANEL_Y } from './config.js';
import { playFx } from './art.js';
import { DTYPES } from './data/damage.js';

const D = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
// posición de las torretas de ballesta respecto al Ingeniero
const TURRET_POS = [[0, 50], [-50, 12], [50, 12]]; // 1ª abajo, 2ª y 3ª a los lados (arriba queda vacío); separadas del Ingeniero
export const NEW_TYPES = ['lancero', 'monje', 'ingeniero', 'asedio', 'midas', 'nigromante', 'druida'];

export const NewTowers = {
  // ------------------------------------------------------------------ ESTADÍSTICAS
  newStats(t) {
    const { A, B, C } = t.ups;
    const o = {};
    switch (t.type) {
      case 'lancero':
        o.dmg = 80;
        o.interval = 3;
        o.range = 135 * (A >= 1 ? 1.2 : 1);
        o.reach = o.range * (B >= 1 ? 2 : 1); // Jabalinas: llega el doble de lejos con el mismo rango
        o.anchor = A >= 2;
        o.mark = A >= 3;
        o.wall = A >= 4;
        o.recover = B >= 2;
        o.fan = B >= 3;
        o.steel = C >= 1;
        o.duel = C >= 2;
        o.impulse = C >= 3;
        o.king = C >= 4;
        break;
      case 'monje':
        o.dmg = 7;
        o.interval = 1.1;
        o.range = 170;
        o.auraR = 150;
        o.fervor = A >= 1;
        o.crown = A >= 2;
        o.sanct = A >= 3;
        o.judgement = A >= 4; // Juicio divino: automático cada 30 s
        o.punish = B >= 1;
        o.tithe = B >= 2; // Diezmo de caridad
        o.mercy = B >= 3;
        o.silence = C >= 1;
        o.stunDur = C >= 2 ? 2 : 0.5;
        o.exorcism = C >= 3;
        o.plague = C >= 4;
        break;
      case 'ingeniero':
        o.dmg = 12;
        o.interval = 1.3;
        o.range = 140;
        o.traps = A >= 1 ? (A >= 3 ? 6 : 3) : 0; // cepos (aturden 5 s)
        o.mines = A >= 2 ? 3 : 0; // Minas: 3 minas que se reponen 6 s después de explotar
        o.rearm = A >= 3;
        o.cross = A >= 4;
        o.turrets = (B >= 1 ? 1 : 0) + (B >= 2 ? 2 : 0); // ya no empieza con torreta: nivel 1 = 1 torreta; Batería = +2 (3 en total)
        o.turretFx = B >= 3; // Torretas especiales
        o.mover = C >= 1; // Taller móvil
        o.gear = C >= 2; // Engranaje
        o.scrap = C >= 3; // Chatarrero
        o.golem = C >= 4;
        break;
      case 'asedio':
        o.dmg = 120 * (A >= 1 ? 1.4 : 1);
        o.interval = 2.8;
        o.range = 340 * (C >= 1 ? 1.25 : 1);
        o.minR = 85;
        o.blast = 50;
        o.bounce1 = A >= 2;
        o.frag = A >= 3;
        o.triple = A >= 4; // Triple-cañón
        o.tar = B >= 1;
        o.barrel = B >= 2;
        o.heat = B >= 3;
        o.lead = C >= 2;
        o.antiarm = C >= 3;
        o.grace = C >= 4;
        break;
      case 'midas':
        o.dmg = C >= 1 ? 14 : 5;
        o.interval = C >= 1 ? 1.5 : 1.4;
        o.range = 175;
        o.touch = A >= 1;
        o.fragile = A >= 2;
        o.statue = A >= 3;
        o.trueMidas = A >= 4;
        o.tribute = B >= 1; // Tributo: mejoras cercanas -10%
        o.collect = B >= 2; // Recaudador: inventario propio
        o.interest = B >= 3;
        o.coin = C >= 1;
        o.twin = C >= 2; // dos monedas
        o.invest = C >= 3; // Inversión armamentística
        o.chest = C >= 4;
        break;
      case 'nigromante':
        o.dmg = 95;
        o.interval = 3.2;
        o.range = 190;
        o.raise = A >= 1;
        o.unstable = A >= 2;
        o.horde = A >= 3;
        o.lord = A >= 4;
        o.curse = B >= 1;
        o.contagion = B >= 2;
        o.pact = B >= 3; // Pacto de sangre: -3% de vida máxima por ataque a los malditos
        o.bond = C >= 1;
        o.soulPow = C >= 2;
        o.soulRay = C >= 3; // con 5 almas o más ataca con un rayo de energía oscura
        o.soulStorm = C >= 4;
        o.soulMax = C >= 4 ? 20 : 10;
        break;
      case 'druida':
        o.dmg = 11;
        o.interval = 1.2;
        o.range = 170;
        o.roots = A >= 1;
        o.thorns = A >= 2;
        o.grove = A >= 3;
        o.ent = A >= 4;
        o.wolves = B >= 1 ? (B >= 2 ? 2 : 1) : 0;
        o.howl = B >= 3;
        o.splinter = C >= 1;
        o.weak = C >= 2;
        o.mystic = C >= 3;
        o.focus = C >= 4;
        break;
    }
    return o;
  },

  // ------------------------------------------------------------------ AUXILIARES
  // Inmoviliza a un zombi. Los férreos (inmunes a efectos de velocidad) no se inmovilizan; los jefes, como mucho 1 s.
  ntImmobilize(e, dur, bossCap = 1, force = false) {
    if (e.dead || e.def.noSlow || e.def.noStun || (e.def.mini && !force)) return false; // inmunes al aturdimiento; los minijefes solo con algunas mejoras
    const d = e.def.boss || e.def.mini ? Math.min(dur, bossCap) : dur;
    e.frozenUntil = Math.max(e.frozenUntil || 0, this.now + d);
    return true;
  },

  ntMark(e, dur, mult) {
    e.markUntil = this.now + dur;
    e.markMult = mult;
  },

  ntShred(e, dur, amt) {
    if (!(e.shredUntil > this.now) || (e.shredAmt || 0) <= amt) e.shredAmt = amt;
    e.shredUntil = Math.max(e.shredUntil || 0, this.now + dur);
  },

  ntGild(e, m) {
    if (e.dead) return;
    const s = this.stats(m);
    e.goldUntil = this.now + 600;
    e.goldBy = m; // para el contador de oro recaudado del Rey Midas
    e.goldMult = 1.3; // dorado: +30% de suministros
    if (s.fragile) this.ntShred(e, 600, 0.2);
    if (s.statue && e.def.mini) this.ntImmobilize(e, 5, 5, true); // Estatua: el toque aturde 5 s a los minijefes
  },

  ntCurse(e, t) {
    if (e.dead) return;
    e.curseUntil = this.now + 8;
    e.curser = t;
    this.ntShred(e, 8, 0.1); // el maldito recibe un 10% más de daño
  },

  // Un nigromante golpea a un zombi: a los 3 ataques lo maldice; con Pacto de sangre los malditos pierden un 3% de su vida máxima por ataque
  ntCurseHit(e, t, s) {
    if (e.dead || !s.curse) return;
    if (e.curseUntil > this.now) {
      if (s.pact) this.damage(e, e.maxHp * 0.03, { src: t, ignoreResist: true });
      e.curseUntil = this.now + 8;
      return;
    }
    e.curseHits = (e.curseHits || 0) + 1;
    if (e.curseHits >= 3) {
      e.curseHits = 0;
      this.ntCurse(e, t);
    }
  },

  // punto de un recorrido más cercano a (x, y), avanzado `adv` px hacia el castillo
  ntAlong(x, y, adv) {
    let best = null;
    let bd = 1e9;
    this.routes.forEach((R, ri) => {
      for (let d = 0; d <= R.len; d += 14) {
        const p = this.posAt(d, 0, ri);
        const dd = D(x, y, p.x, p.y);
        if (dd < bd) {
          bd = dd;
          best = { ri, d };
        }
      }
    });
    if (!best) return { x, y };
    return this.posAt(Math.min(this.routes[best.ri].len, best.d + adv), 0, best.ri);
  },

  // posición futura de un zombi dentro de `sec` segundos (para apuntar por anticipado)
  ntLead(e, sec) {
    const sp = e.def.speed * (e.spMult || 1) * (e.slowUntil > this.now ? 1 - e.slow : 1);
    return this.posAt(Math.min(this.routes[e.route].len, e.dist + sp * sec), e.lane, e.route);
  },

  // zombis dentro de una línea (origen, ángulo, longitud, ancho), ordenados de cerca a lejos
  ntLine(x, y, ang, len, width) {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const out = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const along = dx * ca + dy * sa;
      if (along < -10 || along > len) continue;
      const perp = Math.abs(-dx * sa + dy * ca);
      if (perp <= width + e.def.size * 0.3) out.push({ e, along });
    }
    return out.sort((p, q) => p.along - q.along).map((p) => p.e);
  },

  ntSplash(x, y, r, dmg, p = {}) {
    this.addRing(x, y, r, p.color || 0xff8c42, 0.3);
    playFx(this, 'fx_explosion1', x, y, Math.max(0.5, r / 48));
    for (const e of this.enemiesNear(x, y, r)) {
      if (!this.canHit(p.src, e)) continue;
      let d = dmg;
      if (p.heat && e.burnUntil > this.now) d *= 1.5;
      if (p.tar) {
        e.burnUntil = this.now + 8;
        e.burnDps = Math.max(e.burnDps, 6);
        e.burnSrc = p.src;
      }
      this.damage(e, d, { src: p.src, resMul: p.resMul, turret: p.turret });
      if (p.stun) this.ntImmobilize(e, p.stun, 1, true); // el Golpe de gracia sí aturde a minijefes (1 s)
    }
  },

  // ------------------------------------------------------------------ AURAS Y EFECTOS PASIVOS (cada fotograma)
  updateAuras(dt) {
    for (const o of this.towers) {
      o.auraSpeed = 1;
      o.auraDmg = 1;
      o.rangeMul = 1;
    }
    const soul = Math.min(40, this.towers.filter((x) => x.type === 'nigromante' && x.ups.C >= 1).length);
    for (const m of this.towers) {
      if (m.type === 'monje' && m.ups.A >= 1) {
        const s = this.stats(m);
        for (const o of this.towers) {
          if (o === m || D(m.x, m.y, o.x, o.y) > s.auraR) continue;
          if (s.fervor) o.auraSpeed = Math.max(o.auraSpeed, 1.1);
          if (s.crown) o.auraDmg = Math.max(o.auraDmg, 1.1);
        }
        if (s.sanct) {
          m.sanctT = (m.sanctT || 0) - dt;
          if (m.sanctT <= 0) {
            m.sanctT = 0.3;
            for (const e of this.enemiesNear(m.x, m.y, s.auraR)) this.applySlow(e, 0.15, 0.5);
          }
        }
      }
      if (m.type === 'ingeniero' && m.ups.C >= 2) {
        for (const o of this.towers) if (D(m.x, m.y, o.x, o.y) <= 200) o.rangeMul = Math.max(o.rangeMul, 1.15);
      }
      if (m.type === 'midas' && m.ups.C >= 3) {
        let spent = 0;
        const around = this.towers.filter((o) => o !== m && D(m.x, m.y, o.x, o.y) <= 150);
        around.forEach((o) => (spent += o.upgSpent || 0));
        const boost = Math.min(2, 0.1 * Math.floor(spent / 100));
        around.forEach((o) => (o.auraDmg *= 1 + boost));
      }
      // Aullido del Druida: mientras haya lobos, las defensas cercanas disparan un 15% más rápido
      if (m.type === 'druida' && m.ups.B >= 3 && this.allies.some((a) => a.kind === 'wolf' && a.owner === m)) {
        for (const o of this.towers) if (o !== m && D(m.x, m.y, o.x, o.y) <= 200) o.auraSpeed = Math.max(o.auraSpeed, 1.15);
      }
      if (m.type === 'nigromante' && m.ups.C >= 2) m.auraDmg *= 1 + 0.1 * soul;
    }
  },

  // ------------------------------------------------------------------ PASIVAS POR DEFENSA (antes del ataque)
  ntUpdate(t, dt) {
    const s = this.stats(t);
    switch (t.type) {
      case 'lancero':
        if (s.wall) {
          t.wallT = (t.wallT || 0) + dt;
          if (t.wallT >= 10) {
            const tg = this.pickTarget(t, s.range);
            if (tg) {
              t.wallT = 0;
              const p = this.ntAlong(tg.x, tg.y, 30);
              this.zones.push({ x: p.x, y: p.y, r: 44, life: 6, tick: 0, dps: s.dmg * 0.8, slow: 0.4, pike: true, src: t });
              this.addRing(p.x, p.y, 44, 0xbcaaa4, 0.5);
            }
          }
        }
        break;
      case 'monje':
        if (s.silence) {
          t.stunT = (t.stunT || 0) + dt;
          if (t.stunT >= 4) {
            const tg = this.pickTarget(t, s.range);
            if (tg) {
              t.stunT = 0;
              if (this.ntImmobilize(tg, s.stunDur, 1)) {
                this.addRing(tg.x, tg.y, 30, 0xfff59d, 0.4);
                // Plaga bendita: aturde también hasta 3 enemigos cercanos
                if (s.plague) {
                  this.enemies
                    .filter((o) => o !== tg && !o.dead && Math.hypot(o.x - tg.x, o.y - tg.y) <= 110)
                    .sort((a, b) => Math.hypot(a.x - tg.x, a.y - tg.y) - Math.hypot(b.x - tg.x, b.y - tg.y))
                    .slice(0, 3)
                    .forEach((o) => {
                      if (this.ntImmobilize(o, s.stunDur, 1)) this.addRing(o.x, o.y, 24, 0xfff59d, 0.35);
                    });
                }
              }
            }
          }
        }
        if (s.judgement) {
          t.judgeT = (t.judgeT || 0) + dt;
          if (t.judgeT >= 30 && this.enemies.some((e) => !e.dead)) {
            t.judgeT = 0;
            this.ntJudgement(t, s);
            this.floatText(t.x, t.y - 44, '⚡ Juicio divino', '#fff59d');
          }
        }
        if (s.exorcism) {
          t.exoT = (t.exoT || 0) - dt;
          if (t.exoT <= 0) {
            t.exoT = 0.25;
            for (const e of this.enemiesNear(t.x, t.y, s.range)) {
              if (e.def.boss || e.def.mini || e.hp / e.maxHp >= 0.15) continue;
              this.addRing(e.x, e.y, 60, 0xfff59d, 0.4);
              const ex = e.x;
              const ey = e.y;
              this.damage(e, e.hp + 1, { src: t, ignoreResist: true });
              this.ntSplash(ex, ey, 60, 40, { src: t, color: 0xfff59d });
            }
          }
        }
        break;
      case 'ingeniero':
        this.ntEngineer(t, s, dt);
        break;
      case 'asedio':
        // Golpe de gracia: cada 8 s, obús x10 al zombi con más vida a su alcance (lo aturde 5 s)
        if (s.grace) {
          t.graceT = (t.graceT || 0) + dt;
          if (t.graceT >= 8) {
            const list = this.targetsIn(t, s.range).filter((e) => D(t.x, t.y, e.x, e.y) >= s.minR);
            if (list.length) {
              t.graceT = 0;
              const top = list.reduce((b, e) => (e.hp > b.hp ? e : b), list[0]);
              this.ntRock(t, s, top, { dmg: s.dmg * 10, grace: true });
            }
          }
        }
        break;
      case 'midas':
        if (s.touch) {
          t.touchT = (t.touchT || 0) + dt;
          if (t.touchT >= 5) {
            const list = this.targetsIn(t, s.range).filter((e) => !(e.goldUntil > this.now) && (!e.def.mini || s.statue));
            if (list.length) {
              t.touchT = 0;
              this.ntGild(list[0], t);
              this.addRing(list[0].x, list[0].y, 34, 0xffd700, 0.5);
            }
          }
        }
        break;
      case 'nigromante':
        if (s.soulRay || s.soulStorm) this.ntSouls(t, s);
        break;
      case 'druida':
        this.ntDruid(t, s, dt);
        break;
      default:
        break;
    }
  },

  // ------------------------------------------------------------------ DRUIDA: raíces, lobos y ent
  ntDruid(t, s, dt) {
    const reach = s.range + 20;
    // raíces: cada 6 s inmovilizan 2 s a los 3 zombis más adelantados
    if (s.roots) {
      t.rootT = (t.rootT || 0) + dt;
      if (t.rootT >= 6) {
        const list = this.enemies.filter((e) => !e.dead && D(t.x, t.y, e.x, e.y) <= reach).sort((a, b) => b.dist - a.dist).slice(0, 3);
        if (list.length) {
          t.rootT = 0;
          t.bushes = t.bushes || [];
          list.forEach((e) => {
            if (!this.ntImmobilize(e, 2, 1)) return;
            e.rootUntil = this.now + (e.def.boss ? 1 : 2);
            e.rootSrc = t;
            this.addRing(e.x, e.y, 30, 0x7cb342, 0.5);
            if (s.grove) t.bushes.push({ x: e.x, y: e.y, until: this.now + 8 });
          });
        }
      }
    }
    // arbustos del bosquecillo: ralentizan un 25%
    if (t.bushes && t.bushes.length) {
      t.bushes = t.bushes.filter((b) => b.until > this.now);
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (t.bushes.some((b) => D(b.x, b.y, e.x, e.y) <= 40)) this.applySlow(e, 0.25, 0.3);
      }
    }
    // lobos: cada 16 s sale un lobo (dos con Manada) que dura 8 s
    if (s.wolves) {
      t.wolfT = (t.wolfT || 0) - dt;
      const mine = this.allies.filter((a) => a.kind === 'wolf' && a.owner === t).length;
      if (t.wolfT <= 0 && mine === 0 && this.enemies.some((e) => !e.dead)) {
        t.wolfT = 16;
        for (let i = 0; i < s.wolves; i++) this.allies.push({ kind: 'wolf', owner: t, life: 8, cd: 0.2, x: t.x + i * 14, y: t.y + 12, face: 1 });
        this.floatText(t.x, t.y - 44, '🐺 ¡Lobo!', '#aed581');
      }
    }
    // árbol ancestral: un ent que guarda el camino durante toda la oleada
    if (s.ent && this.waveRunning && !this.allies.some((a) => a.kind === 'ent' && a.owner === t)) {
      const p = this.ntAlong(t.x, t.y, 0);
      this.allies.push({ kind: 'ent', owner: t, life: 9999, cd: 0.6, x: p.x, y: p.y, txt: this.ntGolemSprite(0x8bc34a, 2.0) });
      this.floatText(t.x, t.y - 44, '🌳 Árbol ancestral', '#aed581');
    }
  },

  // recaudar el inventario del Rey Midas (botón de su panel)
  ntCollect(t) {
    const v = Math.floor(t.vault || 0);
    if (v <= 0) return 0;
    t.vault -= v;
    this.supplies += v;
    t.goldEarned = (t.goldEarned || 0) + v;
    this.floatText(t.x, t.y - 44, `+${v} 🛠 recaudado`, '#ffd700');
    return v;
  },

  // ------------------------------------------------------------------ ATAQUES
  ntAttack(t, s) {
    switch (t.type) {
      case 'lancero':
        return this.ntLancer(t, s);
      case 'monje': {
        const tg = this.pickTarget(t, s.range);
        if (!tg) return;
        let d = s.dmg;
        if (s.punish && tg.hp < tg.maxHp) d *= 1.5;
        this.effects.push({ kind: 'bolt', x: t.x, y: t.y - 10, x2: tg.x, y2: tg.y, life: 0.25, max: 0.25, color: 0xfff59d });
        this.damage(tg, d, { src: t, dtype: 'luz' });
        this.towerAnim(t, tg);
        t.cd = s.interval;
        return;
      }
      case 'ingeniero': {
        const tg = this.pickTarget(t, s.range);
        if (!tg) return;
        const k = this.buffs.overload > 0 ? 3 : 1;
        this.effects.push({ kind: 'bolt', x: t.x, y: t.y - 6, x2: tg.x, y2: tg.y, life: 0.2, max: 0.2, color: 0xbdbdbd });
        this.damage(tg, s.dmg, { src: t });
        this.towerAnim(t, tg);
        t.cd = s.interval / k;
        return;
      }
      case 'asedio':
        return this.ntSiege(t, s);
      case 'midas':
        return this.ntMidasAttack(t, s);
      case 'druida':
        return this.ntDruidAttack(t, s);
      case 'nigromante': {
        const tg = this.pickTarget(t, s.range);
        if (!tg) return;
        if (s.soulRay && (t.souls || 0) >= 5) {
          // Rayo de almas: un rayo de energía oscura que atraviesa a todos los de la línea (mucho más daño)
          const ang = Math.atan2(tg.y - t.y, tg.x - t.x);
          this.ntLine(t.x, t.y, ang, s.range + 60, 16).forEach((e) => {
            this.damage(e, s.dmg * 3, { src: t, dtype: 'oscuridad' });
            this.ntCurseHit(e, t, s);
          });
          this.effects.push({ kind: 'darkbeam', x: t.x, y: t.y - 12, ang, len: s.range + 60, life: 0.35, max: 0.35 });
        } else {
          // bola de sangre: sale despacio y acelera rápido hasta el zombi
          this.projectiles.push({ kind: 'blood', x: t.x, y: t.y - 14, target: tg, lx: tg.x, ly: tg.y, v: 60, dmg: s.dmg, stats: s, src: t, trail: [] });
        }
        this.towerAnim(t, tg);
        t.cd = s.interval;
        return;
      }
      default:
        return;
    }
  },

  // ---- Lancero: estocada en línea que atraviesa a todos
  ntLancer(t, s) {
    const target = this.pickTarget(t, s.range);
    if (!target) return;
    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    t.throws = (t.throws || 0) + 1;
    const combo = s.impulse ? t.combo || 0 : 0;
    t.combo = 0;
    const reach = s.reach * (1 + 0.2 * combo);
    const mul = combo > 0 ? 3 : 1;
    const fan = s.fan && t.throws % 4 === 0;
    const angles = fan ? [-0.5, -0.25, 0, 0.25, 0.5].map((d) => ang + d) : [ang];
    // el zombi con más vida a tiro (Duelo)
    let duel = null;
    if (s.duel) for (const e of this.targetsIn(t, s.range)) if (!duel || e.hp > duel.hp) duel = e;
    // animación: la lanza sale disparada hasta el límite del alcance, golpea en la punta y vuelve a la mano
    const mid = Math.floor(angles.length / 2);
    angles.forEach((a, i) => {
      this.effects.push({ kind: 'spear', x: t.x, y: t.y - 6, ang: a, len: reach, life: 0.36, max: 0.36, long: s.reach > s.range, color: s.king ? 0xffd54f : 0xeceff1 });
      this.timers.push({
        t: 0.14, // la punta llega al final: aquí hace daño
        fn: () => {
          if (this.towers.includes(t)) this.ntLanceStrike(t, s, a, reach, mul, { duel, anchor: i === mid });
        },
      });
      if (s.recover) {
        // al volver, la lanza golpea una segunda vez a los que atraviesa
        this.timers.push({
          t: 0.27,
          fn: () => {
            if (this.towers.includes(t)) this.ntLanceStrike(t, s, a, reach, mul * 0.8, { duel: null, anchor: false });
          },
        });
      }
    });
    this.towerAnim(t, target);
    t.cd = s.interval;
  },

  ntLanceStrike(t, s, ang, reach, mul, o) {
    const hits = this.ntLine(t.x, t.y, ang, reach, 16);
    if (!hits.length) return;
    const head = hits.reduce((b, e) => (e.dist > b.dist ? e : b), hits[0]); // el que va en cabeza (más avanzado)
    hits.forEach((e, i) => {
      let d = s.dmg * mul;
      if (s.steel && e === head) d *= 1.4;
      if (o.duel && e === o.duel) d *= 1.5;
      if (s.king && (e.def.resist > 0 || e.def.boss || e.def.mini)) d *= 3; // con armadura, jefes y minijefes
      this.damage(e, d, { src: t });
      // Clavar lanza: ancla al primero que atraviesa (máx. 4 veces por zombi)
      if (s.anchor && o.anchor && i === 0 && !e.dead && (e.anchors || 0) < 4) {
        if (this.ntImmobilize(e, 3, 1)) {
          e.anchors = (e.anchors || 0) + 1;
          if (s.mark) this.ntMark(e, 4, 1.4); // Empalamiento
        }
      }
    });
  },

  // ---- Maestro de asedio: roca parabólica con zona muerta
  ntSiege(t, s) {
    const list = this.targetsIn(t, s.range).filter((e) => D(t.x, t.y, e.x, e.y) >= s.minR);
    if (!list.length) return;
    t.shots = (t.shots || 0) + 1;
    const frag = s.frag && t.shots % 4 === 0;
    const barrel = s.barrel && t.shots % 3 === 0; // cada 3er tiro
    const target = list[0];
    this.ntRock(t, s, target, { dmg: s.dmg, frag, barrel });
    // Triple-cañón: 2 proyectiles más a enemigos aleatorios a su alcance
    if (s.triple) {
      for (let i = 0; i < 2; i++) {
        const r = list[Math.floor(Math.random() * list.length)];
        this.timers.push({ t: 0.12 * (i + 1), fn: () => this.towers.includes(t) && !r.dead && this.ntRock(t, s, r, { dmg: s.dmg }) });
      }
    }
    this.towerAnim(t, target);
    t.cd = s.interval;
  },

  ntRock(t, s, target, o) {
    const flight = o.fast ? 0.7 : 0.9;
    const aim = s.lead ? this.ntLead(target, flight) : { x: target.x, y: target.y };
    this.projectiles.push({
      kind: 'rock',
      sx: t.x,
      sy: t.y,
      tx: aim.x,
      ty: aim.y,
      x: t.x,
      y: t.y,
      t: 0,
      dur: flight,
      dmg: o.dmg,
      blast: s.blast * (o.barrel ? 2 : 1),
      frag: o.frag,
      grace: o.grace,
      bounce: !o.frag && s.bounce1, // Piedras rebotadoras: 1 rebote hacia el enemigo más cercano
      tar: s.tar,
      heat: s.heat,
      resMul: s.antiarm ? 0.5 : undefined,
      barrel: o.barrel,
      src: t,
    });
  },

  ntRockLand(p) {
    const base = { src: p.src, tar: p.tar, heat: p.heat, resMul: p.resMul, color: p.barrel ? 0xff7043 : 0xa1887f };
    this.ntSplash(p.tx, p.ty, p.blast, p.dmg, { ...base, stun: p.grace ? 5 : 0 });
    if (p.frag) {
      // Fragmentación: 8 explosiones en anillo alrededor del impacto
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const fx = p.tx + Math.cos(a) * 75;
        const fy = p.ty + Math.sin(a) * 75;
        this.timers.push({ t: 0.12 + i * 0.03, fn: () => this.ntSplash(fx, fy, 30, p.dmg * 0.5, { ...base }) });
      }
    }
    if (p.bounce) {
      // rebota hacia el enemigo más cercano al impacto, solo si está cerca (unos 3 héroes de distancia, 150 px)
      let near = null;
      let bd = 150;
      for (const e of this.enemies) {
        if (e.dead || !this.canHit(p.src, e)) continue;
        const d = D(p.tx, p.ty, e.x, e.y);
        if (d > p.blast * 0.6 && d < bd) {
          bd = d;
          near = e;
        }
      }
      if (near) {
        const nx = near.x, ny = near.y;
        this.timers.push({ t: 0.35, fn: () => this.ntSplash(nx, ny, p.blast * 0.8, p.dmg * 0.7, { ...base }) });
      }
    }
  },

  // ---- Druida: disparo de hojas; cada 3º es una astilla afilada (x2, con crítico opcional)
  ntDruidAttack(t, s) {
    let tg = this.pickTarget(t, s.range);
    if (!tg) return;
    const mini = s.focus ? this.targetsIn(t, s.range).find((e) => e.def.mini) : null;
    if (mini) tg = mini;
    t.thornN = (t.thornN || 0) + 1;
    const sharp = s.mystic || (s.splinter && t.thornN % 3 === 0);
    let d = s.dmg;
    let col = 0x9ccc65;
    if (sharp) {
      d *= 2;
      col = 0xdce775;
      if (Math.random() < (s.weak ? 0.5 : 0)) {
        d *= 2;
        this.critText(tg);
      }
    }
    const shots = mini ? 4 : 1; // Foco arcano: +3 proyectiles contra el minijefe
    for (let i = 0; i < shots; i++) {
      const fire = () => {
        if (!this.towers.includes(t) || tg.dead) return;
        this.effects.push({ kind: 'bolt', x: t.x, y: t.y - 10, x2: tg.x, y2: tg.y, life: 0.2, max: 0.2, color: col });
        this.damage(tg, d, { src: t });
      };
      if (i === 0) fire();
      else this.timers.push({ t: 0.07 * i, fn: fire });
    }
    this.towerAnim(t, tg);
    t.cd = s.interval;
  },

  // ---- Rey Midas: moneda (línea ida y vuelta) o rayo dorado
  ntMidasAttack(t, s) {
    const tg = this.pickTarget(t, s.range);
    if (!tg) return;
    if (!s.coin) {
      this.effects.push({ kind: 'bolt', x: t.x, y: t.y - 10, x2: tg.x, y2: tg.y, life: 0.25, max: 0.25, color: 0xffd700 });
      this.damage(tg, s.dmg, { src: t, ignoreResist: true });
    } else {
      const ang = Math.atan2(tg.y - t.y, tg.x - t.x);
      const reach = s.range * 1.1;
      const angs = s.twin ? [ang - 0.1, ang + 0.1] : [ang]; // Moneda de la suerte: dos monedas
      const strike = (mul, back) => {
        angs.forEach((a) => {
          this.ntLine(t.x, t.y, a, reach, 14).forEach((e) => this.damage(e, s.dmg * mul, { src: t }));
          this.effects.push({ kind: 'line', x: t.x, y: t.y - 6, ang: a, len: reach, color: back ? 0xffe082 : 0xffd700, life: 0.2, max: 0.2, w: 4 });
        });
      };
      strike(1, false);
      this.timers.push({ t: 0.4, fn: () => this.towers.includes(t) && strike(0.6, true) });
    }
    this.towerAnim(t, tg);
    t.cd = s.interval;
  },

  // ---- Nigromante: rayo y enjambre de almas (se cargan con las bajas)
  ntSouls(t, s) {
    if (!s.soulStorm) return; // el Rayo de almas no gasta almas: es el ataque normal con 5 o más
    const need = 20;
    if ((t.souls || 0) < need) return;
    const list = this.targetsIn(t, 420);
    if (!list.length) return;
    t.souls -= need;
    if (s.soulStorm) {
      const ordered = [...list].sort((a, b) => b.hp - a.hp).slice(0, 6);
      ordered.forEach((e, i) => {
        this.projectiles.push({ kind: 'wisp', x: t.x, y: t.y - 10, target: e, ang: -Math.PI / 2 + i, speed: 380, dmg: s.dmg * 5, src: t, life: 5 });
      });
      this.floatText(t.x, t.y - 44, '👻 Tormenta de almas', '#ce93d8');
    } else {
      const tg = list[0];
      const ang = Math.atan2(tg.y - t.y, tg.x - t.x);
      this.ntLine(t.x, t.y, ang, 460, 18).forEach((e) => this.damage(e, s.dmg * 6, { src: t, ignoreResist: true }));
      this.effects.push({ kind: 'line', x: t.x, y: t.y - 10, ang, len: 460, color: 0xce93d8, life: 0.3, max: 0.3, w: 8 });
      this.floatText(t.x, t.y - 44, '👻 Rayo de almas', '#ce93d8');
    }
  },

  // ------------------------------------------------------------------ INGENIERO: trampas, torretas y golem
  // punto al azar del camino cerca del Ingeniero (para cepos y minas)
  ntTrapSpot(t) {
    for (let i = 0; i < 25; i++) {
      const ri = Math.floor(Math.random() * this.routes.length);
      const d = Math.random() * this.routes[ri].len;
      const p = this.posAt(d, 0, ri);
      if (D(t.x, t.y, p.x, p.y) <= 190) return p;
    }
    return null;
  },

  ntEngineer(t, s, dt) {
    const k = this.buffs.overload > 0 ? 3 : 1;
    // cepos: aturden 5 s
    if (s.traps) {
      t.trapList = t.trapList || [];
      t.trapT = (t.trapT || 0) - dt;
      if (t.trapList.length < s.traps && t.trapT <= 0) {
        const p = this.ntTrapSpot(t);
        if (p) {
          t.trapList.push({ x: p.x, y: p.y, armed: true, rearm: 0 });
          t.trapT = 10;
        }
      }
      for (const tr of t.trapList) {
        if (!tr.armed) {
          tr.rearm -= dt;
          if (tr.rearm <= 0) tr.armed = true;
          continue;
        }
        const e = this.enemies.find((z) => !z.dead && !z.def.flying && D(z.x, z.y, tr.x, tr.y) < 24);
        if (!e) continue;
        tr.armed = false;
        tr.rearm = 10;
        tr.used = true;
        this.ntImmobilize(e, 3, 1);
        this.addRing(tr.x, tr.y, 26, 0xbdbdbd, 0.4);
      }
      if (!s.rearm) t.trapList = t.trapList.filter((tr) => !tr.used);
    }
    // minas: 3 en el camino; la que explota se vuelve a colocar 6 s después
    if (s.mines) {
      t.mineList = t.mineList || [];
      while (t.mineList.length < s.mines) {
        const p = this.ntTrapSpot(t);
        if (!p) break;
        t.mineList.push({ x: p.x, y: p.y, armed: true, rearm: 0 });
      }
      for (const m of t.mineList) {
        if (!m.armed) {
          m.rearm -= dt;
          if (m.rearm <= 0) {
            const p = this.ntTrapSpot(t);
            if (p) {
              m.x = p.x;
              m.y = p.y;
              m.armed = true;
            }
          }
          continue;
        }
        if (!this.enemies.some((z) => !z.dead && !z.def.flying && D(z.x, z.y, m.x, m.y) < 24)) continue;
        m.armed = false;
        m.rearm = 6;
        this.ntSplash(m.x, m.y, 62, 45 * k * this.tierBoost(t), { src: t, color: 0xff7043 });
        if (s.cross) {
          [[55, 0], [-55, 0], [0, 55], [0, -55]].forEach(([ox, oy], i) => {
            this.timers.push({ t: 0.12 + i * 0.04, fn: () => this.ntSplash(m.x + ox, m.y + oy, 40, 45 * k * 1.5 * this.tierBoost(t), { src: t, color: 0xffab40 }) });
          });
        }
      }
    }
    // torretas de ballesta (con Torretas especiales: 1 triple, 2 lanza-cepos, 3 fuego)
    if (s.turrets) {
      t.turretCd = t.turretCd || [0, 0, 0];
      t.turretAng = t.turretAng || [-Math.PI / 2, Math.PI, 0];
      const dmg = 9 * this.tierBoost(t) * (t.auraDmg || 1) * k;
      for (let i = 0; i < s.turrets; i++) {
        t.turretCd[i] -= dt;
        if (t.turretCd[i] > 0) continue;
        const [ox, oy] = TURRET_POS[i];
        const tx = t.x + ox;
        const ty = t.y + oy;
        const list = this.enemies.filter((e) => !e.dead && D(tx, ty, e.x, e.y) <= 215 && this.canHit(t, e)).sort(this.prioCmp(t));
        if (!list.length) continue;
        const e = list[Math.min(i, list.length - 1)];
        t.turretAng[i] = Math.atan2(e.y - ty, e.x - tx);
        let cdv = 1.1;
        const shoot = (en, d, color) => {
          this.effects.push({ kind: 'bolt', x: tx, y: ty - 8, x2: en.x, y2: en.y, life: 0.15, max: 0.15, color });
          this.damage(en, d, { src: t, turret: true });
        };
        if (s.turretFx && i === 0) {
          for (let j = 0; j < 3; j++) shoot(list[j % list.length], dmg * 0.8, 0xffe082); // triple disparo
        } else if (s.turretFx && i === 1) {
          cdv = 3; // más lenta: lanza un cepo que aturde 5 s
          shoot(e, dmg, 0xb0bec5);
          this.ntImmobilize(e, 5, 1);
        } else if (s.turretFx && i === 2) {
          shoot(e, dmg, 0xff7043); // disparo quemador
          e.burnUntil = this.now + 4;
          e.burnDps = Math.max(e.burnDps || 0, 8 * this.tierBoost(t));
          e.burnSrc = t;
        } else shoot(e, dmg, 0xffcc80);
        t.turretCd[i] = cdv / k;
      }
    }
    // golem de chatarra
    if (s.golem) {
      t.golemT = (t.golemT ?? 22) - dt;
      if (t.golemT <= 0 && this.waveRunning) {
        t.golemT = 40;
        // nace en el punto del camino más cercano al Ingeniero (dentro de su radio)
        let ri = 0, bd0 = 1e9, d0 = 0;
        this.routes.forEach((R, r) => {
          for (let d = 0; d <= R.len; d += 12) {
            const q = this.posAt(d, 0, r);
            const dd = D(t.x, t.y, q.x, q.y);
            if (dd < bd0) { bd0 = dd; ri = r; d0 = d; }
          }
        });
        const p0 = this.posAt(d0, 0, ri);
        this.allies.push({ kind: 'golem', owner: t, route: ri, dist: d0, life: 30, cd: 0, chains: [], x: p0.x, y: p0.y, txt: this.ntGolemSprite(0xffffff, 1.1) });
        this.floatText(t.x, t.y - 44, '🤖 Autómata', '#bdbdbd');
      }
    }
  },

  // ------------------------------------------------------------------ ALIADOS (golem, esbirros)
  ntAllies(dt) {
    const k = this.buffs.overload > 0 ? 3 : 1;
    for (const a of this.allies) {
      a.life -= dt;
      if (a.kind === 'golem') {
        const o = a.owner;
        let tg = null;
        let bdg = 1e9;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = D(a.x, a.y, e.x, e.y);
          if (d < bdg) {
            bdg = d;
            tg = e;
          }
        }
        if (tg) {
          if (tg.route !== a.route && this.routes[tg.route]) a.route = tg.route; // cambia de ramal si el zombi va por otro
          const dd = tg.dist - a.dist;
          if (Math.abs(dd) > 30) a.dist += Math.sign(dd) * Math.min(Math.abs(dd) - 30, 60 * dt);
        }
        const R = this.routes[a.route];
        a.dist = Math.max(0, Math.min(R.len, a.dist));
        const p = this.posAt(a.dist, 0, a.route);
        if (Math.abs(p.x - a.x) > 0.01 && a.txt) a.txt.setFlipX(p.x < a.x);
        a.x = p.x;
        a.y = p.y;
        // lanza proyectiles de chatarra a los zombis de su alcance
        a.cd -= dt;
        if (a.cd <= 0 && o) {
          const list = this.enemies.filter((e) => !e.dead && !e.def.flying && D(a.x, a.y, e.x, e.y) <= 161).sort(this.prioCmp(o));
          if (list.length) {
            a.cd = 1.2 / k;
            this.ntGolemAttack(a, list[0]);
            this.projectiles.push({ kind: 'scrap', x: a.x, y: a.y - 24, target: list[0], lx: list[0].x, ly: list[0].y, dmg: 18 * this.tierBoost(o) * (o.auraDmg || 1), src: o, spin: 0 });
          }
        }
      } else if (a.kind === 'wolf') {
        const o = a.owner;
        let tg = null;
        let bd = 420;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = D(a.x, a.y, e.x, e.y);
          if (d < bd) {
            bd = d;
            tg = e;
          }
        }
        const spd = 175;
        if (tg) {
          a.face = tg.x >= a.x ? 1 : -1;
          if (bd > 20) {
            a.x += ((tg.x - a.x) / bd) * spd * dt;
            a.y += ((tg.y - a.y) / bd) * spd * dt;
          } else {
            a.cd -= dt;
            if (a.cd <= 0) {
              a.cd = 0.5;
              this.damage(tg, 15 * this.tierBoost(o) * (o.auraDmg || 1), { src: o });
              this.effects.push({ kind: 'bolt', x: a.x, y: a.y, x2: tg.x, y2: tg.y, life: 0.12, max: 0.12, color: 0xef9a9a });
            }
          }
        } else {
          const od = D(a.x, a.y, o.x, o.y);
          if (od > 30) {
            a.x += ((o.x - a.x) / od) * spd * dt;
            a.y += ((o.y - a.y) / od) * spd * dt;
            a.face = o.x >= a.x ? 1 : -1;
          }
        }
      } else if (a.kind === 'moth') {
        // polillas: vuelan en espirales erráticas, nunca en línea recta
        const o = a.owner;
        let tg = null;
        let bd = 1e9;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = D(a.x, a.y, e.x, e.y);
          if (d < bd) {
            bd = d;
            tg = e;
          }
        }
        const want = tg ? Math.atan2(tg.y - a.y, tg.x - a.x) : Math.atan2(o.y - a.y, o.x - a.x) + Math.PI / 2;
        const diff = Math.atan2(Math.sin(want - a.ang), Math.cos(want - a.ang));
        a.ang += Math.sign(diff) * Math.min(Math.abs(diff), 2.2 * dt) + Math.sin(this.now * 9 + a.ph) * 4.2 * dt;
        const sp = 150 + Math.sin(this.now * 5 + a.ph) * 45;
        a.x = Math.min(this.WW - 10, Math.max(10, a.x + Math.cos(a.ang) * sp * dt));
        a.y = Math.min(this.worldBottom - 10, Math.max(MAP_Y + 10, a.y + Math.sin(a.ang) * sp * dt));
        a.cd -= dt;
        if (a.cd <= 0 && tg && bd <= 22 + tg.def.size * 0.3) {
          a.cd = 0.35;
          this.damage(tg, 11 * this.tierBoost(o) * (o.auraDmg || 1), { src: o });
        }
      } else if (a.kind === 'ent') {
        const o = a.owner;
        a.cd -= dt;
        if (a.cd <= 0) {
          const near = this.enemiesNear(a.x, a.y, 105);
          if (near.length) {
            a.cd = 0.9;
            this.ntGolemAttack(a, near[0]);
            this.addRing(a.x, a.y, 105, 0x8bc34a, 0.3);
            near.forEach((e) => this.damage(e, 20 * this.tierBoost(o) * (o.auraDmg || 1), { src: o }));
          }
        }
      } else if (a.kind === 'minion') {
        const o = a.owner;
        let tg = null;
        let bd = 170;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = D(a.x, a.y, e.x, e.y);
          if (d < bd) {
            bd = d;
            tg = e;
          }
        }
        if (tg) {
          const reach = a.giant ? 42 : 24;
          if (bd > reach) {
            a.x += ((tg.x - a.x) / bd) * 70 * dt;
            a.y += ((tg.y - a.y) / bd) * 70 * dt;
          } else {
            a.cd -= dt;
            if (a.cd <= 0) {
              if (a.giant) {
                a.cd = 3; // el gigante golpea cada 3 s a un enemigo cercano: 200 de daño
                this.ntGolemAttack(a, tg);
                this.addRing(tg.x, tg.y, 26, 0xab47bc, 0.35);
                this.damage(tg, 200 * (o.auraDmg || 1), { src: o });
              } else {
                a.cd = 0.8;
                this.damage(tg, 12 * this.tierBoost(o) * (o.auraDmg || 1), { src: o });
              }
            }
          }
        }
      }
      if (a.txt) a.txt.setPosition(a.x, a.y);
      if (a.life <= 0) {
        if (a.kind === 'minion' && a.unstable && !a.giant) this.ntSplash(a.x, a.y, 60, 300 * (a.owner.auraDmg || 1), { src: a.owner, color: 0xab47bc });
        if (a.txt) a.txt.destroy();
      }
    }
    this.allies = this.allies.filter((a) => a.life > 0);
    // las defensas vendidas dejan de tener esbirros
    this.allies = this.allies.filter((a) => {
      if (a.owner && !this.towers.includes(a.owner)) {
        if (a.txt) a.txt.destroy();
        return false;
      }
      return true;
    });
  },

  ntRaise(owner, e, giant) {
    const s = this.stats(owner);
    const mine = this.allies.filter((a) => a.kind === 'minion' && a.owner === owner && !a.giant).length;
    if (!giant && mine >= (s.horde ? 10 : 5)) return;
    this.allies.push({
      kind: 'minion',
      owner,
      giant,
      unstable: s.unstable,
      life: giant ? 12 : 10 + (s.unstable ? 5 : 0),
      cd: 0.3,
      x: e.x,
      y: e.y,
      txt: giant ? this.ntGolemSprite(0xc9a0ff, 1.7) : null, // el gigante es un golem de piedra teñido de morado
    });
  },

  // sprite del golem de piedra (pack Mecha-stone Golem)
  ntGolemSprite(tint, scale) {
    const s = this.add.sprite(0, 0, 'golem_idle').setOrigin(0.5, 0.7).setScale(scale).setTint(tint).setDepth(15);
    s.play('golem_idle');
    return s;
  },

  // el golem ataca: anima el brazo y gira hacia el objetivo
  ntGolemAttack(a, target) {
    if (!a.txt || !a.txt.active) return;
    a.txt.setFlipX(target.x < a.x);
    a.txt.play('golem_atk', true);
    a.txt.once('animationcomplete', () => {
      if (a.txt && a.txt.active) a.txt.play('golem_idle', true);
    });
  },

  // ------------------------------------------------------------------ PROYECTILES NUEVOS
  ntProjectile(p, dt) {
    if (p.kind === 'scrap') {
      if (p.target && !p.target.dead) {
        p.lx = p.target.x;
        p.ly = p.target.y;
      }
      const dx = p.lx - p.x, dy = p.ly - p.y;
      const d = Math.hypot(dx, dy);
      const step = 520 * dt;
      p.spin += dt * 14;
      if (d <= step + 6) {
        p.dead = true;
        if (p.target && !p.target.dead) this.damage(p.target, p.dmg, { src: p.src });
        this.addRing(p.lx, p.ly, 14, 0x9e9e9e, 0.25);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
      return;
    }
    if (p.kind === 'blood') {
      if (p.target && !p.target.dead) {
        p.lx = p.target.x;
        p.ly = p.target.y + (p.target.flyY || 0);
      }
      p.v = Math.min(900, p.v + 2600 * dt); // empieza lenta y acelera rápido
      const dx = p.lx - p.x, dy = p.ly - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.v * dt;
      p.trail.push({ x: p.x, y: p.y, life: 0.25 });
      if (p.trail.length > 10) p.trail.shift();
      p.trail.forEach((q) => (q.life -= dt));
      if (d <= step + 6) {
        p.dead = true;
        if (p.target && !p.target.dead) {
          this.damage(p.target, p.dmg, { src: p.src, dtype: 'oscuridad' });
          this.ntCurseHit(p.target, p.src, p.stats);
        }
        this.addRing(p.lx, p.ly, 16, 0xb71c1c, 0.3);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
      return;
    }
    if (p.kind === 'rock') {
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      p.x = p.sx + (p.tx - p.sx) * k;
      p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * 110;
      if (k >= 1) {
        p.dead = true;
        this.ntRockLand(p);
      }
    } else if (p.kind === 'ghost') {
      const ARENA = { x0: 12, x1: this.WW - 12, y0: MAP_Y + 10, y1: this.worldBottom - 10 }; // límites del mapa donde rebotan
      p.life -= dt;
      p.x += Math.cos(p.ang) * p.speed * dt;
      p.y += Math.sin(p.ang) * p.speed * dt;
      let bounced = false;
      if (p.x < ARENA.x0 || p.x > ARENA.x1) {
        p.ang = Math.PI - p.ang;
        p.x = Math.min(ARENA.x1, Math.max(ARENA.x0, p.x));
        bounced = true;
      }
      if (p.y < ARENA.y0 || p.y > ARENA.y1) {
        p.ang = -p.ang;
        p.y = Math.min(ARENA.y1, Math.max(ARENA.y0, p.y));
        bounced = true;
      }
      if (bounced) {
        p.bounces -= 1;
        if (p.bounces < 0) p.dead = true;
      }
      for (const e of this.enemies) {
        if (e.dead || D(p.x, p.y, e.x, e.y) > 24 + e.def.size * 0.3) continue;
        if ((p.hitAt.get(e) || -9) > this.now - 0.5) continue;
        p.hitAt.set(e, this.now);
        this.damage(e, p.dmg, { src: p.src });
      }
      if (p.life <= 0) p.dead = true;
    } else if (p.kind === 'wisp') {
      p.life -= dt;
      if (!p.target || p.target.dead) {
        let bd = 1e9;
        p.target = null;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = D(p.x, p.y, e.x, e.y);
          if (d < bd) {
            bd = d;
            p.target = e;
          }
        }
      }
      if (!p.target) {
        p.dead = true;
        return;
      }
      const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
      let diff = Math.atan2(Math.sin(want - p.ang), Math.cos(want - p.ang));
      p.ang += Math.sign(diff) * Math.min(Math.abs(diff), 5 * dt);
      p.x += Math.cos(p.ang) * p.speed * dt;
      p.y += Math.sin(p.ang) * p.speed * dt;
      if (D(p.x, p.y, p.target.x, p.target.y) < 18) {
        this.damage(p.target, p.dmg, { src: p.src, ignoreResist: true });
        p.dead = true;
      }
      if (p.life <= 0) p.dead = true;
    }
  },

  // ------------------------------------------------------------------ HABILIDADES ACTIVAS
  // Devuelve true si se lanzó (y hay que poner la recarga)
  ntSkill(t, s, live) {
    switch (t.type) {
      case 'lancero': {
        if (!live.length) return false;
        const lead = live.reduce((b, e) => (e.dist > b.dist ? e : b), live[0]);
        const base = Math.atan2(lead.y - t.y, lead.x - t.x);
        for (let i = 0; i < 6; i++) {
          const a = base + (i - 2.5) * 0.3;
          this.projectiles.push({ kind: 'ghost', x: t.x, y: t.y - 6, ang: a, speed: 520, bounces: 5, life: 9, dmg: s.dmg * 2.5, hitAt: new Map(), src: t });
        }
        this.addRing(t.x, t.y, 60, 0x90caf9, 0.5);
        return true;
      }
      case 'monje': {
        // Ascensión (ACTIVA): el héroe más cercano asciende 10 s: x2 de daño y de cadencia
        let near = null;
        let bd = 1e9;
        for (const o of this.towers) {
          if (o === t) continue;
          const d = D(t.x, t.y, o.x, o.y);
          if (d < bd) {
            bd = d;
            near = o;
          }
        }
        if (!near) return false;
        near.ascUntil = this.now + 10;
        this.addRing(near.x, near.y, 60, 0xffd700, 0.9);
        this.effects.push({ kind: 'column', x: near.x, y: near.y, life: 0.8, max: 0.8, hit: true });
        this.floatText(near.x, near.y - 50, '✨ Ascensión', '#ffd700');
        return true;
      }
      case 'ingeniero':
        this.buffs.overload = 8;
        this.addRing(t.x, t.y, 400, 0xffa726, 0.8);
        return true;
      case 'asedio': {
        if (!live.length) return false;
        for (let i = 0; i < 12; i++) {
          this.timers.push({
            t: i * 0.42,
            fn: () => {
              if (!this.towers.includes(t)) return;
              const cand = this.enemies.filter((e) => !e.dead).sort((a, b) => b.dist - a.dist);
              if (!cand.length) return;
              this.ntRock(t, s, cand[i % Math.min(cand.length, 4)], { dmg: s.dmg * 1.5, fast: true });
            },
          });
        }
        return true;
      }
      case 'druida': {
        if (!live.length) return false;
        for (let i = 0; i < 8; i++) {
          this.allies.push({ kind: 'moth', owner: t, life: 12, cd: 0, ph: Math.random() * 6.28, ang: (i / 8) * 6.28, x: t.x + Math.cos(i) * 18, y: t.y - 10 + Math.sin(i) * 18 });
        }
        this.addRing(t.x, t.y, 70, 0xce93d8, 0.5);
        return true;
      }
      case 'midas':
        this.buffs.fever = 8;
        this.buffs.feverBy = t;
        this.addRing(t.x, t.y, 500, 0xffd700, 0.8);
        return true;
      case 'nigromante': {
        const cursed = this.enemies.filter((e) => !e.dead && e.curseUntil > this.now);
        if (!cursed.length) return false;
        cursed.forEach((c) => {
          const amt = c.maxHp * 0.3;
          const cx = c.x;
          const cy = c.y;
          this.addRing(cx, cy, 70, 0xab47bc, 0.6);
          playFx(this, 'fx_explosion2', cx, cy, 1, 27);
          for (const o of this.enemiesNear(cx, cy, 70)) this.damage(o, amt, { src: t, ignoreResist: true });
        });
        return true;
      }
      default:
        return false;
    }
  },

  // Juicio divino (Monje A4, automático): columna de luz sobre los 5 zombis con más vida y los marca
  ntJudgement(t, s) {
    const top = this.enemies.filter((e) => !e.dead).sort((a, b) => b.hp - a.hp).slice(0, 5);
    top.forEach((e) => this.effects.push({ kind: 'column', x: e.x, y: e.y, life: 2, max: 2 }));
    this.timers.push({
      t: 2,
      fn: () => {
        top.forEach((e) => {
          if (e.dead) return;
          this.effects.push({ kind: 'column', x: e.x, y: e.y, life: 0.5, max: 0.5, hit: true });
          this.damage(e, s.dmg * 20, { src: t, dtype: 'luz' });
          this.ntMark(e, 10, 1.25);
        });
      },
    });
  },

  // ------------------------------------------------------------------ GANCHOS DE EVENTOS
  ntOnKill(e, src) {
    if (src && src.type === 'lancero' && src.ups.C >= 3) src.combo = Math.min(3, (src.combo || 0) + 1);
    if (e.turretHit && this.towers.includes(e.turretHit)) e.turretHit.turretKills = (e.turretHit.turretKills || 0) + 1;
    let scrap = 0; // suministros de Chatarrero dados por esta baja (máx. 2)
    for (const t of this.towers) {
      if (!NEW_TYPES.includes(t.type)) continue;
      const s = this.stats(t);
      const d = D(t.x, t.y, e.x, e.y);

      if (t.type === 'ingeniero' && s.scrap && d <= s.range && scrap < 2) {
        scrap += 1;
        this.supplies += 1;
      }
      if (t.type === 'midas' && s.collect && d <= s.range) {
        // (Recaudador)
        t.vault = (t.vault || 0) + 1; // Recaudador: 1 suministro por baja, en su inventario (se recauda con el botón de su panel)
      }
      if (t.type === 'nigromante' && d <= s.range + 40) {
        if (s.bond) t.souls = Math.min(s.soulMax, (t.souls || 0) + 1); // cada baja cerca carga un alma
        if (s.raise) {
          if ((e.def.boss || e.def.mini) && s.lord) this.ntRaise(t, e, true);
          else if (Math.random() < 0.2) this.ntRaise(t, e, false);
        }
      }
    }
    if (scrap) this.floatText(e.x, e.y - 20, `+${scrap} ⚙`, '#bdbdbd');
    // Contagio: la maldición salta a otro zombi al morir el maldito
    if (e.curseUntil > this.now && e.curser && this.towers.includes(e.curser) && e.curser.ups.B >= 2) {
      const cand = this.enemies.filter((o) => !o.dead && o !== e && !(o.curseUntil > this.now));
      if (cand.length) this.ntCurse(cand[Math.floor(Math.random() * cand.length)], e.curser);
    }
    // Midas verdadero: un zombi dorado contagia el oro a los cercanos al morir
    if (e.goldUntil > this.now) {
      const m = this.towers.find((x) => x.type === 'midas' && x.ups.A >= 4);
      if (m) for (const o of this.enemiesNear(e.x, e.y, 90)) if (!(o.goldUntil > this.now)) this.ntGild(o, m);
    }
    // Cofre del tirano: el último zombi de la oleada
    if (this.waveRunning && !this.queue.length && !this.enemies.some((x) => !x.dead && x !== e)) {
      for (const t of this.towers) {
        if (t.type === 'midas' && t.ups.C >= 4) {
          const v = 10 * this.waveNo;
          this.supplies += v;
          t.goldEarned = (t.goldEarned || 0) + v;
          this.floatText(e.x, e.y - 40, `🎁 Cofre +${v}`, '#ffd700');
        }
      }
    }
  },

  ntOnWaveStart() {
    this.leakedWave = false;
    // Diezmo de caridad (Monje B2): al empezar la ronda, +10 suministros por cada héroe en el mapa
    for (const t of this.towers) {
      if (t.type === 'monje' && t.ups.B >= 2) {
        const v = 10 * this.towers.length;
        this.supplies += v;
        this.floatText(t.x, t.y - 44, `+${v} 🛠 diezmo`, '#fff59d');
      }
    }
    for (const t of this.towers) {
      if (t.type === 'ingeniero') t.moveCharges = t.ups.C >= 1 ? 1 : 0; // Taller móvil: una vez por oleada
      if (t.type === 'lancero') t.combo = 0;
    }
  },

  ntOnWaveEnd() {
    this.allies.forEach((a) => a.kind === 'ent' && (a.life = 0)); // el árbol ancestral dura una oleada
    for (const t of this.towers) {
      if (t.type === 'monje' && t.ups.B >= 3 && !this.leakedWave) {
        this.lives += 2;
        this.floatText(t.x, t.y - 44, '❤ +2', '#ff8a80');
      }
      if (t.type === 'midas' && t.ups.B >= 3) {
        const v = Math.min(100, Math.floor((t.vault || 0) * 0.1)); // Interés: +10% de lo que hay sin recaudar (máx. +100)
        if (v > 0) {
          t.vault += v;
          this.floatText(t.x, t.y - 44, `+${v} 🛠 interés`, '#ffd700');
        }
      }
    }
  },

  // pacto de sangre (cada fotograma, por zombi)
  ntEnemyTick(e, dt) {
    if (e.rootUntil > this.now && e.rootSrc && this.towers.includes(e.rootSrc) && e.rootSrc.ups.A >= 2) {
      this.damage(e, 10 * dt * this.tierBoost(e.rootSrc) * (e.rootSrc.auraDmg || 1), { dot: true, src: e.rootSrc }); // Espinas
    }
  },

  // Mover una defensa gratis (Taller móvil del Ingeniero)
  movableBy(t) {
    return this.towers.find((m) => m !== t && m.type === 'ingeniero' && m.ups.C >= 1 && (m.moveCharges || 0) > 0);
  },

  // ------------------------------------------------------------------ DIBUJADO
  // Torreta de ballesta: trípode, cuerpo de madera que gira hacia el objetivo, arco con cuerda y virote con punta de metal
  ntBallista(g, x, y, ang, fxColor) {
    const S = 1.35; // tamaño
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x, y + 13 * S, 26 * S, 7 * S);
    g.lineStyle(3.5, 0x3e2723, 1); // trípode
    g.lineBetween(x, y + 1, x - 10 * S, y + 13 * S);
    g.lineBetween(x, y + 1, x + 10 * S, y + 13 * S);
    g.lineBetween(x, y + 1, x, y + 14 * S);
    g.fillStyle(0x5d4037, 1);
    g.fillCircle(x, y, 5 * S);
    const c = Math.cos(ang), s = Math.sin(ang);
    const P = (lx, ly) => ({ x: x + (c * lx - s * ly) * S, y: y - 4 * S + (s * lx + c * ly) * S });
    const poly = (pts, fill, line) => {
      g.fillStyle(fill, 1);
      g.lineStyle(2, line, 1);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath();
      g.fillPath();
      g.strokePath();
    };
    poly([P(-13, -3), P(11, -3), P(11, 3), P(-13, 3)], 0x8d6e63, 0x3e2723); // cuerpo
    // arco (dos brazos curvos) y cuerda
    const arm = [P(9, 0), P(11, -6), P(9, -12), P(5, -16)];
    const arm2 = [P(9, 0), P(11, 6), P(9, 12), P(5, 16)];
    for (const A of [arm, arm2]) {
      g.lineStyle(4, 0x4e342e, 1);
      g.beginPath();
      g.moveTo(A[0].x, A[0].y);
      for (let i = 1; i < A.length; i++) g.lineTo(A[i].x, A[i].y);
      g.strokePath();
      g.lineStyle(1.5, 0xbcaaa4, 1);
      g.beginPath();
      g.moveTo(A[0].x, A[0].y);
      for (let i = 1; i < A.length; i++) g.lineTo(A[i].x, A[i].y);
      g.strokePath();
    }
    const n = P(-5, 0);
    g.lineStyle(1.5, 0xf5f5f5, 1);
    g.lineBetween(arm[3].x, arm[3].y, n.x, n.y);
    g.lineBetween(arm2[3].x, arm2[3].y, n.x, n.y);
    // virote cargado y punta de metal
    const b0 = P(-7, 0), b1 = P(15, 0);
    g.lineStyle(2.5, 0x3e2723, 1);
    g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    poly([P(21, 0), P(15, -3.5), P(15, 3.5)], 0xcfd8dc, 0x455a64);
    g.fillStyle(0x9e9e9e, 1); // remaches
    for (const q of [P(-9, 0), P(3, 0)]) g.fillCircle(q.x, q.y, 1.6);
    if (fxColor) {
      const f = P(-13, 0);
      g.fillStyle(fxColor, 1); // gema del efecto especial
      g.fillCircle(f.x, f.y, 3.5);
      g.lineStyle(1, 0x000000, 0.6);
      g.strokeCircle(f.x, f.y, 3.5);
    }
  },

  ntDraw(a, b) {
    // zombis marcados / malditos
    for (const e of this.enemies) {
      if (e.dead) continue;
      const r = e.def.size * 0.55;
      // resistencia predominante: anillo del color de su tipo bajo los pies · maestro: anillo dorado
      if (e.predom) {
        b.lineStyle(3, DTYPES[e.predom].color, 0.85);
        b.strokeEllipse(e.x, e.y + 14, r * 1.7, r * 0.7);
      }
      if (e.def.master) {
        b.lineStyle(2, 0xffd700, 0.9);
        b.strokeEllipse(e.x, e.y + 14, r * 2.1, r * 0.9);
      }
      if (e.markUntil > this.now) {
        b.lineStyle(3, 0xfff59d, 1);
        b.strokeCircle(e.x, e.y + 2, r + 9);
      }
      if (e.curseUntil > this.now) {
        b.lineStyle(3, 0xab47bc, 1);
        b.strokeCircle(e.x, e.y + 2, r + 11);
      }
      if (e.rootUntil > this.now) {
        // raíces que agarran al zombi
        b.lineStyle(4, 0x558b2f, 1);
        for (let k = 0; k < 5; k++) {
          const rx = e.x - 14 + k * 7;
          b.lineBetween(rx, e.y + r, rx + (k % 2 ? 4 : -4), e.y - r * 0.4);
        }
      }
    }
    for (const t of this.towers) {
      // trampas y torretas del Ingeniero
      if (t.type === 'ingeniero') {
        for (const tr of t.trapList || []) {
          // cepo: dientes de metal
          const al = tr.armed ? 1 : 0.3;
          a.fillStyle(0x9e9e9e, al);
          a.fillCircle(tr.x, tr.y, 8);
          a.lineStyle(2, 0x424242, al);
          a.strokeCircle(tr.x, tr.y, 8);
          a.lineBetween(tr.x - 7, tr.y, tr.x + 7, tr.y);
        }
        for (const m of t.mineList || []) {
          if (!m.armed) continue;
          a.fillStyle(0x37474f, 1);
          a.fillCircle(m.x, m.y, 8);
          a.fillStyle(0xe53935, 0.6 + 0.4 * Math.sin(this.now * 8));
          a.fillCircle(m.x, m.y - 1, 3);
          a.lineStyle(2, 0x212121, 1);
          a.strokeCircle(m.x, m.y, 8);
        }
        const st = this.stats(t);
        const FXC = [0xffd54f, 0x90a4ae, 0xff7043];
        for (let i = 0; i < st.turrets; i++) {
          const [ox, oy] = TURRET_POS[i];
          this.ntBallista(a, t.x + ox, t.y + oy, (t.turretAng || [])[i] ?? 0, st.turretFx ? FXC[i] : null);
        }
      }
      // arbustos del Bosquecillo
      if (t.type === 'druida' && t.bushes) {
        for (const bu of t.bushes) {
          b.fillStyle(0x33691e, 0.55);
          b.fillCircle(bu.x, bu.y + 4, 24);
          b.fillStyle(0x7cb342, 0.7);
          b.fillCircle(bu.x - 7, bu.y, 14);
          b.fillCircle(bu.x + 8, bu.y + 3, 12);
        }
      }
      // aura del Monje (solo se ve si está seleccionada)
      if (t.type === 'monje' && this.selection && this.selection.tower === t && t.ups.A >= 1) {
        b.lineStyle(2, 0xfff59d, 0.7);
        b.strokeCircle(t.x, t.y, this.stats(t).auraR);
      }
      if (t.ascUntil > this.now) {
        // Ascensión: halo dorado y luz
        a.fillStyle(0xfff8e1, 0.18 + 0.08 * Math.sin(this.now * 6));
        a.fillCircle(t.x, t.y, 40);
        a.lineStyle(4, 0xffd700, 1);
        a.strokeCircle(t.x, t.y + 6, 38);
      }
      // contador de almas del Nigromante
      if (t.type === 'nigromante' && t.ups.C >= 1) {
        if (!t.soulTxt) t.soulTxt = this.add.text(t.x, t.y - 52, '', { fontFamily: 'Nunito, sans-serif', fontSize: '15px', color: '#e1bee7', fontStyle: 'bold', stroke: '#1a0026', strokeThickness: 4 }).setOrigin(0.5).setDepth(21);
        const sv = `👻 ${t.souls || 0}`;
        if (t.soulTxt.text !== sv) t.soulTxt.setText(sv);
        t.soulTxt.setPosition(t.x, t.y - 52).setColor((t.souls || 0) >= 5 && t.ups.C >= 3 ? '#ea80fc' : '#e1bee7');
      }
    }
    // aliados: golem de chatarra y esbirros (dibujados con formas, sin texto)
    for (const al of this.allies) {
      if (al.kind === 'golem') {
        al.chains.forEach((e) => {
          a.lineStyle(2, 0xbdbdbd, 0.9);
          a.lineBetween(al.x, al.y, e.x, e.y);
        });
      } else if (al.kind === 'wolf') {
        const f = al.face || 1;
        a.fillStyle(0x000000, 0.3);
        a.fillEllipse(al.x, al.y + 9, 26, 7);
        a.fillStyle(0x9e9e9e, 1);
        a.fillEllipse(al.x, al.y, 24, 12);
        a.fillCircle(al.x + f * 12, al.y - 4, 7);
        a.fillTriangle(al.x + f * 10, al.y - 9, al.x + f * 13, al.y - 15, al.x + f * 16, al.y - 8);
        a.lineStyle(3, 0x757575, 1);
        a.lineBetween(al.x - f * 11, al.y - 1, al.x - f * 20, al.y - 7);
        a.fillStyle(0xe53935, 1);
        a.fillCircle(al.x + f * 14, al.y - 5, 1.6);
      } else if (al.kind === 'moth') {
        const fl = 0.35 + 0.65 * Math.abs(Math.sin(this.now * 28 + al.ph));
        a.fillStyle(0xce93d8, 0.9);
        a.fillEllipse(al.x - 5, al.y - 2, 9 * fl + 2, 11);
        a.fillEllipse(al.x + 5, al.y - 2, 9 * fl + 2, 11);
        a.fillStyle(0x4a148c, 1);
        a.fillEllipse(al.x, al.y, 3, 9);
      } else if (al.kind === 'minion' && !al.giant) {
        const r = 10;
        a.fillStyle(0x000000, 0.3);
        a.fillEllipse(al.x, al.y + r, r * 1.8, r * 0.6);
        a.fillStyle(al.giant ? 0x7b1fa2 : 0x8e24aa, 0.95);
        a.fillCircle(al.x, al.y, r);
        a.fillStyle(0xe1bee7, 1);
        a.fillCircle(al.x - r * 0.3, al.y - r * 0.15, r * 0.2);
        a.fillCircle(al.x + r * 0.3, al.y - r * 0.15, r * 0.2);
        a.lineStyle(2, 0x4a148c, 1);
        a.strokeCircle(al.x, al.y, r);
      }
    }
    for (const p of this.projectiles) {
      if (p.kind === 'rock') {
        a.fillStyle(0x000000, 0.3);
        a.fillCircle(p.x, p.sy + (p.ty - p.sy) * (p.t / p.dur) + 4, 8);
        a.fillStyle(p.barrel ? 0x8d6e63 : 0x757575, 1);
        a.fillCircle(p.x, p.y, p.barrel ? 12 : 9);
        if (p.tar) {
          a.fillStyle(0xff6d00, 0.8);
          a.fillCircle(p.x + 2, p.y - 4, 4);
        }
      } else if (p.kind === 'ghost') {
        const gc = Math.cos(p.ang);
        const gs = Math.sin(p.ang);
        a.lineStyle(4, 0x90caf9, 0.9);
        a.lineBetween(p.x, p.y, p.x - gc * 28, p.y - gs * 28);
        a.fillStyle(0xe3f2fd, 1); // punta de lanza fantasma
        a.beginPath();
        a.moveTo(p.x + gc * 8, p.y + gs * 8);
        a.lineTo(p.x - gc * 8 - gs * 5, p.y - gs * 8 + gc * 5);
        a.lineTo(p.x - gc * 8 + gs * 5, p.y - gs * 8 - gc * 5);
        a.closePath();
        a.fillPath();
      } else if (p.kind === 'scrap') {
        // trozo de chatarra que gira
        const c = Math.cos(p.spin) * 6, s2 = Math.sin(p.spin) * 6;
        a.fillStyle(0x78909c, 1);
        a.fillTriangle(p.x + c, p.y + s2, p.x - s2, p.y + c, p.x - c * 0.6, p.y - s2 * 0.6);
        a.lineStyle(1.5, 0x37474f, 1);
        a.strokeTriangle(p.x + c, p.y + s2, p.x - s2, p.y + c, p.x - c * 0.6, p.y - s2 * 0.6);
      } else if (p.kind === 'blood') {
        for (const q of p.trail) {
          if (q.life <= 0) continue;
          a.fillStyle(0x8e0000, q.life * 2);
          a.fillCircle(q.x, q.y, 4);
        }
        a.fillStyle(0x4a0000, 1);
        a.fillCircle(p.x, p.y, 8);
        a.fillStyle(0xd50000, 1);
        a.fillCircle(p.x, p.y, 6);
        a.fillStyle(0xff8a80, 0.9);
        a.fillCircle(p.x - 2, p.y - 2, 2);
      } else if (p.kind === 'wisp') {
        a.fillStyle(0xce93d8, 0.9);
        a.fillCircle(p.x, p.y, 8);
        a.fillStyle(0xffffff, 0.8);
        a.fillCircle(p.x, p.y, 3);
      }
    }
    for (const f of this.effects) {
      const k = Math.max(0, f.life / f.max);
      if (f.kind === 'line') {
        a.lineStyle(f.w || 4, f.color, k);
        a.lineBetween(f.x, f.y, f.x + Math.cos(f.ang) * f.len, f.y + Math.sin(f.ang) * f.len);
      } else if (f.kind === 'spear') {
        // lanza que sale disparada, clava la punta y regresa (0..0.4 ida, 0.4..0.55 pausa, 0.55..1 vuelta)
        const u = 1 - k;
        let dist;
        if (u < 0.4) dist = f.len * (1 - (1 - u / 0.4) ** 2);
        else if (u < 0.55) dist = f.len;
        else dist = f.len * (1 - ((u - 0.55) / 0.45) ** 2);
        const ca = Math.cos(f.ang);
        const sa = Math.sin(f.ang);
        const sh = f.long ? 46 : 34; // largo del asta
        const tipX = f.x + ca * dist;
        const tipY = f.y + sa * dist;
        const tailD = Math.max(0, dist - sh);
        // estela
        a.lineStyle(2, f.color, 0.25);
        a.lineBetween(f.x, f.y, f.x + ca * tailD, f.y + sa * tailD);
        // asta
        a.lineStyle(4, 0x8d6e63, 1);
        a.lineBetween(f.x + ca * tailD, f.y + sa * tailD, tipX - ca * 10, tipY - sa * 10);
        // punta de acero (triángulo acabado en punto)
        a.fillStyle(0xeceff1, 1);
        a.lineStyle(2, 0x455a64, 1);
        a.beginPath();
        a.moveTo(tipX + ca * 6, tipY + sa * 6);
        a.lineTo(tipX - ca * 10 - sa * 5, tipY - sa * 10 + ca * 5);
        a.lineTo(tipX - ca * 10 + sa * 5, tipY - sa * 10 - ca * 5);
        a.closePath();
        a.fillPath();
        a.strokePath();
      } else if (f.kind === 'darkbeam') {
        const ex = f.x + Math.cos(f.ang) * f.len, ey = f.y + Math.sin(f.ang) * f.len;
        for (const [w, col, al] of [[22, 0x4a148c, 0.35], [12, 0x7b1fa2, 0.8], [4, 0xe1bee7, 1]]) {
          a.lineStyle(w * (0.6 + 0.4 * k), col, al * k);
          a.lineBetween(f.x, f.y, ex, ey);
        }
      } else if (f.kind === 'column') {
        a.fillStyle(0xfff9c4, f.hit ? 0.6 * k : 0.25 + 0.2 * (1 - k));
        a.fillRect(f.x - 14, f.y - 220, 28, 220);
        a.lineStyle(2, 0xfff176, 0.9);
        a.strokeCircle(f.x, f.y, 22 + 10 * (1 - k));
      }
    }
  },
};










