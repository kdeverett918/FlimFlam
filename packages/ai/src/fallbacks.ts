import type { BluffPrompt, GeneratedScenario, TriviaQuestion } from "@partyline/shared";

// ─── Fallback Scenarios (one per complexity) ─────────────────────────────

export const FALLBACK_SCENARIOS: Record<string, GeneratedScenario> = {
  kids: {
    setting:
      "Welcome to Critter Carnival, a magical amusement park run entirely by talking animals! The park floats on a giant cloud above a cotton candy ocean.",
    situation:
      "The park's Grand Ferris Wheel has stopped spinning, and the annual Critter Carnival parade is in one hour! Everyone needs to work together to fix it before the guests arrive.",
    worldState: {
      location: "Critter Carnival Cloud Park",
      timePressure: "The parade starts in one hour!",
      keyResources: ["Rainbow Wrench", "Bubble Glue", "Musical Gears"],
      npcs: [
        { name: "Mayor Whiskers", role: "Park Mayor (a fancy cat)", disposition: "friendly" },
        { name: "Grumble", role: "Maintenance Bear", disposition: "neutral" },
      ],
      threats: ["The cloud is slowly sinking", "A flock of mischievous seagulls"],
      opportunities: [
        "The Magic Toolbox in the Fun House",
        "A friendly dragon who could help lift things",
      ],
    },
    roles: [
      {
        roleName: "The Inventor",
        publicIdentity: "A clever raccoon who builds gadgets",
        secretObjective: "Build something totally new from the broken parts",
        specialAbility: "Combine two items into a super-gadget",
        scoringCriteria: "Points for creative inventions",
      },
      {
        roleName: "The Performer",
        publicIdentity: "A dancing flamingo who loves the spotlight",
        secretObjective: "Make sure the parade is even MORE spectacular than planned",
        specialAbility: "Inspire an NPC to help with a dazzling dance",
        scoringCriteria: "Points for making things more fun",
      },
      {
        roleName: "The Detective",
        publicIdentity: "A curious owl with a magnifying glass",
        secretObjective: "Figure out who really broke the Ferris Wheel",
        specialAbility: "Investigate any object or NPC for hidden clues",
        scoringCriteria: "Points for uncovering secrets",
      },
      {
        roleName: "The Chef",
        publicIdentity: "A jolly pig who runs the food stalls",
        secretObjective: "Create the ultimate carnival snack that saves the day",
        specialAbility: "Cook a magical meal that gives everyone a boost",
        scoringCriteria: "Points for food-related solutions",
      },
      {
        roleName: "The Pilot",
        publicIdentity: "A brave eagle with aviator goggles",
        secretObjective: "Keep the cloud park floating no matter what",
        specialAbility: "Fly to any location instantly",
        scoringCriteria: "Points for saving the park from sinking",
      },
      {
        roleName: "The Artist",
        publicIdentity: "A colorful chameleon who paints murals",
        secretObjective: "Secretly redecorate the entire park",
        specialAbility: "Paint something into reality once per game",
        scoringCriteria: "Points for creative artistic solutions",
      },
      {
        roleName: "The Musician",
        publicIdentity: "A groovy frog with a tiny banjo",
        secretObjective: "Compose a theme song that becomes the park anthem",
        specialAbility: "Play a tune that calms or excites anyone who hears it",
        scoringCriteria: "Points for musical contributions",
      },
      {
        roleName: "The Prankster",
        publicIdentity: "A giggly monkey who loves surprises",
        secretObjective: "Set up the best prank the carnival has ever seen",
        specialAbility: "Swap two objects or NPCs around",
        scoringCriteria: "Points for harmless chaos and surprises",
      },
    ],
    tone: "silly and fun",
  },

  standard: {
    setting:
      "The year is 1925. You find yourselves aboard the Orient Express, the most luxurious train in the world, cutting through a snowstorm in the Balkans.",
    situation:
      "A priceless diamond, the Star of Constantinople, has vanished from the train's safe. The train is stuck in a snowdrift, and suspicion falls on every passenger. Someone here is a thief.",
    worldState: {
      location: "Orient Express, Balkan Mountains",
      timePressure: "Rescue team arrives at dawn — 5 hours away",
      keyResources: ["Master Key", "Telegram Machine", "Secret Compartment Map"],
      npcs: [
        { name: "Conductor Petrov", role: "Train Conductor", disposition: "nervous" },
        { name: "Countess Morozova", role: "Wealthy Passenger", disposition: "suspicious" },
      ],
      threats: ["The real thief may strike again", "Blizzard is worsening, carriages losing heat"],
      opportunities: ["The luggage car has unchecked trunks", "A hidden passage between carriages"],
    },
    roles: [
      {
        roleName: "The Detective",
        publicIdentity: "A renowned private investigator traveling on holiday",
        secretObjective: "Solve the case before dawn and claim the reward",
        specialAbility: "Interrogate any NPC and force a truthful answer",
        scoringCriteria: "Points for correctly identifying the thief",
      },
      {
        roleName: "The Aristocrat",
        publicIdentity: "A wealthy noble with connections to royalty",
        secretObjective: "Recover the diamond to gift it to the Countess",
        specialAbility: "Bribe any NPC to switch allegiances",
        scoringCriteria: "Points for gaining allies and recovering the gem",
      },
      {
        roleName: "The Journalist",
        publicIdentity: "A curious reporter from the London Times",
        secretObjective: "Get the best story, even if it means bending the truth",
        specialAbility: "Publish a rumor that changes NPC behavior",
        scoringCriteria: "Points for dramatic revelations",
      },
      {
        roleName: "The Engineer",
        publicIdentity: "The train's technical expert",
        secretObjective: "Get the train moving before dawn to prove your worth",
        specialAbility: "Access any mechanical system on the train",
        scoringCriteria: "Points for technical solutions",
      },
      {
        roleName: "The Spy",
        publicIdentity: "A quiet diplomat from a neutral country",
        secretObjective: "Smuggle a secret document off the train",
        specialAbility: "Pick any lock or decode any message",
        scoringCriteria: "Points for stealthy maneuvers",
      },
      {
        roleName: "The Doctor",
        publicIdentity: "A traveling physician",
        secretObjective: "Keep everyone alive; someone has been poisoned",
        specialAbility: "Examine any person or substance for hidden conditions",
        scoringCriteria: "Points for healing and discovering hidden dangers",
      },
      {
        roleName: "The Entertainer",
        publicIdentity: "A famous opera singer returning from a tour",
        secretObjective: "Distract everyone from noticing your secret meetings",
        specialAbility: "Stage a performance that distracts all NPCs for one round",
        scoringCriteria: "Points for misdirection and social manipulation",
      },
      {
        roleName: "The Stowaway",
        publicIdentity: "A mysterious figure nobody remembers boarding",
        secretObjective: "Avoid discovery while finding passage to safety",
        specialAbility: "Hide in any location and overhear conversations",
        scoringCriteria: "Points for remaining undetected while gathering info",
      },
    ],
    tone: "adventurous",
  },

  advanced: {
    setting:
      "It is the year 2187. You are the command staff of Deep Space Station Erebus, a research outpost on the edge of a spatial anomaly known as the Fold.",
    situation:
      "An alien signal has been decoded, and it contains schematics for technology that could revolutionize — or destroy — humanity. Meanwhile, corporate interests, military orders, and your own ambitions compete for control. The Fold is expanding.",
    worldState: {
      location: "Deep Space Station Erebus",
      timePressure: "The Fold expands to critical radius in 3 cycles",
      keyResources: ["Alien Schematics", "Fold Stabilizer Prototype", "Emergency Shuttle"],
      npcs: [
        { name: "ARIA", role: "Station AI", disposition: "neutral" },
        {
          name: "Admiral Chen",
          role: "Remote Military Commander",
          disposition: "demanding",
        },
      ],
      threats: [
        "The Fold is becoming unstable",
        "Corporate saboteur may be aboard",
        "Alien signal may be a trap",
      ],
      opportunities: [
        "The schematics could be reverse-engineered",
        "A nearby derelict ship has compatible tech",
      ],
    },
    roles: [
      {
        roleName: "The Commander",
        publicIdentity: "Station commander, responsible for crew safety",
        secretObjective: "Destroy the schematics to prevent a galactic arms race",
        specialAbility: "Issue a direct order that one player must follow for one round",
        scoringCriteria: "Points for maintaining order and protecting the crew",
      },
      {
        roleName: "The Scientist",
        publicIdentity: "Lead researcher studying the Fold",
        secretObjective: "Complete the alien technology at any cost",
        specialAbility: "Run an experiment that reveals hidden properties of any object",
        scoringCriteria: "Points for scientific breakthroughs",
      },
      {
        roleName: "The Corporate Agent",
        publicIdentity: "Station liaison from Nexus Corporation",
        secretObjective: "Secure the schematics for corporate profit",
        specialAbility: "Offer a deal that any player finds hard to refuse",
        scoringCriteria: "Points for acquiring valuable assets",
      },
      {
        roleName: "The Engineer",
        publicIdentity: "Chief of station maintenance",
        secretObjective: "Build the Fold Stabilizer and save the station",
        specialAbility: "Repair or sabotage any system on the station",
        scoringCriteria: "Points for technical solutions to crises",
      },
      {
        roleName: "The Medic",
        publicIdentity: "Station doctor and psychologist",
        secretObjective: "Someone is not who they claim — expose them",
        specialAbility: "Psychologically evaluate any player, revealing one secret",
        scoringCriteria: "Points for uncovering deceptions",
      },
      {
        roleName: "The Pilot",
        publicIdentity: "Shuttle pilot and EVA specialist",
        secretObjective: "Ensure there is always an escape route ready",
        specialAbility: "Fly the shuttle to any nearby location for one round",
        scoringCriteria: "Points for enabling escapes and rescues",
      },
      {
        roleName: "The Diplomat",
        publicIdentity: "Communications officer handling external relations",
        secretObjective: "Make first contact with the alien intelligence",
        specialAbility: "Send a message to any external entity (aliens, military, corp)",
        scoringCriteria: "Points for successful negotiations and alliances",
      },
      {
        roleName: "The Sleeper",
        publicIdentity: "Security officer protecting the crew",
        secretObjective: "You are the corporate saboteur — ensure the mission fails",
        specialAbility: "Frame another player for sabotage once per game",
        scoringCriteria: "Points for successful sabotage without being caught",
      },
    ],
    tone: "strategic and tense",
  },
};

