import type {
  BluffPrompt,
  GeneratedBoard,
  GeneratedScenario,
  TriviaQuestion,
} from "@flimflam/shared";

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

// ─── Fallback Headline Rounds (15 real + 5 drift) ───────────────────────

export const FALLBACK_TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // 15 Real rounds
  {
    question: "Scientists publish the first-ever image of a _____",
    correctAnswer: "Black hole",
    options: ["Black hole", "Neutron star", "Dark matter", "Solar flare"],
    isDrift: false,
    category: "Science Breakthrough",
  },
  {
    question: "Security teams push adoption of _____ to replace passwords",
    correctAnswer: "Passkeys",
    options: ["Passkeys", "Face tattoos", "Stone tablets", "Magic words"],
    isDrift: false,
    category: "Tech",
  },
  {
    question: "Viral slang term '_____ diff' spreads across gaming streams",
    correctAnswer: "skill",
    options: ["skill", "server", "camera", "weather"],
    isDrift: false,
    category: "Social Trend",
  },
  {
    question: "Researchers detect ripples in spacetime called _____ waves",
    correctAnswer: "gravitational",
    options: ["gravitational", "microwave", "sound", "traffic"],
    isDrift: false,
    category: "Science Breakthrough",
  },
  {
    question: "New phones increasingly ship with _____ charging as the default",
    correctAnswer: "USB-C",
    options: ["USB-C", "FireWire", "VGA", "SCSI"],
    isDrift: false,
    category: "Tech",
  },
  {
    question: "Space telescope reveals stunning images of distant _____",
    correctAnswer: "galaxies",
    options: ["galaxies", "volcanoes", "dinosaurs", "skateboards"],
    isDrift: false,
    category: "Science Breakthrough",
  },
  {
    question: "Delivery startups race to promise _____-minute groceries",
    correctAnswer: "10",
    options: ["5", "10", "30", "90"],
    isDrift: false,
    category: "Startup Launch",
  },
  {
    question: "Creators obsess over '_____core' cozy woodland aesthetics",
    correctAnswer: "cottage",
    options: ["cottage", "server", "cement", "banquet"],
    isDrift: false,
    category: "Social Trend",
  },
  {
    question: "Electric vehicles popularize _____ braking to recapture energy",
    correctAnswer: "regenerative",
    options: ["regenerative", "decorative", "explosive", "invisible"],
    isDrift: false,
    category: "Tech",
  },
  {
    question: "Researchers confirm water ice on the Moon in _____ craters",
    correctAnswer: "shadowed",
    options: ["shadowed", "volcanic", "underwater", "tropical"],
    isDrift: false,
    category: "Science Breakthrough",
  },
  {
    question: "New app pitches itself as 'Uber for _____' in a crowded market",
    correctAnswer: "everything",
    options: ["everything", "gravity", "volcanoes", "time"],
    isDrift: false,
    category: "Startup Launch",
  },
  {
    question: "A wave of videos claims you can master any hobby in _____ days",
    correctAnswer: "30",
    options: ["7", "30", "365", "1000"],
    isDrift: false,
    category: "Social Trend",
  },
  {
    question: "AI startups claim they can clone your voice from _____ seconds of audio",
    correctAnswer: "3",
    options: ["1", "3", "30", "300"],
    isDrift: false,
    category: "Startup Launch",
  },
  {
    question: "Viral 'Birds Aren't Real' posts insist pigeons are government _____",
    correctAnswer: "drones",
    options: ["drones", "pancakes", "planets", "submarines"],
    isDrift: false,
    category: "Conspiracy Post",
  },
  {
    question: "Mars rover _____ begins exploring Jezero Crater",
    correctAnswer: "Perseverance",
    options: ["Perseverance", "Curiosity", "Opportunity", "Pathfinder"],
    isDrift: false,
    category: "Science Breakthrough",
  },
  // 5 Drift rounds (fabricated)
  {
    question: "Conspiracy thread claims your phone's autocorrect is controlled by _____ spirits",
    correctAnswer: "poltergeist",
    options: ["poltergeist", "wifi", "gravitons", "caterpillars"],
    isDrift: true,
    category: "Conspiracy Post",
  },
  {
    question: "Startup launches a subscription that delivers jars of _____ air to your door",
    correctAnswer: "mountain",
    options: ["mountain", "office", "underwater", "microwave"],
    isDrift: true,
    category: "Startup Launch",
  },
  {
    question: "Scientists unveil a 'time mirror' that reflects objects _____ minutes into the past",
    correctAnswer: "5",
    options: ["1", "5", "60", "500"],
    isDrift: true,
    category: "Science Breakthrough",
  },
  {
    question: "New laptop claims it can run forever by harvesting _____ energy",
    correctAnswer: "moonlight",
    options: ["moonlight", "wifi", "pizza", "traffic"],
    isDrift: true,
    category: "Tech",
  },
  {
    question: "Teens start greeting each other by tapping phones to exchange a _____ token",
    correctAnswer: "smile",
    options: ["smile", "banana", "gravity", "lawn"],
    isDrift: true,
    category: "Social Trend",
  },
];

