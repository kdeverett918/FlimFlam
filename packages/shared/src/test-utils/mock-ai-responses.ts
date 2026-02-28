import type {
  BluffPrompt,
  BonusJudgingResult,
  GeneratedScenario,
  RoundNarrationResult,
  TriviaQuestion,
} from "../types/ai";

// ---------------------------------------------------------------------------
// Generated Scenarios — one per complexity level
// ---------------------------------------------------------------------------

export const mockScenarioKids: GeneratedScenario = {
  setting: "The Galactic Space Station Funzone",
  situation:
    "The space station's artificial gravity generator has gone haywire, causing everything to float! The crew must work together to fix it before the big Space Pizza Party in 30 minutes.",
  worldState: {
    location: "Galactic Space Station Funzone - Main Deck",
    timePressure: "30 minutes until the Space Pizza Party",
    keyResources: ["gravity wrench", "space duct tape", "emergency pizza oven", "jetpack boots"],
    npcs: [
      {
        name: "Captain Wobbles",
        role: "Station Commander",
        disposition: "cheerful but dizzy",
        status: "floating upside down",
      },
      {
        name: "Sparky",
        role: "Robot Assistant",
        disposition: "helpful and enthusiastic",
        status: "magnetically stuck to the ceiling",
      },
    ],
    threats: ["floating pizza dough everywhere", "space hamster escaped its cage"],
    opportunities: [
      "the anti-gravity makes cool flips possible",
      "Sparky knows a shortcut to the gravity core",
    ],
  },
  roles: [
    {
      roleName: "Chief Fun Officer",
      publicIdentity: "The crew's morale booster who keeps everyone laughing",
      secretObjective: "Secretly collect 3 floating pizza toppings during the mission",
      specialAbility: "Can make anyone laugh so hard they float higher",
      scoringCriteria: "Points for creative jokes and pizza toppings collected",
    },
    {
      roleName: "Space Engineer",
      publicIdentity: "The brilliant kid who can fix anything with space duct tape",
      secretObjective: "Fix the gravity generator but leave one room zero-gravity as a fun zone",
      specialAbility: "Can build gadgets from any two floating objects",
      scoringCriteria: "Points for creative repairs and gadget building",
    },
    {
      roleName: "Animal Wrangler",
      publicIdentity: "The crew member in charge of all space pets",
      secretObjective: "Catch the space hamster AND convince the captain to get a space puppy",
      specialAbility: "Can communicate with any space animal",
      scoringCriteria: "Points for animal interactions and successful wrangling",
    },
  ],
  tone: "silly and adventurous, safe for kids, lots of giggles",
};

export const mockScenarioStandard: GeneratedScenario = {
  setting: "The SS Meridian — a luxury cruise ship in the Bermuda Triangle",
  situation:
    "The ship has sailed into a mysterious fog bank and all electronics have failed. Passengers are starting to panic as strange lights appear beneath the waves. The captain has gone missing and someone needs to take charge.",
  worldState: {
    location: "SS Meridian - Grand Ballroom",
    timePressure: "The fog is closing in; rescue signal must be sent within 2 hours",
    keyResources: [
      "emergency flares",
      "ship's logbook",
      "vintage radio",
      "captain's safe (locked)",
      "lifeboat supplies",
    ],
    npcs: [
      {
        name: "Elena Vasquez",
        role: "First Mate",
        disposition: "nervous but competent",
        status: "trying to maintain order",
      },
      {
        name: "Dr. Marcus Webb",
        role: "Ship's Doctor",
        disposition: "suspiciously calm",
        status: "tending to a seasick passenger",
      },
      {
        name: "Old Pete",
        role: "Retired Sailor",
        disposition: "cryptic and superstitious",
        status: "muttering about 'the last time this happened'",
      },
    ],
    threats: [
      "rising panic among passengers",
      "strange bioluminescent creatures circling the hull",
      "the ship is slowly drifting deeper into the fog",
    ],
    opportunities: [
      "Old Pete seems to know something about the fog",
      "the vintage radio might work without electronics",
      "the captain's logbook has strange annotations about this area",
    ],
  },
  roles: [
    {
      roleName: "The Socialite",
      publicIdentity: "A wealthy passenger who booked the VIP suite",
      secretObjective:
        "You are actually an undercover insurance investigator — document evidence of the captain's negligence",
      specialAbility: "Can charm any NPC into revealing information",
      scoringCriteria:
        "Points for gathering evidence, uncovering secrets, and maintaining your cover",
    },
    {
      roleName: "The Deckhand",
      publicIdentity: "A junior crew member who knows the ship inside and out",
      secretObjective:
        "You discovered the captain's secret cargo manifest — something valuable is hidden in the hold",
      specialAbility: "Can access any restricted area of the ship",
      scoringCriteria: "Points for exploration, helping the crew, and finding the hidden cargo",
    },
    {
      roleName: "The Historian",
      publicIdentity: "A maritime history professor traveling for research",
      secretObjective:
        "You believe the fog is connected to a legendary shipwreck — prove your theory to earn academic fame",
      specialAbility: "Can identify and decode old maritime symbols and messages",
      scoringCriteria:
        "Points for historical connections, solving puzzles, and proving your theory",
    },
    {
      roleName: "The Entertainer",
      publicIdentity: "The ship's lounge singer hired for the cruise",
      secretObjective:
        "You are running from your past — someone on this ship knows your real identity",
      specialAbility: "Can calm panicking passengers and boost group morale",
      scoringCriteria:
        "Points for keeping passengers calm, protecting your secret, and helping others",
    },
  ],
  tone: "mysterious and dramatic with moments of humor",
};