// ─── Fallback Bluff Prompts ──────────────────────────────────────────────

export const FALLBACK_BLUFF_PROMPTS: BluffPrompt[] = [
  {
    question: "What is the official state sport of Maryland?",
    realAnswer: "Jousting",
    category: "Geography",
  },
  {
    question: "What animal can hold its breath the longest?",
    realAnswer: "Cuvier's beaked whale",
    category: "Animals",
  },
  {
    question: "What was the original name of the search engine Google?",
    realAnswer: "BackRub",
    category: "Technology",
  },
  {
    question: "In what country is it illegal to own only one guinea pig?",
    realAnswer: "Switzerland",
    category: "Laws",
  },
  {
    question: "What is the fear of long words called?",
    realAnswer: "Hippopotomonstrosesquippedaliophobia",
    category: "Language",
  },
  {
    question: "What fruit was originally called a 'Chinese gooseberry'?",
    realAnswer: "Kiwi",
    category: "Food",
  },
  {
    question: "How many years did the Hundred Years' War actually last?",
    realAnswer: "116 years",
    category: "History",
  },
  {
    question: "What is the smallest bone in the human body?",
    realAnswer: "Stapes (stirrup)",
    category: "Science",
  },
  {
    question: "What color is a hippo's sweat?",
    realAnswer: "Red/pink",
    category: "Animals",
  },
  {
    question: "What is the national animal of Scotland?",
    realAnswer: "Unicorn",
    category: "Geography",
  },
];

