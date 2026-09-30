/* MACFE 2027 , baseline vehicle parameters.
 *
 * The single source of truth for anything on this site that simulates, solves
 * or displays a number about the car. Do not retype these values into a page,
 * a plot label or a script: import them from here, so one edit moves every
 * place they appear.
 *
 * SI throughout. Values supplied by Quin; anything derived is marked as such
 * and computed from the supplied values rather than written down.
 *
 * Loads as an ES module (import) or as a plain script (window.MACFE_2027).
 */

const supplied = {
  name: 'MACFE 2027',

  mass: {
    total: 290.0,                 // kg
    sprung: 237.6,                // kg
    unsprungPerCorner: {          // kg per corner
      front: 8.2,
      rear: 18.0,
    },
    distribution: {               // fraction of total mass on each axle
      front: 0.48,
      rear: 0.52,
    },
  },

  geometry: {
    wheelbase: 1.530,             // m
    track: {                      // m
      front: 1.310,
      rear: 1.285,
    },
  },

  heights: {
    cgTotal: 0.2874,              // m, whole vehicle
    cgSprung: 0.30,               // m, sprung mass only
    rollCentre: {                 // m, above ground
      front: 0.045,
      rear: 0.075,
    },
  },

  inertia: {
    yaw: 165,                     // kg*m^2, Izz
  },

  springs: {
    coilRate: {                   // N/m at the spring, with the rate as specified
      front: 52538,               // 300 lb/in
      rear: 61294,                // 350 lb/in
    },
    coilRateImperial: {           // lb/in, as the springs are ordered
      front: 300,
      rear: 350,
    },
  },

  aero: {
    frontalArea: 1.025,           // m^2
    cz: 1.88,                     // downforce coefficient
    cd: 1.55,                     // drag coefficient
    balance: {                    // fraction of downforce on each axle
      front: 0.50,
      rear: 0.50,
    },
  },

  // Not in the supplied baseline. Standard sea-level value, held here so the
  // assumption is visible rather than buried in a calculation. Replace with the
  // event-day figure when there is one.
  assumed: {
    airDensity: 1.225,            // kg/m^3
    gravity: 9.80665,             // m/s^2
  },
};

// ---- derived, so these can never drift out of step with the values above ----

const m = supplied.mass;
const g = supplied.geometry;

const unsprungTotal =
  2 * m.unsprungPerCorner.front + 2 * m.unsprungPerCorner.rear;

const derived = {
  unsprungTotal,                                        // kg, all four corners
  sprungCheck: m.total - unsprungTotal,                 // kg, should equal mass.sprung
  axleMass: {                                           // kg on each axle, static
    front: m.total * m.distribution.front,
    rear: m.total * m.distribution.rear,
  },
  // longitudinal CG position, measured along the wheelbase
  a: g.wheelbase * m.distribution.rear,                 // m, front axle to CG
  b: g.wheelbase * m.distribution.front,                // m, CG to rear axle
  trackAverage: (g.track.front + g.track.rear) / 2,     // m
};

// ---- the two aero forces, at a speed in m/s ----

const halfRhoA = () =>
  0.5 * supplied.assumed.airDensity * supplied.aero.frontalArea;

const aeroForces = {
  downforce: (v) => halfRhoA() * supplied.aero.cz * v * v,   // N
  drag: (v) => halfRhoA() * supplied.aero.cd * v * v,        // N
  downforceOnAxle: (v, axle) =>
    aeroForces.downforce(v) * supplied.aero.balance[axle],   // N
};

const MACFE_2027 = Object.freeze({
  ...supplied,
  derived: Object.freeze(derived),
  aeroForces: Object.freeze(aeroForces),
});

if (typeof window !== 'undefined') window.MACFE_2027 = MACFE_2027;

export default MACFE_2027;
export { MACFE_2027 };