export const mockScenarioAdvanced: GeneratedScenario = {
  setting: "The Velvet Room — a 1920s speakeasy beneath a Manhattan hotel",
  situation:
    "It's 1927 and Prohibition is in full swing. The Velvet Room is the city's most exclusive speakeasy, but tonight federal agents are closing in. The owner has been murdered in the wine cellar, and everyone in the room is a suspect. The doors are locked — no one leaves until the truth comes out.",
  worldState: {
    location: "The Velvet Room - underground speakeasy, Manhattan",
    timePressure:
      "Federal agents will breach the entrance in 90 minutes; the real killer must be identified or everyone goes down",
    keyResources: [
      "the victim's pocket watch (stopped at 11:47)",
      "a half-written letter found on the body",
      "the speakeasy's guest ledger",
      "a hidden tunnel to the subway",
      "a revolver with one bullet fired",
    ],
    npcs: [
      {
        name: "Mama Lou",
        role: "Speakeasy Bartender",
        disposition: "shrewd and protective of her regulars",
        status: "wiping down glasses and watching everyone carefully",
      },
      {
        name: "Fingers McGee",
        role: "Jazz Pianist",
        disposition: "nervous and twitchy",
        status: "chain-smoking near the piano",
      },
      {
        name: "Detective Callahan",
        role: "Corrupt Cop (regular patron)",
        disposition: "conflicted between duty and loyalty",
        status: "nursing a whiskey at the bar",
      },
    ],
    threats: [
      "federal raid imminent",
      "the real killer is still in the room",
      "some guests have warrants and will be arrested regardless",
      "rival gang members may use the chaos to settle scores",
    ],
    opportunities: [
      "the hidden tunnel could provide an escape route",
      "Detective Callahan owes favors and might look the other way",
      "Mama Lou keeps secrets about everyone — for a price",
      "the victim's letter might reveal the motive",
    ],
  },
  roles: [
    {
      roleName: "The Bootlegger",
      publicIdentity: "A well-dressed businessman who supplies the speakeasy",
      secretObjective:
        "The victim owed you $50,000. Find the victim's hidden stash and frame someone else for the murder to cover your tracks",
      specialAbility: "Can bribe any NPC or player with favors from the criminal underworld",
      scoringCriteria:
        "Points for recovering the debt, avoiding suspicion, successful manipulation",
    },
    {
      roleName: "The Flapper",
      publicIdentity: "A glamorous socialite and regular at the speakeasy",
      secretObjective:
        "You are actually a journalist. Get the real story, survive the raid, and publish the exposé of the century",
      specialAbility: "Can eavesdrop on any conversation and gain hidden information",
      scoringCriteria:
        "Points for gathering information, uncovering truths, protecting your identity",
    },
    {
      roleName: "The Crooner",
      publicIdentity: "A rising jazz singer performing tonight",
      secretObjective:
        "You witnessed the murder but the killer saw you too. Survive the night, find an ally, and ensure the killer is caught without becoming the next victim",
      specialAbility:
        "Can read body language — once per round, ask the narrator if someone is lying",
      scoringCriteria:
        "Points for survival, successful alliances, and bringing the killer to justice",
    },
    {
      roleName: "The Fixer",
      publicIdentity: "A mysterious figure who arranges 'solutions' for people with problems",
      secretObjective:
        "You were hired to kill the victim but someone beat you to it. Find out who, eliminate the competition, and collect your fee anyway",
      specialAbility: "Can forge documents and create alibis for yourself or others",
      scoringCriteria:
        "Points for information gathering, manipulation, and achieving your contract",
    },
    {
      roleName: "The Heiress",
      publicIdentity: "The victim's estranged daughter, here for a secret reconciliation",
      secretObjective:
        "You came to confront your father about your inheritance. Now that he's dead, secure the will before anyone else finds it — and discover if his 'business partners' are responsible",
      specialAbility: "Can access the victim's personal belongings and private office",
      scoringCriteria:
        "Points for uncovering family secrets, securing the inheritance, and finding the truth",
    },
  ],
  tone: "noir, suspenseful, morally complex with sharp dialogue",
};