// ─── Fallback Brain Battle Boards ────────────────────────────────────────

export const FALLBACK_BOARDS: GeneratedBoard[] = [
  {
    categories: [
      {
        name: "Animals in Space",
        clues: [
          {
            id: "fb1-1-1",
            answer: "This fruit fly became the first animal launched into space in 1947",
            question: "What is a fruit fly?",
            value: 200,
          },
          {
            id: "fb1-1-2",
            answer: "This Soviet dog became the first animal to orbit Earth in 1957",
            question: "Who is Laika?",
            value: 400,
          },
          {
            id: "fb1-1-3",
            answer: "These two monkeys named Able and Miss Baker survived spaceflight in 1959",
            question: "What are rhesus and squirrel monkeys?",
            value: 600,
          },
          {
            id: "fb1-1-4",
            answer: "In 2007, these micro-animals survived exposure to the vacuum of space",
            question: "What are tardigrades?",
            value: 800,
          },
          {
            id: "fb1-1-5",
            answer: "This French cat named Felicette was launched to space in 1963",
            question: "What is a cat?",
            value: 1000,
          },
        ],
      },
      {
        name: "Famous Last Words",
        clues: [
          {
            id: "fb1-2-1",
            answer: "'I have a dream' was the famous refrain of this civil rights leader",
            question: "Who is Martin Luther King Jr.?",
            value: 200,
          },
          {
            id: "fb1-2-2",
            answer: "This Apple co-founder's last words were reportedly 'Oh wow. Oh wow. Oh wow.'",
            question: "Who is Steve Jobs?",
            value: 400,
          },
          {
            id: "fb1-2-3",
            answer: "This playwright said 'I am dying beyond my means' on his deathbed",
            question: "Who is Oscar Wilde?",
            value: 600,
          },
          {
            id: "fb1-2-4",
            answer: "This composer reportedly said 'I shall hear in heaven' as his final words",
            question: "Who is Beethoven?",
            value: 800,
          },
          {
            id: "fb1-2-5",
            answer: "This outlaw's last words before being shot were allegedly 'Who's there?'",
            question: "Who is Billy the Kid?",
            value: 1000,
          },
        ],
      },
      {
        name: "Taylor Swift & Physics",
        clues: [
          {
            id: "fb1-3-1",
            answer:
              "Taylor's 'Love Story' and this Newton law both describe equal and opposite reactions",
            question: "What is Newton's Third Law?",
            value: 200,
          },
          {
            id: "fb1-3-2",
            answer: "Like entropy, this Taylor album showed things only move in one direction",
            question: "What is 1989?",
            value: 400,
          },
          {
            id: "fb1-3-3",
            answer:
              "This force keeps Swift's concert crowds on the ground, measured at 9.8 m/s squared",
            question: "What is gravity?",
            value: 600,
          },
          {
            id: "fb1-3-4",
            answer:
              "Taylor's 'Eras Tour' and this physics concept both involve moving through distinct periods",
            question: "What is a phase transition?",
            value: 800,
          },
          {
            id: "fb1-3-5",
            answer:
              "In quantum mechanics, this principle says you can't know a particle's position and momentum simultaneously, much like predicting Taylor's next album genre",
            question: "What is the Heisenberg Uncertainty Principle?",
            value: 1000,
          },
        ],
      },
      {
        name: "Before & After",
        clues: [
          {
            id: "fb1-4-1",
            answer: "A tropical fruit that's also a tech company's headquarters city",
            question: "What is Apple Park?",
            value: 200,
          },
          {
            id: "fb1-4-2",
            answer: "The Disney princess who shares her name with a sleep state in computers",
            question: "Who is Aurora?",
            value: 400,
          },
          {
            id: "fb1-4-3",
            answer: "The card game that shares its name with a region destroyed by a volcano",
            question: "What is Pompeii Poker? (Pompeii)",
            value: 600,
          },
          {
            id: "fb1-4-4",
            answer: "A Beatles song that is also a type of heavy construction equipment",
            question: "What is Yellow Submarine?",
            value: 800,
          },
          {
            id: "fb1-4-5",
            answer: "A Shakespeare play whose title character shares a name with a Roman month",
            question: "What is Julius Caesar?",
            value: 1000,
          },
        ],
      },
      {
        name: "Things That Are Red",
        clues: [
          {
            id: "fb1-5-1",
            answer: "This planet is known as the Red Planet",
            question: "What is Mars?",
            value: 200,
          },
          {
            id: "fb1-5-2",
            answer: "This gemstone is the birthstone for July",
            question: "What is a ruby?",
            value: 400,
          },
          {
            id: "fb1-5-3",
            answer: "This famous canyon in Arizona gets its red color from iron oxide",
            question: "What is the Grand Canyon?",
            value: 600,
          },
          {
            id: "fb1-5-4",
            answer: "This giant star in the constellation Orion has a distinctly reddish hue",
            question: "What is Betelgeuse?",
            value: 800,
          },
          {
            id: "fb1-5-5",
            answer:
              "This sea between Africa and the Arabian Peninsula gets its name from seasonal algae blooms",
            question: "What is the Red Sea?",
            value: 1000,
          },
        ],
      },
    ],
  },
  {
    categories: [
      {
        name: "Video Games",
        clues: [
          {
            id: "fb2-1-1",
            answer: "This plumber has been rescuing Princess Peach since 1985",
            question: "Who is Mario?",
            value: 200,
          },
          {
            id: "fb2-1-2",
            answer:
              "This block-building survival game became the best-selling video game of all time",
            question: "What is Minecraft?",
            value: 400,
          },
          {
            id: "fb2-1-3",
            answer:
              "This battle royale game introduced building mechanics and took over pop culture in 2018",
            question: "What is Fortnite?",
            value: 600,
          },
          {
            id: "fb2-1-4",
            answer:
              "This 2017 Nintendo game lets you cook apples, tame horses, and fight Guardians in Hyrule",
            question: "What is The Legend of Zelda: Breath of the Wild?",
            value: 800,
          },
          {
            id: "fb2-1-5",
            answer:
              "This FromSoftware game won Game of the Year 2022 and was co-created with George R.R. Martin",
            question: "What is Elden Ring?",
            value: 1000,
          },
        ],
      },
      {
        name: "Cooking & Chemistry",
        clues: [
          {
            id: "fb2-2-1",
            answer: "Adding this NaHCO3 compound to batter makes cakes rise",
            question: "What is baking soda?",
            value: 200,
          },
          {
            id: "fb2-2-2",
            answer: "This reaction between amino acids and sugars gives browned food its flavor",
            question: "What is the Maillard reaction?",
            value: 400,
          },
          {
            id: "fb2-2-3",
            answer:
              "Chefs use this process of heating and cooling chocolate to give it a glossy finish and snap",
            question: "What is tempering?",
            value: 600,
          },
          {
            id: "fb2-2-4",
            answer: "This protein in eggs denatures when heated, causing them to solidify",
            question: "What is albumin?",
            value: 800,
          },
          {
            id: "fb2-2-5",
            answer: "This gas, produced by yeast fermentation, is what makes bread dough rise",
            question: "What is carbon dioxide?",
            value: 1000,
          },
        ],
      },
      {
        name: "World Capitals",
        clues: [
          {
            id: "fb2-3-1",
            answer: "This city with the Eiffel Tower is the capital of France",
            question: "What is Paris?",
            value: 200,
          },
          {
            id: "fb2-3-2",
            answer: "This capital city sits on the Potomac River in a district that is not a state",
            question: "What is Washington, D.C.?",
            value: 400,
          },
          {
            id: "fb2-3-3",
            answer: "This capital of Australia is often confused with Sydney or Melbourne",
            question: "What is Canberra?",
            value: 600,
          },
          {
            id: "fb2-3-4",
            answer: "This capital of Mongolia shares its name with a famous conqueror",
            question: "What is Ulaanbaatar?",
            value: 800,
          },
          {
            id: "fb2-3-5",
            answer: "This South American capital sits at over 11,000 feet elevation in the Andes",
            question: "What is La Paz?",
            value: 1000,
          },
        ],
      },
      {
        name: "Movies & Mathematics",
        clues: [
          {
            id: "fb2-4-1",
            answer: "The number of Dalmatians in the classic Disney film",
            question: "What is 101?",
            value: 200,
          },
          {
            id: "fb2-4-2",
            answer: "This 2001 Russell Crowe film shares its name with a type of math competition",
            question: "What is A Beautiful Mind?",
            value: 400,
          },
          {
            id: "fb2-4-3",
            answer:
              "In The Matrix, Neo's world is a simulation based on this branch of math involving arrays of numbers",
            question: "What is linear algebra (matrices)?",
            value: 600,
          },
          {
            id: "fb2-4-4",
            answer:
              "This number, approximately 3.14159, appears in the title of a Darren Aronofsky film",
            question: "What is pi?",
            value: 800,
          },
          {
            id: "fb2-4-5",
            answer:
              "The film 'Hidden Figures' features mathematicians calculating this type of path for orbiting spacecraft",
            question: "What is a trajectory?",
            value: 1000,
          },
        ],
      },
      {
        name: "Before & After",
        clues: [
          {
            id: "fb2-5-1",
            answer:
              "A board game about real estate that's also a term for controlling a whole market",
            question: "What is Monopoly?",
            value: 200,
          },
          {
            id: "fb2-5-2",
            answer: "The social media platform where you 'tweet' that's also a sound birds make",
            question: "What is Twitter?",
            value: 400,
          },
          {
            id: "fb2-5-3",
            answer: "A Queen song and a type of rhyming two-line poem",
            question: "What is Bohemian Rhapsody (rhyming couplet)?",
            value: 600,
          },
          {
            id: "fb2-5-4",
            answer: "A horror author whose last name is also what medieval royalty sat on",
            question: "Who is Stephen King?",
            value: 800,
          },
          {
            id: "fb2-5-5",
            answer: "The Greek god of the sea whose name is also a planet and a trident brand",
            question: "What is Neptune?",
            value: 1000,
          },
        ],
      },
    ],
  },
  {
    categories: [
      {
        name: "90s Nostalgia",
        clues: [
          {
            id: "fb3-1-1",
            answer: "This virtual pet on a keychain demanded constant feeding and attention",
            question: "What is a Tamagotchi?",
            value: 200,
          },
          {
            id: "fb3-1-2",
            answer: "This Nickelodeon game show involved a giant nose called the Aggro Crag",
            question: "What is GUTS?",
            value: 400,
          },
          {
            id: "fb3-1-3",
            answer:
              "This toy let you see colorful geometric patterns by looking through a tube and rotating the end",
            question: "What is a kaleidoscope?",
            value: 600,
          },
          {
            id: "fb3-1-4",
            answer:
              "This 1996 electronic toy repeated color-and-sound sequences that players had to memorize",
            question: "What is Bop It?",
            value: 800,
          },
          {
            id: "fb3-1-5",
            answer:
              "This programming language, created in 1995, was originally called Mocha and then LiveScript",
            question: "What is JavaScript?",
            value: 1000,
          },
        ],
      },
      {
        name: "Pizza & World History",
        clues: [
          {
            id: "fb3-2-1",
            answer: "The Margherita pizza was named after this Italian queen in 1889",
            question: "Who is Queen Margherita of Savoy?",
            value: 200,
          },
          {
            id: "fb3-2-2",
            answer: "Pizza originated in this Italian city, also home to Mount Vesuvius",
            question: "What is Naples?",
            value: 400,
          },
          {
            id: "fb3-2-3",
            answer:
              "During this 1960s-era space race, astronauts ate freeze-dried food but never this popular dish in orbit",
            question: "What is pizza?",
            value: 600,
          },
          {
            id: "fb3-2-4",
            answer:
              "In 2001, Pizza Hut paid $1 million to deliver a pizza to this orbiting location",
            question: "What is the International Space Station?",
            value: 800,
          },
          {
            id: "fb3-2-5",
            answer:
              "The ancient Romans ate a flatbread called 'panis focacius' that evolved into this modern Italian bread",
            question: "What is focaccia?",
            value: 1000,
          },
        ],
      },
      {
        name: "Ocean Life",
        clues: [
          {
            id: "fb3-3-1",
            answer:
              "This eight-armed sea creature is known for its intelligence and ability to change color",
            question: "What is an octopus?",
            value: 200,
          },
          {
            id: "fb3-3-2",
            answer: "This 'clown' fish became famous after a 2003 Pixar movie",
            question: "What is a clownfish?",
            value: 400,
          },
          {
            id: "fb3-3-3",
            answer:
              "This bioluminescent creature is responsible for making parts of the ocean glow at night",
            question: "What is dinoflagellate plankton?",
            value: 600,
          },
          {
            id: "fb3-3-4",
            answer: "This giant squid rival can grow over 40 feet and lives in the deep ocean",
            question: "What is a colossal squid?",
            value: 800,
          },
          {
            id: "fb3-3-5",
            answer:
              "This immortal jellyfish can revert to its polyp stage, theoretically living forever",
            question: "What is Turritopsis dohrnii?",
            value: 1000,
          },
        ],
      },
      {
        name: "Music & Sports Mashup",
        clues: [
          {
            id: "fb3-4-1",
            answer: "Freddie Mercury and this sport both involve a 'Queen' and a checkered flag",
            question: "What is Formula 1 racing?",
            value: 200,
          },
          {
            id: "fb3-4-2",
            answer:
              "This instrument and a baseball position share the name 'pitcher'... just kidding, but this one shares 'bass'",
            question: "What is a bass guitar?",
            value: 400,
          },
          {
            id: "fb3-4-3",
            answer:
              "The Super Bowl halftime show and this musical term both refer to a performance break",
            question: "What is an intermission?",
            value: 600,
          },
          {
            id: "fb3-4-4",
            answer:
              "In both cricket and music, this word means a series of connected performances or matches",
            question: "What is a tour?",
            value: 800,
          },
          {
            id: "fb3-4-5",
            answer:
              "Quarterback 'audibles' at the line share their name with this range of human hearing",
            question: "What is the audible frequency range?",
            value: 1000,
          },
        ],
      },
      {
        name: "Before & After",
        clues: [
          {
            id: "fb3-5-1",
            answer: "A fruit that shares its name with a color",
            question: "What is orange?",
            value: 200,
          },
          {
            id: "fb3-5-2",
            answer: "A planet that shares its name with a Roman god of war and a chocolate bar",
            question: "What is Mars?",
            value: 400,
          },
          {
            id: "fb3-5-3",
            answer: "This word means a baby cat and also a brand of candy bar",
            question: "What is Kit Kat?",
            value: 600,
          },
          {
            id: "fb3-5-4",
            answer: "A chess piece that shares its name with a fortified structure",
            question: "What is a rook (castle)?",
            value: 800,
          },
          {
            id: "fb3-5-5",
            answer: "This word means a musical note duration and also a monetary unit in the UK",
            question: "What is a pound?",
            value: 1000,
          },
        ],
      },
    ],
  },
];
