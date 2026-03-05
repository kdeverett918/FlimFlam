export interface WheelPuzzle {
  category: string;
  phrase: string;
  hint?: string;
}

export const KIDS_PUZZLES: WheelPuzzle[] = [
  // ── Thing ──
  { category: "Thing", phrase: "ICE CREAM CONE", hint: "A tasty frozen treat" },
  { category: "Thing", phrase: "BASKETBALL COURT", hint: "Where you dribble and shoot hoops" },
  { category: "Thing", phrase: "JUMPING ROPE", hint: "A playground favorite" },
  { category: "Thing", phrase: "BIRTHDAY CAKE", hint: "You blow out candles on this" },
  { category: "Thing", phrase: "ROLLER COASTER", hint: "A thrilling ride" },
  { category: "Thing", phrase: "TEDDY BEAR", hint: "A stuffed cuddle buddy" },
  { category: "Thing", phrase: "BUBBLE GUM", hint: "Chew it and blow a bubble" },
  { category: "Thing", phrase: "RAINBOW SPRINKLES", hint: "Colorful bits on top of ice cream" },
  {
    category: "Thing",
    phrase: "SNOWMAN BUILDING",
    hint: "A winter activity with snowballs and carrots",
  },
  { category: "Thing", phrase: "BICYCLE HELMET", hint: "Keeps your head safe on two wheels" },
  { category: "Thing", phrase: "GOLDFISH BOWL", hint: "A round home for a pet swimmer" },
  { category: "Thing", phrase: "TREEHOUSE LADDER", hint: "Climb up to the fort in the branches" },
  { category: "Thing", phrase: "SKATEBOARD PARK", hint: "Ramps and rails for four-wheeled fun" },
  { category: "Thing", phrase: "FIRE TRUCK", hint: "A big red vehicle with a siren" },
  { category: "Thing", phrase: "SLEEPING BAG", hint: "Camp out cozy in this" },
  { category: "Thing", phrase: "MAGNIFYING GLASS", hint: "Makes tiny things look big" },
  { category: "Thing", phrase: "PIGGY BANK", hint: "Save your coins in this" },
  { category: "Thing", phrase: "MAGIC WAND", hint: "A wizard waves this" },
  { category: "Thing", phrase: "TREASURE CHEST", hint: "Pirates hide gold in this" },
  { category: "Thing", phrase: "PAPER AIRPLANE", hint: "Fold and fly it across the room" },
  {
    category: "Thing",
    phrase: "FLASHLIGHT BATTERIES",
    hint: "Power source for lighting up the dark",
  },
  {
    category: "Thing",
    phrase: "BUTTERFLY GARDEN",
    hint: "A colorful place where winged insects flutter",
  },

  // ── Food & Drink ──
  { category: "Food & Drink", phrase: "PEANUT BUTTER AND JELLY", hint: "A classic sandwich" },
  { category: "Food & Drink", phrase: "CHOCOLATE CHIP COOKIE", hint: "A baked treat with bits" },
  { category: "Food & Drink", phrase: "MACARONI AND CHEESE", hint: "Cheesy pasta dish" },
  { category: "Food & Drink", phrase: "HOT DOG", hint: "A ballpark favorite" },
  { category: "Food & Drink", phrase: "LEMONADE STAND", hint: "A summer business for kids" },
  { category: "Food & Drink", phrase: "APPLE JUICE", hint: "A fruity drink from a box" },
  { category: "Food & Drink", phrase: "CANDY CANE", hint: "A striped holiday sweet" },
  { category: "Food & Drink", phrase: "GRILLED CHEESE SANDWICH", hint: "Melty and golden brown" },
  { category: "Food & Drink", phrase: "FRUIT SALAD", hint: "A bowl of mixed fresh fruits" },
  {
    category: "Food & Drink",
    phrase: "CHICKEN NUGGETS",
    hint: "A kid favorite at fast food places",
  },

  // ── Place ──
  { category: "Place", phrase: "SWIMMING POOL", hint: "You splash around here" },
  { category: "Place", phrase: "AMUSEMENT PARK", hint: "Rides and games galore" },
  { category: "Place", phrase: "PLAYGROUND SLIDE", hint: "A slippery ride at recess" },
  { category: "Place", phrase: "TOY STORE", hint: "A fun place to shop" },
  { category: "Place", phrase: "OUTER SPACE", hint: "Stars and planets live here" },
  { category: "Place", phrase: "CANDY SHOP", hint: "Walls of sweet treats" },
  { category: "Place", phrase: "NORTH POLE", hint: "Santa lives here" },

  // ── Animals ──
  { category: "Animals", phrase: "BALD EAGLE", hint: "An American bird of prey" },
  { category: "Animals", phrase: "POLAR BEAR", hint: "A big white arctic animal" },
  { category: "Animals", phrase: "SEA TURTLE", hint: "A shelled swimmer in the ocean" },
  { category: "Animals", phrase: "HUMPBACK WHALE", hint: "A giant ocean mammal that sings" },
  { category: "Animals", phrase: "TREE FROG", hint: "A little green climber" },
  { category: "Animals", phrase: "BABY CHICK", hint: "A fluffy yellow bird" },
  { category: "Animals", phrase: "LADYBUG WINGS", hint: "Red and black spotted flying parts" },
  { category: "Animals", phrase: "PENGUIN WADDLE", hint: "How a tuxedo bird walks" },
  { category: "Animals", phrase: "HAMSTER WHEEL", hint: "A tiny pet's exercise machine" },
  { category: "Animals", phrase: "BUNNY RABBIT", hint: "A fluffy hopper with long ears" },
  { category: "Animals", phrase: "KITTY CAT", hint: "A purring furry friend" },
  { category: "Animals", phrase: "PUPPY DOG", hint: "A playful young canine" },

  // ── Movies & TV ──
  { category: "Movies & TV", phrase: "LION KING", hint: "Simba's story in the savanna" },
  { category: "Movies & TV", phrase: "FINDING NEMO", hint: "A lost clownfish adventure" },
  { category: "Movies & TV", phrase: "TOY STORY", hint: "Buzz and Woody come to life" },
  { category: "Movies & TV", phrase: "FROZEN YOGURT", hint: "A chilly treat from the shop" },
  {
    category: "Movies & TV",
    phrase: "SPONGEBOB SQUAREPANTS",
    hint: "He lives in a pineapple under the sea",
  },

  // ── Sports ──
  { category: "Sports", phrase: "HOME RUN", hint: "The best hit in baseball" },
  { category: "Sports", phrase: "SOCCER BALL", hint: "You kick this black and white ball" },
  { category: "Sports", phrase: "GOLD MEDAL", hint: "First place prize at the Olympics" },
  { category: "Sports", phrase: "SWIMMING RACE", hint: "Fastest in the pool wins" },
  { category: "Sports", phrase: "BASEBALL GLOVE", hint: "You catch fly balls with this" },
  { category: "Sports", phrase: "JUMP SHOT", hint: "A basketball move in the air" },
  { category: "Sports", phrase: "BELLY FLOP", hint: "A splashy dive gone wrong" },
  { category: "Sports", phrase: "CANNONBALL SPLASH", hint: "A big jump into the pool" },
  { category: "Sports", phrase: "FINISH LINE", hint: "Where the race ends" },
  { category: "Sports", phrase: "HIGH FIVE", hint: "Slap hands to celebrate" },

  // ── Music ──
  { category: "Music", phrase: "TWINKLE TWINKLE LITTLE STAR", hint: "A famous lullaby" },
  { category: "Music", phrase: "HAPPY BIRTHDAY", hint: "Everyone sings this once a year" },
  { category: "Music", phrase: "JINGLE BELLS", hint: "A holiday classic about a sleigh" },

  // ── Around The World ──
  { category: "Around The World", phrase: "EIFFEL TOWER", hint: "A tall iron landmark in France" },
  { category: "Around The World", phrase: "GREAT WALL OF CHINA", hint: "A very long ancient wall" },
  {
    category: "Around The World",
    phrase: "STATUE OF LIBERTY",
    hint: "She holds a torch in New York",
  },

  // ── Rhyme Time ──
  { category: "Rhyme Time", phrase: "FUNNY BUNNY", hint: "A silly rabbit" },
  { category: "Rhyme Time", phrase: "LAZY DAISY", hint: "A relaxed flower" },
  { category: "Rhyme Time", phrase: "SILLY BILLY", hint: "A goofy person" },
];

