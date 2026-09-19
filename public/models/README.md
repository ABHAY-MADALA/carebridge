# CareBridge human model

`carebridge-human.glb` is a local derivative of MakeHuman's hm08 base mesh and
graphical morph targets. All source graphical assets are **CC0 1.0 Universal**.
No MakeHuman application source code is included. Full license: `MAKEHUMAN-CC0.txt`.

Sources (retrieved September 19, 2026):
- https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj
- https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/caucasian-male-young.target
- https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/universal-male-young-maxmuscle-averageweight.target
- https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md

Source attribution: MakeHuman contributors; Data Collection AB, Joel Palmius,
Jonas Hauquier, Manuel Bastioni. Geometry is used as a neutral communication
surface, not a medically accurate anatomical atlas.

Preparation: download these three graphical sources into `work/body-model/` as
`base.obj`, `male.target`, and `muscle.target`, then run
`node scripts/prepare-body-model.mjs` from the project root.
The script applies the morphs, adjusts the A-pose, removes helper geometry,
subdivides once, normalizes to 1.8 units high, and packs indexed geometry into GLB.
