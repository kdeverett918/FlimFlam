export interface WheelPuzzle {
  category: string;
  phrase: string;
  hint?: string;
}

export const KIDS_PUZZLES: WheelPuzzle[] = [
  { category: "Thing", phrase: "ICE CREAM CONE", hint: "A tasty frozen treat" },
  { category: "Thing", phrase: "BASKETBALL", hint: "You dribble and shoot this" },
  { category: "Thing", phrase: "JUMPING ROPE", hint: "A playground favorite" },
  { category: "Thing", phrase: "BIRTHDAY CAKE", hint: "You blow out candles on this" },
  { category: "Thing", phrase: "ROLLER COASTER", hint: "A thrilling ride" },
  { category: "Food & Drink", phrase: "PEANUT BUTTER AND JELLY", hint: "A classic sandwich" },
  { category: "Food & Drink", phrase: "CHOCOLATE CHIP COOKIE", hint: "A baked treat with bits" },
  { category: "Food & Drink", phrase: "MACARONI AND CHEESE", hint: "Cheesy pasta dish" },
  { category: "Food & Drink", phrase: "HOT DOG", hint: "A ballpark favorite" },
  { category: "Place", phrase: "SWIMMING POOL", hint: "You splash around here" },
  { category: "Place", phrase: "AMUSEMENT PARK", hint: "Rides and games galore" },
  { category: "Place", phrase: "PLAYGROUND", hint: "Where kids go for recess" },
  { category: "Place", phrase: "TOY STORE", hint: "A fun place to shop" },
  { category: "Thing", phrase: "TEDDY BEAR", hint: "A stuffed cuddle buddy" },
  { category: "Thing", phrase: "BUBBLE GUM", hint: "Chew it and blow a bubble" },
  { category: "Thing", phrase: "RAINBOW", hint: "Colorful arc in the sky" },
  { category: "Thing", phrase: "SNOWMAN", hint: "Built with snowballs and a carrot" },
  { category: "Thing", phrase: "BICYCLE", hint: "Two wheels and pedals" },
  { category: "Thing", phrase: "GOLDFISH", hint: "A common pet in a bowl" },
  { category: "Thing", phrase: "TREEHOUSE", hint: "A fort up in the branches" },
  { category: "Thing", phrase: "SKATEBOARD", hint: "Four wheels and a deck" },
  { category: "Food & Drink", phrase: "LEMONADE STAND", hint: "A summer business for kids" },
];

export const STANDARD_PUZZLES: WheelPuzzle[] = [
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
  { category: "Person", phrase: "GOOD SAMARITAN", hint: "Someone who helps strangers" },
  { category: "Thing", phrase: "ROUND TRIP TICKET", hint: "There and back again" },
  { category: "Thing", phrase: "DIAMOND IN THE ROUGH", hint: "Hidden potential" },
  { category: "Place", phrase: "GOLDEN GATE BRIDGE", hint: "Famous San Francisco landmark" },
  { category: "Place", phrase: "GRAND CANYON", hint: "A very deep Arizona attraction" },
  { category: "Place", phrase: "NIAGARA FALLS", hint: "Famous North American waterfalls" },
  { category: "Food & Drink", phrase: "EGGS BENEDICT", hint: "A brunch classic with hollandaise" },
  { category: "Food & Drink", phrase: "FRENCH ONION SOUP", hint: "Topped with melted cheese" },
  { category: "Food & Drink", phrase: "STRAWBERRY SHORTCAKE", hint: "A fruity layered dessert" },
  { category: "Thing", phrase: "ROCKING CHAIR", hint: "Sit back and sway" },
  { category: "Thing", phrase: "SHOOTING STAR", hint: "Make a wish on this" },
  { category: "Phrase", phrase: "ONCE IN A BLUE MOON", hint: "Very rarely" },
  { category: "Phrase", phrase: "WHEN PIGS FLY", hint: "That will never happen" },
  { category: "Phrase", phrase: "HITTING THE NAIL ON THE HEAD", hint: "Getting it exactly right" },
  { category: "Thing", phrase: "JIGSAW PUZZLE", hint: "Piece it together" },
  { category: "Thing", phrase: "ALARM CLOCK", hint: "It wakes you up" },
];

export const ADVANCED_PUZZLES: WheelPuzzle[] = [
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
  { category: "Phrase", phrase: "BURNING THE CANDLE AT BOTH ENDS", hint: "Working too hard" },
  { category: "Phrase", phrase: "CURIOSITY KILLED THE CAT", hint: "Being too nosy is risky" },
  { category: "Phrase", phrase: "THE PROOF IS IN THE PUDDING", hint: "Results show the truth" },
  { category: "Phrase", phrase: "BETWEEN A ROCK AND A HARD PLACE", hint: "Two tough choices" },
  {
    category: "Phrase",
    phrase: "A PICTURE IS WORTH A THOUSAND WORDS",
    hint: "Visual storytelling",
  },
  { category: "Person", phrase: "SECRETARY OF STATE", hint: "A top cabinet position" },
  { category: "Person", phrase: "ROCKET SCIENTIST", hint: "Not exactly brain surgery" },
  { category: "Place", phrase: "GREAT BARRIER REEF", hint: "Australian underwater wonder" },
  { category: "Place", phrase: "MOUNT RUSHMORE", hint: "Presidential faces in stone" },
  { category: "Thing", phrase: "ENCYCLOPEDIA BRITANNICA", hint: "A classic reference set" },
  { category: "Thing", phrase: "DOUBLE EDGED SWORD", hint: "Advantage and disadvantage" },
  {
    category: "Food & Drink",
    phrase: "EGGS FLORENTINE WITH HOLLANDAISE",
    hint: "A fancy brunch dish",
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
  { category: "Before & After", phrase: "WEDDING RING LEADER", hint: "Marriage + boss" },
];

/** Return the puzzle bank for a given complexity level. */
export function getPuzzleBank(complexity: "kids" | "standard" | "advanced"): WheelPuzzle[] {
  switch (complexity) {
    case "kids":
      return KIDS_PUZZLES;
    case "standard":
      return STANDARD_PUZZLES;
    case "advanced":
      return ADVANCED_PUZZLES;
  }
}