export const STANDARD_PUZZLES: WheelPuzzle[] = [
  // ── Phrase ──
  { category: "Phrase", phrase: "BREAK A LEG", hint: "Good luck in theater" },
  { category: "Phrase", phrase: "PIECE OF CAKE", hint: "Easy as can be" },
  { category: "Phrase", phrase: "ACTIONS SPEAK LOUDER THAN WORDS", hint: "Deeds over talk" },
  { category: "Phrase", phrase: "BETTER LATE THAN NEVER", hint: "Arriving is what counts" },
  { category: "Phrase", phrase: "EVERY CLOUD HAS A SILVER LINING", hint: "Optimistic saying" },
  {
    category: "Phrase",
    phrase: "THE EARLY BIRD CATCHES THE WORM",
    hint: "Rise and shine pays off",
  },
  { category: "Phrase", phrase: "PRACTICE MAKES PERFECT", hint: "Keep at it" },
  { category: "Phrase", phrase: "ONCE IN A BLUE MOON", hint: "Very rarely" },
  { category: "Phrase", phrase: "WHEN PIGS FLY", hint: "That will never happen" },
  { category: "Phrase", phrase: "HITTING THE NAIL ON THE HEAD", hint: "Getting it exactly right" },
  { category: "Phrase", phrase: "BITE THE BULLET", hint: "Endure something painful" },
  { category: "Phrase", phrase: "COST AN ARM AND A LEG", hint: "Very expensive" },
  { category: "Phrase", phrase: "LET THE CAT OUT OF THE BAG", hint: "Reveal a secret" },
  {
    category: "Phrase",
    phrase: "KILL TWO BIRDS WITH ONE STONE",
    hint: "Accomplish two things at once",
  },
  { category: "Phrase", phrase: "THE BEST OF BOTH WORLDS", hint: "Having two good things" },
  { category: "Phrase", phrase: "BARKING UP THE WRONG TREE", hint: "Accusing the wrong person" },
  { category: "Phrase", phrase: "UNDER THE WEATHER", hint: "Feeling sick" },
  { category: "Phrase", phrase: "BLESSING IN DISGUISE", hint: "Something bad that turns good" },
  { category: "Phrase", phrase: "BACK TO THE DRAWING BOARD", hint: "Start over from scratch" },
  { category: "Phrase", phrase: "BURNING THE MIDNIGHT OIL", hint: "Working late into the night" },
  { category: "Phrase", phrase: "COOL AS A CUCUMBER", hint: "Calm and collected" },
  { category: "Phrase", phrase: "SPILL THE BEANS", hint: "Reveal a secret accidentally" },
  { category: "Phrase", phrase: "HIT THE ROAD", hint: "Time to leave" },
  { category: "Phrase", phrase: "ON CLOUD NINE", hint: "Extremely happy" },

  // ── Person ──
  { category: "Person", phrase: "GOOD SAMARITAN", hint: "Someone who helps strangers" },
  { category: "Person", phrase: "CLASS CLOWN", hint: "The funny one at school" },
  { category: "Person", phrase: "EARLY BIRD", hint: "Someone who wakes up first" },

  // ── Thing ──
  { category: "Thing", phrase: "ROUND TRIP TICKET", hint: "There and back again" },
  { category: "Thing", phrase: "DIAMOND IN THE ROUGH", hint: "Hidden potential" },
  { category: "Thing", phrase: "ROCKING CHAIR", hint: "Sit back and sway" },
  { category: "Thing", phrase: "SHOOTING STAR", hint: "Make a wish on this" },
  { category: "Thing", phrase: "JIGSAW PUZZLE", hint: "Piece it together" },
  { category: "Thing", phrase: "ALARM CLOCK", hint: "It wakes you up" },
  { category: "Thing", phrase: "GRANDFATHER CLOCK", hint: "A tall ticking timepiece" },
  { category: "Thing", phrase: "RUBBER DUCK", hint: "A yellow bath time companion" },
  { category: "Thing", phrase: "PHOTO ALBUM", hint: "Memories between pages" },
  { category: "Thing", phrase: "BOOKWORM PARADISE", hint: "A reader's dream destination" },

  // ── Place ──
  { category: "Place", phrase: "GOLDEN GATE BRIDGE", hint: "Famous San Francisco landmark" },
  { category: "Place", phrase: "GRAND CANYON", hint: "A very deep Arizona attraction" },
  { category: "Place", phrase: "NIAGARA FALLS", hint: "Famous North American waterfalls" },

  // ── Food & Drink ──
  { category: "Food & Drink", phrase: "EGGS BENEDICT", hint: "A brunch classic with hollandaise" },
  { category: "Food & Drink", phrase: "FRENCH ONION SOUP", hint: "Topped with melted cheese" },
  { category: "Food & Drink", phrase: "STRAWBERRY SHORTCAKE", hint: "A fruity layered dessert" },
  { category: "Food & Drink", phrase: "BANANA SPLIT", hint: "An ice cream sundae with fruit" },
  { category: "Food & Drink", phrase: "FISH AND CHIPS", hint: "A British fried classic" },
  { category: "Food & Drink", phrase: "SPAGHETTI AND MEATBALLS", hint: "An Italian comfort food" },

  // ── Movies & TV ──
  { category: "Movies & TV", phrase: "WIZARD OF OZ", hint: "Follow the yellow brick road" },
  { category: "Movies & TV", phrase: "STAR WARS", hint: "May the Force be with you" },
  { category: "Movies & TV", phrase: "JURASSIC PARK", hint: "Dinosaurs come back to life" },
  { category: "Movies & TV", phrase: "THE SOUND OF MUSIC", hint: "The hills are alive" },
  { category: "Movies & TV", phrase: "BACK TO THE FUTURE", hint: "Time travel in a DeLorean" },
  { category: "Movies & TV", phrase: "INDIANA JONES", hint: "An adventurous archaeologist" },
  { category: "Movies & TV", phrase: "WHEEL OF FORTUNE", hint: "Spin and solve the puzzle" },
  { category: "Movies & TV", phrase: "STRANGER THINGS", hint: "Upside down in Hawkins" },
  { category: "Movies & TV", phrase: "THE PRICE IS RIGHT", hint: "Come on down" },
  { category: "Movies & TV", phrase: "GAME OF THRONES", hint: "Winter is coming" },

  // ── Sports ──
  { category: "Sports", phrase: "SLAM DUNK", hint: "A powerful basketball move" },
  {
    category: "Sports",
    phrase: "SUPER BOWL SUNDAY",
    hint: "The biggest football game of the year",
  },
  { category: "Sports", phrase: "WORLD SERIES", hint: "The championship of baseball" },
  { category: "Sports", phrase: "HOLE IN ONE", hint: "A perfect golf shot" },
  { category: "Sports", phrase: "TRIPLE PLAY", hint: "Three outs on one baseball play" },
  { category: "Sports", phrase: "TOUCHDOWN PASS", hint: "Throwing for six points" },

  // ── Music ──
  { category: "Music", phrase: "BOHEMIAN RHAPSODY", hint: "Queen's epic rock ballad" },
  { category: "Music", phrase: "STAIRWAY TO HEAVEN", hint: "Led Zeppelin's legendary track" },
  { category: "Music", phrase: "ROCK AND ROLL", hint: "A genre that shook the world" },
  { category: "Music", phrase: "JAILHOUSE ROCK", hint: "Elvis danced in prison" },
  { category: "Music", phrase: "RHYTHM AND BLUES", hint: "A soulful music genre" },

  // ── Around The World ──
  {
    category: "Around The World",
    phrase: "LEANING TOWER OF PISA",
    hint: "A famously tilted Italian building",
  },
  { category: "Around The World", phrase: "BIG BEN", hint: "London's famous clock tower" },
  { category: "Around The World", phrase: "TAJ MAHAL", hint: "A marble monument of love in India" },
  {
    category: "Around The World",
    phrase: "MACHU PICCHU",
    hint: "An ancient Incan city in the clouds",
  },
  {
    category: "Around The World",
    phrase: "TIMES SQUARE",
    hint: "New York's bright and bustling center",
  },

  // ── Rhyme Time ──
  { category: "Rhyme Time", phrase: "BRAIN DRAIN", hint: "A mental exhaustion" },
  { category: "Rhyme Time", phrase: "FENDER BENDER", hint: "A minor car accident" },
  { category: "Rhyme Time", phrase: "FLOWER POWER", hint: "A hippie motto" },
  { category: "Rhyme Time", phrase: "DREAM TEAM", hint: "The best group ever assembled" },
  { category: "Rhyme Time", phrase: "LEGAL EAGLE", hint: "A sharp lawyer" },

  // ── Quotable Quotes ──
  {
    category: "Quotable Quotes",
    phrase: "TO BE OR NOT TO BE",
    hint: "Shakespeare's famous question",
  },
  {
    category: "Quotable Quotes",
    phrase: "I THINK THEREFORE I AM",
    hint: "A philosopher's declaration",
  },
  {
    category: "Quotable Quotes",
    phrase: "THAT IS ONE SMALL STEP FOR MAN",
    hint: "Words from the moon",
  },
  { category: "Quotable Quotes", phrase: "JUST DO IT", hint: "A famous sneaker slogan" },
  {
    category: "Quotable Quotes",
    phrase: "MAY THE FORCE BE WITH YOU",
    hint: "Galactic good wishes",
  },
  {
    category: "Quotable Quotes",
    phrase: "LIFE IS LIKE A BOX OF CHOCOLATES",
    hint: "Forrest Gump's mama said",
  },
];

