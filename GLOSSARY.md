# Glossary

Domain terms for the identity hero. Code names follow these.

**Side**: one of the two identities: `technology` (labelled "code") or `community` (labelled "people").

**Le Châtelier cycle**: what happens when a side is added: the system moves toward it, pushes back, then settles with a little of the change kept. Owned by `js/cycle.js`.

**Stage**: a step of the cycle: `equilibrium` → `disturbance` → `counter` → `settled`. A new disturbance restarts the cycle from any stage.

**Disturbance**: adding a side (hovering, focusing or clicking a panel, or pressing the switch). Also the first stage.

**Phase**: one of the two liquids in the fluid hero, one per side. Coloured like the cobalt chloride equilibrium (provisional).

**Phase boundary**: the moving line where the two phases meet. In the code, "along" is the position along it and "across" the position through it. _Avoid_: interface (taken by the architecture vocabulary).

**Phase geometry**: where the phase boundary is and which phase a point is in. Owned by `js/phase-geometry.js`, which also writes the shader's copy of the boundary formula.

**Buffer**: the violet band along the phase boundary. It widens under stress.

**Blob**: a small volume of one phase inside the other, from a bubble or from fluid the pointer dragged across. It dissolves over time.

**Dent**: the local push in the phase boundary, away from the pointer.

**Fluid simulation**: moves the pointer, the phase boundary and the blobs one frame at a time, and hands the frame to the liquid and particle layers to draw. Owned by `js/fluid-sim.js`.

**Cursor zone**: the cursor colour for a part of the page, declared in markup with `data-cursor` (`paper`, `ink`, or `phase`, which resolves to the phase under the pointer).