export const mockScenarios: GeneratedScenario[] = [
  mockScenarioKids,
  mockScenarioStandard,
  mockScenarioAdvanced,
];

// ---------------------------------------------------------------------------
// Round Narration Results (5 variations)
// ---------------------------------------------------------------------------

export const mockNarrationResults: RoundNarrationResult[] = [
  {
    narration:
      "Captain Wobbles did a triple backflip as the Chief Fun Officer told the funniest joke in the galaxy. Meanwhile, the Space Engineer fashioned a makeshift gravity anchor from a pizza box and space duct tape. The space hamster zoomed past, trailing cheese in its wake!",
    playerOutcomes: [
      {
        sessionId: "player-1",
        narration: "Your joke caused a chain reaction of giggles across the station!",
        points: 150,
        progressDelta: 0.2,
        reason: "Creative humor that boosted crew morale",
      },
      {
        sessionId: "player-2",
        narration:
          "Your pizza-box gravity anchor actually worked... sort of. Things are only half-floating now.",
        points: 200,
        progressDelta: 0.3,
        reason: "Ingenious engineering with limited materials",
      },
    ],
    worldStateUpdate: {
      timePressure: "20 minutes until the Space Pizza Party",
      threats: ["half the pizza dough is still floating", "space hamster now has cheese armor"],
    },
    dramaticTwist:
      "Sparky suddenly announces that the gravity generator wasn't broken — someone turned it off on purpose!",
  },
  {
    narration:
      "The fog thickened around the SS Meridian as The Socialite cornered Old Pete near the stern. His cryptic words painted a terrifying picture — this wasn't the first ship to vanish here. Below deck, The Deckhand discovered the hidden cargo: sealed crates marked with an unknown symbol.",
    playerOutcomes: [
      {
        sessionId: "player-1",
        narration: "Old Pete trusted you enough to share his story about the last disappearance.",
        points: 175,
        progressDelta: 0.25,
        reason: "Excellent social manipulation and information gathering",
      },
      {
        sessionId: "player-2",
        narration: "The sealed crates contain something that hums with an otherworldly energy.",
        points: 200,
        progressDelta: 0.3,
        reason: "Major discovery in the ship's hold",
      },
      {
        sessionId: "player-3",
        narration: "Your historical knowledge identified the symbols as matching a 1898 shipwreck.",
        points: 150,
        progressDelta: 0.2,
        reason: "Critical historical connection made",
      },
    ],
    worldStateUpdate: {
      threats: [
        "the bioluminescent creatures are getting closer to the surface",
        "a passenger claims to have seen a ghost on the upper deck",
      ],
      opportunities: [
        "the cargo might be the key to understanding the fog",
        "Old Pete is willing to guide the ship if someone takes the helm",
      ],
    },
  },
  {
    narration:
      "Mama Lou's eyes narrowed as she watched the room. The Bootlegger smooth-talked Detective Callahan into 'overlooking' certain details, while The Flapper pretended to powder her nose near a very interesting conversation. Fingers McGee hit a wrong note — or was it a signal?",
    playerOutcomes: [
      {
        sessionId: "player-1",
        narration: "Callahan pocketed your envelope and promised to 'lose' some evidence.",
        points: 175,
        progressDelta: 0.15,
        reason: "Successful bribery but Mama Lou noticed the exchange",
      },
      {
        sessionId: "player-2",
        narration:
          "You overheard Fingers McGee whispering about a second entrance the feds don't know about.",
        points: 225,
        progressDelta: 0.25,
        reason: "Critical intelligence gathered through eavesdropping",
      },
      {
        sessionId: "player-3",
        narration:
          "You found an ally in The Crooner, but sharing your secret means trusting a stranger.",
        points: 100,
        progressDelta: 0.1,
        reason: "Alliance formed but at a cost — shared vulnerability",
      },
    ],
    worldStateUpdate: {
      timePressure: "60 minutes until the federal breach",
      newDevelopments: [
        "Detective Callahan is now compromised",
        "a second hidden exit has been revealed",
      ],
    },
    dramaticTwist:
      "The lights flicker and when they come back on, the victim's pocket watch is missing from the evidence table.",
  },
  {
    narration:
      "In a stunning turn of events, the Animal Wrangler used zero-gravity physics to herd the space hamster into a floating bubble of water. The Chief Fun Officer organized an impromptu zero-g dance party that actually helped shake loose a stuck gear in the gravity generator!",
    playerOutcomes: [
      {
        sessionId: "player-3",
        narration: "The space hamster is safely contained in its water bubble habitat!",
        points: 250,
        progressDelta: 0.35,
        reason: "Creative problem solving using the environment",
      },
      {
        sessionId: "player-1",
        narration: "Your dance party accidentally fixed part of the problem. Science!",
        points: 175,
        progressDelta: 0.2,
        reason: "Accidental genius through creative play",
      },
    ],
    worldStateUpdate: {
      timePressure: "10 minutes until the Space Pizza Party",
      keyResources: [
        "gravity wrench",
        "space duct tape",
        "emergency pizza oven",
        "jetpack boots",
        "hamster water bubble",
      ],
    },
  },
  {
    narration:
      "The tension in The Velvet Room reached a breaking point. The Heiress produced a letter proving the victim had changed his will just hours before the murder. The Fixer recognized the handwriting on the threatening note — it matched someone in this very room. Outside, the sound of police sirens grew louder.",
    playerOutcomes: [
      {
        sessionId: "player-5",
        narration:
          "The will names you as sole heir, but its authenticity will be questioned if the murder isn't solved.",
        points: 200,
        progressDelta: 0.2,
        reason: "Major evidence revealed but creates new complications",
      },
      {
        sessionId: "player-4",
        narration:
          "You know whose handwriting that is. This information is worth a fortune — or a bullet.",
        points: 250,
        progressDelta: 0.3,
        reason: "Critical deduction that shifts the power balance",
      },
      {
        sessionId: "player-3",
        narration:
          "The killer's eyes met yours across the room. They know that you know. Time is running out.",
        points: 150,
        progressDelta: 0.15,
        reason: "Dangerous position — the truth comes at a cost",
      },
    ],
    worldStateUpdate: {
      timePressure: "30 minutes until the federal breach",
      threats: [
        "federal agents are in position outside",
        "the killer is becoming desperate",
        "someone has a gun",
      ],
    },
    dramaticTwist:
      "Detective Callahan stands up and announces he's placing everyone under arrest — then locks eyes with Mama Lou, who slowly shakes her head.",
  },
];