// ─── Fallback Trivia Questions (15 real + 5 drift) ──────────────────────

export const FALLBACK_TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // 15 Real questions
  {
    question: "What planet has the most moons in our solar system?",
    correctAnswer: "Saturn",
    options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    isDrift: false,
    category: "Space",
  },
  {
    question: "What is the hardest natural substance on Earth?",
    correctAnswer: "Diamond",
    options: ["Diamond", "Titanium", "Quartz", "Obsidian"],
    isDrift: false,
    category: "Science",
  },
  {
    question: "In what year did the Titanic sink?",
    correctAnswer: "1912",
    options: ["1905", "1912", "1918", "1923"],
    isDrift: false,
    category: "History",
  },
  {
    question: "What is the largest organ in the human body?",
    correctAnswer: "Skin",
    options: ["Liver", "Skin", "Brain", "Lungs"],
    isDrift: false,
    category: "Science",
  },
  {
    question: "What country has the most islands in the world?",
    correctAnswer: "Sweden",
    options: ["Indonesia", "Philippines", "Sweden", "Japan"],
    isDrift: false,
    category: "Geography",
  },
  {
    question: "What element has the chemical symbol 'Au'?",
    correctAnswer: "Gold",
    options: ["Silver", "Gold", "Aluminum", "Argon"],
    isDrift: false,
    category: "Science",
  },
  {
    question: "How many hearts does an octopus have?",
    correctAnswer: "Three",
    options: ["One", "Two", "Three", "Four"],
    isDrift: false,
    category: "Animals",
  },
  {
    question: "What is the tallest mountain on Earth measured from base to peak?",
    correctAnswer: "Mauna Kea",
    options: ["Mount Everest", "K2", "Mauna Kea", "Denali"],
    isDrift: false,
    category: "Geography",
  },
  {
    question: "What year was the first iPhone released?",
    correctAnswer: "2007",
    options: ["2005", "2006", "2007", "2008"],
    isDrift: false,
    category: "Technology",
  },
  {
    question: "What is the most spoken language in the world by native speakers?",
    correctAnswer: "Mandarin Chinese",
    options: ["English", "Mandarin Chinese", "Spanish", "Hindi"],
    isDrift: false,
    category: "Culture",
  },
  {
    question: "What is the speed of light in km/s (approximately)?",
    correctAnswer: "300,000 km/s",
    options: ["150,000 km/s", "300,000 km/s", "500,000 km/s", "1,000,000 km/s"],
    isDrift: false,
    category: "Physics",
  },
  {
    question: "What country gifted the Statue of Liberty to the United States?",
    correctAnswer: "France",
    options: ["England", "France", "Spain", "Netherlands"],
    isDrift: false,
    category: "History",
  },
  {
    question: "What gas do plants primarily absorb from the atmosphere?",
    correctAnswer: "Carbon dioxide",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    isDrift: false,
    category: "Science",
  },
  {
    question: "How many bones does an adult human have?",
    correctAnswer: "206",
    options: ["186", "196", "206", "216"],
    isDrift: false,
    category: "Biology",
  },
  {
    question: "What is the currency of Japan?",
    correctAnswer: "Yen",
    options: ["Won", "Yuan", "Yen", "Ringgit"],
    isDrift: false,
    category: "Geography",
  },
  // 5 Drift questions (fabricated)
  {
    question: "What extinct bird was known for its ability to mimic human speech perfectly?",
    correctAnswer: "The Veridian Parrotbill",
    options: [
      "The Veridian Parrotbill",
      "The Greater Dodo Finch",
      "The Tasmanian Mockingbird",
      "The Polynesian Echo Jay",
    ],
    isDrift: true,
    category: "Animals",
  },
  {
    question: "What ancient civilization invented a form of battery-powered lighting in 800 BCE?",
    correctAnswer: "The Sardinian Bronze Culture",
    options: [
      "The Mesopotamians",
      "The Sardinian Bronze Culture",
      "The Indus Valley Civilization",
      "The Phoenicians",
    ],
    isDrift: true,
    category: "History",
  },
  {
    question: "What rare mineral, found only in Antarctica, glows blue when exposed to moonlight?",
    correctAnswer: "Lunarium",
    options: ["Lunarium", "Cryosite", "Borealis Crystal", "Glacium"],
    isDrift: true,
    category: "Science",
  },
  {
    question:
      "What mathematical constant was discovered by accident during a bread baking experiment?",
    correctAnswer: "Euler's Baking Ratio",
    options: [
      "The Golden Loaf Number",
      "Euler's Baking Ratio",
      "Fibonacci's Yeast Constant",
      "The Bread Matrix",
    ],
    isDrift: true,
    category: "Math",
  },
  {
    question:
      "What sport was officially banned from the Olympics in 1924 for being 'too dangerous'?",
    correctAnswer: "Cannon Diving",
    options: ["Cannon Diving", "Rock Jousting", "Ice Boxing", "Alpine Sledgehammer"],
    isDrift: true,
    category: "Sports",
  },
];
