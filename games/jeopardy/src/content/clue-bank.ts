// ─── Jeopardy Clue Bank ───────────────────────────────────────────────────
// 7 boards per complexity level (kids / standard / advanced) = 21 total.
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
    cat("Animals", [
      ["A cat", "What animal purrs and chases mice?"],
      ["An elephant", "What is the largest land animal?"],
      ["A cheetah", "What is the fastest land animal?"],
      ["A blue whale", "What is the largest animal that has ever lived?"],
      ["A chameleon", "What lizard can change its color to blend in?"],
    ]),
    cat("Cartoons", [
      ["SpongeBob SquarePants", "Who lives in a pineapple under the sea?"],
      ["Scooby-Doo", "What cartoon dog helps solve mysteries with Shaggy?"],
      ["Mickey Mouse", "Who is the famous Disney character with round ears?"],
      ["Bugs Bunny", "What carrot-eating rabbit loves carrots and outsmarting Elmer Fudd?"],
      ["Dora the Explorer", "What cartoon girl carries a purple backpack and explores?"],
    ]),
    cat("Food", [
      ["Pizza", "What popular food is round, flat, and has cheese on top?"],
      ["An apple", "What red fruit keeps the doctor away?"],
      ["Popcorn", "What snack pops when you heat up the kernels?"],
      ["A banana", "What yellow fruit do monkeys love to eat?"],
      ["Spaghetti", "What long thin pasta is often served with meatballs?"],
    ]),
    cat("Space", [
      ["The Moon", "What orbits the Earth and glows at night?"],
      ["The Sun", "What star is closest to Earth?"],
      ["Mars", "What planet is known as the Red Planet?"],
      ["Saturn", "What planet has big rings around it?"],
      ["Pluto", "What dwarf planet used to be the ninth planet?"],
    ]),
    cat("Colors", [
      ["Red", "What color are fire trucks?"],
      ["Green", "What color is grass?"],
      ["Orange", "What color is a carrot?"],
      ["Blue", "What color is the sky on a clear day?"],
      ["Purple", "What color do you get when you mix red and blue?"],
    ]),
    cat("Sports", [
      ["Soccer", "What sport uses a round black-and-white ball and goals?"],
      ["Basketball", "What sport has players shooting a ball through a hoop?"],
      ["Swimming", "What sport takes place in a pool or lake?"],
      ["Baseball", "What sport uses a bat, a ball, and bases?"],
      ["Gymnastics", "What sport has flips, cartwheels, and balance beams?"],
    ]),
  ),

  // Board 2
  board(
    cat("Dinosaurs", [
      ["Tyrannosaurus Rex", "What giant meat-eating dinosaur had tiny arms?"],
      ["Triceratops", "What dinosaur had three horns on its head?"],
      ["Stegosaurus", "What dinosaur had plates along its back and spikes on its tail?"],
      ["Brachiosaurus", "What super tall dinosaur had a very long neck?"],
      ["Pterodactyl", "What flying reptile lived during the dinosaur age?"],
    ]),
    cat("Ocean Life", [
      ["A dolphin", "What smart sea animal is known for jumping out of the water?"],
      ["An octopus", "What sea creature has eight arms?"],
      ["A starfish", "What ocean animal is shaped like a star?"],
      ["A seahorse", "What tiny ocean creature looks like a horse?"],
      ["A jellyfish", "What see-through sea creature can sting you?"],
    ]),
    cat("Fairy Tales", [
      ["Cinderella", "Who left a glass slipper at the ball?"],
      ["The Big Bad Wolf", "Who tried to blow down the three little pigs' houses?"],
      ["Rapunzel", "What princess let down her long hair from a tower?"],
      ["Jack", "Who climbed a beanstalk and found a giant?"],
      ["Snow White", "What princess lived with seven dwarfs?"],
    ]),
    cat("Weather", [
      ["A rainbow", "What colorful arc appears in the sky after rain?"],
      ["Thunder", "What loud sound comes during a storm?"],
      ["A snowflake", "What falls from the sky in winter and is always unique?"],
      ["A tornado", "What spinning funnel of wind touches the ground?"],
      ["Hail", "What are balls of ice that fall from clouds called?"],
    ]),
    cat("Music", [
      ["A drum", "What instrument do you hit with sticks?"],
      ["A piano", "What instrument has black and white keys?"],
      ["A guitar", "What stringed instrument do rock stars play?"],
      ["A flute", "What instrument do you blow across to make sound?"],
      ["A violin", "What stringed instrument do you play with a bow?"],
    ]),
    cat("Bugs & Insects", [
      ["A ladybug", "What small red beetle has black spots?"],
      ["A butterfly", "What insect starts as a caterpillar?"],
      ["A firefly", "What bug lights up at night?"],
      ["An ant", "What tiny insect lives in colonies and carries things bigger than itself?"],
      ["A bee", "What insect makes honey?"],
    ]),
  ),

  // Board 3
  board(
    cat("Countries", [
      ["Australia", "What country is also a continent with kangaroos?"],
      ["Japan", "What island country is known for sushi and cherry blossoms?"],
      ["Egypt", "What country has the Great Pyramids?"],
      ["Brazil", "What South American country is famous for soccer and Carnival?"],
      ["Canada", "What country is north of the United States and has a maple leaf flag?"],
    ]),
    cat("Body Parts", [
      ["The heart", "What organ pumps blood through your body?"],
      ["The brain", "What organ inside your head helps you think?"],
      ["The lungs", "What two organs help you breathe?"],
      ["The stomach", "What organ breaks down the food you eat?"],
      ["The skeleton", "What is the name for all 206 bones in your body?"],
    ]),
    cat("Superheroes", [
      ["Spider-Man", "What superhero was bitten by a radioactive spider?"],
      ["Batman", "What superhero lives in a cave and drives the Batmobile?"],
      ["Wonder Woman", "What Amazon warrior princess has an invisible jet?"],
      ["Superman", "What superhero comes from the planet Krypton?"],
      ["The Hulk", "What superhero turns big and green when angry?"],
    ]),
    cat("Toys & Games", [
      ["LEGO", "What toy uses small plastic bricks to build things?"],
      ["A yo-yo", "What toy goes up and down on a string?"],
      ["A kite", "What toy flies in the wind on a long string?"],
      ["Monopoly", "What board game has you buying properties like Park Place?"],
      ["A Rubik's Cube", "What colorful puzzle cube has six sides to solve?"],
    ]),
    cat("Holidays", [
      ["Halloween", "On what holiday do kids dress up and say trick-or-treat?"],
      ["Christmas", "What holiday is celebrated on December 25th?"],
      ["Easter", "What spring holiday involves an egg hunt?"],
      ["Thanksgiving", "What November holiday celebrates with turkey dinner?"],
      ["Valentine's Day", "What February holiday celebrates love with hearts and cards?"],
    ]),
    cat("Plants", [
      ["A sunflower", "What tall yellow flower faces the sun?"],
      ["A cactus", "What desert plant is covered in sharp spines?"],
      ["A Venus flytrap", "What plant can snap shut to catch bugs?"],
      ["An oak tree", "What common tree grows from an acorn?"],
      ["Bamboo", "What plant can grow over three feet in a single day?"],
    ]),
  ),

  // Board 4
  board(
    cat("Dogs", [
      ["A golden retriever", "What friendly yellow dog breed loves to fetch?"],
      ["A Dalmatian", "What white dog breed has black spots and rides fire trucks?"],
      ["A poodle", "What curly-haired dog breed comes in standard, mini, and toy sizes?"],
      ["A German shepherd", "What dog breed is often used as a police dog?"],
      ["A chihuahua", "What is the smallest dog breed in the world?"],
    ]),
    cat("Nursery Rhymes", [
      ["Humpty Dumpty", "Who sat on a wall and had a great fall?"],
      ["Jack and Jill", "Who went up the hill to fetch a pail of water?"],
      ["Little Bo Peep", "Who lost her sheep and didn't know where to find them?"],
      ["Old Mother Hubbard", "Who went to the cupboard to get her dog a bone?"],
      ["Mary", "Whose little lamb followed her to school one day?"],
    ]),
    cat("Video Games", [
      ["Mario", "What plumber jumps on goombas to save Princess Peach?"],
      ["Minecraft", "What game lets you build with blocks and survive against creepers?"],
      ["Pikachu", "What yellow electric creature is the star of Pokemon?"],
      ["Sonic", "What blue hedgehog collects gold rings and runs super fast?"],
      ["Kirby", "What pink puffball can copy enemy powers by swallowing them?"],
    ]),
    cat("Numbers", [
      ["12", "How many months are in a year?"],
      ["8", "How many legs does a spider have?"],
      ["7", "How many continents are there on Earth?"],
      ["26", "How many letters are in the English alphabet?"],
      ["206", "How many bones are in the adult human body?"],
    ]),
    cat("Transportation", [
      ["A helicopter", "What flying vehicle has spinning blades on top?"],
      ["A submarine", "What vehicle can travel underwater?"],
      ["A hot air balloon", "What flies using a big bag filled with heated air?"],
      ["A train", "What vehicle runs on rails and has a caboose?"],
      ["A rocket", "What vehicle launches astronauts into space?"],
    ]),
    cat("Movies", [
      ["Frozen", "What Disney movie has a princess who can make ice and snow?"],
      ["Finding Nemo", "What movie is about a clownfish dad searching for his son?"],
      ["The Lion King", "What movie features a lion cub named Simba?"],
      ["Toy Story", "What movie stars a cowboy named Woody and a space ranger named Buzz?"],
      ["Moana", "What movie follows a Polynesian girl who sails across the ocean?"],
    ]),
  ),

  // Board 5
  board(
    cat("Fruits", [
      ["A watermelon", "What large green fruit is red and juicy inside?"],
      ["Grapes", "What small round fruits grow in bunches on a vine?"],
      ["A pineapple", "What tropical fruit has a spiky crown on top?"],
      ["A coconut", "What round brown fruit has white flesh and water inside?"],
      ["A mango", "What orange tropical fruit is the most popular fruit in the world?"],
    ]),
    cat("Sounds", [
      ["Woof", "What sound does a dog make?"],
      ["Moo", "What sound does a cow make?"],
      ["Buzz", "What sound does a bee make?"],
      ["Hiss", "What sound does a snake make?"],
      ["Ribbit", "What sound does a frog make?"],
    ]),
    cat("Geography", [
      ["The Sahara", "What is the largest hot desert in Africa?"],
      ["The Amazon", "What is the largest rainforest in the world?"],
      ["Mount Everest", "What is the tallest mountain in the world?"],
      ["The Nile", "What is the longest river in Africa?"],
      ["Antarctica", "What is the coldest continent on Earth?"],
    ]),
    cat("School Subjects", [
      ["Math", "In what subject do you learn addition and subtraction?"],
      ["Art", "In what class do you paint, draw, and use clay?"],
      ["Science", "In what subject do you learn about plants, animals, and experiments?"],
      ["Music", "In what class do you learn to sing and play instruments?"],
      ["Physical Education", "What class is also called gym or P.E.?"],
    ]),
    cat("Inventions", [
      ["The telephone", "What invention lets you talk to people far away?"],
      ["The light bulb", "What invention by Thomas Edison lights up a room?"],
      ["The airplane", "What did the Wright Brothers invent that flies?"],
      ["The printing press", "What invention made it possible to print books quickly?"],
      ["The internet", "What invention connects computers all around the world?"],
    ]),
    cat("Magic Words", [
      ["Abracadabra", "What magic word do magicians say when performing a trick?"],
      ["Please", "What word should you say when asking for something politely?"],
      ["Thank you", "What two words do you say when someone gives you something?"],
      ["Sorry", "What word do you say when you accidentally hurt someone?"],
      ["Presto", "What word means a magic trick happened instantly?"],
    ]),
  ),

  // Board 6
  board(
    cat("Farm Animals", [
      ["A pig", "What farm animal rolls in mud and goes oink?"],
      ["A horse", "What farm animal do people ride and it goes neigh?"],
      ["A chicken", "What farm animal lays eggs?"],
      ["A goat", "What farm animal eats almost anything and has horns?"],
      ["A sheep", "What farm animal gives us wool for sweaters?"],
    ]),
    cat("Shapes", [
      ["A circle", "What shape is a pizza?"],
      ["A triangle", "What shape has exactly three sides?"],
      ["A star", "What shape has five points?"],
      ["A rectangle", "What shape is a door?"],
      ["An octagon", "What eight-sided shape is a stop sign?"],
    ]),
    cat("Story Characters", [
      ["Pinocchio", "What puppet's nose grew longer when he lied?"],
      ["The Grinch", "Who stole Christmas from the Whos in Whoville?"],
      ["Goldilocks", "Who tried three bowls of porridge at the bears' house?"],
      ["Peter Pan", "What boy never grows up and lives in Neverland?"],
      ["Alice", "Who fell down a rabbit hole into Wonderland?"],
    ]),
    cat("Baby Animals", [
      ["A kitten", "What is a baby cat called?"],
      ["A puppy", "What is a baby dog called?"],
      ["A cub", "What is a baby bear called?"],
      ["A foal", "What is a baby horse called?"],
      ["A joey", "What is a baby kangaroo called?"],
    ]),
    cat("Continents", [
      ["Africa", "What continent has lions, elephants, and giraffes in the wild?"],
      ["Asia", "What is the largest continent on Earth?"],
      ["Europe", "What continent has the Eiffel Tower and Big Ben?"],
      ["South America", "What continent has the Amazon River?"],
      ["North America", "What continent has the United States, Canada, and Mexico?"],
    ]),
    cat("Things That Fly", [
      ["A bird", "What animal flies and has feathers?"],
      ["A bat", "What is the only mammal that can truly fly?"],
      ["A frisbee", "What round plastic disc do you throw at the park?"],
      ["A paper airplane", "What do you fold from a sheet of paper and toss?"],
      ["A blimp", "What slow-flying airship floats over football stadiums?"],
    ]),
  ),

  // Board 7
  board(
    cat("Candy & Sweets", [
      ["A lollipop", "What candy on a stick do you lick?"],
      ["Chocolate", "What sweet treat comes from cocoa beans?"],
      ["Gummy bears", "What chewy candy is shaped like a small bear?"],
      ["Cotton candy", "What fluffy pink treat is made from spun sugar?"],
      ["Bubble gum", "What candy can you chew and blow into bubbles?"],
    ]),
    cat("Planets", [
      ["Mercury", "What is the closest planet to the Sun?"],
      ["Jupiter", "What is the largest planet in our solar system?"],
      ["Venus", "What planet is the hottest in our solar system?"],
      ["Neptune", "What is the farthest planet from the Sun?"],
      ["Earth", "What is the only planet known to have life?"],
    ]),
    cat("Famous Places", [
      ["The Statue of Liberty", "What green statue holds a torch in New York Harbor?"],
      ["The Great Wall of China", "What ancient wall stretches across China?"],
      ["The Eiffel Tower", "What tall iron tower is in Paris, France?"],
      ["The Grand Canyon", "What huge canyon in Arizona was carved by a river?"],
      ["Niagara Falls", "What famous waterfall is on the border of the US and Canada?"],
    ]),
    cat("Dance", [
      ["The Macarena", "What group dance has you putting your arms out and shaking your hips?"],
      ["Ballet", "What type of dance uses pointed shoes and tutus?"],
      ["The Robot", "What dance move makes you look like a machine?"],
      ["Break dancing", "What style of dance includes spinning on your head?"],
      ["The Chicken Dance", "What silly dance has you flapping your arms like wings?"],
    ]),
    cat("Science Fun", [
      ["A volcano", "What mountain-like landform can erupt with hot lava?"],
      ["A fossil", "What is the preserved remains of an ancient animal in rock?"],
      ["A magnet", "What object sticks to metal things using an invisible force?"],
      ["A telescope", "What tool helps you see stars and planets far away?"],
      ["Gravity", "What invisible force keeps you on the ground?"],
    ]),
    cat("At the Beach", [
      ["A sandcastle", "What do you build out of wet sand at the beach?"],
      ["A seashell", "What hard, pretty thing washes up from the ocean?"],
      ["Sunscreen", "What lotion protects your skin from sunburn?"],
      ["A surfboard", "What board do you stand on to ride ocean waves?"],
      ["A tide pool", "What small pool of water forms in rocks at the shore?"],
    ]),
  ),
];