// ---------------------------------------------------------------------------
// Bonus Judging Result
// ---------------------------------------------------------------------------

export const mockBonusJudging: BonusJudgingResult = {
  bestAction: {
    sessionId: "player-2",
    reason:
      "Building a gravity anchor from a pizza box showed incredible creativity and actually advanced the mission. Engineering at its finest!",
    points: 300,
  },
  chaosAgent: {
    sessionId: "player-1",
    reason:
      "Starting a zero-g dance party in the middle of a crisis is peak chaos energy — and it somehow worked!",
    points: 200,
  },
  mvpMoment: {
    description:
      "When the space hamster was captured in a floating water bubble, the entire station erupted in cheers. It was the moment that brought the crew together.",
  },
};

// ---------------------------------------------------------------------------
// Bluff Prompts (3)
// ---------------------------------------------------------------------------

export const mockBluffPrompts: BluffPrompt[] = [
  {
    question: "What is the world record for the longest continuous hiccup episode?",
    realAnswer: "68 years, held by Charles Osborne from 1922 to 1990",
    category: "World Records",
  },
  {
    question: "What was the original name of the search engine Google?",
    realAnswer: "BackRub",
    category: "Technology",
  },
  {
    question: "In Japan, what is a 'kancho'?",
    realAnswer:
      "A children's prank where you clasp your hands together and poke someone in the rear",
    category: "Culture",
  },
];

