/*
 * ahoy's own pieces, in the order the picker lists them, each with the group
 * it is listed under. The terminal app and the macOS screensaver both play
 * this list. To add a piece: put it in src/pieces/, import it here and add it
 * to its group.
 */
import type { Piece } from "./types.ts";
import * as ahoy from "./pieces/ahoy.ts";
import * as anchor from "./pieces/anchor.ts";
import * as anchorRoger from "./pieces/anchor-roger.ts";
import * as anglerfish from "./pieces/anglerfish.ts";
import * as articles from "./pieces/articles.ts";
import * as aws from "./pieces/aws.ts";
import * as bilgeRat from "./pieces/bilge-rat.ts";
import * as blackBart from "./pieces/black-bart.ts";
import * as blackSpot from "./pieces/black-spot.ts";
import * as blackbeard from "./pieces/blackbeard.ts";
import * as brassCompass from "./pieces/brass-compass.ts";
import * as broadside from "./pieces/broadside.ts";
import * as burningShip from "./pieces/burning-ship.ts";
import * as calicoJack from "./pieces/calico-jack.ts";
import * as cannon from "./pieces/cannon.ts";
import * as compassRose from "./pieces/compass-rose.ts";
import * as condentPennant from "./pieces/condent-pennant.ts";
import * as crossedCutlasses from "./pieces/crossed-cutlasses.ts";
import * as crossedFlintlocks from "./pieces/crossed-flintlocks.ts";
import * as crownedSkull from "./pieces/crowned-skull.ts";
import * as crowsNest from "./pieces/crows-nest.ts";
import * as cutlass from "./pieces/cutlass.ts";
import * as cutlassBite from "./pieces/cutlass-bite.ts";
import * as dagger from "./pieces/dagger.ts";
import * as davyJonesLocker from "./pieces/davy-jones-locker.ts";
import * as deadEye from "./pieces/dead-eye.ts";
import * as deadMansChest from "./pieces/dead-mans-chest.ts";
import * as desertIsland from "./pieces/desert-island.ts";
import * as doubloon from "./pieces/doubloon.ts";
import * as drownedRoger from "./pieces/drowned-roger.ts";
import * as edwardLow from "./pieces/edward-low.ts";
import * as eightBells from "./pieces/eight-bells.ts";
import * as emanuelWynne from "./pieces/emanuel-wynne.ts";
import * as fireRoger from "./pieces/fire-roger.ts";
import * as fishBones from "./pieces/fish-bones.ts";
import * as flintlock from "./pieces/flintlock.ts";
import * as flintlockRoger from "./pieces/flintlock-roger.ts";
import * as flyingDutchman from "./pieces/flying-dutchman.ts";
import * as galleon from "./pieces/galleon.ts";
import * as ghostCaptain from "./pieces/ghost-captain.ts";
import * as ghostRoger from "./pieces/ghost-roger.ts";
import * as glowingWake from "./pieces/glowing-wake.ts";
import * as goldHoard from "./pieces/gold-hoard.ts";
import * as goldRoger from "./pieces/gold-roger.ts";
import * as goldTooth from "./pieces/gold-tooth.ts";
import * as grapplingHook from "./pieces/grappling-hook.ts";
import * as grog from "./pieces/grog.ts";
import * as henryEvery from "./pieces/henry-every.ts";
import * as hourglass from "./pieces/hourglass.ts";
import * as iceRoger from "./pieces/ice-roger.ts";
import * as ironHook from "./pieces/iron-hook.ts";
import * as jackRackham from "./pieces/jack-rackham.ts";
import * as joliRouge from "./pieces/joli-rouge.ts";
import * as jollyBoat from "./pieces/jolly-boat.ts";
import * as jollyRoger from "./pieces/jolly-roger.ts";
import * as kraken from "./pieces/kraken.ts";
import * as krakenArms from "./pieces/kraken-arms.ts";
import * as laughingRoger from "./pieces/laughing-roger.ts";
import * as litFuse from "./pieces/lit-fuse.ts";
import * as manOfWar from "./pieces/man-of-war.ts";
import * as mastheadDawn from "./pieces/masthead-dawn.ts";
import * as mermaid from "./pieces/mermaid.ts";
import * as messageInABottle from "./pieces/message-in-a-bottle.ts";
import * as noPreyNoPay from "./pieces/no-prey-no-pay.ts";
import * as octopus from "./pieces/octopus.ts";
import * as oysterPearl from "./pieces/oyster-pearl.ts";
import * as parrot from "./pieces/parrot.ts";
import * as piecesOfEight from "./pieces/pieces-of-eight.ts";
import * as piercedSkull from "./pieces/pierced-skull.ts";
import * as pirateCaptain from "./pieces/pirate-captain.ts";
import * as pirateCove from "./pieces/pirate-cove.ts";
import * as pirateCrab from "./pieces/pirate-crab.ts";
import * as pirateFlag from "./pieces/pirate-flag.ts";
import * as pirateHeart from "./pieces/pirate-heart.ts";
import * as pirateTavern from "./pieces/pirate-tavern.ts";
import * as portRoyal from "./pieces/port-royal.ts";
import * as powderKeg from "./pieces/powder-keg.ts";
import * as profileRoger from "./pieces/profile-roger.ts";
import * as queenAnnesRevenge from "./pieces/queen-annes-revenge.ts";
import * as redRoger from "./pieces/red-roger.ts";
import * as roseRoger from "./pieces/rose-roger.ts";
import * as rumBottle from "./pieces/rum-bottle.ts";
import * as seaBattle from "./pieces/sea-battle.ts";
import * as seaDog from "./pieces/sea-dog.ts";
import * as seaSerpent from "./pieces/sea-serpent.ts";
import * as seagull from "./pieces/seagull.ts";
import * as sharkFin from "./pieces/shark-fin.ts";
import * as shipInABottle from "./pieces/ship-in-a-bottle.ts";
import * as shipsLantern from "./pieces/ships-lantern.ts";
import * as shipsMonkey from "./pieces/ships-monkey.ts";
import * as shipsWheel from "./pieces/ships-wheel.ts";
import * as shovelRoger from "./pieces/shovel-roger.ts";
import * as skeletonKey from "./pieces/skeleton-key.ts";
import * as skullAndCrossbones from "./pieces/skull-and-crossbones.ts";
import * as skullCandle from "./pieces/skull-candle.ts";
import * as skullIsland from "./pieces/skull-island.ts";
import * as skullMoon from "./pieces/skull-moon.ts";
import * as sloop from "./pieces/sloop.ts";
import * as snakeRoger from "./pieces/snake-roger.ts";
import * as spiderRoger from "./pieces/spider-roger.ts";
import * as spyglass from "./pieces/spyglass.ts";
import * as stedeBonnet from "./pieces/stede-bonnet.ts";
import * as stormAtSea from "./pieces/storm-at-sea.ts";
import * as stormRoger from "./pieces/storm-roger.ts";
import * as sunkenGalleon from "./pieces/sunken-galleon.ts";
import * as thomasTew from "./pieces/thomas-tew.ts";
import * as threeSkulls from "./pieces/three-skulls.ts";
import * as tortuga from "./pieces/tortuga.ts";
import * as treasureCave from "./pieces/treasure-cave.ts";
import * as treasureChest from "./pieces/treasure-chest.ts";
import * as treasureMap from "./pieces/treasure-map.ts";
import * as tricorn from "./pieces/tricorn.ts";
import * as walkThePlank from "./pieces/walk-the-plank.ts";
import * as wantedPoster from "./pieces/wanted-poster.ts";
import * as whaleTail from "./pieces/whale-tail.ts";
import * as wingedSkull from "./pieces/winged-skull.ts";
import * as wreckCoast from "./pieces/wreck-coast.ts";
import * as xMarksTheSpot from "./pieces/x-marks-the-spot.ts";