// ═══════════════════════════════════════════════════════════════════════════
// STANDARD BOARDS (13+)
// ═══════════════════════════════════════════════════════════════════════════

export const STANDARD_BOARDS: JeopardyBoard[] = [
  // Board 1
  board(
    cat("World Geography", [
      ["The Amazon River", "What is the longest river in South America?"],
      ["Tokyo", "What is the most populous city in Japan?"],
      ["The Himalayas", "What mountain range contains Mount Everest?"],
      ["Iceland", "What island nation lies between the North Atlantic and Arctic Oceans?"],
      ["The Mariana Trench", "What is the deepest point in the world's oceans?"],
    ]),
    cat("American History", [
      ["George Washington", "Who was the first President of the United States?"],
      ["1776", "In what year was the Declaration of Independence signed?"],
      ["The Louisiana Purchase", "What 1803 deal doubled the size of the United States?"],
      ["Abraham Lincoln", "What president issued the Emancipation Proclamation?"],
      ["The 19th Amendment", "What constitutional amendment gave women the right to vote?"],
    ]),
    cat("Science", [
      ["H2O", "What is the chemical formula for water?"],
      ["Isaac Newton", "Who discovered the laws of gravity and motion?"],
      ["The mitochondria", "What organelle is known as the powerhouse of the cell?"],
      ["Albert Einstein", "Who developed the theory of relativity?"],
      ["DNA", "What molecule carries the genetic instructions for life?"],
    ]),
    cat("Pop Culture", [
      ["Taylor Swift", "What singer is known for her Eras Tour and hit album '1989'?"],
      [
        "The Marvel Cinematic Universe",
        "What film franchise includes Iron Man, Thor, and the Avengers?",
      ],
      ["TikTok", "What short-video social media app was created by ByteDance?"],
      ["Harry Potter", "What book series features a wizard school called Hogwarts?"],
      ["BTS", "What K-pop group from South Korea has fans called ARMY?"],
    ]),
    cat("Movies", [
      ["The Wizard of Oz", "In what 1939 film does Dorothy follow the Yellow Brick Road?"],
      ["Titanic", "What 1997 James Cameron film features Jack and Rose on a doomed ship?"],
      ["Star Wars", "What sci-fi franchise features Jedi knights and the Force?"],
      ["Jurassic Park", "What 1993 Spielberg film brought dinosaurs back to life?"],
      ["The Godfather", "What 1972 film follows the Corleone crime family?"],
    ]),
    cat("Literature", [
      ["Mark Twain", "Who wrote 'The Adventures of Tom Sawyer'?"],
      [
        "Romeo and Juliet",
        "What Shakespeare play features two star-crossed lovers from feuding families?",
      ],
      ["George Orwell", "Who wrote the dystopian novel '1984'?"],
      [
        "To Kill a Mockingbird",
        "What Harper Lee novel features Atticus Finch as a lawyer in Alabama?",
      ],
      ["The Odyssey", "What ancient Greek epic follows Odysseus on his journey home from Troy?"],
    ]),
  ),

  // Board 2
  board(
    cat("Music History", [
      ["The Beatles", "What British band had members named John, Paul, George, and Ringo?"],
      ["Elvis Presley", "Who is known as the King of Rock and Roll?"],
      ["Beethoven", "What composer continued to write music after becoming deaf?"],
      ["Woodstock", "What 1969 music festival in New York became a cultural milestone?"],
      ["Michael Jackson", "Who released the best-selling album 'Thriller'?"],
    ]),
    cat("World Capitals", [
      ["Paris", "What is the capital of France?"],
      ["Canberra", "What is the capital of Australia?"],
      ["Brasilia", "What is the capital of Brazil?"],
      ["Ottawa", "What is the capital of Canada?"],
      ["Nairobi", "What is the capital of Kenya?"],
    ]),
    cat("Human Body", [
      ["The femur", "What is the longest bone in the human body?"],
      ["Red blood cells", "What type of blood cell carries oxygen?"],
      ["The liver", "What is the largest internal organ in the human body?"],
      ["The cornea", "What transparent layer covers the front of the eye?"],
      ["The cerebellum", "What part of the brain controls balance and coordination?"],
    ]),
    cat("Technology", [
      ["Apple", "What company created the iPhone?"],
      ["Binary", "What number system uses only 0s and 1s?"],
      ["Tim Berners-Lee", "Who invented the World Wide Web?"],
      ["Bluetooth", "What wireless technology was named after a Viking king?"],
      [
        "Moore's Law",
        "What observation states that transistor count doubles roughly every two years?",
      ],
    ]),
    cat("Mythology", [
      ["Zeus", "Who is the king of the gods in Greek mythology?"],
      ["Thor", "What Norse god wields the hammer Mjolnir?"],
      ["Medusa", "What Greek monster had snakes for hair and could turn people to stone?"],
      ["The Minotaur", "What half-man, half-bull creature lived in a labyrinth on Crete?"],
      ["Anubis", "What Egyptian god with a jackal head guided souls to the afterlife?"],
    ]),
    cat("Sports Records", [
      ["Usain Bolt", "Who holds the world record for the 100-meter dash at 9.58 seconds?"],
      ["Wayne Gretzky", "What hockey player holds the record for most career goals in the NHL?"],
      ["Simone Biles", "What American gymnast has the most World Championship gold medals?"],
      ["Michael Phelps", "What swimmer has won the most Olympic gold medals ever?"],
      ["Wilt Chamberlain", "What NBA player scored 100 points in a single game?"],
    ]),
  ),

  // Board 3
  board(
    cat("Food & Drink", [
      ["Sushi", "What Japanese dish features vinegared rice with raw fish?"],
      ["Espresso", "What strong Italian coffee is the base for lattes and cappuccinos?"],
      ["Kimchi", "What spicy fermented cabbage is a staple of Korean cuisine?"],
      ["Champagne", "What sparkling wine is named after a region in France?"],
      ["Croissant", "What flaky, crescent-shaped pastry originated in France?"],
    ]),
    cat("Ancient Civilizations", [
      ["The Egyptians", "What civilization built the Great Pyramid of Giza?"],
      ["The Roman Empire", "What ancient empire was centered in Italy and built the Colosseum?"],
      ["The Aztecs", "What Mesoamerican civilization built Tenochtitlan where Mexico City stands?"],
      ["The Greeks", "What ancient civilization gave us democracy and the Olympic Games?"],
      ["The Incas", "What South American empire built Machu Picchu in the Andes?"],
    ]),
    cat("Elements", [
      ["Gold", "What element has the symbol Au?"],
      ["Oxygen", "What element makes up about 21% of Earth's atmosphere?"],
      ["Iron", "What element has the symbol Fe and is essential for blood?"],
      ["Helium", "What noble gas makes balloons float and voices squeaky?"],
      ["Uranium", "What radioactive element is used as fuel in nuclear power plants?"],
    ]),
    cat("TV Shows", [
      ["Friends", "What 1990s sitcom is set in a coffee shop called Central Perk?"],
      ["Game of Thrones", "What HBO fantasy series is based on George R.R. Martin's novels?"],
      ["The Office", "What mockumentary sitcom is set at the Dunder Mifflin Paper Company?"],
      ["Breaking Bad", "What show follows a chemistry teacher turned drug lord in New Mexico?"],
      ["Stranger Things", "What Netflix sci-fi series is set in the 1980s in Hawkins, Indiana?"],
    ]),
    cat("Languages", [
      ["Mandarin Chinese", "What is the most spoken native language in the world?"],
      ["Latin", "What ancient language is the root of Spanish, French, and Italian?"],
      ["Braille", "What writing system uses raised dots for people who are blind?"],
      [
        "Esperanto",
        "What constructed language was created in 1887 to be a universal second language?",
      ],
      [
        "Sanskrit",
        "What ancient Indian language is considered the mother of many South Asian languages?",
      ],
    ]),
    cat("Space Exploration", [
      ["Neil Armstrong", "Who was the first person to walk on the Moon?"],
      ["1957", "In what year did the Soviet Union launch Sputnik?"],
      ["The International Space Station", "What is the largest human-made structure in orbit?"],
      [
        "Voyager 1",
        "What spacecraft launched in 1977 is the farthest human-made object from Earth?",
      ],
      ["Mars", "What planet did the Perseverance rover land on in 2021?"],
    ]),
  ),

  // Board 4
  board(
    cat("Art & Artists", [
      ["Leonardo da Vinci", "Who painted the Mona Lisa?"],
      ["Vincent van Gogh", "What Dutch painter is known for 'Starry Night'?"],
      ["Pablo Picasso", "What Spanish artist co-founded Cubism?"],
      ["Frida Kahlo", "What Mexican artist is famous for her self-portraits?"],
      ["Claude Monet", "What French artist is considered the founder of Impressionism?"],
    ]),
    cat("Oceans & Seas", [
      ["The Pacific Ocean", "What is the largest ocean on Earth?"],
      ["The Dead Sea", "What body of water is so salty that people float easily?"],
      ["The Mediterranean Sea", "What sea is bordered by Europe, Africa, and Asia?"],
      ["The Arctic Ocean", "What is the smallest and shallowest ocean?"],
      [
        "The Bermuda Triangle",
        "What region in the Atlantic is famous for mysterious disappearances?",
      ],
    ]),
    cat("Inventions", [
      ["Thomas Edison", "Who invented the practical light bulb?"],
      ["Johannes Gutenberg", "Who invented the movable-type printing press around 1440?"],
      ["Alexander Graham Bell", "Who is credited with inventing the telephone in 1876?"],
      ["The Wright Brothers", "Who made the first powered airplane flight in 1903?"],
      ["Nikola Tesla", "What inventor pioneered alternating current electricity?"],
    ]),
    cat("Animals", [
      ["A platypus", "What egg-laying mammal has a duck-like bill and venomous spurs?"],
      ["An axolotl", "What Mexican salamander can regenerate its limbs?"],
      ["A narwhal", "What Arctic whale has a long spiral tusk?"],
      ["A pangolin", "What is the only mammal covered in scales?"],
      ["An albatross", "What seabird has the longest wingspan of any living bird?"],
    ]),
    cat("Math", [
      ["Pi", "What mathematical constant is approximately 3.14159?"],
      ["The Pythagorean Theorem", "What theorem states a-squared plus b-squared equals c-squared?"],
      ["A googol", "What number is 10 raised to the 100th power?"],
      [
        "Fibonacci",
        "What Italian mathematician described a sequence where each number is the sum of the two before it?",
      ],
      [
        "Zero",
        "What number did Indian mathematicians formalize as a concept around the 5th century?",
      ],
    ]),
    cat("Flags & Symbols", [
      ["Japan", "What country has a flag with a red circle on a white background?"],
      ["The olive branch", "What symbol on the United Nations flag represents peace?"],
      ["Switzerland", "What country has a square-shaped flag with a white cross?"],
      [
        "The crescent moon and star",
        "What symbols appear on the flags of many Muslim-majority countries?",
      ],
      ["Nepal", "What is the only country with a non-rectangular flag?"],
    ]),
  ),

  // Board 5
  board(
    cat("US States", [
      ["Alaska", "What is the largest US state by area?"],
      ["Hawaii", "What US state is made up entirely of islands?"],
      ["Texas", "What state is known as the Lone Star State?"],
      ["Rhode Island", "What is the smallest US state by area?"],
      ["California", "What state has the most people and is home to Hollywood?"],
    ]),
    cat("Physics", [
      ["The speed of light", "What travels at approximately 186,000 miles per second?"],
      ["An atom", "What is the basic unit of matter?"],
      ["Gravity", "What force keeps planets in orbit around the Sun?"],
      ["A black hole", "What cosmic object has gravity so strong that nothing can escape it?"],
      ["The Higgs boson", "What particle discovered in 2012 gives other particles their mass?"],
    ]),
    cat("Board Games", [
      ["Chess", "What strategy game has kings, queens, bishops, and knights?"],
      ["Risk", "What board game involves world domination through military strategy?"],
      ["Clue", "What mystery board game has you guessing who did it, with what, and where?"],
      ["Scrabble", "What word game uses letter tiles on a grid to score points?"],
      [
        "Settlers of Catan",
        "What strategy game has players collecting resources to build settlements?",
      ],
    ]),
    cat("Famous Speeches", [
      ["Martin Luther King Jr.", "Who said 'I have a dream' in 1963?"],
      ["Abraham Lincoln", "Who delivered the Gettysburg Address in 1863?"],
      ["Winston Churchill", "Who said 'We shall fight on the beaches' during World War II?"],
      ["John F. Kennedy", "Who said 'Ask not what your country can do for you'?"],
      ["Franklin D. Roosevelt", "Who said 'The only thing we have to fear is fear itself'?"],
    ]),
    cat("Fashion", [
      ["Coco Chanel", "What French designer popularized the little black dress?"],
      ["Nike", "What brand's slogan is 'Just Do It'?"],
      ["Denim", "What fabric are blue jeans made from?"],
      ["A beret", "What round, flat hat is associated with French fashion?"],
      ["Haute couture", "What French term describes high-end custom-fitted fashion?"],
    ]),
    cat("Landmarks", [
      ["The Colosseum", "What ancient amphitheater in Rome could seat 50,000 spectators?"],
      ["Machu Picchu", "What 15th-century Incan citadel sits high in the Andes Mountains of Peru?"],
      ["The Taj Mahal", "What white marble mausoleum in India was built by Shah Jahan?"],
      ["Stonehenge", "What prehistoric monument in England consists of large standing stones?"],
      [
        "The Great Barrier Reef",
        "What is the world's largest coral reef system off the coast of Australia?",
      ],
    ]),
  ),

  // Board 6
  board(
    cat("Chemistry", [
      ["Carbon", "What element is the basis of organic chemistry?"],
      ["The periodic table", "What chart organizes all known chemical elements?"],
      ["NaCl", "What is the chemical formula for table salt?"],
      ["Noble gases", "What group of elements is known for being extremely unreactive?"],
      [
        "Marie Curie",
        "Who was the first woman to win a Nobel Prize, for her work on radioactivity?",
      ],
    ]),
    cat("World Wars", [
      ["1914", "In what year did World War I begin?"],
      ["D-Day", "What June 6, 1944 operation was the Allied invasion of Normandy?"],
      ["The Treaty of Versailles", "What 1919 treaty officially ended World War I?"],
      ["Pearl Harbor", "What US naval base was attacked by Japan on December 7, 1941?"],
      ["The Manhattan Project", "What secret US program developed the first atomic bomb?"],
    ]),
    cat("Animated Films", [
      ["Shrek", "What animated film features a green ogre and a talking donkey?"],
      ["Up", "What Pixar film features an old man who flies his house with balloons?"],
      [
        "Spirited Away",
        "What Studio Ghibli film won the 2003 Academy Award for Best Animated Feature?",
      ],
      ["Coco", "What Pixar film is set during the Mexican Day of the Dead?"],
      ["The Incredibles", "What Pixar film follows a family of superheroes in hiding?"],
    ]),
    cat("Economics", [
      ["Supply and demand", "What basic economic principle determines prices in a market?"],
      ["Inflation", "What term describes the general increase in prices over time?"],
      [
        "The stock market",
        "What financial market allows people to buy and sell shares of companies?",
      ],
      ["Adam Smith", "Who is considered the father of modern economics?"],
      [
        "GDP",
        "What three-letter abbreviation measures the total value of goods produced by a country?",
      ],
    ]),
    cat("Famous Duos", [
      ["Sherlock Holmes and Watson", "What fictional detective duo lives at 221B Baker Street?"],
      ["Batman and Robin", "What superhero duo protects Gotham City?"],
      ["Lewis and Clark", "What pair of explorers led an expedition across western North America?"],
      ["Tom and Jerry", "What cartoon cat-and-mouse duo have been chasing each other since 1940?"],
      [
        "Bonnie and Clyde",
        "What criminal couple became famous outlaws during the Great Depression?",
      ],
    ]),
    cat("Astronomy", [
      ["A constellation", "What is a pattern of stars visible from Earth called?"],
      ["A light-year", "What unit of distance measures how far light travels in one year?"],
      ["The Milky Way", "What galaxy contains our solar system?"],
      ["A supernova", "What explosive event marks the death of a massive star?"],
      ["Galileo Galilei", "Who was the first to use a telescope to observe the planets?"],
    ]),
  ),

  // Board 7
  board(
    cat("Psychology", [
      ["Sigmund Freud", "Who is considered the father of psychoanalysis?"],
      ["Pavlov's dog", "What experiment demonstrated classical conditioning with a bell and food?"],
      ["REM sleep", "What sleep stage is associated with dreaming?"],
      [
        "The placebo effect",
        "What phenomenon occurs when a fake treatment produces real improvement?",
      ],
      [
        "Maslow's hierarchy of needs",
        "What pyramid-shaped theory ranks human needs from basic to self-actualization?",
      ],
    ]),
    cat("Olympic Games", [
      ["Athens, Greece", "Where were the first modern Olympic Games held in 1896?"],
      ["Five", "How many rings are in the Olympic symbol?"],
      ["The marathon", "What long-distance running event is 26.2 miles?"],
      ["1936 Berlin", "At what Olympics did Jesse Owens win four gold medals?"],
      ["Figure skating", "What winter sport combines ice skating with dance and jumps?"],
    ]),
    cat("Musical Instruments", [
      ["A saxophone", "What woodwind instrument was invented by Adolphe Sax?"],
      ["A cello", "What stringed instrument is played sitting down and is larger than a viola?"],
      ["A ukulele", "What small four-stringed instrument originated in Hawaii?"],
      ["An oboe", "What double-reed woodwind instrument tunes the orchestra?"],
      ["A theremin", "What electronic instrument is played without touching it?"],
    ]),
    cat("Rivers", [
      ["The Mississippi", "What is the longest river in North America?"],
      ["The Danube", "What river flows through more European capitals than any other?"],
      ["The Ganges", "What river is sacred in Hinduism?"],
      ["The Yangtze", "What is the longest river in Asia?"],
      ["The Congo", "What African river is the deepest in the world?"],
    ]),
    cat("Vocabulary", [
      ["A palindrome", "What is a word or phrase that reads the same forwards and backwards?"],
      [
        "An oxymoron",
        "What figure of speech combines two contradictory terms, like 'jumbo shrimp'?",
      ],
      [
        "Onomatopoeia",
        "What literary term describes words that imitate sounds, like 'buzz' or 'splash'?",
      ],
      ["A portmanteau", "What word describes blending two words together, like 'brunch'?"],
      ["An anagram", "What is a word formed by rearranging the letters of another word?"],
    ]),
    cat("Architecture", [
      ["The arch", "What curved structural element was perfected by the Romans?"],
      ["Frank Lloyd Wright", "What American architect designed Fallingwater?"],
      ["A flying buttress", "What external support structure is common in Gothic cathedrals?"],
      ["The Parthenon", "What ancient Greek temple sits atop the Acropolis in Athens?"],
      [
        "Art Deco",
        "What architectural style is seen in the Chrysler Building and Empire State Building?",
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
    cat("Classical Music", [
      ["Antonio Vivaldi", "Who composed 'The Four Seasons'?"],
      ["Beethoven's 9th Symphony", "What symphony introduced choral voices with 'Ode to Joy'?"],
      ["Pyotr Tchaikovsky", "Who composed 'Swan Lake' and 'The Nutcracker'?"],
      ["Igor Stravinsky", "Whose 'Rite of Spring' caused a riot at its 1913 Paris premiere?"],
      [
        "Richard Wagner",
        "What German composer created the four-opera cycle 'Der Ring des Nibelungen'?",
      ],
    ]),
    cat("World Politics", [
      [
        "The United Nations",
        "What international organization was founded in 1945 to promote peace?",
      ],
      ["NATO", "What military alliance was formed in 1949 as a counterbalance to Soviet power?"],
      [
        "Nelson Mandela",
        "Who became South Africa's first Black president after 27 years in prison?",
      ],
      ["The Berlin Wall", "What structure divided East and West Germany until its fall in 1989?"],
      ["The Bretton Woods Agreement", "What 1944 conference established the IMF and World Bank?"],
    ]),
    cat("Philosophy", [
      ["Socrates", "What Greek philosopher was sentenced to death by drinking hemlock?"],
      ["Cogito ergo sum", "What Latin phrase by Descartes means 'I think, therefore I am'?"],
      [
        "Friedrich Nietzsche",
        "What philosopher declared 'God is dead' and developed the concept of the Ubermensch?",
      ],
      ["Plato's Republic", "What work describes an ideal society ruled by philosopher-kings?"],
      [
        "Immanuel Kant",
        "What philosopher developed the categorical imperative as a test for moral action?",
      ],
    ]),
    cat("Advanced Science", [
      ["Quantum mechanics", "What branch of physics deals with behavior at the subatomic level?"],
      ["CRISPR", "What gene-editing technology was adapted from a bacterial immune system?"],
      [
        "The Heisenberg Uncertainty Principle",
        "What principle states you cannot simultaneously know a particle's exact position and momentum?",
      ],
      ["Dark matter", "What invisible substance makes up about 27% of the universe?"],
      [
        "The Standard Model",
        "What theory describes the fundamental particles and forces of nature?",
      ],
    ]),
    cat("Literary Classics", [
      ["Fyodor Dostoevsky", "Who wrote 'Crime and Punishment' and 'The Brothers Karamazov'?"],
      ["Gabriel Garcia Marquez", "Who wrote 'One Hundred Years of Solitude'?"],
      ["James Joyce", "Who wrote the notoriously difficult novel 'Ulysses'?"],
      ["Franz Kafka", "Who wrote 'The Metamorphosis' about a man who turns into an insect?"],
      ["Marcel Proust", "Who wrote the seven-volume novel 'In Search of Lost Time'?"],
    ]),
    cat("Economics & Finance", [
      [
        "John Maynard Keynes",
        "What economist argued for government spending to combat recessions?",
      ],
      ["The Federal Reserve", "What is the central banking system of the United States?"],
      ["A derivative", "What financial instrument derives its value from an underlying asset?"],
      ["Milton Friedman", "What economist championed monetarism and free-market capitalism?"],
      [
        "The Laffer Curve",
        "What curve suggests that beyond a certain point, higher tax rates reduce revenue?",
      ],
    ]),
  ),

  // Board 2
  board(
    cat("Renaissance Art", [
      ["Michelangelo", "Who painted the ceiling of the Sistine Chapel?"],
      ["Sandro Botticelli", "Who painted 'The Birth of Venus'?"],
      ["Raphael", "Who painted 'The School of Athens' in the Vatican?"],
      ["Donatello", "What Renaissance sculptor created the bronze 'David' in Florence?"],
      ["Jan van Eyck", "What Flemish painter is credited with perfecting oil painting techniques?"],
    ]),
    cat("Constitutional Law", [
      [
        "The First Amendment",
        "What amendment protects freedom of speech, religion, and the press?",
      ],
      ["Marbury v. Madison", "What 1803 Supreme Court case established judicial review?"],
      ["The Fifth Amendment", "What amendment protects against self-incrimination?"],
      [
        "Brown v. Board of Education",
        "What 1954 case ruled that school segregation was unconstitutional?",
      ],
      ["The Fourteenth Amendment", "What amendment guarantees equal protection under the law?"],
    ]),
    cat("Organic Chemistry", [
      ["An amino acid", "What building block of proteins has an amine and carboxyl group?"],
      ["Benzene", "What aromatic hydrocarbon has the formula C6H6?"],
      [
        "Chirality",
        "What property describes a molecule that is non-superimposable on its mirror image?",
      ],
      [
        "An ester",
        "What functional group formed from an acid and alcohol gives fruits their smell?",
      ],
      [
        "A polymer",
        "What type of large molecule is made from repeating smaller units called monomers?",
      ],
    ]),
    cat("Cold War", [
      [
        "The Cuban Missile Crisis",
        "What 1962 standoff brought the US and USSR closest to nuclear war?",
      ],
      ["The Space Race", "What competition between the US and USSR led to the Moon landing?"],
      ["Containment", "What US foreign policy aimed to prevent the spread of communism?"],
      [
        "The Iron Curtain",
        "What phrase did Churchill use to describe the divide between East and West Europe?",
      ],
      [
        "Glasnost and Perestroika",
        "What twin policies of Gorbachev meant openness and restructuring?",
      ],
    ]),
    cat("Opera", [
      ["Giuseppe Verdi", "Who composed 'Aida' and 'La Traviata'?"],
      ["The Magic Flute", "What Mozart opera features Papageno and the Queen of the Night?"],
      ["Giacomo Puccini", "Who composed 'Madama Butterfly' and 'La Boheme'?"],
      ["The Ring Cycle", "What Wagner opera cycle takes about 15 hours to perform?"],
      [
        "Maria Callas",
        "What Greek-American soprano is considered the greatest opera singer of the 20th century?",
      ],
    ]),
    cat("Epidemiology", [
      [
        "The Black Death",
        "What 14th-century pandemic killed roughly a third of Europe's population?",
      ],
      [
        "John Snow",
        "What physician traced a London cholera outbreak to a contaminated water pump?",
      ],
      ["Smallpox", "What is the only human disease to have been completely eradicated?"],
      ["Patient zero", "What term describes the first identified case in an outbreak?"],
      ["R-naught", "What value (R0) measures how contagious an infectious disease is?"],
    ]),
  ),

  // Board 3
  board(
    cat("Ancient Philosophy", [
      ["Aristotle", "What philosopher tutored Alexander the Great?"],
      [
        "The Allegory of the Cave",
        "What Platonic allegory compares ignorance to prisoners watching shadows?",
      ],
      [
        "Stoicism",
        "What school of philosophy taught by Zeno emphasized virtue and emotional resilience?",
      ],
      ["Epicurus", "What Greek philosopher taught that pleasure is the highest good?"],
      ["Confucius", "What Chinese philosopher emphasized filial piety and social harmony?"],
    ]),
    cat("Quantum Physics", [
      ["Schrodinger's cat", "What thought experiment involves a cat that is both alive and dead?"],
      [
        "Quantum entanglement",
        "What phenomenon links two particles so measuring one instantly affects the other?",
      ],
      [
        "The double-slit experiment",
        "What experiment demonstrates that light behaves as both a wave and a particle?",
      ],
      ["Max Planck", "Who is considered the father of quantum theory?"],
      [
        "Superposition",
        "What principle states a quantum system exists in all possible states simultaneously?",
      ],
    ]),
    cat("World Religions", [
      [
        "The Five Pillars",
        "What are the five core practices that every Muslim is expected to follow?",
      ],
      ["Siddhartha Gautama", "What was the birth name of the Buddha?"],
      ["The Torah", "What is the central sacred text of Judaism?"],
      ["Hinduism", "What is the oldest major world religion, with origins in the Indus Valley?"],
      [
        "Martin Luther",
        "Who started the Protestant Reformation by nailing 95 theses to a church door?",
      ],
    ]),
    cat("Geopolitics", [
      ["The Suez Canal", "What waterway connects the Mediterranean Sea to the Red Sea?"],
      ["OPEC", "What organization of petroleum-exporting countries controls oil production?"],
      ["The European Union", "What political and economic union of 27 countries uses the euro?"],
      [
        "The Treaty of Westphalia",
        "What 1648 peace established the modern concept of state sovereignty?",
      ],
      ["The Silk Road", "What ancient trade network connected China to the Mediterranean?"],
    ]),
    cat("Linguistics", [
      ["A morpheme", "What is the smallest meaningful unit of language?"],
      ["Noam Chomsky", "What linguist proposed the theory of universal grammar?"],
      [
        "A creole",
        "What type of language develops when a pidgin becomes a community's native tongue?",
      ],
      ["The Rosetta Stone", "What artifact allowed scholars to decipher Egyptian hieroglyphics?"],
      [
        "The Great Vowel Shift",
        "What major change in English pronunciation occurred between 1400 and 1700?",
      ],
    ]),
    cat("Mathematical Proofs", [
      ["Euclid", "Who wrote 'Elements,' the foundational textbook of geometry?"],
      [
        "Fermat's Last Theorem",
        "What theorem took 358 years to prove, finally solved by Andrew Wiles in 1995?",
      ],
      [
        "The Goldbach Conjecture",
        "What unproven conjecture states every even integer greater than 2 is the sum of two primes?",
      ],
      [
        "Godel's Incompleteness Theorems",
        "What theorems proved that any consistent mathematical system has unprovable truths?",
      ],
      [
        "The Riemann Hypothesis",
        "What unsolved problem concerns the distribution of prime numbers?",
      ],
    ]),
  ),

  // Board 4
  board(
    cat("Film Theory", [
      ["Alfred Hitchcock", "What director is known as the Master of Suspense?"],
      [
        "Akira Kurosawa",
        "What Japanese director made 'Seven Samurai' and influenced George Lucas?",
      ],
      ["French New Wave", "What 1960s film movement featured directors like Godard and Truffaut?"],
      ["Citizen Kane", "What 1941 Orson Welles film is often called the greatest movie ever made?"],
      [
        "The auteur theory",
        "What concept holds that a director's personal vision dominates a film?",
      ],
    ]),
    cat("Microbiology", [
      ["Alexander Fleming", "Who discovered penicillin in 1928?"],
      ["A virus", "What pathogen is smaller than bacteria and needs a host cell to replicate?"],
      ["Bacteriophage", "What type of virus specifically infects and destroys bacteria?"],
      ["Louis Pasteur", "Who developed pasteurization and proved the germ theory of disease?"],
      ["MRSA", "What antibiotic-resistant staphylococcus bacterium is a major hospital concern?"],
    ]),
    cat("Political Philosophy", [
      ["Thomas Hobbes", "Who described life without government as 'nasty, brutish, and short'?"],
      ["John Locke", "What philosopher argued for natural rights of life, liberty, and property?"],
      [
        "The Communist Manifesto",
        "What 1848 pamphlet by Marx and Engels calls for workers to unite?",
      ],
      [
        "Jean-Jacques Rousseau",
        "Who wrote 'The Social Contract' and said man is born free but everywhere in chains?",
      ],
      [
        "John Rawls",
        "What philosopher proposed the 'veil of ignorance' as a tool for just governance?",
      ],
    ]),
    cat("Astrophysics", [
      ["Stephen Hawking", "What physicist wrote 'A Brief History of Time'?"],
      ["A neutron star", "What superdense stellar remnant is made almost entirely of neutrons?"],
      ["The Big Bang", "What theory describes the origin of the universe from a singularity?"],
      ["A white dwarf", "What is the remnant of a low-mass star after it expels its outer layers?"],
      [
        "Cosmic microwave background radiation",
        "What faint glow of radiation is the afterglow of the Big Bang?",
      ],
    ]),
    cat("World Literature", [
      ["Leo Tolstoy", "Who wrote 'War and Peace' and 'Anna Karenina'?"],
      ["Chinua Achebe", "Who wrote 'Things Fall Apart' about colonial Nigeria?"],
      [
        "Haruki Murakami",
        "What Japanese novelist wrote 'Norwegian Wood' and 'Kafka on the Shore'?",
      ],
      [
        "Jorge Luis Borges",
        "What Argentine writer is known for mind-bending short stories like 'The Library of Babel'?",
      ],
      [
        "Rabindranath Tagore",
        "What Indian poet became the first non-European to win the Nobel Prize in Literature?",
      ],
    ]),
    cat("Game Theory", [
      [
        "The Prisoner's Dilemma",
        "What classic scenario shows why two rational actors might not cooperate?",
      ],
      ["John Nash", "What mathematician's work on equilibrium won the 1994 Nobel Prize?"],
      ["A zero-sum game", "What type of game means one player's gain is exactly another's loss?"],
      [
        "Tit for tat",
        "What simple strategy in repeated games starts by cooperating, then mirrors the opponent?",
      ],
      [
        "The Nash Equilibrium",
        "What state exists when no player can benefit by changing strategy alone?",
      ],
    ]),
  ),

  // Board 5
  board(
    cat("Impressionism", [
      ["Claude Monet", "Who painted 'Impression, Sunrise,' giving the movement its name?"],
      ["Edgar Degas", "What Impressionist is famous for his paintings of ballet dancers?"],
      ["Pierre-Auguste Renoir", "Who painted 'Dance at Le Moulin de la Galette'?"],
      ["Camille Pissarro", "What painter is considered the 'dean of Impressionist painters'?"],
      [
        "Mary Cassatt",
        "What American Impressionist is known for her paintings of mothers and children?",
      ],
    ]),
    cat("Neuroscience", [
      ["A neuron", "What is the basic functional cell of the nervous system?"],
      ["Dopamine", "What neurotransmitter is associated with reward and pleasure?"],
      ["The hippocampus", "What brain structure plays a key role in forming new memories?"],
      [
        "Neuroplasticity",
        "What property of the brain allows it to reorganize and form new connections?",
      ],
      [
        "The blood-brain barrier",
        "What selective membrane protects the brain from harmful substances in the blood?",
      ],
    ]),
    cat("Diplomatic History", [
      [
        "The Congress of Vienna",
        "What 1814-1815 conference rebalanced European power after Napoleon?",
      ],
      [
        "The Marshall Plan",
        "What US program provided economic aid to rebuild Western Europe after WWII?",
      ],
      ["The Camp David Accords", "What 1978 agreement brought peace between Egypt and Israel?"],
      [
        "Henry Kissinger",
        "What US Secretary of State practiced realpolitik and opened relations with China?",
      ],
      [
        "The Helsinki Accords",
        "What 1975 agreement addressed human rights and post-WWII European borders?",
      ],
    ]),
    cat("Etymology", [
      ["Greek", "From what language does the word 'democracy' originate, meaning 'people power'?"],
      ["Arabic", "The words 'algebra,' 'algorithm,' and 'alcohol' all come from what language?"],
      [
        "A portmanteau",
        "What is the linguistic term for blending two words, like 'smog' from smoke and fog?",
      ],
      ["Latin", "From what language does 'et cetera,' meaning 'and the rest,' originate?"],
      [
        "Old Norse",
        "The English words 'sky,' 'egg,' and 'window' come from what ancient language?",
      ],
    ]),
    cat("Cryptography", [
      ["The Caesar cipher", "What ancient encryption method shifts each letter by a fixed number?"],
      [
        "The Enigma machine",
        "What German encryption device was cracked by Alan Turing during WWII?",
      ],
      ["RSA", "What public-key cryptosystem is based on the difficulty of factoring large primes?"],
      ["A hash function", "What one-way function converts data into a fixed-size output?"],
      [
        "Quantum key distribution",
        "What technique uses quantum mechanics to create theoretically unbreakable encryption?",
      ],
    ]),
    cat("Ecology", [
      [
        "A keystone species",
        "What type of species has a disproportionately large effect on its ecosystem?",
      ],
      [
        "The greenhouse effect",
        "What process traps heat in Earth's atmosphere via gases like CO2?",
      ],
      ["Biodiversity", "What term describes the variety of life in a particular ecosystem?"],
      [
        "Eutrophication",
        "What process occurs when excess nutrients cause algal blooms that deplete oxygen in water?",
      ],
      [
        "The Gaia hypothesis",
        "What theory proposed by James Lovelock views Earth as a self-regulating system?",
      ],
    ]),
  ),

  // Board 6
  board(
    cat("Baroque Music", [
      [
        "Johann Sebastian Bach",
        "Who composed the 'Brandenburg Concertos' and 'The Well-Tempered Clavier'?",
      ],
      ["George Frideric Handel", "Who composed 'Messiah' with its famous 'Hallelujah' chorus?"],
      ["A fugue", "What musical form features a theme that is imitated by multiple voices?"],
      ["The harpsichord", "What keyboard instrument preceded the piano in the Baroque era?"],
      [
        "Claudio Monteverdi",
        "What Italian composer is considered the bridge between Renaissance and Baroque music?",
      ],
    ]),
    cat("International Law", [
      ["The Geneva Conventions", "What treaties establish the humanitarian rules of war?"],
      [
        "The International Criminal Court",
        "What court in The Hague prosecutes genocide, war crimes, and crimes against humanity?",
      ],
      [
        "The Law of the Sea",
        "What UN convention governs international waters and maritime boundaries?",
      ],
      [
        "Diplomatic immunity",
        "What legal protection prevents diplomats from being prosecuted in a host country?",
      ],
      [
        "The Nuremberg Trials",
        "What post-WWII proceedings established that 'following orders' is not a defense for war crimes?",
      ],
    ]),
    cat("Thermodynamics", [
      ["Entropy", "What thermodynamic quantity measures the disorder of a system?"],
      [
        "Absolute zero",
        "What temperature, 0 Kelvin, is the theoretical lowest possible temperature?",
      ],
      [
        "The Second Law",
        "What law of thermodynamics states that entropy in an isolated system always increases?",
      ],
      ["A Carnot engine", "What theoretical heat engine operates at maximum possible efficiency?"],
      ["Enthalpy", "What thermodynamic quantity measures the total heat content of a system?"],
    ]),
    cat("Ancient Rome", [
      ["Julius Caesar", "What Roman leader was assassinated on the Ides of March, 44 BC?"],
      ["The Punic Wars", "What three wars were fought between Rome and Carthage?"],
      ["Augustus", "Who was the first Roman Emperor?"],
      [
        "The Roman aqueducts",
        "What engineering marvels carried water across great distances to Roman cities?",
      ],
      ["476 AD", "In what year did the Western Roman Empire officially fall?"],
    ]),
    cat("Existentialism", [
      [
        "Jean-Paul Sartre",
        "Who wrote 'Being and Nothingness' and said 'existence precedes essence'?",
      ],
      ["Albert Camus", "Who wrote 'The Stranger' and 'The Myth of Sisyphus'?"],
      ["Soren Kierkegaard", "What Danish philosopher is considered the father of existentialism?"],
      ["Simone de Beauvoir", "Who wrote 'The Second Sex' and applied existentialism to feminism?"],
      ["Martin Heidegger", "What philosopher's 'Being and Time' explored the concept of Dasein?"],
    ]),
    cat("Topology", [
      ["A Mobius strip", "What surface has only one side and one edge?"],
      ["A Klein bottle", "What non-orientable surface has no inside or outside in 4D space?"],
      [
        "The Euler characteristic",
        "What topological invariant equals vertices minus edges plus faces?",
      ],
      ["A torus", "What donut-shaped surface is topologically distinct from a sphere?"],
      [
        "The Poincare Conjecture",
        "What famous problem about 3-spheres was proven by Grigori Perelman in 2003?",
      ],
    ]),
  ),

  // Board 7
  board(
    cat("Jazz", [
      ["Louis Armstrong", "What trumpeter and singer is known as the father of jazz?"],
      ["Miles Davis", "Who recorded the groundbreaking jazz album 'Kind of Blue'?"],
      ["Duke Ellington", "What bandleader composed 'Take the A Train' and 'Mood Indigo'?"],
      ["Bebop", "What fast-paced jazz style was pioneered by Charlie Parker and Dizzy Gillespie?"],
      ["John Coltrane", "What saxophonist recorded 'A Love Supreme'?"],
    ]),
    cat("Cognitive Science", [
      [
        "The Turing Test",
        "What test evaluates whether a machine can exhibit intelligent behavior?",
      ],
      [
        "Confirmation bias",
        "What cognitive bias makes people favor information that confirms their existing beliefs?",
      ],
      ["Working memory", "What type of memory temporarily holds information for processing?"],
      [
        "The cocktail party effect",
        "What phenomenon allows you to focus on one conversation in a noisy room?",
      ],
      [
        "Dual process theory",
        "What framework distinguishes between fast intuitive and slow analytical thinking?",
      ],
    ]),
    cat("Revolutionary Wars", [
      [
        "The Bastille",
        "What Parisian fortress was stormed on July 14, 1789, starting the French Revolution?",
      ],
      ["Simon Bolivar", "What leader liberated much of South America from Spanish rule?"],
      ["The Bolsheviks", "What faction led the 1917 Russian Revolution under Lenin?"],
      [
        "The Haitian Revolution",
        "What was the only successful slave revolt that founded a nation, in 1804?",
      ],
      ["Mao Zedong", "Who led the Communist revolution in China, establishing the PRC in 1949?"],
    ]),
    cat("Number Theory", [
      ["A prime number", "What type of number is only divisible by 1 and itself?"],
      [
        "The twin prime conjecture",
        "What unsolved problem asks if there are infinitely many primes differing by 2?",
      ],
      ["Euclid's proof", "What ancient proof showed there are infinitely many prime numbers?"],
      [
        "Modular arithmetic",
        "What type of arithmetic deals with remainders, often called 'clock arithmetic'?",
      ],
      [
        "The Collatz Conjecture",
        "What simple unsolved problem asks if repeatedly halving evens and tripling-plus-one odds always reaches 1?",
      ],
    ]),
    cat("Postmodern Literature", [
      ["Thomas Pynchon", "Who wrote the notoriously complex novel 'Gravity's Rainbow'?"],
      ["Italo Calvino", "Who wrote 'If on a winter's night a traveler'?"],
      [
        "Don DeLillo",
        "Who wrote 'White Noise,' a satire of American consumerism and death anxiety?",
      ],
      ["Salman Rushdie", "Who wrote 'Midnight's Children' about India's independence?"],
      ["David Foster Wallace", "Who wrote the 1,079-page novel 'Infinite Jest'?"],
    ]),
    cat("Relativity", [
      [
        "Special relativity",
        "What theory states that the speed of light is the same for all observers?",
      ],
      ["Time dilation", "What relativistic effect causes time to slow down at high speeds?"],
      ["E equals mc squared", "What equation relates energy to mass and the speed of light?"],
      [
        "Gravitational lensing",
        "What effect causes light to bend around massive objects like galaxies?",
      ],
      [
        "The twin paradox",
        "What thought experiment shows that a traveling twin ages slower than a stationary one?",
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