export const ADVANCED_PUZZLES: WheelPuzzle[] = [
  // ── Before & After ──
  { category: "Before & After", phrase: "RUNNING BACK DOOR", hint: "Football + entry" },
  {
    category: "Before & After",
    phrase: "FRENCH TOAST OF THE TOWN",
    hint: "Breakfast + celebrated person",
  },
  { category: "Before & After", phrase: "GRAND SLAM DUNK", hint: "Tennis + basketball" },
  { category: "Before & After", phrase: "BLIND DATE NIGHT", hint: "Unknown meetup + evening out" },
  { category: "Before & After", phrase: "HOME RUN FOR THE MONEY", hint: "Baseball + competition" },
  { category: "Before & After", phrase: "CARD SHARK WEEK", hint: "Gambler + TV event" },
  { category: "Before & After", phrase: "REALITY CHECK MATE", hint: "Wake up + chess" },
  { category: "Before & After", phrase: "ROCKING CHAIR LIFT", hint: "Furniture + ski apparatus" },
  { category: "Before & After", phrase: "WEDDING RING LEADER", hint: "Marriage + boss" },
  {
    category: "Before & After",
    phrase: "SPEED BUMP IN THE ROAD",
    hint: "Traffic obstacle + setback",
  },
  {
    category: "Before & After",
    phrase: "BEAUTY SLEEP WALKING",
    hint: "Rest + nighttime wandering",
  },
  { category: "Before & After", phrase: "FAST BREAK DANCING", hint: "Basketball + street moves" },
  { category: "Before & After", phrase: "SIDE KICK STAND", hint: "Buddy + motorcycle part" },
  { category: "Before & After", phrase: "ROLLER COASTER GUARD", hint: "Ride + protector" },
  {
    category: "Before & After",
    phrase: "SPACE SHUTTLE BUS",
    hint: "NASA vehicle + city transport",
  },
  { category: "Before & After", phrase: "MASTER MIND READER", hint: "Board game + psychic" },
  {
    category: "Before & After",
    phrase: "HIGH FIVE STAR GENERAL",
    hint: "Hand slap + military rank",
  },

  // ── Phrase ──
  { category: "Phrase", phrase: "BURNING THE CANDLE AT BOTH ENDS", hint: "Working too hard" },
  { category: "Phrase", phrase: "CURIOSITY KILLED THE CAT", hint: "Being too nosy is risky" },
  { category: "Phrase", phrase: "THE PROOF IS IN THE PUDDING", hint: "Results show the truth" },
  { category: "Phrase", phrase: "BETWEEN A ROCK AND A HARD PLACE", hint: "Two tough choices" },
  {
    category: "Phrase",
    phrase: "A PICTURE IS WORTH A THOUSAND WORDS",
    hint: "Visual storytelling",
  },
  {
    category: "Phrase",
    phrase: "YOU CANNOT JUDGE A BOOK BY ITS COVER",
    hint: "Looks can be deceiving",
  },
  {
    category: "Phrase",
    phrase: "NECESSITY IS THE MOTHER OF INVENTION",
    hint: "Need drives creativity",
  },
  {
    category: "Phrase",
    phrase: "ABSENCE MAKES THE HEART GROW FONDER",
    hint: "Missing someone deepens love",
  },
  { category: "Phrase", phrase: "A WATCHED POT NEVER BOILS", hint: "Impatience makes time crawl" },
  {
    category: "Phrase",
    phrase: "DISCRETION IS THE BETTER PART OF VALOR",
    hint: "Knowing when to hold back",
  },
  { category: "Phrase", phrase: "FORTUNE FAVORS THE BOLD", hint: "Bravery brings luck" },
  {
    category: "Phrase",
    phrase: "THE PEN IS MIGHTIER THAN THE SWORD",
    hint: "Writing beats fighting",
  },
  { category: "Phrase", phrase: "STILL WATERS RUN DEEP", hint: "Quiet people have depth" },
  { category: "Phrase", phrase: "EVERY ROSE HAS ITS THORN", hint: "Beauty comes with pain" },
  {
    category: "Phrase",
    phrase: "ALL THAT GLITTERS IS NOT GOLD",
    hint: "Shiny does not mean valuable",
  },
  {
    category: "Phrase",
    phrase: "THE SQUEAKY WHEEL GETS THE GREASE",
    hint: "Complaining gets attention",
  },

  // ── Person ──
  { category: "Person", phrase: "SECRETARY OF STATE", hint: "A top cabinet position" },
  { category: "Person", phrase: "ROCKET SCIENTIST", hint: "Not exactly brain surgery" },
  { category: "Person", phrase: "DEVIL'S ADVOCATE", hint: "Argues the opposing side on purpose" },
  { category: "Person", phrase: "MASTER OF CEREMONIES", hint: "The host who runs the show" },

  // ── Place ──
  { category: "Place", phrase: "GREAT BARRIER REEF", hint: "Australian underwater wonder" },
  { category: "Place", phrase: "MOUNT RUSHMORE", hint: "Presidential faces in stone" },
  { category: "Place", phrase: "BERMUDA TRIANGLE", hint: "A mysterious area in the Atlantic" },

  // ── Thing ──
  { category: "Thing", phrase: "ENCYCLOPEDIA BRITANNICA", hint: "A classic reference set" },
  { category: "Thing", phrase: "DOUBLE EDGED SWORD", hint: "Advantage and disadvantage" },

  // ── Food & Drink ──
  {
    category: "Food & Drink",
    phrase: "EGGS FLORENTINE WITH HOLLANDAISE",
    hint: "A fancy brunch dish",
  },
  {
    category: "Food & Drink",
    phrase: "LOBSTER THERMIDOR",
    hint: "A luxurious French seafood dish",
  },
  { category: "Food & Drink", phrase: "BAKED ALASKA", hint: "A flaming ice cream dessert" },

  // ── Movies & TV ──
  { category: "Movies & TV", phrase: "THE SHAWSHANK REDEMPTION", hint: "A prison escape classic" },
  { category: "Movies & TV", phrase: "SCHINDLER'S LIST", hint: "A powerful wartime story" },
  {
    category: "Movies & TV",
    phrase: "ONE FLEW OVER THE CUCKOO'S NEST",
    hint: "Rebellion in a mental ward",
  },
  { category: "Movies & TV", phrase: "SILENCE OF THE LAMBS", hint: "Clarice meets Hannibal" },
  { category: "Movies & TV", phrase: "THE USUAL SUSPECTS", hint: "Keyser Soze's mystery" },

  // ── Sports ──
  { category: "Sports", phrase: "CHAMPIONSHIP DOUBLE HEADER", hint: "Two big games in one day" },
  { category: "Sports", phrase: "SUDDEN DEATH OVERTIME", hint: "Next score wins it all" },
  { category: "Sports", phrase: "UNFORCED ERROR", hint: "A tennis mistake with no pressure" },

  // ── Music ──
  { category: "Music", phrase: "SYMPHONY IN D MINOR", hint: "A classical orchestral piece" },
  {
    category: "Music",
    phrase: "SERGEANT PEPPER'S LONELY HEARTS CLUB BAND",
    hint: "A legendary Beatles album",
  },
  { category: "Music", phrase: "PURPLE RAIN", hint: "Prince's iconic anthem" },

  // ── Around The World ──
  {
    category: "Around The World",
    phrase: "TRANS SIBERIAN RAILWAY",
    hint: "The longest train route in the world",
  },
  {
    category: "Around The World",
    phrase: "STRAIT OF GIBRALTAR",
    hint: "The narrow passage between Europe and Africa",
  },
  {
    category: "Around The World",
    phrase: "GALAPAGOS ISLANDS",
    hint: "Darwin studied evolution here",
  },

  // ── Rhyme Time ──
  { category: "Rhyme Time", phrase: "DOUBLE TROUBLE", hint: "Twice the problems" },
  { category: "Rhyme Time", phrase: "WILLY NILLY", hint: "Without a plan" },
  { category: "Rhyme Time", phrase: "HELTER SKELTER", hint: "Wild and chaotic confusion" },
  { category: "Rhyme Time", phrase: "NITTY GRITTY", hint: "The core details of something" },

  // ── Quotable Quotes ──
  {
    category: "Quotable Quotes",
    phrase: "ELEMENTARY MY DEAR WATSON",
    hint: "The detective explains it simply",
  },
  {
    category: "Quotable Quotes",
    phrase: "I CAME I SAW I CONQUERED",
    hint: "Caesar's boast in three parts",
  },
  {
    category: "Quotable Quotes",
    phrase: "FRANKLY MY DEAR I DON'T GIVE A DAMN",
    hint: "Rhett Butler's farewell",
  },
  {
    category: "Quotable Quotes",
    phrase: "HOUSTON WE HAVE A PROBLEM",
    hint: "A famous space mission distress call",
  },
  {
    category: "Quotable Quotes",
    phrase: "HERE'S LOOKING AT YOU KID",
    hint: "Bogart's toast in Casablanca",
  },
  {
    category: "Quotable Quotes",
    phrase: "WE'RE NOT IN KANSAS ANYMORE",
    hint: "Dorothy realizes she's far from home",
  },
  { category: "Before & After", phrase: "BELLY BUTTON DOWN SHIRT", hint: "Navel + clothing style" },
  { category: "Before & After", phrase: "FRENCH KISS OF DEATH", hint: "Romance + fatal blow" },
  {
    category: "Before & After",
    phrase: "PAPER BACK SEAT DRIVER",
    hint: "Book type + annoying passenger",
  },
  { category: "Before & After", phrase: "FIRE TRUCK STOP", hint: "Emergency vehicle + rest area" },
  {
    category: "Before & After",
    phrase: "DREAM CATCHER IN THE RYE",
    hint: "Native art + Salinger novel",
  },
  {
    category: "Before & After",
    phrase: "GOLD RUSH HOUR",
    hint: "Precious metal frenzy + traffic jam",
  },
  {
    category: "Before & After",
    phrase: "SWEET TOOTH FAIRY",
    hint: "Sugar craving + childhood myth",
  },
  { category: "Before & After", phrase: "PIANO BAR STOOL", hint: "Music lounge + seating" },
  {
    category: "Before & After",
    phrase: "FREE THROW PILLOW",
    hint: "Basketball shot + couch cushion",
  },
  { category: "Before & After", phrase: "HALF TIME MACHINE", hint: "Sports break + sci-fi device" },

  // ── Phrase (extra advanced) ──
  { category: "Phrase", phrase: "ROME WAS NOT BUILT IN A DAY", hint: "Great things take time" },
  {
    category: "Phrase",
    phrase: "THE GRASS IS ALWAYS GREENER",
    hint: "Others seem to have it better",
  },
  {
    category: "Phrase",
    phrase: "KEEP YOUR FRIENDS CLOSE AND YOUR ENEMIES CLOSER",
    hint: "Strategic social advice",
  },
  { category: "Phrase", phrase: "TWO WRONGS DON'T MAKE A RIGHT", hint: "Revenge solves nothing" },
  { category: "Phrase", phrase: "WHEN IT RAINS IT POURS", hint: "Problems come all at once" },
  {
    category: "Phrase",
    phrase: "BIRDS OF A FEATHER FLOCK TOGETHER",
    hint: "Similar people group up",
  },
  {
    category: "Phrase",
    phrase: "DON'T PUT ALL YOUR EGGS IN ONE BASKET",
    hint: "Diversify your risks",
  },

  // ── Around The World (extra advanced) ──
  {
    category: "Around The World",
    phrase: "PANAMA CANAL",
    hint: "A famous waterway connecting two oceans",
  },
  {
    category: "Around The World",
    phrase: "ANGEL FALLS",
    hint: "The world's tallest uninterrupted waterfall",
  },
  { category: "Around The World", phrase: "MOUNT KILIMANJARO", hint: "Africa's highest peak" },
  {
    category: "Around The World",
    phrase: "VENETIAN CANALS",
    hint: "Waterways winding through an Italian city",
  },
  {
    category: "Around The World",
    phrase: "GREAT SPHINX OF GIZA",
    hint: "A mythical creature guarding the pyramids",
  },
  {
    category: "Around The World",
    phrase: "BUCKINGHAM PALACE",
    hint: "The British monarch's London residence",
  },

  // ── Person (extra advanced) ──
  { category: "Person", phrase: "JACK OF ALL TRADES", hint: "Skilled at many things" },
  { category: "Person", phrase: "BACKSEAT DRIVER", hint: "Someone who gives unwanted advice" },
  {
    category: "Person",
    phrase: "ARMCHAIR QUARTERBACK",
    hint: "A critic who doesn't play the game",
  },

  // ── Thing (extra advanced) ──
  { category: "Thing", phrase: "ACHILLES HEEL", hint: "A fatal weakness" },
  { category: "Thing", phrase: "GENTLEMAN'S AGREEMENT", hint: "An unwritten deal based on trust" },
  { category: "Thing", phrase: "PANDORA'S BOX", hint: "Opening this unleashes chaos" },
  { category: "Thing", phrase: "SILVER BULLET", hint: "A simple solution to a complex problem" },

  // ── Quotable Quotes (extra advanced) ──
  {
    category: "Quotable Quotes",
    phrase: "THE ONLY THING WE HAVE TO FEAR IS FEAR ITSELF",
    hint: "FDR's inaugural courage",
  },
  {
    category: "Quotable Quotes",
    phrase: "ASK NOT WHAT YOUR COUNTRY CAN DO FOR YOU",
    hint: "JFK's famous challenge",
  },
  {
    category: "Quotable Quotes",
    phrase: "TO INFINITY AND BEYOND",
    hint: "A space ranger's battle cry",
  },
];

/** Return the puzzle bank for a given complexity level. */
export function getPuzzleBank(
  complexity: "kids" | "standard" | "advanced",
  options?: { minWordCount?: number },
): WheelPuzzle[] {
  let bank: WheelPuzzle[];
  switch (complexity) {
    case "kids":
      bank = KIDS_PUZZLES;
      break;
    case "standard":
      bank = STANDARD_PUZZLES;
      break;
    case "advanced":
      bank = ADVANCED_PUZZLES;
      break;
  }

  const minWords = options?.minWordCount;
  if (minWords && minWords > 1) {
    return bank.filter((p) => p.phrase.trim().split(/\s+/).length >= minWords);
  }
  return bank;
}

/** Extract unique categories from a puzzle bank. */
export function getCategories(bank: WheelPuzzle[]): string[] {
  const set = new Set<string>();
  for (const p of bank) set.add(p.category);
  return [...set].sort();
}