// ---------------------------------------------------------------------------
// Trivia Questions (10 — mix of real and drift)
// ---------------------------------------------------------------------------

export const mockTriviaQuestions: TriviaQuestion[] = [
  {
    question: "What is the largest planet in our solar system?",
    correctAnswer: "Jupiter",
    options: ["Saturn", "Jupiter", "Neptune", "Uranus"],
    isDrift: false,
    category: "Space",
  },
  {
    question: "Which element has the chemical symbol 'Au'?",
    correctAnswer: "Gold",
    options: ["Silver", "Gold", "Aluminum", "Argon"],
    isDrift: false,
    category: "Science",
  },
  {
    question: "What year was the first email sent?",
    correctAnswer: "1971",
    options: ["1965", "1971", "1978", "1983"],
    isDrift: false,
    category: "Technology",
  },
  {
    question: "In what country was the sport of 'Competitive Moss Rolling' invented?",
    correctAnswer: "Finland",
    options: ["Finland", "Norway", "Iceland", "Scotland"],
    isDrift: true,
    category: "Sports",
  },
  {
    question: "What is the smallest country in the world by area?",
    correctAnswer: "Vatican City",
    options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
    isDrift: false,
    category: "Geography",
  },
  {
    question:
      "Which famous painter invented the 'Chromatic Dissolve' technique used in Renaissance frescoes?",
    correctAnswer: "Lorenzo Vecchio",
    options: ["Lorenzo Vecchio", "Sandro Botticelli", "Fra Angelico", "Piero della Francesca"],
    isDrift: true,
    category: "Art",
  },
  {
    question: "How many hearts does an octopus have?",
    correctAnswer: "3",
    options: ["1", "2", "3", "4"],
    isDrift: false,
    category: "Biology",
  },
  {
    question:
      "What is the name of the mathematical theorem that proves parallel lines can intersect in 'folded Euclidean space'?",
    correctAnswer: "The Harmon-Kishida Principle",
    options: [
      "The Harmon-Kishida Principle",
      "Euclid's Fifth Postulate",
      "The Parallel Axiom",
      "Riemann's Conjecture",
    ],
    isDrift: true,
    category: "Mathematics",
  },
  {
    question: "What is the capital city of Australia?",
    correctAnswer: "Canberra",
    options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
    isDrift: false,
    category: "Geography",
  },
  {
    question:
      "In the 1800s, which European country briefly made it illegal to name a pig after the reigning monarch?",
    correctAnswer: "France",
    options: ["France", "England", "Spain", "Prussia"],
    isDrift: true,
    category: "History",
  },
];

// ---------------------------------------------------------------------------
// Malformed / partial JSON strings for error-handling tests
// ---------------------------------------------------------------------------

export const malformedJsonString =
  '{"setting": "The Moon Base", "situation": "Something went wrong", "roles": [{"roleName": "Astro';

export const partialValidJsonString =
  '{"setting": "The Moon Base", "situation": "A valid situation", "roles": [], "tone": "adventurous", "worldState": {"location": "Moon"}}';