/** The groups, as listed, with the heading the picker gives each. */
export const PACKS: [string, string][] = [
  ["pirate", "pirate pack"],
  ["pixels", "pirate pixels"],
  ["rogers", "jolly rogers"],
  ["lore", "pirate lore"],
  ["voyages", "pirate scenes"],
  ["aws", "just for fun"],
];

export const OWN_PIECES: [slug: string, pack: string, piece: Piece][] = [
  ["galleon", "pirate", galleon],
  ["pirate-flag", "pirate", pirateFlag],
  ["jolly-roger", "pirate", jollyRoger],
  ["kraken", "pirate", kraken],
  ["parrot", "pirate", parrot],
  ["ships-wheel", "pirate", shipsWheel],
  ["treasure-map", "pirate", treasureMap],
  ["treasure-chest", "pirate", treasureChest],
  ["anchor", "pirate", anchor],
  ["ahoy", "pirate", ahoy],
  ["pirate-heart", "pirate", pirateHeart],
  ["sea-dog", "pixels", seaDog],
  ["doubloon", "pixels", doubloon],
  ["lit-fuse", "pixels", litFuse],
  ["dead-eye", "pixels", deadEye],
  ["gold-tooth", "pixels", goldTooth],
  ["skull-candle", "pixels", skullCandle],
  ["fish-bones", "pixels", fishBones],
  ["crossed-cutlasses", "pixels", crossedCutlasses],
  ["dagger", "pixels", dagger],
  ["cannon", "pixels", cannon],
  ["skeleton-key", "pixels", skeletonKey],
  ["tricorn", "pixels", tricorn],
  ["rum-bottle", "pixels", rumBottle],
  ["x-marks-the-spot", "pixels", xMarksTheSpot],
  ["desert-island", "pixels", desertIsland],
  ["sloop", "pixels", sloop],
  ["jolly-boat", "pixels", jollyBoat],
  ["ship-in-a-bottle", "pixels", shipInABottle],
  ["walk-the-plank", "pixels", walkThePlank],
  ["shark-fin", "pixels", sharkFin],
  ["whale-tail", "pixels", whaleTail],
  ["sea-serpent", "pixels", seaSerpent],
  ["octopus", "pixels", octopus],
  ["pirate-crab", "pixels", pirateCrab],
  ["seagull", "pixels", seagull],
  ["pirate-captain", "pixels", pirateCaptain],
  ["man-of-war", "pixels", manOfWar],
  ["ships-monkey", "pixels", shipsMonkey],
  ["bilge-rat", "pixels", bilgeRat],
  ["anglerfish", "pixels", anglerfish],
  ["mermaid", "pixels", mermaid],
  ["kraken-arms", "pixels", krakenArms],
  ["flintlock", "pixels", flintlock],
  ["gold-hoard", "pixels", goldHoard],
  ["brass-compass", "pixels", brassCompass],
  ["grappling-hook", "pixels", grapplingHook],
  ["oyster-pearl", "pixels", oysterPearl],
  ["skull-and-crossbones", "rogers", skullAndCrossbones],
  ["jack-rackham", "rogers", jackRackham],
  ["cutlass-bite", "rogers", cutlassBite],
  ["pierced-skull", "rogers", piercedSkull],
  ["crowned-skull", "rogers", crownedSkull],
  ["fire-roger", "rogers", fireRoger],
  ["red-roger", "rogers", redRoger],
  ["ghost-roger", "rogers", ghostRoger],
  ["laughing-roger", "rogers", laughingRoger],
  ["rose-roger", "rogers", roseRoger],
  ["profile-roger", "rogers", profileRoger],
  ["winged-skull", "rogers", wingedSkull],
  ["emanuel-wynne", "rogers", emanuelWynne],
  ["henry-every", "rogers", henryEvery],
  ["condent-pennant", "rogers", condentPennant],
  ["gold-roger", "rogers", goldRoger],
  ["flintlock-roger", "rogers", flintlockRoger],
  ["anchor-roger", "rogers", anchorRoger],
  ["shovel-roger", "rogers", shovelRoger],
  ["storm-roger", "rogers", stormRoger],
  ["ice-roger", "rogers", iceRoger],
  ["snake-roger", "rogers", snakeRoger],
  ["spider-roger", "rogers", spiderRoger],
  ["drowned-roger", "rogers", drownedRoger],
  ["blackbeard", "lore", blackbeard],
  ["calico-jack", "lore", calicoJack],
  ["queen-annes-revenge", "lore", queenAnnesRevenge],
  ["black-bart", "lore", blackBart],
  ["pieces-of-eight", "lore", piecesOfEight],
  ["no-prey-no-pay", "lore", noPreyNoPay],
  ["tortuga", "lore", tortuga],
  ["hourglass", "lore", hourglass],
  ["black-spot", "lore", blackSpot],
  ["flying-dutchman", "lore", flyingDutchman],
  ["compass-rose", "lore", compassRose],
  ["wanted-poster", "lore", wantedPoster],
  ["eight-bells", "lore", eightBells],
  ["stede-bonnet", "lore", stedeBonnet],
  ["ghost-captain", "lore", ghostCaptain],
  ["cutlass", "lore", cutlass],
  ["broadside", "lore", broadside],
  ["dead-mans-chest", "lore", deadMansChest],
  ["grog", "lore", grog],
  ["davy-jones-locker", "lore", davyJonesLocker],
  ["spyglass", "lore", spyglass],
  ["iron-hook", "lore", ironHook],
  ["skull-moon", "lore", skullMoon],
  ["edward-low", "lore", edwardLow],
  ["thomas-tew", "lore", thomasTew],
  ["ships-lantern", "lore", shipsLantern],
  ["three-skulls", "lore", threeSkulls],
  ["articles", "lore", articles],
  ["powder-keg", "lore", powderKeg],
  ["joli-rouge", "lore", joliRouge],
  ["crossed-flintlocks", "lore", crossedFlintlocks],
  ["crows-nest", "lore", crowsNest],
  ["message-in-a-bottle", "lore", messageInABottle],
  ["skull-island", "voyages", skullIsland],
  ["storm-at-sea", "voyages", stormAtSea],
  ["port-royal", "voyages", portRoyal],
  ["pirate-cove", "voyages", pirateCove],
  ["glowing-wake", "voyages", glowingWake],
  ["sea-battle", "voyages", seaBattle],
  ["burning-ship", "voyages", burningShip],
  ["masthead-dawn", "voyages", mastheadDawn],
  ["sunken-galleon", "voyages", sunkenGalleon],
  ["wreck-coast", "voyages", wreckCoast],
  ["treasure-cave", "voyages", treasureCave],
  ["pirate-tavern", "voyages", pirateTavern],
  ["aws", "aws", aws],
];
