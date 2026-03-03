// ─── Jeopardy Clue Bank ───────────────────────────────────────────────────
// 11 boards per complexity level (kids / standard / advanced) = 33 total.
// Each board: 6 categories x 5 clues at $200 / $400 / $600 / $800 / $1000.

export interface JeopardyClue {
  answer: string;
  question: string;
  value: number;
}

export interface JeopardyCategory {
  name: string;
  clues: JeopardyClue[];
}

export interface JeopardyBoard {
  categories: JeopardyCategory[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function cat(name: string, clues: [string, string][]): JeopardyCategory {
  const values = [200, 400, 600, 800, 1000];
  return {
    name,
    clues: clues.map(([answer, question], i) => ({
      answer,
      question,
      value: values[i] ?? 0,
    })),
  };
}

function board(...categories: JeopardyCategory[]): JeopardyBoard {
  return { categories };
}

// ═══════════════════════════════════════════════════════════════════════════
// KIDS BOARDS (8+)
// ═══════════════════════════════════════════════════════════════════════════

export const KIDS_BOARDS: JeopardyBoard[] = [
  // Board 1
  board(
    cat("Disney & Pixar", [
      ["Elsa", "Which queen from Arendelle told everyone to 'Let It Go'?"],
      ["Woody", "Who is Buzz Lightyear's cowboy best friend in Toy Story?"],
      ["Moana", "Which Disney princess sailed across the ocean to save her island?"],
      ["WALL-E", "Which lonely robot spent 700 years cleaning up trash on Earth?"],
      [
        "Encanto",
        "In which movie does every Madrigal family member get a magical gift except Mirabel?",
      ],
    ]),
    cat("YouTube & TikTok", [
      [
        "MrBeast",
        "Which YouTuber is famous for giving away millions of dollars in extreme challenges?",
      ],
      [
        "Baby Shark",
        "Which song about a family of sea creatures became the most-viewed YouTube video ever?",
      ],
      [
        "Among Us",
        "Which multiplayer game about finding the impostor blew up on YouTube and Twitch?",
      ],
      ["Charli D'Amelio", "Who was the first person to reach 100 million followers on TikTok?"],
      [
        "Skibidi Toilet",
        "Which bizarre YouTube series features singing toilets battling cameramen?",
      ],
    ]),
    cat("Video Games", [
      ["Mario", "Who is Nintendo's famous plumber that rescues Princess Peach?"],
      ["Fortnite", "Which battle royale game is known for its Victory Royale and dance emotes?"],
      ["Minecraft", "In which game do you mine blocks and craft tools in a blocky 3D world?"],
      ["Pikachu", "Which yellow electric mouse is the most famous Pokémon?"],
      ["Roblox", "Which platform lets you play millions of games created by other users?"],
    ]),
    cat("Superheroes", [
      [
        "Spider-Man",
        "Which hero was bitten by a radioactive spider and shoots webs from his wrists?",
      ],
      ["Black Panther", "Which Marvel hero is the king of Wakanda?"],
      ["Wonder Woman", "Which DC superhero is an Amazon warrior princess from Themyscira?"],
      [
        "Groot",
        "Which tree-like Guardian of the Galaxy can only say three words: 'I am' plus his name?",
      ],
      [
        "Miles Morales",
        "Which teenager from Brooklyn became the Spider-Man of his universe in Into the Spider-Verse?",
      ],
    ]),
    cat("Kids TV Shows", [
      ["Bluey", "Which Australian animated show stars a Blue Heeler puppy and her family?"],
      [
        "Stranger Things",
        "Which Netflix show features kids fighting monsters from the Upside Down in Hawkins, Indiana?",
      ],
      ["SpongeBob", "Which sea creature lives in a pineapple under the sea in Bikini Bottom?"],
      [
        "Gabby's Dollhouse",
        "Which Netflix show follows a girl who shrinks down to play inside her magical dollhouse?",
      ],
      [
        "Percy Jackson",
        "Which Disney+ series follows a boy who discovers he's the son of a Greek god?",
      ],
    ]),
    cat("Viral Moments", [
      ["The dress", "In 2015, was a certain piece of clothing blue and black, or white and gold?"],
      ["Rickrolling", "What internet prank tricks people into watching a Rick Astley music video?"],
      [
        "Ice Bucket Challenge",
        "What viral challenge had people dumping cold water on their heads for ALS charity?",
      ],
      ["Corn Kid", "Which boy went viral for declaring 'It's corn!' and saying it has the juice?"],
      [
        "Grimace Shake",
        "Which purple McDonald's character's birthday shake went viral with spooky TikToks?",
      ],
    ]),
  ),

  // Board 2
  board(
    cat("Popular Songs", [
      [
        "Old Town Road",
        "Which record-breaking Lil Nas X hit has him riding his horse down a road?",
      ],
      ["Let It Go", "Which Frozen power ballad was sung by literally every kid in 2014?"],
      ["Happy", "Which Pharrell Williams feel-good song from Despicable Me 2 made everyone dance?"],
      ["Shake It Off", "In which 2014 Taylor Swift anthem does she tell haters what to do?"],
      [
        "Flowers",
        "In which 2023 Miley Cyrus breakup anthem does she sing about buying herself something?",
      ],
    ]),
    cat("Roblox & Minecraft", [
      ["Creeper", "Which green Minecraft mob sneaks up on players and explodes?"],
      ["Adopt Me", "Which Roblox game lets you raise and trade virtual pets?"],
      ["The Nether", "Which fiery Minecraft dimension is full of lava, ghasts, and piglins?"],
      ["Robux", "What is the virtual currency you spend in Roblox?"],
      ["The Ender Dragon", "What is the final boss you fight in Minecraft's End dimension?"],
    ]),
    cat("Sports Stars", [
      [
        "Lionel Messi",
        "Which Argentine soccer legend finally won the World Cup in 2022 and then joined Inter Miami?",
      ],
      [
        "Simone Biles",
        "Which gymnast is considered the GOAT and came back to dominate the 2024 Paris Olympics?",
      ],
      ["LeBron James", "Which NBA legend played on the same Lakers team as his son Bronny?"],
      [
        "Caitlin Clark",
        "Which Iowa basketball star broke the NCAA scoring record and was drafted #1 in the WNBA?",
      ],
      [
        "Usain Bolt",
        "Which Jamaican sprinter holds the world record in both the 100m and 200m dash?",
      ],
    ]),
    cat("Movie Quotes", [
      ["To infinity and beyond", "What is Buzz Lightyear's famous catchphrase in Toy Story?"],
      ["I am Groot", "What is the only sentence spoken by the tree-like Guardian of the Galaxy?"],
      [
        "Just keep swimming",
        "What is Dory's advice for getting through tough times in Finding Nemo?",
      ],
      ["Wakanda forever", "What salute became a global symbol after the Black Panther movie?"],
      ["That's my spot", "What does Sheldon Cooper insist about his seat on The Big Bang Theory?"],
    ]),
    cat("Social Media", [
      ["Instagram", "Which app is known for Stories, Reels, and photo filters?"],
      ["TikTok", "Which short-video app owned by ByteDance has over a billion users worldwide?"],
      [
        "BeReal",
        "Which app sends a daily notification for you to post an unfiltered photo within 2 minutes?",
      ],
      ["Discord", "Which chat platform with servers and voice channels is huge with gamers?"],
      ["Threads", "Which text-based app did Meta launch in 2023 to compete with Twitter/X?"],
    ]),
    cat("Memes & Internet", [
      ["Doge", "Which Shiba Inu dog became a famous meme and even inspired a cryptocurrency?"],
      [
        "Nyan Cat",
        "Which pixelated cat with a Pop-Tart body flies through space leaving a rainbow trail?",
      ],
      [
        "Distracted Boyfriend",
        "Which stock photo meme shows a man looking at another woman while his girlfriend stares?",
      ],
      [
        "This is fine",
        "Which meme shows a cartoon dog sitting in a burning room saying everything is okay?",
      ],
      [
        "Woman yelling at cat",
        "Which meme combines a Real Housewives scene with a confused white cat at a dinner table?",
      ],
    ]),
  ),

  // Board 3
  board(
    cat("Animated Movies", [
      [
        "Turning Red",
        "Which Pixar movie is about a girl who turns into a giant red panda when she gets emotional?",
      ],
      [
        "Luca",
        "Which Pixar movie follows two sea monsters pretending to be human in an Italian town?",
      ],
      ["Wish", "Which Disney movie is set in the kingdom of Rosas where a star grants wishes?"],
      [
        "Elemental",
        "Which Pixar movie takes place in a city where fire, water, earth, and air people live together?",
      ],
      ["Inside Out 2", "Which sequel introduced Anxiety as a new emotion in Riley's head?"],
    ]),
    cat("Gaming Legends", [
      ["Zelda", "Which princess does Link always try to save in a legendary Nintendo franchise?"],
      ["Sonic", "Which blue hedgehog runs super fast and collects golden rings?"],
      ["Steve", "Who is the default player character in Minecraft?"],
      ["Kirby", "Which round pink Nintendo character swallows enemies to copy their powers?"],
      ["Master Chief", "Who is the armored super soldier hero of the Halo video game series?"],
    ]),
    cat("Taylor Swift", [
      [
        "Eras Tour",
        "What is the name of Taylor Swift's record-breaking concert tour named after all her musical periods?",
      ],
      ["Travis Kelce", "Which Kansas City Chiefs player started dating Taylor Swift in 2023?"],
      ["Swifties", "What do Taylor Swift's devoted fans call themselves?"],
      [
        "Fearless",
        "Which was the first Taylor Swift album to be re-recorded as a 'Taylor's Version'?",
      ],
      [
        "Tortured Poets Department",
        "Which Taylor Swift 2024 album broke first-day Spotify streaming records?",
      ],
    ]),
    cat("Space & Science", [
      ["Mars", "Which red planet is NASA's Perseverance rover exploring?"],
      [
        "James Webb",
        "Which space telescope launched in 2021 and takes stunning photos of distant galaxies?",
      ],
      [
        "SpaceX",
        "Which Elon Musk company builds reusable rockets and has launched astronauts to the ISS?",
      ],
      [
        "A black hole",
        "What invisible-sounding space object did scientists take the first-ever photo of in 2019?",
      ],
      [
        "Artemis",
        "What is the name of NASA's program to send astronauts back to the Moon for the first time since 1972?",
      ],
    ]),
    cat("Food Trends", [
      ["Boba tea", "Which Taiwanese drink with chewy tapioca pearls became a worldwide trend?"],
      ["Hot Cheetos", "Which spicy red snacks are a lunchroom favorite and have their own movie?"],
      ["Dalgona coffee", "Which whipped coffee drink went viral during COVID lockdowns?"],
      [
        "Crumbl Cookies",
        "Which cookie chain is famous for rotating weekly flavors and pink boxes?",
      ],
      [
        "Dubai chocolate",
        "Which pistachio-filled chocolate bar went viral on TikTok and sold out everywhere?",
      ],
    ]),
    cat("Dance Challenges", [
      [
        "Renegade",
        "Which TikTok dance created by Jalaiah Harmon became the app's most famous choreography?",
      ],
      ["Macarena", "Which 1990s line dance made a comeback as a viral TikTok trend?"],
      ["Floss", "Which side-to-side arm-swinging dance was made famous by the Backpack Kid?"],
      ["Griddy", "Which football celebration dance went viral after NFL players started doing it?"],
      [
        "Jingle Jangle",
        "Which catchy dance from a Netflix Christmas movie had kids doing it everywhere?",
      ],
    ]),
  ),

  // Board 4
  board(
    cat("Marvel Universe", [
      [
        "Iron Man",
        "Which superhero did Tony Stark become after building a suit of armor in a cave?",
      ],
      [
        "Thanos",
        "Which purple villain collected all six Infinity Stones to snap away half the universe?",
      ],
      ["Shang-Chi", "Which Marvel hero is a master of martial arts and wields the Ten Rings?"],
      ["Loki", "Who is Thor's mischievous adopted brother who got his own Disney+ TV series?"],
      [
        "Ms. Marvel",
        "Which stretchy superhero is secretly Pakistani-American teenager Kamala Khan?",
      ],
    ]),
    cat("Pet Influencers", [
      [
        "Jiffpom",
        "Which tiny Pomeranian holds Guinness World Records and has millions of Instagram followers?",
      ],
      [
        "Grumpy Cat",
        "Which cat named Tardar Sauce became famous for her permanently annoyed expression?",
      ],
      ["Doug the Pug", "Which chubby pug became 'King of Pop Culture' with millions of followers?"],
      [
        "Nala Cat",
        "Which Siamese-tabby mix holds the Guinness record for most Instagram followers for a cat?",
      ],
      [
        "Bunny the Sheepadoodle",
        "Which dog went viral for 'talking' to her owner using soundboard buttons?",
      ],
    ]),
    cat("Streaming Shows", [
      [
        "Squid Game",
        "In which Korean Netflix show do players compete in deadly children's games for prize money?",
      ],
      [
        "Wednesday",
        "Which deadpan Addams Family daughter did Jenna Ortega play in a hit Netflix series?",
      ],
      [
        "Cocomelon",
        "Which animated YouTube and Netflix show for toddlers features JJ and nursery rhymes?",
      ],
      [
        "One Piece",
        "Which Netflix live-action show is based on a manga about pirates searching for treasure?",
      ],
      [
        "Avatar",
        "Which animated show about the last airbender did Netflix make a live-action version of?",
      ],
    ]),
    cat("Olympic Sports", [
      ["Skateboarding", "Which sport made its Olympic debut at the Tokyo 2020 Games?"],
      [
        "Breaking",
        "Which hip-hop dance style debuted as an Olympic sport at the 2024 Paris Games?",
      ],
      ["Surfing", "Which wave-riding sport was added to the Olympics and held in Tahiti in 2024?"],
      ["Noah Lyles", "Which American sprinter won the 100m gold at the 2024 Paris Olympics?"],
      ["Climbing", "Which sport where athletes scale walls was new to the Olympics in Tokyo 2020?"],
    ]),
    cat("Board Games & Cards", [
      ["Uno", "In which card game do you shout the game's name when you have one card left?"],
      [
        "Pokemon cards",
        "Which collectible trading cards featuring creatures like Charizard can sell for thousands?",
      ],
      [
        "Monopoly",
        "In which classic board game do you buy properties and try to bankrupt your opponents?",
      ],
      [
        "Exploding Kittens",
        "In which popular card game do you draw cards and hope you don't draw a cat that blows up?",
      ],
      [
        "Wordle",
        "Which daily five-letter word guessing game turned green and yellow squares into a global obsession?",
      ],
    ]),
    cat("Funny Animals", [
      ["Fiona", "Which premature baby hippo at the Cincinnati Zoo became a viral superstar?"],
      [
        "Pesto",
        "Which giant King penguin chick at Melbourne's Sea Life Aquarium went viral for being enormous?",
      ],
      [
        "Lil Bub",
        "Which special-needs cat with a permanently stuck-out tongue became an internet celebrity?",
      ],
      [
        "Moo Deng",
        "Which baby pygmy hippo at a Thai zoo became a viral sensation and meme in 2024?",
      ],
      [
        "Harambe",
        "Which gorilla at the Cincinnati Zoo became one of the most famous memes of 2016?",
      ],
    ]),
  ),

  // Board 5
  board(
    cat("Emoji & Texting", [
      ["LOL", "Which acronym means 'laughing out loud'?"],
      ["The skull emoji", "On TikTok, which emoji means you're 'dead' from laughing so hard?"],
      ["GOAT", "Which acronym stands for 'Greatest Of All Time'?"],
      [
        "Cap",
        "Which slang word means someone is lying, where 'no' plus this word means they're truthful?",
      ],
      ["Fire emoji", "Which emoji is used to say something is really cool or 'lit'?"],
    ]),
    cat("Holidays & Events", [
      [
        "Halloween",
        "On which October holiday do kids dress up in costumes and go trick-or-treating?",
      ],
      [
        "Comic-Con",
        "At which annual San Diego convention do fans dress up and see movie trailers?",
      ],
      [
        "April Fools' Day",
        "On which day do companies and people try to trick everyone with fake announcements?",
      ],
      ["Pi Day", "Which math holiday falls on March 14th because the date looks like 3.14?"],
      [
        "Earth Day",
        "Which April 22nd holiday encourages everyone to help protect the environment?",
      ],
    ]),
    cat("Famous Duos", [
      [
        "Mario and Luigi",
        "Which plumber brothers from Nintendo always save the Mushroom Kingdom together?",
      ],
      ["Tom and Jerry", "Which cat and mouse have been chasing each other in cartoons since 1940?"],
      [
        "Elsa and Anna",
        "Which royal sisters from Frozen learned that love can thaw a frozen heart?",
      ],
      ["Batman and Robin", "Which Dynamic Duo protects Gotham City from villains?"],
      [
        "Sonic and Tails",
        "Which speedy blue hedgehog and his two-tailed fox friend fight Dr. Eggman?",
      ],
    ]),
    cat("Theme Parks", [
      ["Disney World", "Which Florida theme park is called 'The Most Magical Place on Earth'?"],
      [
        "Universal Studios",
        "Which theme park chain is home to the Wizarding World of Harry Potter?",
      ],
      ["Legoland", "Which theme park chain is built around colorful plastic building bricks?"],
      [
        "Six Flags",
        "Which amusement park chain known for its roller coasters is named after a number?",
      ],
      [
        "Super Nintendo World",
        "Which themed area at Universal lets you jump into the world of Mario?",
      ],
    ]),
    cat("Cool Inventions", [
      [
        "ChatGPT",
        "Which AI chatbot launched in 2022 and could write essays, code, and answer questions?",
      ],
      [
        "Apple Vision Pro",
        "What is Apple's mixed reality headset that lets you see digital content in the real world?",
      ],
      ["Tesla", "Which electric car company was the first to make EVs cool and mainstream?"],
      ["Nintendo Switch", "Which gaming console can be played on your TV or as a handheld device?"],
      [
        "3D printing",
        "Which technology builds physical objects layer by layer from a digital design?",
      ],
    ]),
    cat("World Records", [
      [
        "T-Rex",
        "The largest complete skeleton of which dinosaur, named Sue, is at the Chicago Field Museum?",
      ],
      [
        "Usain Bolt",
        "Who holds the world record for the fastest 100-meter sprint at 9.58 seconds?",
      ],
      ["Mount Everest", "What is the tallest mountain in the world at over 29,000 feet?"],
      ["Jenga", "The world record for the tallest tower was set in which block-stacking game?"],
      [
        "Speed cubing",
        "What is the competitive hobby where the world record for solving a Rubik's Cube is under 4 seconds?",
      ],
    ]),
  ),

  // Board 6
  board(
    cat("Pokémon", [
      [
        "Charizard",
        "Which fire-breathing dragon Pokémon is one of the original three final evolutions?",
      ],
      ["Poké Ball", "What red-and-white sphere do trainers throw to catch wild Pokémon?"],
      [
        "Ash Ketchum",
        "Which trainer from Pallet Town finally became a Pokémon World Champion after 25 years?",
      ],
      ["Eevee", "Which Pokémon is famous for being able to evolve into eight different forms?"],
      ["Scarlet and Violet", "Which two Pokémon games introduced an open-world format in 2022?"],
    ]),
    cat("Famous YouTubers", [
      ["PewDiePie", "Which Swedish YouTuber was the most subscribed individual creator for years?"],
      ["Dude Perfect", "Which group of friends is famous for impossible trick shots?"],
      [
        "Ryan Kaji",
        "Which kid started reviewing toys on YouTube and became one of the highest-paid creators?",
      ],
      ["Dream", "Which Minecraft YouTuber was famous for speedruns and wore a smiley-face mask?"],
      [
        "Mark Rober",
        "Which former NASA engineer makes viral science and engineering videos on YouTube?",
      ],
    ]),
    cat("Music Artists", [
      ["Olivia Rodrigo", "Whose debut hit 'drivers license' broke Spotify streaming records?"],
      [
        "Bad Bunny",
        "Which Puerto Rican reggaeton artist was Spotify's most-streamed artist multiple years in a row?",
      ],
      [
        "Billie Eilish",
        "Which singer won her first Grammy at age 18 and is known for her whispery vocal style?",
      ],
      [
        "The Weeknd",
        "Which Canadian singer performed at the Super Bowl halftime show surrounded by bandaged dancers?",
      ],
      ["Sabrina Carpenter", "Whose song 'Espresso' became the song of summer 2024?"],
    ]),
    cat("Weird & Wacky", [
      [
        "A rubber duck",
        "What is the bath toy whose world's-largest version toured harbors around the world?",
      ],
      [
        "Area 51",
        "Which top-secret Nevada base did millions of people jokingly sign up to storm in 2019?",
      ],
      [
        "Tide Pods",
        "Which colorful laundry detergent packets did teens start a dangerous challenge by eating?",
      ],
      [
        "Ship stuck in Suez Canal",
        "What happened when the Ever Given container ship got wedged sideways in a famous waterway in 2021?",
      ],
      [
        "Gender reveal party",
        "What type of celebration accidentally started a wildfire in California in 2020?",
      ],
    ]),
    cat("Anime & Manga", [
      ["Naruto", "Which ninja dreams of becoming Hokage and has a fox spirit sealed inside him?"],
      ["Goku", "Which Dragon Ball hero powers up by screaming until his hair turns golden?"],
      [
        "Demon Slayer",
        "In which hit anime does Tanjiro use Water Breathing techniques to fight demons?",
      ],
      [
        "One Piece",
        "In which series does Monkey D. Luffy want to find the treasure and become King of the Pirates?",
      ],
      [
        "My Hero Academia",
        "In which anime is Deku born without powers in a world where almost everyone has a Quirk?",
      ],
    ]),
    cat("Toys & Trends", [
      ["Fidget spinner", "Which three-pronged spinning toy became a massive craze in 2017?"],
      ["Pop It", "Which colorful silicone bubble-popping toy became a fidget sensation?"],
      [
        "Squishmallows",
        "Which super-soft, round stuffed animals became the most collected plush toy?",
      ],
      [
        "Lego",
        "Which Danish building brick company makes sets for everything from Star Wars to flowers?",
      ],
      [
        "Stanley cup",
        "Which insulated tumbler with a handle became a must-have accessory, especially in pastel colors?",
      ],
    ]),
  ),

  // Board 7
  board(
    cat("Harry Potter", [
      [
        "Hogwarts",
        "What is the school of witchcraft and wizardry with four houses: Gryffindor, Hufflepuff, Ravenclaw, and Slytherin?",
      ],
      ["Quidditch", "What is the wizarding sport played on broomsticks with a Golden Snitch?"],
      ["Dobby", "Which free house-elf loved socks and sacrificed himself to save Harry?"],
      [
        "Dumbledore",
        "Who was the headmaster of Hogwarts and the only wizard Voldemort ever feared?",
      ],
      [
        "Horcrux",
        "Harry had to destroy seven of which objects containing pieces of Voldemort's soul?",
      ],
    ]),
    cat("Star Wars", [
      [
        "Baby Yoda",
        "Which tiny green character from The Mandalorian became the internet's favorite 'Child'?",
      ],
      [
        "Darth Vader",
        "Which Sith Lord revealed he was Luke's father in one of cinema's biggest twists?",
      ],
      [
        "Lightsaber",
        "What glowing energy swords do Jedi and Sith fight with that come in different colors?",
      ],
      [
        "The Mandalorian",
        "Which Disney+ show follows a bounty hunter in Beskar armor through the galaxy?",
      ],
      [
        "Ahsoka",
        "Which former Jedi Padawan of Anakin Skywalker got her own Disney+ live-action series?",
      ],
    ]),
    cat("Internet Safety", [
      [
        "A password",
        "What secret combination of letters, numbers, and symbols should you never share with strangers?",
      ],
      [
        "Cyberbullying",
        "What is it called when someone is mean to another person online or through text messages?",
      ],
      [
        "Phishing",
        "What scam uses fake emails or messages to trick people into giving up personal information?",
      ],
      [
        "Screen time",
        "What do parents often set limits on to make sure kids don't spend too many hours on devices?",
      ],
      [
        "Two-factor authentication",
        "What security feature requires both a password and a code sent to your phone?",
      ],
    ]),
    cat("Geography Fun", [
      ["Australia", "Which country is also a continent and is home to kangaroos and koalas?"],
      [
        "The Amazon",
        "Which South American river and rainforest is the largest tropical forest on Earth?",
      ],
      ["Antarctica", "What is the coldest continent, covered almost entirely in ice?"],
      ["Japan", "Which island nation is famous for sushi, anime, and the bullet train?"],
      ["The Sahara", "What is the largest hot desert in the world, covering most of North Africa?"],
    ]),
    cat("Challenges & Pranks", [
      [
        "Mannequin Challenge",
        "In which 2016 viral trend did everyone freeze in place while a camera moved around them?",
      ],
      [
        "Bottle flip",
        "Which challenge involves tossing a water bottle and trying to make it land upright?",
      ],
      [
        "Invisible prank",
        "In which TikTok trend do family members pretend they can't see someone in the room?",
      ],
      [
        "Silhouette Challenge",
        "Which TikTok trend used a red filter and a doorframe to create a dramatic shadow effect?",
      ],
      [
        "Whipped cream challenge",
        "In which prank does someone put whipped cream on a sleeping person's hand and tickle their nose?",
      ],
    ]),
    cat("Nature & Weather", [
      [
        "Northern Lights",
        "What colorful dancing lights in the sky, also called aurora borealis, were visible unusually far south in 2024?",
      ],
      [
        "A tornado",
        "What spinning column of air can destroy buildings and is rated on the Enhanced Fujita scale?",
      ],
      ["Coral reef", "What is the Great Barrier Reef the world's largest structure made of?"],
      [
        "A solar eclipse",
        "What event in April 2024 had millions of Americans watching the moon completely block out the sun?",
      ],
      [
        "Climate change",
        "What is the term for rising global temperatures caused by greenhouse gases?",
      ],
    ]),
  ),

  // Board 8
  board(
    cat("Science & Nature", [
      ["Photosynthesis", "What is the process plants use to turn sunlight into food?"],
      ["Butterfly", "Which insect starts life as a caterpillar and goes through metamorphosis?"],
      ["Volcano", "What mountain can erupt and shoot hot lava, ash, and gas into the air?"],
      [
        "Fossil",
        "What is the preserved remains of a plant or animal from millions of years ago called?",
      ],
      [
        "Camouflage",
        "What ability lets animals like chameleons and octopuses blend in with their surroundings?",
      ],
    ]),
    cat("Music Fun", [
      ["Piano", "Which instrument has 88 black and white keys?"],
      ["Guitar", "Which stringed instrument is most commonly used in rock bands?"],
      ["Drums", "Which instrument do you hit with sticks to keep the beat in a band?"],
      ["Bruno Mars", "Which singer is known for hits like 'Uptown Funk' and '24K Magic'?"],
      ["Choir", "What is a group of people singing together called?"],
    ]),
    cat("Art & Colors", [
      ["Rainbow", "What colorful arc appears in the sky after it rains?"],
      ["Mona Lisa", "What is the name of the famous smiling painting by Leonardo da Vinci?"],
      ["Orange", "Which color do you get when you mix red and yellow?"],
      ["Sculpture", "What is a 3D artwork made by carving, molding, or shaping material called?"],
      ["Bob Ross", "Which painter was famous for his TV show and saying 'happy little trees'?"],
    ]),
    cat("Geography Adventures", [
      ["Africa", "Which continent has the most countries, including Egypt, Kenya, and Nigeria?"],
      ["Pacific Ocean", "What is the largest ocean on Earth?"],
      ["North Pole", "Where does Santa Claus supposedly live, at the very top of the world?"],
      [
        "Amazon Rainforest",
        "What is the world's largest tropical rainforest, home to jaguars and toucans?",
      ],
      ["Hawaii", "Which U.S. state is made up of islands in the middle of the Pacific Ocean?"],
    ]),
    cat("Books & Stories", [
      ["Dr. Seuss", "Which author wrote 'The Cat in the Hat' and 'Green Eggs and Ham'?"],
      [
        "Diary of a Wimpy Kid",
        "Which book series follows Greg Heffley's hilarious middle school adventures?",
      ],
      [
        "Charlotte's Web",
        "In which book does a spider save a pig named Wilbur by writing words in her web?",
      ],
      [
        "Dog Man",
        "Which Dav Pilkey graphic novel series features a hero who is part dog, part police officer?",
      ],
      ["Narnia", "In which book series do children enter a magical world through a wardrobe?"],
    ]),
    cat("Bugs & Creepy Crawlies", [
      ["Ladybug", "Which small red beetle with black spots is considered good luck?"],
      ["Spider", "Which eight-legged creature spins webs to catch its food?"],
      ["Firefly", "Which insect lights up at night with a glowing tail?"],
      ["Ant", "Which tiny insect can carry objects 50 times its own body weight?"],
      [
        "Monarch butterfly",
        "Which orange and black butterfly migrates thousands of miles each year?",
      ],
    ]),
  ),

  // Board 9
  board(
    cat("Space Explorers", [
      ["The Moon", "What is the closest object in space to Earth that astronauts have walked on?"],
      ["Saturn", "Which planet is famous for its beautiful rings made of ice and rock?"],
      ["The Sun", "What is the star at the center of our solar system?"],
      ["Astronaut", "What do you call a person who travels to space?"],
      ["Milky Way", "What is the name of the galaxy that contains our solar system?"],
    ]),
    cat("Mythology & Legends", [
      ["Zeus", "Who is the king of the Greek gods, known for throwing lightning bolts?"],
      ["Unicorn", "Which mythical horse has a single spiral horn on its forehead?"],
      ["Thor", "Which Norse god of thunder shares his name with a Marvel superhero?"],
      [
        "Dragon",
        "Which legendary fire-breathing creature appears in stories from almost every culture?",
      ],
      [
        "Medusa",
        "Which monster from Greek mythology had snakes for hair and could turn people to stone?",
      ],
    ]),
    cat("Technology for Kids", [
      ["Wi-Fi", "What wireless technology lets your tablet or phone connect to the internet?"],
      ["Robot", "What is a machine programmed to do tasks automatically called?"],
      [
        "Coding",
        "What is the skill of writing instructions for computers also known as programming?",
      ],
      ["GPS", "Which technology in phones and cars uses satellites to help you find your way?"],
      [
        "QR code",
        "Which square black-and-white pattern can you scan with your phone camera to open a website?",
      ],
    ]),
    cat("Ocean Creatures", [
      [
        "Dolphin",
        "Which smart ocean mammal is known for being playful and making clicking sounds?",
      ],
      ["Octopus", "Which sea creature has eight arms and three hearts?"],
      ["Shark", "Which ocean predator has rows of sharp teeth that keep growing back?"],
      [
        "Sea turtle",
        "Which ocean reptile can live for over 100 years and returns to the same beach to lay eggs?",
      ],
      [
        "Jellyfish",
        "Which see-through sea creature has no brain, no heart, and stinging tentacles?",
      ],
    ]),
    cat("World Holidays", [
      ["Diwali", "Which Hindu festival of lights involves fireworks, sweets, and oil lamps?"],
      [
        "Chinese New Year",
        "Which celebration features dragon dances, red envelopes, and fireworks?",
      ],
      ["Hanukkah", "Which Jewish holiday lasts eight nights and involves lighting a menorah?"],
      [
        "Day of the Dead",
        "Which Mexican holiday on November 1st and 2nd honors loved ones who have passed away?",
      ],
      [
        "Carnival",
        "Which colorful celebration before Lent is famous for parades, masks, and costumes in Brazil?",
      ],
    ]),
    cat("Dinosaurs", [
      [
        "T-Rex",
        "Which fearsome dinosaur had tiny arms and the strongest bite of any land animal ever?",
      ],
      [
        "Triceratops",
        "Which plant-eating dinosaur had three horns on its face and a big bony frill?",
      ],
      [
        "Stegosaurus",
        "Which dinosaur had large bony plates along its back and spikes on its tail?",
      ],
      [
        "Pterodactyl",
        "Which flying reptile from the dinosaur age had leathery wings and a long beak?",
      ],
      [
        "Asteroid",
        "What giant space rock is believed to have crashed into Earth 66 million years ago and wiped out the dinosaurs?",
      ],
    ]),
  ),

  // Board 10
  board(
    cat("Amazing Animals", [
      ["Cheetah", "Which African cat is the fastest land animal, reaching speeds of 70 mph?"],
      ["Elephant", "Which animal is the largest living land mammal and never forgets?"],
      ["Parrot", "Which colorful bird can learn to talk and repeat human words?"],
      ["Chameleon", "Which lizard can change its skin color to match its surroundings?"],
      [
        "Platypus",
        "Which Australian animal has a duck bill, beaver tail, and lays eggs even though it's a mammal?",
      ],
    ]),
    cat("Math is Fun", [
      ["A dozen", "What word means a group of twelve?"],
      ["Hexagon", "What is a shape with six sides called?"],
      ["Infinity", "What is the concept for a number that goes on forever?"],
      ["Pi", "Which math number starts with 3.14 and goes on forever without repeating?"],
      [
        "Fibonacci",
        "Which famous number sequence starts 1, 1, 2, 3, 5, 8 where each number is the sum of the two before it?",
      ],
    ]),
    cat("Countries & Flags", [
      ["Canada", "Which country north of the United States has a maple leaf on its flag?"],
      [
        "Brazil",
        "Which South American country is the largest and known for soccer and the Amazon?",
      ],
      ["India", "Which country has over a billion people and is famous for the Taj Mahal?"],
      ["Egypt", "Which country is home to the ancient pyramids and the Sphinx?"],
      [
        "Nepal",
        "Which country has the only national flag that is not rectangular, shaped like two triangles?",
      ],
    ]),
    cat("Silly Science", [
      [
        "Uranus",
        "Which planet in our solar system is tilted on its side and rolls around the sun?",
      ],
      [
        "Slime",
        "Which gooey, stretchy toy became a science experiment craze using glue and borax?",
      ],
      [
        "Taste buds",
        "What are the tiny sensors on your tongue that let you taste sweet, sour, salty, and bitter?",
      ],
      [
        "Quicksand",
        "Which natural trap is a mix of sand, clay, and water that can slowly swallow objects?",
      ],
      [
        "Bioluminescence",
        "What is the ability of some ocean creatures like anglerfish and jellyfish to make their own light?",
      ],
    ]),
    cat("Classic Cartoons", [
      ["Scooby-Doo", "Which cartoon dog solves mysteries with Shaggy and the Mystery Inc. gang?"],
      ["Bugs Bunny", "Which wisecracking rabbit says 'What's up, Doc?'?"],
      ["SpongeBob", "Which cartoon character works at the Krusty Krab and lives in a pineapple?"],
      ["Garfield", "Which lazy orange cat loves lasagna and hates Mondays?"],
      ["The Simpsons", "Which yellow-skinned cartoon family has lived in Springfield since 1989?"],
    ]),
    cat("Sports Basics", [
      [
        "Soccer",
        "Which sport is called 'football' in most countries and is the most popular sport in the world?",
      ],
      ["Touchdown", "What is worth six points in American football?"],
      ["Home run", "In baseball, what is it called when a batter hits the ball out of the park?"],
      [
        "Slam dunk",
        "What flashy basketball move involves jumping and pushing the ball down through the hoop?",
      ],
      [
        "Hat trick",
        "In hockey and soccer, what is it called when one player scores three goals in a single game?",
      ],
    ]),
  ),

  // Board 11
  board(
    cat("Weather Wonders", [
      ["Snow", "What type of frozen precipitation falls in fluffy white flakes?"],
      ["Thunder", "What is the loud booming sound that follows lightning?"],
      [
        "Hurricane",
        "What powerful spinning storm forms over warm ocean water and has an 'eye' in the center?",
      ],
      [
        "Hail",
        "What type of ice falls from the sky during severe thunderstorms, sometimes as big as baseballs?",
      ],
      [
        "Earthquake",
        "What natural event happens when tectonic plates under the ground suddenly shift and shake?",
      ],
    ]),
    cat("Musical Instruments", [
      [
        "Violin",
        "Which stringed instrument is played with a bow and is the smallest in the orchestra?",
      ],
      ["Trumpet", "Which shiny brass instrument is used in jazz and can play loud, bright notes?"],
      ["Flute", "Which woodwind instrument do you play by blowing across a hole at the top?"],
      ["Ukulele", "Which small four-stringed instrument comes from Hawaii?"],
      [
        "Harmonica",
        "Which small instrument do you play by blowing and drawing air through tiny holes?",
      ],
    ]),
    cat("Inventions That Changed the World", [
      ["Printing press", "Which invention by Gutenberg made it possible to mass-produce books?"],
      ["Light bulb", "Which invention by Thomas Edison lit up homes for the first time?"],
      [
        "Telephone",
        "Which invention by Alexander Graham Bell let people talk to each other from far away?",
      ],
      [
        "Airplane",
        "Which invention by the Wright Brothers let humans fly for the first time in 1903?",
      ],
      [
        "Internet",
        "Which global network of computers changed the world by connecting billions of people?",
      ],
    ]),
    cat("Human Body", [
      ["Heart", "Which organ pumps blood through your whole body about 100,000 times a day?"],
      ["206", "How many bones does an adult human body have?"],
      ["Brain", "Which organ controls your thoughts, movements, and everything your body does?"],
      ["Lungs", "Which pair of organs in your chest fills with air when you breathe?"],
      ["Skin", "What is the largest organ of the human body?"],
    ]),
    cat("Famous Landmarks", [
      ["Eiffel Tower", "Which famous iron tower in Paris, France was built in 1889?"],
      [
        "Statue of Liberty",
        "Which giant green statue holding a torch was a gift from France to America?",
      ],
      ["Great Wall of China", "Which ancient wall stretches over 13,000 miles across China?"],
      ["Big Ben", "What is the famous clock tower in London, England called?"],
      [
        "Mount Rushmore",
        "Which South Dakota mountain has four U.S. presidents' faces carved into it?",
      ],
    ]),
    cat("Pets & Pet Care", [
      [
        "Goldfish",
        "Which popular orange pet fish can actually live for over 10 years with proper care?",
      ],
      [
        "Hamster",
        "Which small, furry pet loves running on a wheel and stuffing food in its cheeks?",
      ],
      ["Veterinarian", "What is a doctor who takes care of animals called?"],
      ["Leash", "What do you attach to a dog's collar to keep them safe on walks?"],
      [
        "Hermit crab",
        "Which pet crustacean carries a borrowed shell on its back and switches to bigger ones as it grows?",
      ],
    ]),
  ),
];

// ═══════════════════════════════════════════════════════════════════════════
// STANDARD BOARDS (13+)
// ═══════════════════════════════════════════════════════════════════════════

export const STANDARD_BOARDS: JeopardyBoard[] = [
  // Board 1
  board(
    cat("Reality TV Royalty", [
      [
        "Kim Kardashian",
        "Which reality star turned mogul passed the baby bar exam and advocates for criminal justice reform?",
      ],
      [
        "RuPaul",
        "Which drag queen host tells contestants 'If you can't love yourself, how in the hell you gonna love somebody else?'?",
      ],
      ["Jeff Probst", "Who has presided over the tribal councils of Survivor for over 40 seasons?"],
      [
        "The Bachelor",
        "Which ABC dating show has contestants receive roses to stay and has spawned multiple spinoffs?",
      ],
      [
        "Love Island",
        "Which British dating show puts contestants in a villa where they must 'couple up' or risk elimination?",
      ],
    ]),
    cat("Viral Moments", [
      [
        "Will Smith",
        "Which actor shocked the world by slapping Chris Rock on stage at the 2022 Oscars?",
      ],
      [
        "Bernie Sanders mittens",
        "Whose cozy inauguration look in January 2021 became the internet's favorite meme?",
      ],
      [
        "Ocean Spray cranberry juice",
        "Which brand of juice went viral when a skateboarder drank it on TikTok to Fleetwood Mac's 'Dreams'?",
      ],
      [
        "Hawk Tuah",
        "Which two-word catchphrase from a viral 2024 street interview launched the speaker to internet fame?",
      ],
      [
        "Brat summer",
        "Which lime-green one-word Charli XCX album title defined an aesthetic movement in 2024?",
      ],
    ]),
    cat("Netflix & Chill", [
      [
        "Squid Game",
        "In which Korean survival drama do 456 contestants play deadly children's games for a cash prize?",
      ],
      [
        "Tiger King",
        "In which 2020 docuseries did Joe Exotic and Carole Baskin feud over big cats during lockdown?",
      ],
      [
        "Bridgerton",
        "Which Shonda Rhimes-produced period drama set in Regency-era London became Netflix's biggest hit?",
      ],
      [
        "Glass Onion",
        "In which Knives Out sequel did Daniel Craig play detective Benoit Blanc at a tech billionaire's island?",
      ],
      [
        "Baby Reindeer",
        "Which 2024 Netflix limited series about stalking was based on creator Richard Gadd's real experiences?",
      ],
    ]),
    cat("Billboard Hits", [
      ["Taylor Swift", "Whose Eras Tour became the first concert tour to gross over $1 billion?"],
      ["Espresso", "What was Sabrina Carpenter's 2024 smash hit named after a caffeinated drink?"],
      [
        "Old Town Road",
        "Which Lil Nas X genre-bending country-rap hit spent a record 19 weeks at #1 on the Billboard Hot 100?",
      ],
      [
        "Beyoncé",
        "Whose 'Cowboy Carter' album brought country music back to the mainstream in 2024?",
      ],
      [
        "APT",
        "Which 2024 ROSÉ and Bruno Mars collaboration was named after a Korean drinking game?",
      ],
    ]),
    cat("Social Media Stars", [
      [
        "Khaby Lame",
        "Which Senegalese-Italian TikToker became the most-followed person on the app by silently mocking life hacks?",
      ],
      [
        "Emma Chamberlain",
        "Which YouTuber turned coffee entrepreneur became a Gen Z fashion icon at the Met Gala?",
      ],
      [
        "Kai Cenat",
        "Which Twitch streamer's chaotic giveaways have caused actual stampedes in New York City?",
      ],
      [
        "Addison Rae",
        "Which TikTok dancer transitioned to music and acting with roles in He's All That?",
      ],
      ["Alex Cooper", "Which podcaster turned 'Call Her Daddy' into a $60 million Spotify deal?"],
    ]),
    cat("Memes That Broke the Internet", [
      [
        "Crying Jordan",
        "Which meme uses Michael Jordan's tearful Hall of Fame face as an endlessly reusable image?",
      ],
      [
        "Salt Bae",
        "Which Turkish chef's dramatic arm-sliding salt sprinkle went viral and launched a restaurant empire?",
      ],
      [
        "The Ick",
        "Which dating term for an instant turnoff became one of TikTok's most relatable trends?",
      ],
      [
        "Roman Empire",
        "In 2023, women discovered that men think about which ancient civilization surprisingly often?",
      ],
      [
        "Very demure",
        "Which phrase paired with 'very mindful' became the catchphrase of late summer 2024 thanks to Jools Lebron?",
      ],
    ]),
  ),

  // Board 2
  board(
    cat("Celebrity Drama", [
      [
        "Kanye West",
        "Which rapper legally changed his name to Ye and was dropped by Adidas over antisemitic remarks?",
      ],
      [
        "Johnny Depp",
        "Whose defamation trial against ex-wife Amber Heard was livestreamed and became a social media spectacle?",
      ],
      [
        "Britney Spears",
        "Whose 13-year conservatorship was ended with the help of the #FreeBritney movement in 2021?",
      ],
      [
        "Diddy",
        "Which hip-hop mogul born Sean Combs was arrested in 2024 on federal racketeering charges?",
      ],
      [
        "Justin and Hailey Bieber",
        "Which pop star couple announced their pregnancy in 2024 with a vow-renewal photoshoot?",
      ],
    ]),
    cat("Sports Headlines", [
      [
        "Lionel Messi",
        "Which Argentine legend chose Inter Miami over European clubs, boosting MLS viewership overnight?",
      ],
      [
        "Caitlin Clark",
        "Which Iowa Hawkeye shattered the NCAA scoring record and became the face of women's basketball?",
      ],
      [
        "Shohei Ohtani",
        "Which Japanese two-way baseball star signed a record $700 million deal with the Dodgers?",
      ],
      [
        "Travis Kelce",
        "Which Kansas City Chiefs tight end became as famous for his relationship as his football?",
      ],
      [
        "Angel Reese",
        "Whose 'you can't see me' taunt to Caitlin Clark in the 2023 NCAA final went viral?",
      ],
    ]),
    cat("Fashion & Beauty", [
      [
        "Ozempic",
        "Which diabetes drug became Hollywood's worst-kept secret for rapid weight loss?",
      ],
      [
        "Quiet luxury",
        "Which 2023 fashion trend favored understated, logo-free designer clothing like in Succession?",
      ],
      [
        "Stanley tumbler",
        "Which 40-ounce insulated cup became the must-have accessory, especially for suburban moms?",
      ],
      [
        "Mob wife aesthetic",
        "Which 2024 fashion trend embraced leopard print, fur coats, and big gold jewelry?",
      ],
      [
        "The Met Gala",
        "Which annual fundraising fashion event at the Metropolitan Museum is known as fashion's biggest night?",
      ],
    ]),
    cat("True Crime", [
      ["Dahmer", "In which controversial Netflix series did Evan Peters star as Jeffrey Dahmer?"],
      [
        "Making a Murderer",
        "Which Netflix docuseries about Steven Avery sparked national debate about wrongful convictions?",
      ],
      [
        "The Menendez Brothers",
        "Which siblings convicted of killing their parents in 1989 got renewed attention from a 2024 Netflix series?",
      ],
      [
        "Alex Murdaugh",
        "Which South Carolina lawyer was convicted of murdering his wife and son in a high-profile 2023 trial?",
      ],
      [
        "Serial",
        "Which groundbreaking podcast about the murder of Hae Min Lee helped launch the true crime genre?",
      ],
    ]),
    cat("Food & Drink Trends", [
      [
        "Crumbl Cookies",
        "Which cookie chain with rotating weekly flavors and pink boxes became a TikTok obsession?",
      ],
      [
        "Dirty soda",
        "Which trend of mixing soda with cream and flavored syrups was popularized by Mormon culture in Utah?",
      ],
      ["Ube", "Which purple Filipino yam became a trendy flavor in ice cream, donuts, and lattes?"],
      [
        "Hot honey",
        "Which spicy-sweet condiment combining honey with chili peppers became a pizza and chicken topping craze?",
      ],
      [
        "Girl dinner",
        "Which TikTok trend celebrated assembling a meal of random snacks instead of cooking?",
      ],
    ]),
    cat("Movie Franchises", [
      [
        "Barbie",
        "Which 2023 Greta Gerwig film starring Margot Robbie earned over $1.4 billion worldwide?",
      ],
      [
        "Oppenheimer",
        "Which Christopher Nolan biopic about the father of the atomic bomb swept the 2024 Oscars?",
      ],
      [
        "Spider-Verse",
        "The animated Miles Morales films are part of which shared multiverse of web-slingers?",
      ],
      [
        "Top Gun Maverick",
        "In which 2022 sequel did Tom Cruise return as Pete Mitchell for a massive box office hit?",
      ],
      [
        "Avatar The Way of Water",
        "Which 2022 James Cameron sequel explored the oceans of Pandora?",
      ],
    ]),
  ),

  // Board 3
  board(
    cat("Award Shows", [
      [
        "Everything Everywhere",
        "Which multiverse film starring Michelle Yeoh swept the 2023 Oscars with seven wins?",
      ],
      [
        "Parasite",
        "Which Korean film made history as the first non-English language film to win Best Picture at the Oscars?",
      ],
      ["Beyoncé", "Which artist holds the record for most Grammy wins of all time with 32?"],
      [
        "Moonlight",
        "Which film was revealed as the real Best Picture winner after La La Land was announced by mistake?",
      ],
      [
        "Oppenheimer",
        "Which film won Best Picture, Best Director, and Best Actor at the 2024 Academy Awards?",
      ],
    ]),
    cat("The Kardashians", [
      [
        "Kris Jenner",
        "Which 'momager' is credited with building the Kardashian-Jenner empire from a reality show?",
      ],
      ["Skims", "What is Kim Kardashian's shapewear brand valued at over $4 billion?"],
      [
        "Kylie Jenner",
        "Which youngest Kardashian-Jenner sibling built a cosmetics empire and was once called a self-made billionaire?",
      ],
      [
        "North West",
        "Which daughter of Kim and Kanye has gone viral for her fashion and attitude?",
      ],
      ["Kourtney Kardashian", "Which Kardashian sister married Blink-182 drummer Travis Barker?"],
    ]),
    cat("Streaming Wars", [
      ["Disney Plus", "Which streaming service launched in 2019 with Baby Yoda as its killer app?"],
      [
        "The Bear",
        "Which Hulu/FX show about a fine-dining chef running a Chicago sandwich shop became a critical darling?",
      ],
      [
        "Yellowjackets",
        "Which Showtime series alternates between a plane crash in the 1990s and the survivors' present lives?",
      ],
      [
        "Shogun",
        "Which FX/Hulu series about 1600s Japan swept the 2024 Emmys with a record 18 wins?",
      ],
      [
        "Severance",
        "In which Apple TV+ show do employees surgically separate their work and personal memories?",
      ],
    ]),
    cat("Tech Giants", [
      ["Elon Musk", "Which tech billionaire bought Twitter for $44 billion and rebranded it as X?"],
      [
        "Sam Altman",
        "Which OpenAI CEO was briefly fired and rehired in a dramatic 2023 boardroom coup?",
      ],
      [
        "Mark Zuckerberg",
        "Which Meta CEO pivoted from the metaverse to AI and started cage-fighting training?",
      ],
      [
        "ChatGPT",
        "Which AI chatbot reached 100 million users in just two months after launching in November 2022?",
      ],
      [
        "Apple Vision Pro",
        "What is Apple's $3,500 mixed reality headset that launched in 2024 with 'spatial computing'?",
      ],
    ]),
    cat("World Cup & Olympics", [
      [
        "Argentina",
        "Which South American country won the 2022 FIFA World Cup, with Messi finally lifting the trophy?",
      ],
      [
        "Paris 2024",
        "In which city were the 2024 Summer Olympics held, featuring events at iconic landmarks?",
      ],
      [
        "Simone Biles",
        "Which gymnast withdrew from Tokyo 2020 for mental health, then returned to dominate Paris 2024?",
      ],
      [
        "Breakdancing",
        "Which hip-hop discipline debuted as an Olympic sport in Paris 2024, sparking heated debate?",
      ],
      [
        "Morocco",
        "Which African nation shocked the world by reaching the 2022 World Cup semifinals?",
      ],
    ]),
    cat("Podcasts & Audio", [
      [
        "Joe Rogan",
        "Which podcast host signed an exclusive deal worth a reported $250 million with Spotify?",
      ],
      [
        "Crime Junkie",
        "Which true crime podcast hosted by Ashley Flowers consistently tops the charts?",
      ],
      [
        "SmartLess",
        "Which celebrity interview podcast is hosted by Jason Bateman, Sean Hayes, and Will Arnett?",
      ],
      [
        "Spotify Wrapped",
        "Which annual feature showing your listening stats becomes a social media event every December?",
      ],
      [
        "Audiobooks",
        "Into which spoken-word format did Spotify expand beyond music to compete with Audible?",
      ],
    ]),
  ),

  // Board 4
  board(
    cat("Drag Race Universe", [
      [
        "Bianca Del Rio",
        "Which Season 6 winner is known for her insult comedy and was called the 'Joan Rivers of drag'?",
      ],
      ["Sashay away", "What two-word phrase are eliminated queens told on RuPaul's Drag Race?"],
      [
        "Lip sync for your life",
        "What dramatic showdown must bottom-two queens perform in to avoid elimination?",
      ],
      [
        "All Stars",
        "Which Drag Race spinoff series brings back fan-favorite queens for another shot at the crown?",
      ],
      [
        "Snatch Game",
        "Which Drag Race challenge has queens impersonate celebrities in a Match Game format?",
      ],
    ]),
    cat("TikTok Trends", [
      [
        "Get ready with me",
        "What are GRWM videos where creators do their makeup while talking to the camera about their lives?",
      ],
      [
        "BookTok",
        "Which TikTok community boosted sales of romance and fantasy novels, making some authors bestsellers overnight?",
      ],
      [
        "Devious licks",
        "Which 2021 TikTok trend encouraged students to steal things from school bathrooms?",
      ],
      [
        "NPC streaming",
        "Which bizarre live-streaming trend has creators acting like video game characters for tips?",
      ],
      [
        "Tube girl",
        "Who is Sabrina Bahsoon, who went viral in 2023 for confidently filming music videos on the London Underground?",
      ],
    ]),
    cat("Real Housewives", [
      ["Bravo", "On which NBCUniversal cable network do all Real Housewives shows air?"],
      ["Andy Cohen", "Which host and producer presides over all Housewives reunion specials?"],
      [
        "Teresa Giudice",
        "Which New Jersey Housewife famously flipped a table and served time in federal prison?",
      ],
      [
        "Atlanta",
        "In which city's Housewives franchise did NeNe Leakes make 'I said what I said' iconic?",
      ],
      [
        "Salt Lake City",
        "Which Housewives franchise was rocked by Jen Shah's fraud conviction and Monica Garcia's troll scandal?",
      ],
    ]),
    cat("Nostalgia TV", [
      ["Friends", "Which '90s sitcom had its reunion special premiere on HBO Max in 2021?"],
      [
        "The Office",
        "In which NBC mockumentary does Steve Carell's Michael Scott still generate endless memes?",
      ],
      [
        "Gilmore Girls",
        "Which show about a mother-daughter duo in Stars Hollow got a Netflix revival called 'A Year in the Life'?",
      ],
      [
        "Fresh Prince",
        "Which '90s Will Smith sitcom got a dramatic Peacock reboot called 'Bel-Air'?",
      ],
      [
        "That '70s Show",
        "Which sitcom got a Netflix sequel called 'That '90s Show' featuring the original cast's kids?",
      ],
    ]),
    cat("Music Festivals", [
      [
        "Coachella",
        "Which annual Indio, California desert festival is as famous for influencer fashion as its music?",
      ],
      [
        "Fyre Festival",
        "Which disastrous 2017 luxury music festival in the Bahamas, organized by Billy McFarland, spawned two documentaries?",
      ],
      [
        "Astroworld",
        "Which Travis Scott 2021 festival in Houston ended in tragedy when a crowd crush killed 10 people?",
      ],
      [
        "Glastonbury",
        "Which legendary British music festival takes place on a farm in Somerset, England?",
      ],
      [
        "Burning Man",
        "Which annual Nevada desert gathering was trapped in mud in 2023, stranding 70,000 attendees?",
      ],
    ]),
    cat("Dating App Culture", [
      ["Tinder", "Which dating app popularized the swipe-right, swipe-left mechanic?"],
      [
        "Situationship",
        "Which term describes a romantic connection that's more than friends but not officially a relationship?",
      ],
      ["Bumble", "On which dating app do women have to make the first move?"],
      [
        "Ghosting",
        "What term means suddenly cutting off all communication with someone you've been dating?",
      ],
      [
        "Rizz",
        "What was Oxford's 2023 Word of the Year, meaning charm or attractiveness, especially in flirting?",
      ],
    ]),
  ),

  // Board 5
  board(
    cat("Survivor Deep Cuts", [
      [
        "Boston Rob",
        "Which player named Rob Mariano played Survivor five times and finally won on his fourth attempt?",
      ],
      ["The merge", "What pivotal moment in each Survivor season combines two tribes into one?"],
      [
        "Hidden immunity idol",
        "What carved object found at camp can save you from being voted out at tribal council?",
      ],
      [
        "Parvati Shallow",
        "Which legendary player is famous for her black widow alliance and double idol play in Heroes vs. Villains?",
      ],
      [
        "Jeff Probst",
        "Who besides hosting Survivor also serves as an executive producer and sometimes directs episodes?",
      ],
    ]),
    cat("K-Pop & K-Drama", [
      [
        "BTS",
        "Which Korean boy band's 'ARMY' fanbase helped them become the best-selling act of 2020 and 2021?",
      ],
      ["BLACKPINK", "Which four-member K-pop girl group headlined Coachella in 2023?"],
      [
        "Crash Landing on You",
        "Which K-drama about a South Korean heiress who lands in North Korea became a global hit?",
      ],
      [
        "NewJeans",
        "Which K-pop girl group debuted in 2022 with Y2K aesthetics and tracks like 'Hype Boy'?",
      ],
      [
        "Hallyu",
        "What Korean word meaning 'Korean Wave' describes the global spread of Korean pop culture?",
      ],
    ]),
    cat("Conspiracy Corner", [
      [
        "QAnon",
        "Which online conspiracy movement claims a secret cabal controls world governments?",
      ],
      ["Flat Earth", "Which debunked theory claims the planet is a disc, not a sphere?"],
      [
        "Pizzagate",
        "Which debunked conspiracy theory falsely linked a D.C. pizza restaurant to a political trafficking ring?",
      ],
      [
        "Birds Aren't Real",
        "Which satirical conspiracy movement jokingly claims the government replaced all birds with surveillance drones?",
      ],
      [
        "Simulation theory",
        "What is the idea, endorsed by Elon Musk, that our reality might be a computer program?",
      ],
    ]),
    cat("The Bachelor Universe", [
      [
        "The final rose",
        "What symbolic flower do contestants on The Bachelor hope to receive at the end of the season?",
      ],
      [
        "Fantasy suites",
        "What controversial overnight date episode is when remaining contestants get private time with the lead?",
      ],
      [
        "After the Final Rose",
        "What live special airs after each Bachelor season finale to catch up with the lead and their chosen partner?",
      ],
      [
        "Paradise",
        "Which Bachelor spinoff sends rejected contestants to a beach in Mexico for a second chance at love?",
      ],
      [
        "Golden Bachelor",
        "Which 2023 Bachelor spinoff featured a 71-year-old widower looking for love, though the couple later divorced?",
      ],
    ]),
    cat("Video Game Culture", [
      [
        "Elden Ring",
        "Which FromSoftware open-world game co-created with George R.R. Martin won Game of the Year 2022?",
      ],
      ["Baldur's Gate 3", "Which massive D&D RPG by Larian Studios swept the 2023 Game Awards?"],
      [
        "GTA 6",
        "Which long-awaited Rockstar Games open-world sequel is set in Vice City, expected in 2025?",
      ],
      [
        "Hogwarts Legacy",
        "Which 2023 Harry Potter RPG let players attend Hogwarts in the 1800s despite boycott calls?",
      ],
      [
        "Palworld",
        "Which 2024 survival game was dubbed 'Pokémon with guns' and sold millions in its first week?",
      ],
    ]),
    cat("Influencer Scandals", [
      [
        "Logan Paul",
        "Which YouTuber sparked outrage filming in Japan's Aokigahara forest, then pivoted to WWE and Prime energy drinks?",
      ],
      [
        "James Charles",
        "Which beauty YouTuber lost millions of subscribers during a feud with Tati Westbrook in 2019?",
      ],
      [
        "Andrew Tate",
        "Which controversial influencer was arrested in Romania on human trafficking charges in late 2022?",
      ],
      [
        "Colleen Ballinger",
        "Which YouTuber known as Miranda Sings responded to grooming allegations with an infamous ukulele apology video?",
      ],
      [
        "David Dobrik",
        "Whose Vlog Squad faced allegations of enabling dangerous stunts and misconduct?",
      ],
    ]),
  ),

  // Board 6
  board(
    cat("Beyoncé's Universe", [
      [
        "Lemonade",
        "Which 2016 Beyoncé visual album premiered on HBO and explored themes of infidelity and Black womanhood?",
      ],
      [
        "Renaissance",
        "Which 2022 Beyoncé dance album was inspired by her late Uncle Jonny and ballroom culture?",
      ],
      [
        "Cowboy Carter",
        "Which 2024 Beyoncé album went full country and featured a cover of Dolly Parton's 'Jolene'?",
      ],
      ["Beyhive", "What is the buzzing nickname for Beyoncé's fiercely loyal fanbase?"],
      ["Destiny's Child", "In which '90s/'00s girl group did Beyoncé rise to fame as lead singer?"],
    ]),
    cat("Horror & Thriller", [
      [
        "Get Out",
        "Which Jordan Peele directorial debut explored racism through the horror genre and won an Oscar for Best Screenplay?",
      ],
      [
        "Nope",
        "Which 2022 Jordan Peele film featured a mysterious UFO above a California horse ranch?",
      ],
      [
        "M3GAN",
        "Which 2023 horror film about a killer AI doll became a viral meme before it even premiered?",
      ],
      [
        "Smile",
        "Which 2022 horror film featured a creepy grinning entity that spread from person to person?",
      ],
      [
        "Five Nights at Freddy's",
        "Which horror video game franchise about killer animatronics finally got a movie adaptation in 2023?",
      ],
    ]),
    cat("Political Pop Culture", [
      [
        "Brat",
        "What did Charli XCX declare Kamala Harris after the VP launched her 2024 presidential campaign?",
      ],
      [
        "Dark Brandon",
        "Which meme reimagined Joe Biden as a laser-eyed, ice-cream-eating action hero?",
      ],
      ["Covfefe", "What was the mysterious made-up word in Trump's famous late-night 2017 tweet?"],
      [
        "I did that",
        "What stickers of Joe Biden pointing were placed on gas pumps by critics during high fuel prices?",
      ],
      [
        "Tan suit",
        "What color suit did Obama wear in 2014 that became a meme about manufactured political controversies?",
      ],
    ]),
    cat("Iconic Albums", [
      [
        "Midnights",
        "Which Taylor Swift 2022 album crashed Ticketmaster when Eras Tour presale began?",
      ],
      ["30", "Which Adele album, named after her age, featured the 2021 hit 'Easy on Me'?"],
      [
        "Un Verano Sin Ti",
        "Which Bad Bunny 2022 album became the most-streamed album on Spotify that year?",
      ],
      ["SOS", "Which SZA 2022 album featuring 'Kill Bill' spent multiple weeks at #1?"],
      [
        "Harry's House",
        "Which Harry Styles 2022 album featuring 'As It Was' won the Grammy for Album of the Year?",
      ],
    ]),
    cat("Internet Drama", [
      [
        "Twitter/X",
        "Which social media platform did Elon Musk rebrand in 2023, removing its iconic bird logo?",
      ],
      ["Reddit", "On which platform did WallStreetBets cause GameStop stock to skyrocket in 2021?"],
      [
        "Cancel culture",
        "What is the phenomenon of publicly calling out and boycotting public figures for problematic behavior?",
      ],
      [
        "Deinfluencing",
        "Which 2023 TikTok counter-trend encourages people NOT to buy overhyped products?",
      ],
      [
        "Threads",
        "Which Twitter competitor did Meta launch in July 2023, gaining 100 million users in five days?",
      ],
    ]),
    cat("Comfort TV", [
      [
        "Ted Lasso",
        "In which Apple TV+ hit did Jason Sudeikis play an optimistic American football coach leading a British soccer team?",
      ],
      [
        "Abbott Elementary",
        "Which ABC mockumentary created by Quinta Brunson is about teachers at an underfunded Philadelphia school?",
      ],
      [
        "Only Murders in the Building",
        "In which Hulu show do Steve Martin, Martin Short, and Selena Gomez solve crimes in their New York apartment building?",
      ],
      [
        "Schitt's Creek",
        "Which CBC/Netflix comedy about a rich family losing everything swept the 2020 Emmys?",
      ],
      [
        "Heartstopper",
        "Which Netflix YA series about two British schoolboys falling in love became a feel-good sensation?",
      ],
    ]),
  ),

  // Board 7
  board(
    cat("Drake vs. Everyone", [
      [
        "Kendrick Lamar",
        "Which rapper released 'Not Like Us,' the diss track of 2024, targeting Drake?",
      ],
      [
        "Degrassi",
        "On which Canadian teen drama did Drake play wheelchair-bound Jimmy before rap stardom?",
      ],
      [
        "Ghostwriting",
        "What practice of having others write his lyrics did Meek Mill accuse Drake of in their 2015 beef?",
      ],
      [
        "Certified Lover Boy",
        "Which 2021 Drake album featured a cover with pregnant woman emojis that became a meme?",
      ],
      [
        "Pusha T",
        "Which rapper revealed Drake had a secret son named Adonis on the diss track 'The Story of Adidon'?",
      ],
    ]),
    cat("Anime Goes Mainstream", [
      [
        "Demon Slayer",
        "Which anime franchise's Mugen Train film became the highest-grossing Japanese film ever?",
      ],
      [
        "Attack on Titan",
        "Which anime about humanity fighting giant humanoid creatures concluded its decade-long run in 2023?",
      ],
      [
        "Jujutsu Kaisen",
        "From which anime did Gojo Satoru become one of the most popular fictional characters in the world?",
      ],
      [
        "Chainsaw Man",
        "Which anime about a boy who merges with a chainsaw devil debuted to massive hype in 2022?",
      ],
      ["Crunchyroll", "What is the dominant streaming platform for anime outside Japan?"],
    ]),
    cat("Wellness & Self-Care", [
      [
        "Ozempic",
        "Which GLP-1 drug became the most talked-about weight loss method among celebrities?",
      ],
      [
        "Cold plunge",
        "Which wellness trend involves submerging yourself in ice-cold water, popularized by influencers?",
      ],
      [
        "Therapy speak",
        "What is the trend of using terms like 'boundaries,' 'triggered,' and 'gaslighting' in everyday conversation?",
      ],
      [
        "Dry January",
        "Which annual trend challenges people to give up alcohol for the first month of the year?",
      ],
      [
        "Mouth taping",
        "Which controversial sleep trend involves putting tape over your lips to promote nose breathing?",
      ],
    ]),
    cat("Documentary Hits", [
      [
        "The Social Dilemma",
        "Which 2020 Netflix documentary warned about social media's manipulation of human psychology?",
      ],
      [
        "Framing Britney Spears",
        "Which 2021 New York Times documentary helped spark the #FreeBritney movement?",
      ],
      [
        "The Tinder Swindler",
        "Which Netflix documentary exposed Simon Leviev, who conned women out of millions on dating apps?",
      ],
      [
        "White Hot",
        "Which Netflix documentary explored the controversy behind Abercrombie & Fitch's exclusionary branding?",
      ],
      [
        "Quiet on Set",
        "Which 2024 Investigation Discovery docuseries exposed abuse on Nickelodeon kids' shows?",
      ],
    ]),
    cat("Gaming Controversies", [
      [
        "Activision Blizzard",
        "Which gaming giant did Microsoft acquire for $69 billion in the largest gaming deal in history?",
      ],
      [
        "Loot boxes",
        "Which randomized in-game purchase mechanics have been compared to gambling by regulators?",
      ],
      [
        "Cyberpunk 2077",
        "Which highly anticipated 2020 game launched so buggy that Sony pulled it from the PlayStation Store?",
      ],
      [
        "Unity",
        "Which game engine sparked developer outrage in 2023 when it announced a per-install fee?",
      ],
      [
        "AI art",
        "What technology did game studios face backlash for using to replace human artists and concept designers?",
      ],
    ]),
    cat("Unexpected Crossovers", [
      [
        "Travis Scott",
        "Which rapper collaborated with McDonald's, Nike, and Fortnite, blurring music, fashion, and gaming?",
      ],
      [
        "Post Malone",
        "Which rapper surprised fans by releasing a country album called 'F-1 Trillion' in 2024?",
      ],
      [
        "Martha and Snoop",
        "Who are the unlikely duo that host a cooking show called 'Potluck Dinner Party'?",
      ],
      [
        "Barbenheimer",
        "What portmanteau did fans create when Barbie and Oppenheimer opened on the same day in July 2023?",
      ],
      [
        "MrBeast",
        "Which YouTuber launched Feastables chocolate bars and a fast-food brand called MrBeast Burger?",
      ],
    ]),
  ),

  // Board 8
  board(
    cat("Science & Discovery", [
      [
        "CRISPR",
        "Which gene-editing technology could let scientists cut and paste DNA like editing a document?",
      ],
      [
        "Black hole photo",
        "In 2019, the Event Horizon Telescope captured the first image of what mysterious space object?",
      ],
      [
        "Mars rover",
        "What type of robotic vehicle named Perseverance is currently exploring the Red Planet?",
      ],
      [
        "mRNA vaccine",
        "Which new type of vaccine technology was used to create COVID shots by Pfizer and Moderna?",
      ],
      [
        "Nuclear fusion",
        "In December 2022, U.S. scientists achieved ignition in which type of energy reaction that powers the sun?",
      ],
    ]),
    cat("Music Legends", [
      [
        "Prince",
        "Which legendary artist released 'Purple Rain' and changed his name to an unpronounceable symbol?",
      ],
      [
        "David Bowie",
        "Which chameleonic rock star was known for alter egos like Ziggy Stardust and 'Space Oddity'?",
      ],
      [
        "Fleetwood Mac",
        "Which classic rock band had 'Dreams' go viral on TikTok thanks to a cranberry juice skateboard video?",
      ],
      [
        "Dolly Parton",
        "Which country music icon has her own theme park, Dollywood, and funded children's book programs?",
      ],
      [
        "Queen",
        "Which band's 'Bohemian Rhapsody' biopic became the highest-grossing music biopic of all time?",
      ],
    ]),
    cat("Art & Artists", [
      [
        "Banksy",
        "Which anonymous British street artist is known for political graffiti and self-destructing artworks?",
      ],
      [
        "Frida Kahlo",
        "Which Mexican artist known for vivid self-portraits has become a feminist icon?",
      ],
      [
        "Van Gogh",
        "Which Dutch painter of 'Starry Night' has immersive digital exhibitions touring the world?",
      ],
      [
        "NFT art",
        "Beeple sold 'Everydays' for $69 million in which type of blockchain-verified digital art?",
      ],
      [
        "KAWS",
        "Which contemporary artist is known for his X-eyed figures and collaborations with brands like Uniqlo?",
      ],
    ]),
    cat("Geography & Travel", [
      [
        "Iceland",
        "Which Nordic island nation is famous for geysers, volcanoes, and the Northern Lights?",
      ],
      ["Dubai", "Which Middle Eastern city has the world's tallest building, the Burj Khalifa?"],
      ["Machu Picchu", "Which ancient Incan citadel sits high in the Andes Mountains of Peru?"],
      [
        "Great Barrier Reef",
        "Which natural wonder off Australia's coast is the world's largest coral reef system?",
      ],
      [
        "Santorini",
        "Which Greek island with white-and-blue buildings overlooking a volcanic caldera is a top Instagram destination?",
      ],
    ]),
    cat("Books & Literature", [
      [
        "Colleen Hoover",
        "Which author of 'It Ends with Us' dominated BookTok and became one of the best-selling authors of 2022-2023?",
      ],
      [
        "Fourth Wing",
        "Which Rebecca Yarros fantasy novel about dragon riders became BookTok's biggest obsession in 2023?",
      ],
      [
        "Lessons in Chemistry",
        "Which bestselling novel about a 1960s female chemist turned cooking show host became an Apple TV+ series?",
      ],
      [
        "Sarah J. Maas",
        "Which fantasy author's ACOTAR and Crescent City series have massive BookTok followings?",
      ],
      [
        "Tomorrow and Tomorrow and Tomorrow",
        "Which 2022 novel about two friends who create video games became a literary sensation?",
      ],
    ]),
    cat("Technology & Gadgets", [
      [
        "AirPods",
        "Which Apple wireless earbuds became so ubiquitous they're practically a fashion accessory?",
      ],
      ["Steam Deck", "Which Valve handheld gaming PC lets you play your Steam library on the go?"],
      [
        "Threads",
        "Which Twitter/X competitor by Meta launched and gained 100 million users in record time?",
      ],
      [
        "Rabbit R1",
        "Which bright orange AI hardware device generated CES 2024 buzz but disappointed on delivery?",
      ],
      [
        "Passkeys",
        "Which passwordless login technology using biometrics is replacing traditional passwords across the web?",
      ],
    ]),
  ),

  // Board 9
  board(
    cat("Mythology & Legends", [
      [
        "Trojan Horse",
        "Which giant wooden structure did the Greeks use to sneak soldiers into the city of Troy?",
      ],
      [
        "Excalibur",
        "What is the legendary sword that King Arthur pulled from a stone to prove he was the true king?",
      ],
      [
        "Pandora's box",
        "In Greek mythology, whose curiosity released all the evils into the world when she opened a container?",
      ],
      [
        "Valhalla",
        "In Norse mythology, what is the great hall where warriors go after dying in battle?",
      ],
      [
        "Icarus",
        "Which figure from Greek myth flew too close to the sun with wax wings that melted?",
      ],
    ]),
    cat("Space & Astronomy", [
      [
        "Light year",
        "What unit of distance measures how far light travels in one year, about 5.88 trillion miles?",
      ],
      [
        "Hubble",
        "Which NASA space telescope has been orbiting Earth and taking photos since 1990?",
      ],
      [
        "Elon Musk",
        "Whose SpaceX company successfully caught a returning Starship booster with a pair of giant mechanical arms?",
      ],
      [
        "Voyager 1",
        "Which NASA spacecraft launched in 1977 is the farthest human-made object from Earth?",
      ],
      ["Exoplanet", "What is a planet orbiting a star outside our solar system called?"],
    ]),
    cat("90s & 2000s Nostalgia", [
      [
        "Tamagotchi",
        "Which egg-shaped Japanese digital pet from the 1990s had to be fed and cleaned or it would die?",
      ],
      [
        "Razor scooter",
        "Which foldable aluminum kick scooter was every kid's must-have toy around the year 2000?",
      ],
      [
        "iPod",
        "Which Apple device revolutionized how people listened to music with '1,000 songs in your pocket'?",
      ],
      [
        "MySpace",
        "Which social network where you could customize your profile with HTML and pick a Top 8 preceded Facebook?",
      ],
      [
        "Vine",
        "Which six-second video app launched careers for creators before shutting down in 2017?",
      ],
    ]),
    cat("Cooking & Chefs", [
      [
        "Gordon Ramsay",
        "Which fiery British chef is known for yelling at contestants on Hell's Kitchen and Kitchen Nightmares?",
      ],
      [
        "Air fryer",
        "Which countertop kitchen appliance that circulates hot air became TikTok's favorite way to cook everything?",
      ],
      [
        "Sourdough",
        "Which type of bread made with a fermented starter became everyone's lockdown baking project?",
      ],
      [
        "Noma",
        "Which Copenhagen restaurant was named the world's best multiple times before closing in 2024?",
      ],
      [
        "Stanley Tucci",
        "Which actor went viral for his cocktail-making videos and Italian food travelogue on CNN?",
      ],
    ]),
    cat("Iconic TV Moments", [
      [
        "Red Wedding",
        "Which shocking Game of Thrones massacre horrified viewers at a Stark-Frey wedding celebration?",
      ],
      [
        "I am the one who knocks",
        "What is Walter White's famous declaration of power in Breaking Bad?",
      ],
      [
        "The Last of Us",
        "Which HBO adaptation of a video game about a post-apocalyptic fungal infection became a massive hit?",
      ],
      [
        "White Lotus",
        "Which HBO anthology series about wealthy vacationers at luxury resorts became appointment TV?",
      ],
      [
        "Succession",
        "Which HBO drama about the Roy family's media empire dominated the 2023 Emmys in its final season?",
      ],
    ]),
    cat("Weird World Records", [
      [
        "Joey Chestnut",
        "Which competitive eater holds the record for most hot dogs consumed at Nathan's July 4th contest?",
      ],
      [
        "Speed cubing",
        "In which competitive hobby did Max Park set the 3.13-second world record for solving a Rubik's Cube?",
      ],
      [
        "Longest fingernails",
        "What body part does a Texas woman named Diana Armstrong hold a Guinness record for never cutting?",
      ],
      [
        "Most T-shirts worn",
        "What record involves layering hundreds of pieces of clothing on one person at the same time?",
      ],
      [
        "Largest pizza",
        "What was the food item measuring over 13,000 square feet that earned a Guinness record in 2023?",
      ],
    ]),
  ),

  // Board 10
  board(
    cat("Podcasts & True Crime", [
      [
        "My Favorite Murder",
        "Which comedy-true crime podcast hosted by Karen Kilgariff and Georgia Hardstark coined 'murderino'?",
      ],
      [
        "Dateline",
        "Which long-running NBC newsmagazine has become must-watch Friday night true crime TV?",
      ],
      [
        "Serial",
        "Which podcast's investigation of Adnan Syed's case led to his conviction being overturned in 2022?",
      ],
      [
        "The Jinx",
        "Which HBO documentary series about Robert Durst returned for a second season after his conviction?",
      ],
      [
        "Scam Goddess",
        "Which comedy podcast hosted by Laci Mosley covers con artists with a humorous twist?",
      ],
    ]),
    cat("Board Games & Tabletop", [
      [
        "Settlers of Catan",
        "Which German board game about trading resources like wheat and ore became a worldwide phenomenon?",
      ],
      [
        "Dungeons & Dragons",
        "Which tabletop RPG saw a massive popularity surge thanks to shows like Stranger Things and Critical Role?",
      ],
      [
        "Codenames",
        "Which party word game has two teams trying to guess their agents based on one-word clues?",
      ],
      [
        "Wingspan",
        "Which award-winning board game about collecting birds became a surprise hit with gorgeous artwork?",
      ],
      [
        "Ticket to Ride",
        "Which board game has players collecting train cards to claim railway routes across a map?",
      ],
    ]),
    cat("Internet Culture", [
      [
        "Touch grass",
        "What does the internet tell someone to do when they need to step away from online drama and go outside?",
      ],
      [
        "Main character energy",
        "Which TikTok concept means living life as if you're the protagonist of your own movie?",
      ],
      [
        "Slay",
        "Which slang term means to do something extremely well, often used as enthusiastic praise?",
      ],
      [
        "Rent free",
        "What phrase describes something that lives in your head and you can't stop thinking about it?",
      ],
      [
        "Chronically online",
        "What does the internet call someone who spends so much time on social media they lose touch with reality?",
      ],
    ]),
    cat("Fashion Moments", [
      [
        "Birkenstock",
        "Which German sandal brand had a major fashion comeback after appearing in the Barbie movie?",
      ],
      [
        "Barbiecore",
        "Which hot pink fashion aesthetic took over in 2023, inspired by Margot Robbie's movie press tour?",
      ],
      [
        "Zara",
        "Which fast-fashion Spanish retailer has become Gen Z's go-to for trend replication?",
      ],
      [
        "Platform shoes",
        "Which thick-soled footwear from the '70s and '90s made a major comeback in the 2020s?",
      ],
      [
        "Tenniscore",
        "Which 2023 fashion aesthetic inspired by country club style featured pleated skirts and polo shirts?",
      ],
    ]),
    cat("Streaming Music", [
      [
        "Spotify Wrapped",
        "Which annual recap of your listening habits becomes a social media event every December?",
      ],
      [
        "Vinyl revival",
        "What physical music format outsold CDs for the first time in decades in 2022?",
      ],
      [
        "Drake",
        "Which rapper held the record for most streams on Spotify before being overtaken by The Weeknd?",
      ],
      [
        "Doja Cat",
        "Which rapper and singer known for 'Say So' and 'Paint the Town Red' is famous for wild costumes?",
      ],
      [
        "SZA",
        "Whose album 'SOS' spent over 10 weeks at number one and featured hits like 'Kill Bill'?",
      ],
    ]),
    cat("Travel Trends", [
      [
        "Revenge travel",
        "Which post-pandemic trend saw people booking expensive trips to make up for lost time?",
      ],
      ["Digital nomad", "What do you call someone who works remotely while traveling the world?"],
      [
        "Bleisure",
        "What portmanteau describes combining business travel with leisure vacation time?",
      ],
      [
        "Overtourism",
        "What problem caused cities like Barcelona, Venice, and Amsterdam to restrict visitor numbers?",
      ],
      [
        "Japan tourism boom",
        "Which country saw record-breaking tourism in 2024 partly because its currency was weak against the dollar?",
      ],
    ]),
  ),

  // Board 11
  board(
    cat("Mental Health Awareness", [
      [
        "Therapy",
        "What form of professional mental health treatment became destigmatized largely through social media?",
      ],
      [
        "Burnout",
        "Which condition of physical and emotional exhaustion from prolonged stress was recognized by the WHO?",
      ],
      [
        "Anxiety",
        "Which mental health condition affecting millions is characterized by persistent worry and nervousness?",
      ],
      [
        "Mindfulness",
        "Which practice of being fully present and aware became a popular wellness and meditation trend?",
      ],
      [
        "Dopamine dressing",
        "Which fashion trend involves wearing bright, happy colors specifically to boost your mood?",
      ],
    ]),
    cat("Remix Culture", [
      [
        "Mashup",
        "What do you call a song that combines elements from two or more existing tracks?",
      ],
      [
        "Sampling",
        "What music production technique involves reusing a portion of an existing recording in a new song?",
      ],
      [
        "Fan fiction",
        "What type of creative writing by fans features characters from existing books, movies, or shows?",
      ],
      [
        "Cosplay",
        "What hobby involves creating and wearing costumes to portray fictional characters at conventions?",
      ],
      [
        "Fan edit",
        "What type of video remixes footage from movies or shows to create new storylines or improve existing ones?",
      ],
    ]),
    cat("Sports Culture", [
      [
        "Fantasy football",
        "Which game lets you draft real NFL players and compete based on their actual stats each week?",
      ],
      [
        "Pickleball",
        "Which paddle sport combining elements of tennis, badminton, and ping-pong became America's fastest-growing sport?",
      ],
      [
        "Formula 1",
        "Which auto racing series saw a massive U.S. popularity surge after the Netflix documentary 'Drive to Survive'?",
      ],
      [
        "NIL deals",
        "What ruling lets college athletes earn money from their Name, Image, and Likeness?",
      ],
      [
        "Saudi sports spending",
        "Which country spent billions luring stars like Cristiano Ronaldo and Neymar to its soccer league?",
      ],
    ]),
    cat("Home & Lifestyle", [
      [
        "Marie Kondo",
        "Which Japanese tidying expert taught the world to keep only items that 'spark joy'?",
      ],
      [
        "Cottagecore",
        "Which aesthetic romanticizes rural life with baking bread, flower arranging, and living in the countryside?",
      ],
      [
        "Plant parent",
        "What do millennials and Gen Z call themselves when they fill their apartments with houseplants?",
      ],
      [
        "Thrifting",
        "Which trend of buying secondhand clothing became both a sustainability movement and fashion statement?",
      ],
      [
        "Quiet luxury",
        "Which lifestyle trend favors understated quality and subtlety over flashy logos and brands?",
      ],
    ]),
    cat("Viral Challenges 2.0", [
      [
        "Milk crate challenge",
        "Which dangerous 2021 viral trend involved climbing a pyramid of stacked plastic containers?",
      ],
      [
        "Benadryl challenge",
        "Which TikTok challenge involving antihistamines led to FDA warnings about dangerous overdoses?",
      ],
      [
        "One Chip Challenge",
        "Which Paqui snack dare involving the world's spiciest tortilla chip was pulled from stores after a teen's death?",
      ],
      [
        "75 Hard",
        "Which intense 75-day fitness and mental toughness program went viral on TikTok?",
      ],
      [
        "12-3-30",
        "Which treadmill workout trend involves walking at an incline of 12, speed 3, for 30 minutes?",
      ],
    ]),
    cat("Celebrity Side Hustles", [
      [
        "Ryan Reynolds",
        "Which actor owns Aviation Gin, Mint Mobile, and Wrexham A.F.C. soccer club with Rob McElhenney?",
      ],
      [
        "Rihanna",
        "Whose Fenty Beauty and Savage X Lingerie brands made her a billionaire beyond music?",
      ],
      ["George Clooney", "Which actor co-founded Casamigos tequila and sold it for $1 billion?"],
      [
        "Snoop Dogg",
        "Which rapper has a cookbook, wine brand, and hosted the 2024 Olympics coverage for NBC?",
      ],
      [
        "Dwayne Johnson",
        "Which former wrestler turned actor launched Teremana tequila and the ZOA energy drink brand?",
      ],
    ]),
  ),
];

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED BOARDS (16+)
// ═══════════════════════════════════════════════════════════════════════════

export const ADVANCED_BOARDS: JeopardyBoard[] = [
  // Board 1
  board(
    cat("World Leaders", [
      [
        "Volodymyr Zelenskyy",
        "Which former comedian became Ukraine's wartime president and global symbol of resistance after Russia's 2022 invasion?",
      ],
      [
        "Narendra Modi",
        "Which Indian prime minister leads the world's most populous country and won a historic third term in 2024?",
      ],
      [
        "Xi Jinping",
        "Which Chinese leader abolished presidential term limits and consolidated more power than any leader since Mao?",
      ],
      [
        "Olaf Scholz",
        "Which German chancellor replaced Angela Merkel and reversed decades of policy by sending weapons to Ukraine?",
      ],
      [
        "Javier Milei",
        "Which libertarian economist and self-described 'anarcho-capitalist' won Argentina's presidency in 2023 wielding a chainsaw?",
      ],
    ]),
    cat("Political Scandals", [
      [
        "January 6th",
        "On which date in 2021 did a mob storm the U.S. Capitol in an attempt to overturn the presidential election?",
      ],
      [
        "Partygate",
        "Which scandal involving lockdown-breaking parties at 10 Downing Street triggered Boris Johnson's political downfall?",
      ],
      [
        "George Santos",
        "Which New York congressman was expelled from the House in 2023 after fabricating virtually his entire resume?",
      ],
      [
        "Bob Menendez",
        "Which New Jersey senator was indicted in 2023 after gold bars and cash were found in his home from alleged Egyptian bribes?",
      ],
      [
        "Clarence Thomas",
        "Which Supreme Court justice faced scrutiny over undisclosed luxury gifts from billionaire Harlan Crow?",
      ],
    ]),
    cat("International Conflicts", [
      [
        "Ukraine",
        "Which country did Russia launch a full-scale invasion of in February 2022, triggering the largest European war since WWII?",
      ],
      [
        "Gaza",
        "In which territory did Israel's military campaign following the October 7, 2023 Hamas attack kill tens of thousands of civilians?",
      ],
      [
        "Taiwan",
        "Around which self-governing island have China's increasing military provocations heightened fears of a potential invasion?",
      ],
      [
        "Wagner Group",
        "Which Russian private military company's leader launched a brief mutiny before dying in a plane crash?",
      ],
      [
        "Sudan",
        "In which African nation did a civil war between the Sudanese Armed Forces and the RSF militia erupt in April 2023?",
      ],
    ]),
    cat("Supreme Court Decisions", [
      [
        "Dobbs v. Jackson",
        "Which 2022 Supreme Court ruling overturned Roe v. Wade and eliminated the federal right to abortion?",
      ],
      [
        "Affirmative action",
        "What practice did the Supreme Court effectively end in college admissions in its 2023 ruling against Harvard and UNC?",
      ],
      [
        "Student loan forgiveness",
        "What type of debt was Biden's plan to cancel up to $20,000 per borrower of before the Supreme Court struck it down?",
      ],
      [
        "Trump v. United States",
        "Which 2024 ruling granted presidents broad immunity from criminal prosecution for official acts?",
      ],
      [
        "Chevron deference",
        "Which 40-year-old doctrine requiring courts to defer to federal agencies' interpretations did the Supreme Court overturn in 2024?",
      ],
    ]),
    cat("Tech & AI", [
      [
        "GPT-4",
        "Which OpenAI 2023 multimodal AI model could analyze images and pass the bar exam in the top percentile?",
      ],
      [
        "TikTok ban",
        "Which app did Congress pass legislation in 2024 requiring ByteDance to divest or face a U.S. ban?",
      ],
      [
        "NVIDIA",
        "Which chipmaker became one of the world's most valuable companies due to surging AI demand for its GPUs?",
      ],
      [
        "Sora",
        "Which text-to-video AI model did OpenAI announce in 2024 that could generate realistic minute-long videos?",
      ],
      [
        "EU AI Act",
        "What landmark legislation did the European Union pass in 2024, creating the world's first comprehensive AI regulations?",
      ],
    ]),
    cat("Climate Crisis", [
      [
        "COP28",
        "Which 2023 UN climate conference was controversially held in Dubai and headed by an oil company CEO?",
      ],
      [
        "1.5 degrees Celsius",
        "To what temperature threshold above pre-industrial levels does the Paris Agreement aim to limit global warming?",
      ],
      [
        "Canada wildfires",
        "Which country's record-breaking 2023 blazes blanketed New York City and the U.S. Northeast in hazardous orange smoke?",
      ],
      [
        "Maui",
        "On which Hawaiian island did the August 2023 wildfires in Lahaina become the deadliest U.S. wildfire in over a century?",
      ],
      [
        "Loss and damage fund",
        "What fund did COP28 establish to help developing countries deal with climate change impacts they didn't cause?",
      ],
    ]),
  ),

  // Board 2
  board(
    cat("Geopolitics", [
      [
        "BRICS",
        "Which economic bloc of Brazil, Russia, India, China, and South Africa expanded to include six new members in 2024?",
      ],
      [
        "NATO",
        "Which military alliance did Finland and Sweden break decades of neutrality to join in response to Russia's invasion of Ukraine?",
      ],
      [
        "Abraham Accords",
        "Which 2020 agreements normalized relations between Israel and several Arab states including the UAE and Bahrain?",
      ],
      [
        "Belt and Road",
        "What is the name of China's massive global infrastructure investment program?",
      ],
      [
        "AUKUS",
        "Which 2021 security pact between Australia, the UK, and the US will provide nuclear-powered submarines to Australia?",
      ],
    ]),
    cat("Election Drama", [
      [
        "Trump indictments",
        "In 2023, the 45th president was indicted in how many separate criminal cases, a first for any U.S. president?",
      ],
      [
        "Kamala Harris",
        "Which vice president became the Democratic presidential nominee in 2024 after Biden dropped out of the race?",
      ],
      [
        "Lula da Silva",
        "Which leftist leader returned to power in Brazil in 2023 after his corruption convictions were annulled?",
      ],
      [
        "Keir Starmer",
        "Which Labour leader won a landslide UK election victory in 2024, ending 14 years of Conservative rule?",
      ],
      [
        "Electoral College",
        "Which system, not the popular vote, determines U.S. presidential elections and remains hotly debated for reform?",
      ],
    ]),
    cat("Media & Journalism", [
      [
        "Elon Musk",
        "Which billionaire bought Twitter, fired most staff, unbanned controversial accounts, and rebranded it as X?",
      ],
      [
        "Tucker Carlson",
        "Which top-rated Fox News primetime host was abruptly fired in April 2023, shortly after the Dominion settlement?",
      ],
      [
        "Dominion Voting Systems",
        "With which company did Fox News settle a defamation lawsuit for $787.5 million over 2020 election lies?",
      ],
      [
        "The Washington Post",
        "Which newspaper's editorial board was controversially blocked by Jeff Bezos from endorsing a presidential candidate in 2024?",
      ],
      [
        "News deserts",
        "What term describes communities that have lost their local newspapers, leaving residents without local journalism?",
      ],
    ]),
    cat("Economic Headlines", [
      [
        "Inflation",
        "Which economic measure hit a 40-year high of 9.1% in the U.S. in June 2022, squeezing household budgets?",
      ],
      [
        "Silicon Valley Bank",
        "Which major tech-focused bank collapsed in March 2023, triggering fears of a broader banking crisis?",
      ],
      [
        "Interest rates",
        "What did the Federal Reserve raise to their highest level in over 20 years to fight inflation?",
      ],
      [
        "The Great Resignation",
        "Which 2021-2022 trend saw millions of workers voluntarily quit their jobs seeking better conditions?",
      ],
      [
        "De-dollarization",
        "What is the process pushed by BRICS nations of reducing reliance on the U.S. dollar in global trade?",
      ],
    ]),
    cat("Cultural Movements", [
      [
        "Black Lives Matter",
        "Which movement saw its largest protests in 2020 after the murder of George Floyd by a Minneapolis police officer?",
      ],
      [
        "Me Too",
        "Which movement against sexual harassment gained renewed momentum across industries after Harvey Weinstein's conviction?",
      ],
      [
        "Stop Asian Hate",
        "Which movement emerged during COVID-19 in response to a surge in anti-Asian violence and discrimination?",
      ],
      [
        "Book bans",
        "What did the American Library Association report record numbers of attempts to do to books in schools and libraries?",
      ],
      [
        "DEI",
        "Which abbreviation for Diversity, Equity, and Inclusion programs became a major political flashpoint with several states passing laws to restrict them?",
      ],
    ]),
    cat("Controversial Figures", [
      [
        "Elon Musk",
        "Which Tesla and SpaceX CEO became the world's richest person and most polarizing figure in tech?",
      ],
      [
        "Andrew Tate",
        "Which self-proclaimed misogynist influencer was arrested in Romania on charges of human trafficking and organized crime?",
      ],
      [
        "George Santos",
        "Which expelled congressman fabricated his education, work history, and personal story?",
      ],
      [
        "Sam Bankman-Fried",
        "Which FTX founder was convicted of fraud after his crypto exchange collapsed, losing billions in customer funds?",
      ],
      [
        "Rudy Giuliani",
        "Which former New York City mayor, once called 'America's Mayor,' was disbarred and found liable for defaming Georgia election workers?",
      ],
    ]),
  ),

  // Board 3
  board(
    cat("Documentary Deep Dives", [
      [
        "Icarus",
        "Which Oscar-winning documentary accidentally uncovered Russia's state-sponsored Olympic doping program?",
      ],
      [
        "13th",
        "Which Ava DuVernay documentary explored how the 13th Amendment's exception clause perpetuated racial inequality?",
      ],
      [
        "Navalny",
        "Which documentary followed the Russian opposition leader's poisoning investigation and return to Moscow?",
      ],
      [
        "The Jinx",
        "In which HBO documentary series did Robert Durst appear to confess to murder on a hot mic?",
      ],
      [
        "Four Hours at the Capitol",
        "Which HBO documentary used footage and testimony to reconstruct the January 6th insurrection minute by minute?",
      ],
    ]),
    cat("Crypto & Finance", [
      [
        "FTX",
        "Which cryptocurrency exchange collapsed in November 2022, wiping out billions in customer deposits?",
      ],
      [
        "Bitcoin ETF",
        "What type of spot investment product for cryptocurrency did the SEC approve for the first time in January 2024?",
      ],
      [
        "NFTs",
        "Which blockchain-based digital ownership tokens went from billion-dollar hype to near-worthless in under two years?",
      ],
      [
        "Terra Luna",
        "Which cryptocurrency's algorithmic stablecoin lost its peg in May 2022, vaporizing $40 billion in value?",
      ],
      [
        "Binance",
        "At which exchange, the world's largest crypto platform, did Changpeng Zhao plead guilty to money laundering violations?",
      ],
    ]),
    cat("Space Race 2.0", [
      [
        "Starship",
        "What is SpaceX's fully reusable mega-rocket called, the largest and most powerful rocket ever built?",
      ],
      [
        "Chandrayaan-3",
        "Which mission made India the fourth country to land on the Moon and the first to land near the south pole?",
      ],
      [
        "Artemis",
        "Which NASA program to return humans to the Moon is named after Apollo's twin sister in Greek mythology?",
      ],
      [
        "Ingenuity",
        "Which small Mars helicopter became the first aircraft to achieve powered flight on another planet?",
      ],
      [
        "James Webb Space Telescope",
        "Which $10 billion telescope positioned at the L2 Lagrange point revealed the deepest infrared images of the universe?",
      ],
    ]),
    cat("Immigration & Borders", [
      [
        "Title 42",
        "Which COVID-era border policy used by both Trump and Biden was lifted in May 2023?",
      ],
      [
        "Remain in Mexico",
        "Which Trump-era policy required asylum seekers to wait in Mexico while their U.S. cases were processed?",
      ],
      [
        "The border wall",
        "What physical barrier along the U.S.-Mexico boundary was Trump's signature immigration promise?",
      ],
      [
        "DACA",
        "Which Obama-era program protecting undocumented immigrants brought to the U.S. as children remains in legal limbo?",
      ],
      [
        "Lampedusa",
        "Which small Italian island has been overwhelmed by arrivals of migrants crossing the Mediterranean?",
      ],
    ]),
    cat("Pandemic Legacy", [
      [
        "Long COVID",
        "Which condition involves persistent symptoms months or years after the initial COVID infection?",
      ],
      [
        "mRNA vaccines",
        "Which groundbreaking technology, originally developed for cancer research, was used by Pfizer and Moderna for their COVID shots?",
      ],
      [
        "Lab leak theory",
        "What is the alternative hypothesis to the Wuhan market origin of COVID that remains debated?",
      ],
      [
        "Excess deaths",
        "What measure do epidemiologists use to capture total pandemic mortality beyond confirmed COVID death counts?",
      ],
      [
        "WHO pandemic treaty",
        "What global agreement to improve preparedness for future pandemics has had contentious negotiations?",
      ],
    ]),
    cat("Gender & Identity", [
      [
        "Transgender rights",
        "Which community's access to healthcare, sports, and bathrooms was targeted by hundreds of bills across U.S. states?",
      ],
      [
        "Roe v. Wade",
        "Which landmark 1973 ruling's overturning in 2022 triggered an immediate patchwork of state abortion laws?",
      ],
      [
        "Title IX",
        "Which federal law did the Biden administration propose changes to in order to include protections based on gender identity?",
      ],
      [
        "Equal Rights Amendment",
        "Which proposed constitutional amendment guaranteeing sex equality, first introduced in 1923, still hasn't been ratified?",
      ],
      [
        "Nonbinary",
        "Which gender identity, recognized on official IDs in a growing number of countries, is neither male nor female?",
      ],
    ]),
  ),

  // Board 4
  board(
    cat("Putin's Russia", [
      [
        "Alexei Navalny",
        "Which Russian opposition leader died in an Arctic penal colony in February 2024 under suspicious circumstances?",
      ],
      [
        "Nord Stream",
        "Which undersea gas pipelines from Russia to Germany were sabotaged by explosions in September 2022?",
      ],
      [
        "Yevgeny Prigozhin",
        "Which Wagner Group founder staged a brief armed mutiny against Russia's military leadership before dying in a suspicious plane crash?",
      ],
      [
        "Grain deal",
        "From which UN-brokered agreement allowing Ukrainian grain exports through the Black Sea did Russia pull out?",
      ],
      [
        "Partial mobilization",
        "What controversial call-up of 300,000 reservists did Putin order in September 2022, prompting mass emigration?",
      ],
    ]),
    cat("Middle East Turmoil", [
      [
        "October 7th",
        "What date in 2023 marked Hamas's unprecedented attack on Israel that killed approximately 1,200 people?",
      ],
      [
        "Rafah",
        "Which southern Gaza city near the Egyptian border saw an Israeli military operation that drew intense international criticism?",
      ],
      [
        "Houthis",
        "Which Yemeni rebel group began attacking shipping in the Red Sea in solidarity with Palestinians in late 2023?",
      ],
      [
        "Iran",
        "Which country launched its first direct military strike on Israeli soil in April 2024 with drones and missiles?",
      ],
      [
        "Two-state solution",
        "What long-proposed peace framework envisions independent Israeli and Palestinian nations existing side by side?",
      ],
    ]),
    cat("Big Tech Regulation", [
      [
        "Antitrust",
        "In which area of law did the DOJ's landmark case against Google argue it maintained an illegal search monopoly?",
      ],
      [
        "Section 230",
        "Which law shielding internet platforms from liability for user-generated content is a target of both parties?",
      ],
      [
        "GDPR",
        "Which EU regulation has become the global standard for data protection and digital rights?",
      ],
      [
        "App Store",
        "Over which iPhone marketplace and its 30% commission did Epic Games sue Apple?",
      ],
      [
        "Digital Markets Act",
        "Which EU law forced Apple to allow alternative app stores and sideloading on iPhones in Europe?",
      ],
    ]),
    cat("African Affairs", [
      [
        "Coup belt",
        "What name describes the wave of military takeovers that swept through Mali, Burkina Faso, Niger, and Gabon?",
      ],
      [
        "Ethiopia",
        "In which East African country did a brutal civil war in the Tigray region kill hundreds of thousands before a 2022 ceasefire?",
      ],
      [
        "South Africa",
        "In which country did the ANC lose its parliamentary majority for the first time in 30 years in 2024 elections?",
      ],
      [
        "Mpox",
        "Which disease, originally called monkeypox, spread globally in 2022 and resurged in Central Africa in 2024?",
      ],
      [
        "Sahel",
        "From which semi-arid African region did France withdraw its military forces as anti-French sentiment grew?",
      ],
    ]),
    cat("Trade Wars", [
      [
        "Chip war",
        "The U.S. passed the CHIPS Act to compete with China in manufacturing which essential components?",
      ],
      [
        "Tariffs",
        "Which taxes on Chinese goods did Trump impose and Biden largely keep in place and add more of?",
      ],
      [
        "TSMC",
        "Which Taiwanese company manufactures the vast majority of the world's most advanced semiconductor chips?",
      ],
      [
        "Rare earth minerals",
        "Which critical elements used in electronics, EVs, and military technology does China dominate global processing of?",
      ],
      [
        "Decoupling",
        "What term describes the push by the U.S. and allies to reduce economic dependence on China?",
      ],
    ]),
    cat("Gun Violence", [
      [
        "Uvalde",
        "In which Texas city did a gunman kill 19 children and 2 teachers at Robb Elementary School in May 2022?",
      ],
      [
        "Bipartisan Safer Communities Act",
        "What 2022 law was the first major federal gun safety legislation passed in nearly 30 years?",
      ],
      [
        "Ghost guns",
        "What are these untraceable homemade firearms without serial numbers that have become a growing law enforcement concern?",
      ],
      [
        "Red flag laws",
        "Which laws allow courts to temporarily remove firearms from people deemed a danger to themselves or others?",
      ],
      [
        "March for Our Lives",
        "Which mass protest movement demanding gun control was organized by Parkland shooting survivors?",
      ],
    ]),
  ),

  // Board 5
  board(
    cat("The Trump Legal Saga", [
      [
        "Manhattan hush money",
        "In which case was Trump convicted on 34 felony counts involving payments to Stormy Daniels?",
      ],
      [
        "Mar-a-Lago documents",
        "At which Palm Beach, Florida estate was Trump indicted for retaining classified documents?",
      ],
      [
        "Jack Smith",
        "Which special counsel was appointed to investigate Trump's efforts to overturn the 2020 election?",
      ],
      [
        "RICO",
        "Under which racketeering statute were Trump and 18 co-defendants charged in Fulton County, Georgia?",
      ],
      [
        "Presidential immunity",
        "What did the Supreme Court rule in Trump v. United States that presidents have broadly for official acts?",
      ],
    ]),
    cat("China Rising", [
      [
        "Belt and Road Initiative",
        "What is China's trillion-dollar global infrastructure program spanning over 150 countries called?",
      ],
      [
        "Spy balloon",
        "What type of Chinese surveillance device floated across the U.S. before being shot down in February 2023?",
      ],
      [
        "Uyghurs",
        "Against which Muslim minority group in Xinjiang did the UN find China committed serious human rights violations?",
      ],
      [
        "BRICS expansion",
        "Which economic bloc did China push to enlarge in order to counterbalance Western-dominated institutions?",
      ],
      [
        "Evergrande",
        "Which massive Chinese property developer's collapse exposed deep cracks in China's real estate sector?",
      ],
    ]),
    cat("Democracy Under Threat", [
      [
        "Disinformation",
        "What is the deliberate spread of false information to manipulate public opinion known as?",
      ],
      [
        "Gerrymandering",
        "What is the practice of drawing electoral districts to favor one party that has been challenged in courts nationwide?",
      ],
      [
        "Authoritarian populism",
        "What term do political scientists use for leaders who combine strongman rule with appeals to ordinary citizens?",
      ],
      [
        "Voter suppression",
        "What form of election manipulation do critics argue strict voter ID laws and limited polling locations amount to?",
      ],
      [
        "Deepfakes",
        "What are AI-generated realistic fake videos and audio recordings that pose a growing threat to elections called?",
      ],
    ]),
    cat("Labor Movements", [
      [
        "SAG-AFTRA",
        "Which actors' union went on strike alongside the writers' guild in 2023, shutting down Hollywood production?",
      ],
      [
        "WGA",
        "Which writers' union struck for 148 days in 2023 over streaming residuals and AI protections?",
      ],
      [
        "Amazon unionization",
        "At which tech giant's Staten Island warehouse did workers vote to form its first union in 2022?",
      ],
      [
        "UAW",
        "Which auto workers' union staged a historic simultaneous strike against Ford, GM, and Stellantis in 2023?",
      ],
      [
        "Starbucks Workers United",
        "Under which union have baristas at hundreds of locations organized starting in 2021?",
      ],
    ]),
    cat("Reproductive Rights", [
      [
        "Dobbs v. Jackson",
        "Which 2022 Supreme Court decision held that the Constitution does not confer a right to abortion?",
      ],
      [
        "Mifepristone",
        "Which widely used abortion medication had legal battles over its access reach the Supreme Court?",
      ],
      [
        "Trigger laws",
        "What type of pre-written state laws automatically banned abortion once Roe v. Wade was overturned?",
      ],
      [
        "Ballot measures",
        "Through which type of direct votes did voters in Kansas, Ohio, and Michigan protect abortion rights?",
      ],
      [
        "IVF",
        "Which fertility treatment was threatened when Alabama's Supreme Court ruled that frozen embryos are children?",
      ],
    ]),
    cat("Housing Crisis", [
      [
        "Airbnb effect",
        "What do critics blame short-term rental platforms for in terms of reducing housing supply and driving up rents?",
      ],
      [
        "NIMBYism",
        "Which acronym for 'Not In My Back Yard' describes opposition to new housing development in existing neighborhoods?",
      ],
      [
        "Rent control",
        "Which controversial policy caps how much landlords can charge, with economists debating its effectiveness?",
      ],
      [
        "Homelessness",
        "What did the U.S. record its highest-ever count of people experiencing in January 2023?",
      ],
      [
        "Zoning reform",
        "What type of land-use rule changes are cities and states making to allow more multi-family housing?",
      ],
    ]),
  ),

  // Board 6
  board(
    cat("AI Revolution", [
      [
        "Hallucination",
        "What term describes when AI chatbots confidently generate false information as if it were fact?",
      ],
      [
        "Claude",
        "Which Anthropic AI assistant is named after Claude Shannon and trained with Constitutional AI?",
      ],
      [
        "Midjourney",
        "Which AI image generation tool created viral images including a fake Pope in a puffer jacket?",
      ],
      [
        "Sam Altman firing",
        "Which OpenAI CEO was briefly ousted by the board in November 2023 before employees threatened to resign en masse?",
      ],
      [
        "Alignment",
        "Which AI safety concept focuses on ensuring artificial intelligence systems act in accordance with human values?",
      ],
    ]),
    cat("War Crimes & Justice", [
      [
        "ICC",
        "Which international court issued an arrest warrant for Vladimir Putin for the forced deportation of Ukrainian children?",
      ],
      [
        "Bucha massacre",
        "In which Ukrainian suburb outside Kyiv did evidence of Russian atrocities shock the world in April 2022?",
      ],
      [
        "Kherson",
        "Which southern Ukrainian regional capital did Ukraine liberate in November 2022 in a major symbolic victory?",
      ],
      [
        "Drone warfare",
        "What form of combat using cheap commercial and military unmanned aerial vehicles has been extensively used in Ukraine?",
      ],
      [
        "Cluster munitions",
        "Which weapons banned by over 100 countries did the U.S. controversially supply to Ukraine?",
      ],
    ]),
    cat("Energy Transition", [
      [
        "Electric vehicles",
        "What type of zero-emission cars saw global sales surpass 14 million units in 2023?",
      ],
      [
        "Heat pumps",
        "Which energy-efficient technology for heating and cooling buildings saw explosive growth in Europe?",
      ],
      [
        "Green hydrogen",
        "Which clean fuel produced using renewable electricity and water electrolysis is seen as key for heavy industry?",
      ],
      [
        "Offshore wind",
        "Which renewable energy source did the Biden administration approve multiple large-scale projects for along the U.S. East Coast?",
      ],
      [
        "IRA",
        "Despite its abbreviated name, what is the Inflation Reduction Act of 2022 the largest U.S. investment in?",
      ],
    ]),
    cat("Social Justice", [
      [
        "Reparations",
        "What payments did California's task force recommend for Black residents to address the legacy of slavery?",
      ],
      [
        "Affirmative action",
        "Which policy was effectively ended by the Supreme Court's 2023 ruling against Harvard and UNC in college admissions?",
      ],
      [
        "Police reform",
        "Which goal was left unmet when the George Floyd Justice in Policing Act passed the House but stalled in the Senate?",
      ],
      [
        "Environmental justice",
        "Which concept addresses the disproportionate impact of pollution and climate change on communities of color?",
      ],
      [
        "Missing and Murdered Indigenous Women",
        "What does the MMIW movement highlight about the crisis of violence against Native women?",
      ],
    ]),
    cat("European Politics", [
      [
        "Brexit",
        "Which 2020 divorce has left the UK grappling with trade barriers, labor shortages, and economic consequences?",
      ],
      [
        "Marine Le Pen",
        "Which far-right French leader's party won the most seats in the first round of France's 2024 snap elections?",
      ],
      [
        "Giorgia Meloni",
        "Who became Italy's first female prime minister in 2022 as leader of the Brothers of Italy?",
      ],
      [
        "Alexei Navalny",
        "Whose death in an Arctic prison in February 2024 prompted vigils across Europe?",
      ],
      [
        "Farmers' protests",
        "What 2024 protests saw tractors blockade capitals across Europe over EU environmental regulations?",
      ],
    ]),
    cat("Health & Science", [
      [
        "Wegovy",
        "Which brand name for semaglutide was approved specifically for weight management and became hugely in demand?",
      ],
      [
        "RSV vaccine",
        "Which vaccine for a common respiratory virus that endangers infants and the elderly was first approved in 2023?",
      ],
      [
        "CRISPR",
        "Which gene-editing technology received its first FDA-approved therapy for sickle cell disease in December 2023?",
      ],
      [
        "Microplastics",
        "Which tiny particles found in human blood, lungs, and placentas are raising health concerns worldwide?",
      ],
      [
        "Bird flu",
        "Which virus strain, H5N1, spread to dairy cattle across multiple U.S. states in 2024, raising pandemic concerns?",
      ],
    ]),
  ),

  // Board 7
  board(
    cat("Elon Musk Empire", [
      [
        "DOGE",
        "Which government efficiency initiative was Musk named to lead, sharing its name with a cryptocurrency?",
      ],
      [
        "Neuralink",
        "Which Musk brain-computer interface company implanted its first chip in a human patient in January 2024?",
      ],
      [
        "Starlink",
        "Which SpaceX satellite internet service became critical infrastructure for Ukraine's military communications?",
      ],
      [
        "X",
        "To which single letter did Musk rebrand Twitter in 2023, replacing the iconic blue bird logo?",
      ],
      [
        "Grok",
        "What is the name of Musk's AI chatbot built by xAI that is marketed as having a 'rebellious streak'?",
      ],
    ]),
    cat("Global Food Crisis", [
      [
        "Black Sea grain",
        "Through which body of water did Russia's blockade of Ukrainian exports threaten global food supplies?",
      ],
      [
        "Fertilizer shortage",
        "What agricultural input produced mainly by Russia and Belarus became scarce, driving up food prices worldwide?",
      ],
      [
        "El Niño",
        "Which Pacific Ocean warming pattern in 2023-2024 worsened droughts and floods, threatening global food production?",
      ],
      [
        "Food inflation",
        "What term for rising prices of basic groceries disproportionately affected the world's poorest populations?",
      ],
      [
        "Lab-grown meat",
        "Which cultured protein produced without slaughtering animals was approved for sale in Singapore and the U.S.?",
      ],
    ]),
    cat("Misinformation Age", [
      [
        "QAnon",
        "Which conspiracy movement's followers were prominent at the January 6th Capitol riot?",
      ],
      [
        "Anti-vax movement",
        "Which pre-existing movement experienced a broader resurgence fueled by distrust of COVID vaccines?",
      ],
      [
        "Fact-checking",
        "What function do platforms like Snopes and PolitiFact perform, though their effectiveness is debated?",
      ],
      [
        "Russian troll farms",
        "What are state-sponsored disinformation operations like the Internet Research Agency known as?",
      ],
      [
        "AI-generated content",
        "Which technology's proliferation of realistic but fake text, images, and video threatens information integrity?",
      ],
    ]),
    cat("Nuclear Tensions", [
      [
        "Zaporizhzhia",
        "Which Ukrainian nuclear power plant, Europe's largest, raised fears of a disaster under Russian occupation?",
      ],
      [
        "AUKUS submarines",
        "Which security pact will provide Australia with nuclear-powered submarines using U.S. and UK technology?",
      ],
      [
        "Iran nuclear deal",
        "Which diplomatic agreement known as the JCPOA collapsed after Trump's 2018 withdrawal?",
      ],
      [
        "North Korea",
        "Which country's regime under Kim Jong Un test-fired a record number of missiles in 2022, including ICBMs?",
      ],
      [
        "Oppenheimer",
        "Which 2023 Christopher Nolan film about the father of the atomic bomb reignited interest in nuclear weapons history?",
      ],
    ]),
    cat("Inequality & Wealth", [
      [
        "Billionaire tax",
        "Which proposed policy aims to address the fact that the ultra-wealthy often pay lower effective tax rates than workers?",
      ],
      [
        "Oxfam report",
        "Which organization's annual inequality report found the richest 1% captured nearly twice as much new wealth as the rest of the world?",
      ],
      [
        "Union resurgence",
        "What trend of worker organizing brought public approval of labor unions to its highest level since the 1960s?",
      ],
      [
        "CEO pay ratio",
        "Which metric tracks that the average large-company CEO now earns over 300 times their median worker?",
      ],
      [
        "Universal basic income",
        "Which policy of unconditional cash payments to citizens showed promising results in pilot programs across multiple cities?",
      ],
    ]),
    cat("The Future of Democracy", [
      [
        "Ranked choice voting",
        "Which electoral reform used in Alaska and Maine lets voters rank candidates in order of preference?",
      ],
      [
        "Term limits",
        "Which reform proposals aim to prevent career politicians from holding the same office indefinitely?",
      ],
      [
        "Dark money",
        "What term describes political spending by nonprofit organizations that don't disclose their donors?",
      ],
      [
        "Misinformation laws",
        "What type of legislation does the EU's Digital Services Act use to attempt to combat online falsehoods?",
      ],
      [
        "Youth voter turnout",
        "Which metric measuring Gen Z's increased participation in elections has surprised political analysts?",
      ],
    ]),
  ),

  // Board 8
  board(
    cat("Science & Breakthroughs", [
      [
        "Nuclear fusion",
        "In December 2022, Lawrence Livermore achieved net energy gain for the first time in which type of reaction?",
      ],
      [
        "AlphaFold",
        "Which DeepMind AI system solved the 50-year-old protein folding problem, winning its creators a Nobel Prize?",
      ],
      [
        "Ozempic",
        "Which semaglutide drug originally for diabetes became the most talked-about weight loss medication in decades?",
      ],
      [
        "Quantum computing",
        "Which computing paradigm using qubits instead of bits did Google claim 'supremacy' in with its Sycamore processor?",
      ],
      [
        "Casgevy",
        "What was the first CRISPR-based gene therapy approved by the FDA in 2023, treating sickle cell disease?",
      ],
    ]),
    cat("Music Industry Politics", [
      [
        "Taylor's Version",
        "What re-recording campaign did Taylor Swift launch after Scooter Braun acquired her master recordings?",
      ],
      [
        "Streaming royalties",
        "Which ongoing industry dispute centers on artists receiving fractions of a cent per play on platforms like Spotify?",
      ],
      [
        "Ticketmaster",
        "Which ticketing monopoly faced a DOJ antitrust lawsuit after its disastrous Eras Tour presale crash?",
      ],
      [
        "Drake vs. Kendrick",
        "Which 2024 rap feud produced diss tracks 'Not Like Us' and 'Family Matters' and dominated the summer?",
      ],
      [
        "Beyoncé country snub",
        "Whose 'Cowboy Carter' album fueled debate about genre gatekeeping after being overlooked by the CMA Awards?",
      ],
    ]),
    cat("Art World Controversies", [
      [
        "Beeple",
        "Which digital artist sold an NFT collage for $69.3 million at Christie's, making it the third-most expensive work by a living artist?",
      ],
      [
        "Banksy shredder",
        "Which anonymous artist's 'Love Is in the Bin' partially self-destructed at auction, then sold for even more?",
      ],
      [
        "Stolen art repatriation",
        "What movement has seen major museums return looted artifacts to countries like Greece, Nigeria, and Ethiopia?",
      ],
      [
        "AI art copyright",
        "What legal question emerged when the U.S. Copyright Office ruled that purely AI-generated images lack human authorship?",
      ],
      [
        "Immersive Van Gogh",
        "Which controversial exhibition format projects famous paintings onto walls, drawing both crowds and criticism?",
      ],
    ]),
    cat("Geopolitics: Asia-Pacific", [
      [
        "QUAD",
        "Which grouping of the U.S., Japan, India, and Australia was formed to counter China's influence in the Indo-Pacific?",
      ],
      [
        "South China Sea",
        "In which body of water does China claim territory through artificial islands despite international tribunal rulings against it?",
      ],
      [
        "AUKUS",
        "Which trilateral security pact will provide Australia with nuclear-powered submarines using U.S. and UK technology?",
      ],
      [
        "Myanmar coup",
        "In which Southeast Asian country did the military seize power in February 2021, triggering a brutal civil war?",
      ],
      [
        "Fukushima water",
        "Which Japanese nuclear plant began releasing treated radioactive wastewater into the Pacific in 2023, angering China?",
      ],
    ]),
    cat("Philosophy & Ethics", [
      [
        "Effective altruism",
        "Which philosophical movement associated with Sam Bankman-Fried advocates using evidence and reason to maximize charitable impact?",
      ],
      [
        "Longtermism",
        "Which philosophical stance prioritizes the welfare of future generations, sometimes over present concerns?",
      ],
      [
        "AI alignment",
        "What field of research focuses on ensuring artificial intelligence systems pursue goals beneficial to humanity?",
      ],
      [
        "Trolley problem",
        "Which classic ethics thought experiment about diverting a runaway trolley became relevant to self-driving car programming?",
      ],
      [
        "Right to be forgotten",
        "Which legal concept allows individuals to request the deletion of their personal data from search engines and databases?",
      ],
    ]),
    cat("Latin America", [
      [
        "Nayib Bukele",
        "Which El Salvadoran president gained fame for cracking down on gangs and adopting Bitcoin as legal tender?",
      ],
      [
        "Pink tide",
        "What term describes the wave of left-wing election victories across Latin America in 2022-2023?",
      ],
      [
        "Gustavo Petro",
        "Who became Colombia's first left-wing president in 2022, a former guerrilla fighter?",
      ],
      [
        "Panama Canal drought",
        "Which vital global shipping route faced severe traffic restrictions in 2023 due to climate-related water shortages?",
      ],
      [
        "Venezuela migration",
        "From which crisis-stricken country have over 7 million people emigrated, one of the largest displacement crises in the world?",
      ],
    ]),
  ),

  // Board 9
  board(
    cat("Tech Ethics & Regulation", [
      [
        "Algorithmic bias",
        "What term describes systematic discrimination embedded in AI systems that can affect hiring, lending, and policing?",
      ],
      [
        "Right to repair",
        "Which consumer movement advocates for laws allowing people to fix their own electronics and farm equipment?",
      ],
      [
        "Surveillance capitalism",
        "What concept, coined by Shoshana Zuboff, describes the commodification of personal data by tech companies?",
      ],
      [
        "Age verification",
        "Which requirement for social media platforms has been passed into law in several U.S. states and the EU to protect minors?",
      ],
      [
        "Open source AI",
        "Which debate pits Meta's approach of releasing AI model weights publicly against OpenAI's closed approach?",
      ],
    ]),
    cat("International Courts & Law", [
      [
        "ICJ",
        "Which UN court ruled that Israel must take measures to prevent genocide in its military operations in Gaza?",
      ],
      [
        "Universal jurisdiction",
        "Which legal principle allows countries to prosecute certain grave crimes regardless of where they were committed?",
      ],
      [
        "ICC arrest warrant",
        "What legal instrument did the International Criminal Court issue for Vladimir Putin over the deportation of Ukrainian children?",
      ],
      [
        "Crimes against humanity",
        "Under which category of international law were the Uyghur detentions in Xinjiang characterized by human rights organizations?",
      ],
      [
        "Rome Statute",
        "Which 1998 treaty established the International Criminal Court, though major powers like the U.S., Russia, and China haven't ratified it?",
      ],
    ]),
    cat("Space Exploration", [
      [
        "Artemis II",
        "Which NASA mission will send astronauts around the Moon for the first time since Apollo 17 in 1972?",
      ],
      [
        "OSIRIS-REx",
        "Which NASA mission successfully returned a sample from the asteroid Bennu to Earth in 2023?",
      ],
      [
        "Europa Clipper",
        "Which NASA spacecraft launched in 2024 will investigate whether Jupiter's icy moon could harbor life?",
      ],
      [
        "Starship orbital test",
        "Which SpaceX vehicle, the largest rocket ever built, failed its first orbital test flight but succeeded in catching its booster on a later attempt?",
      ],
      [
        "Space debris",
        "What growing problem of defunct satellites and fragments in orbit threatens future space missions through cascading collisions known as the Kessler syndrome?",
      ],
    ]),
    cat("Economic Theory & Policy", [
      [
        "Modern Monetary Theory",
        "Which heterodox economic framework argues sovereign currency-issuing nations can't run out of money?",
      ],
      [
        "Yield curve inversion",
        "Which bond market phenomenon where short-term rates exceed long-term rates has historically predicted recessions?",
      ],
      [
        "Shrinkflation",
        "What practice sees companies reducing product sizes while maintaining prices, effectively a hidden price increase?",
      ],
      [
        "Nearshoring",
        "What is the practice of relocating supply chains to geographically closer countries like Mexico to reduce dependence on China?",
      ],
      [
        "Central bank digital currency",
        "What type of government-issued digital money are over 100 countries exploring, with China's e-CNY being the most advanced?",
      ],
    ]),
    cat("Climate & Environment", [
      [
        "Tipping points",
        "What term describes thresholds in the climate system that, once crossed, trigger irreversible and accelerating changes?",
      ],
      [
        "Carbon capture",
        "Which technology aims to remove CO2 directly from the atmosphere or industrial emissions and store it underground?",
      ],
      [
        "Greenwashing",
        "What is the deceptive practice of companies exaggerating or fabricating their environmental credentials?",
      ],
      [
        "PFAS forever chemicals",
        "Which class of persistent synthetic chemicals found in drinking water are linked to cancer and have prompted EPA regulation?",
      ],
      [
        "Loss of biodiversity",
        "Which crisis, sometimes called the sixth mass extinction, sees species disappearing at rates 100-1000 times normal?",
      ],
    ]),
    cat("Media & Propaganda", [
      [
        "State media",
        "What type of government-controlled news outlets like RT and CGTN do democracies struggle to counter?",
      ],
      [
        "Information warfare",
        "Which concept describes the strategic use of disinformation, hacking, and media manipulation as a weapon in geopolitical conflicts?",
      ],
      [
        "Citizen journalism",
        "What form of reporting by ordinary people using smartphones has become crucial for documenting conflicts and police violence?",
      ],
      [
        "Section 230",
        "Which 26-word U.S. law protecting internet platforms from liability for user content is called 'the most important law in tech'?",
      ],
      [
        "Substack",
        "Which newsletter platform became a haven for independent journalists but faced controversy over hosting extremist content?",
      ],
    ]),
  ),

  // Board 10
  board(
    cat("Global Health", [
      [
        "Antimicrobial resistance",
        "Which growing public health threat occurs when bacteria, viruses, and fungi evolve to survive drugs designed to kill them?",
      ],
      [
        "WHO pandemic preparedness",
        "Which international treaty has been under contentious negotiation to improve the world's response to future health emergencies?",
      ],
      [
        "Mental health crisis",
        "Which public health emergency has seen adolescent rates of depression and anxiety surge, linked partly to social media?",
      ],
      [
        "Universal healthcare",
        "Which model of health coverage that most developed nations use remains politically contentious in the United States?",
      ],
      [
        "Fentanyl crisis",
        "Which synthetic opioid, 50-100 times stronger than morphine, drives the majority of U.S. overdose deaths?",
      ],
    ]),
    cat("Authoritarian Playbook", [
      [
        "Autocratic legalism",
        "What term describes leaders who use nominally democratic legal tools to consolidate power and suppress opposition?",
      ],
      [
        "Viktor Orbán",
        "Which Hungarian leader's model of 'illiberal democracy' has inspired far-right movements globally?",
      ],
      [
        "Press freedom",
        "What fundamental right has declined globally for a decade according to Reporters Without Borders?",
      ],
      [
        "Pegasus spyware",
        "Which Israeli-made surveillance software was revealed to have been used by governments to monitor journalists and dissidents?",
      ],
      [
        "Social credit system",
        "What controversial Chinese monitoring system assigns citizens scores based on their behavior?",
      ],
    ]),
    cat("Digital Economy", [
      [
        "Creator economy",
        "Which economic model valued at over $100 billion encompasses influencers, YouTubers, and podcasters monetizing content?",
      ],
      [
        "Gig economy",
        "Which labor model built on short-term independent contracts has faced legal battles over worker classification?",
      ],
      [
        "Web3",
        "Which blockchain-based vision of a decentralized internet has faced skepticism as crypto markets crashed?",
      ],
      [
        "AI automation",
        "What economic threat led Goldman Sachs to estimate 300 million jobs globally could be affected by generative AI?",
      ],
      [
        "Platform economy",
        "What model where companies like Uber, Airbnb, and DoorDash match suppliers with consumers dominates the modern economy?",
      ],
    ]),
    cat("Historical Parallels", [
      [
        "Weimar Republic",
        "Which interwar German democracy's collapse into authoritarianism is frequently invoked as a warning for modern democracies?",
      ],
      [
        "Cold War 2.0",
        "What term describes the growing ideological and technological rivalry between the U.S. and China?",
      ],
      [
        "Appeasement",
        "Which historical policy toward Hitler in the 1930s is invoked by critics of insufficient Western responses to Putin?",
      ],
      [
        "Spanish flu",
        "Which 1918 pandemic that killed 50 million people is the most common historical comparison point for COVID-19?",
      ],
      [
        "Bretton Woods",
        "Which 1944 agreement established the post-WWII economic order that BRICS nations now seek to challenge?",
      ],
    ]),
    cat("Education & Culture Wars", [
      [
        "Critical race theory",
        "Which academic framework examining systemic racism became a major political flashpoint in school board fights?",
      ],
      [
        "Book banning",
        "What practice saw record attempts in U.S. schools and libraries, often targeting LGBTQ+ and racial justice titles?",
      ],
      [
        "School choice",
        "Which education policy promoting vouchers and charter schools has advanced in multiple Republican-led states?",
      ],
      [
        "Student debt",
        "Which financial burden averaging $37,000 per borrower has the Biden administration made multiple attempts to reduce?",
      ],
      [
        "AI in education",
        "What technology's integration into classrooms has forced universities to rethink assessment, plagiarism, and learning?",
      ],
    ]),
    cat("Migration & Demographics", [
      [
        "Population decline",
        "What demographic trend affecting countries like Japan, South Korea, and China threatens economic growth and pension systems?",
      ],
      [
        "Climate refugees",
        "What term describes people displaced by rising seas, droughts, and extreme weather, though they lack formal legal status?",
      ],
      [
        "Replacement theory",
        "Which white supremacist conspiracy theory falsely claims elites are deliberately replacing white populations with immigrants?",
      ],
      [
        "EU migration pact",
        "What agreement did EU member states reach in 2024 to share responsibility for processing asylum seekers?",
      ],
      [
        "Demographic dividend",
        "Which economic concept explains how young populations in Africa could drive growth, if education and jobs keep pace?",
      ],
    ]),
  ),

  // Board 11
  board(
    cat("Artificial Intelligence Debates", [
      [
        "Existential risk",
        "Which concern about advanced AI, endorsed by figures like Geoffrey Hinton and Yoshua Bengio, focuses on potential human extinction?",
      ],
      [
        "Open letter pause",
        "What did thousands of tech leaders sign in March 2023 calling for a six-month halt to training AI systems more powerful than GPT-4?",
      ],
      [
        "Anthropic",
        "Which AI safety company founded by former OpenAI researchers created Claude and pioneered Constitutional AI?",
      ],
      [
        "AI copyright",
        "What legal dispute has the New York Times, authors, and artists brought against AI companies over training on their work?",
      ],
      [
        "Autonomous weapons",
        "What category of AI-powered military technology that can select and engage targets without human intervention faces calls for a UN ban?",
      ],
    ]),
    cat("Global Power Shifts", [
      [
        "Multipolar world",
        "What term describes the emerging geopolitical order where power is distributed among several major states rather than one or two?",
      ],
      [
        "Global South",
        "What collective term for developing nations has gained prominence as these countries demand greater voice in international institutions?",
      ],
      [
        "Petrodollar",
        "Which decades-old system of pricing oil in U.S. dollars faced challenges as Saudi Arabia signaled willingness to trade in other currencies?",
      ],
      [
        "ASEAN",
        "Which 10-member Southeast Asian bloc has become a key arena for U.S.-China competition for influence?",
      ],
      [
        "African Continental Free Trade Area",
        "What is the world's largest free trade area by number of countries, creating a single market for 1.3 billion Africans?",
      ],
    ]),
    cat("Technology & Society", [
      [
        "Digital divide",
        "What term describes the gap between people with reliable internet and technology access and those without?",
      ],
      [
        "Attention economy",
        "Which concept describes how platforms compete for human focus, treating it as a scarce and monetizable resource?",
      ],
      [
        "Techno-feudalism",
        "What term coined by Yanis Varoufakis argues that platforms like Amazon and Google have replaced capitalism with a new form of serfdom?",
      ],
      [
        "Brain-computer interface",
        "Which technology connecting neural signals to computers advanced when Neuralink implanted its first human chip in 2024?",
      ],
      [
        "Synthetic biology",
        "Which field of engineering living organisms to produce fuels, drugs, and materials is considered a key 21st-century industry?",
      ],
    ]),
    cat("Constitutional Crises", [
      [
        "Judicial overreach",
        "What criticism has been leveled at U.S. district judges issuing nationwide injunctions that block federal policies?",
      ],
      [
        "Executive power",
        "Which area of constitutional law was at the center of debates about presidential immunity and emergency declarations?",
      ],
      [
        "Insurrection clause",
        "Which Section 3 of the 14th Amendment bars individuals who 'engaged in insurrection' from holding office?",
      ],
      [
        "Court expansion",
        "Which proposed reform would add seats to the U.S. Supreme Court to counteract its conservative supermajority?",
      ],
      [
        "Originalism",
        "Which judicial philosophy interprets the Constitution based on its original meaning at the time of ratification?",
      ],
    ]),
    cat("Future of Work", [
      [
        "Four-day work week",
        "Which labor reform showed positive results in UK and Icelandic trials, maintaining productivity with less time?",
      ],
      [
        "Remote work",
        "Which pandemic-accelerated practice of working from home has become a permanent battleground between employers and employees?",
      ],
      [
        "AI job displacement",
        "Which concern led the IMF to warn that 40% of global employment could be affected by artificial intelligence?",
      ],
      [
        "Quiet quitting",
        "Which 2022 workplace trend describes doing the minimum required at work instead of going above and beyond?",
      ],
      [
        "Unions in tech",
        "What labor movement gained ground as employees at Apple, Google, and Microsoft organized for better conditions?",
      ],
    ]),
    cat("Philosophical Challenges", [
      [
        "Post-truth",
        "Which concept describes a political culture where appeals to emotion and personal belief outweigh objective facts?",
      ],
      [
        "Digital consciousness",
        "Which philosophical question about whether AI could become sentient was raised when a Google engineer claimed LaMDA was aware?",
      ],
      [
        "Epistemic crisis",
        "What term describes the breakdown in shared agreement about basic facts and how knowledge is established?",
      ],
      [
        "Techno-optimism",
        "Which worldview, championed by Marc Andreessen's manifesto, argues technology is the solution to nearly all human problems?",
      ],
      [
        "Degrowth",
        "Which economic philosophy argues wealthy nations should deliberately shrink their economies to address climate change and inequality?",
      ],
    ]),
  ),
];

// ─── Accessor ─────────────────────────────────────────────────────────────

export function getClueBank(complexity: string): JeopardyBoard[] {
  switch (complexity) {
    case "kids":
      return KIDS_BOARDS;
    case "advanced":
      return ADVANCED_BOARDS;
    default:
      return STANDARD_BOARDS;
  }
}
