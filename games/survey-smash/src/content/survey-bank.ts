export interface SurveyAnswer {
  text: string;
  points: number;
  rank: number;
}

export interface Survey {
  question: string;
  answers: SurveyAnswer[];
}

export const KIDS_SURVEYS: Survey[] = [
  {
    question: "Name something you find at a playground",
    answers: [
      { text: "Slide", points: 30, rank: 1 },
      { text: "Swings", points: 25, rank: 2 },
      { text: "Monkey bars", points: 15, rank: 3 },
      { text: "Sandbox", points: 12, rank: 4 },
      { text: "Seesaw", points: 10, rank: 5 },
      { text: "Climbing wall", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a flavor of ice cream",
    answers: [
      { text: "Chocolate", points: 30, rank: 1 },
      { text: "Vanilla", points: 25, rank: 2 },
      { text: "Strawberry", points: 18, rank: 3 },
      { text: "Cookies and cream", points: 12, rank: 4 },
      { text: "Mint chocolate chip", points: 10, rank: 5 },
      { text: "Cookie dough", points: 5, rank: 6 },
    ],
  },
  {
    question: "Name an animal you might see at the zoo",
    answers: [
      { text: "Lion", points: 25, rank: 1 },
      { text: "Elephant", points: 22, rank: 2 },
      { text: "Giraffe", points: 18, rank: 3 },
      { text: "Monkey", points: 15, rank: 4 },
      { text: "Tiger", points: 12, rank: 5 },
      { text: "Bear", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you bring to school",
    answers: [
      { text: "Backpack", points: 28, rank: 1 },
      { text: "Lunch", points: 22, rank: 2 },
      { text: "Pencil", points: 18, rank: 3 },
      { text: "Books", points: 14, rank: 4 },
      { text: "Water bottle", points: 10, rank: 5 },
      { text: "Eraser", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a color of the rainbow",
    answers: [
      { text: "Red", points: 22, rank: 1 },
      { text: "Blue", points: 20, rank: 2 },
      { text: "Green", points: 16, rank: 3 },
      { text: "Yellow", points: 14, rank: 4 },
      { text: "Orange", points: 12, rank: 5 },
      { text: "Purple", points: 10, rank: 6 },
      { text: "Indigo", points: 6, rank: 7 },
    ],
  },
  {
    question: "Name a pet people keep at home",
    answers: [
      { text: "Dog", points: 35, rank: 1 },
      { text: "Cat", points: 28, rank: 2 },
      { text: "Fish", points: 15, rank: 3 },
      { text: "Hamster", points: 10, rank: 4 },
      { text: "Bird", points: 7, rank: 5 },
      { text: "Rabbit", points: 5, rank: 6 },
    ],
  },
  {
    question: "Name a fruit",
    answers: [
      { text: "Apple", points: 28, rank: 1 },
      { text: "Banana", points: 22, rank: 2 },
      { text: "Orange", points: 18, rank: 3 },
      { text: "Strawberry", points: 14, rank: 4 },
      { text: "Grape", points: 10, rank: 5 },
      { text: "Watermelon", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you do at a birthday party",
    answers: [
      { text: "Eat cake", points: 30, rank: 1 },
      { text: "Open presents", points: 25, rank: 2 },
      { text: "Play games", points: 18, rank: 3 },
      { text: "Sing happy birthday", points: 12, rank: 4 },
      { text: "Blow out candles", points: 10, rank: 5 },
      { text: "Dance", points: 5, rank: 6 },
    ],
  },
  {
    question: "Name a topping you put on pizza",
    answers: [
      { text: "Pepperoni", points: 30, rank: 1 },
      { text: "Cheese", points: 25, rank: 2 },
      { text: "Mushrooms", points: 15, rank: 3 },
      { text: "Sausage", points: 12, rank: 4 },
      { text: "Olives", points: 10, rank: 5 },
      { text: "Pineapple", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something that flies",
    answers: [
      { text: "Bird", points: 28, rank: 1 },
      { text: "Airplane", points: 25, rank: 2 },
      { text: "Butterfly", points: 15, rank: 3 },
      { text: "Helicopter", points: 12, rank: 4 },
      { text: "Kite", points: 10, rank: 5 },
      { text: "Bee", points: 10, rank: 6 },
    ],
  },
  {
    question: "Name a vegetable",
    answers: [
      { text: "Carrot", points: 25, rank: 1 },
      { text: "Broccoli", points: 22, rank: 2 },
      { text: "Corn", points: 18, rank: 3 },
      { text: "Peas", points: 14, rank: 4 },
      { text: "Potato", points: 12, rank: 5 },
      { text: "Tomato", points: 9, rank: 6 },
    ],
  },
  {
    question: "Name something you wear on your feet",
    answers: [
      { text: "Shoes", points: 30, rank: 1 },
      { text: "Socks", points: 28, rank: 2 },
      { text: "Sandals", points: 15, rank: 3 },
      { text: "Boots", points: 12, rank: 4 },
      { text: "Sneakers", points: 10, rank: 5 },
      { text: "Slippers", points: 5, rank: 6 },
    ],
  },
  {
    question: "Name a holiday",
    answers: [
      { text: "Christmas", points: 30, rank: 1 },
      { text: "Halloween", points: 22, rank: 2 },
      { text: "Thanksgiving", points: 16, rank: 3 },
      { text: "Easter", points: 12, rank: 4 },
      { text: "Fourth of July", points: 10, rank: 5 },
      { text: "Valentine's Day", points: 10, rank: 6 },
    ],
  },
  {
    question: "Name something you do before going to bed",
    answers: [
      { text: "Brush teeth", points: 30, rank: 1 },
      { text: "Put on pajamas", points: 22, rank: 2 },
      { text: "Read a book", points: 18, rank: 3 },
      { text: "Take a bath", points: 14, rank: 4 },
      { text: "Say goodnight", points: 10, rank: 5 },
      { text: "Get a drink of water", points: 6, rank: 6 },
    ],
  },
  {
    question: "Name a type of weather",
    answers: [
      { text: "Rain", points: 28, rank: 1 },
      { text: "Snow", points: 25, rank: 2 },
      { text: "Sunny", points: 20, rank: 3 },
      { text: "Windy", points: 12, rank: 4 },
      { text: "Cloudy", points: 8, rank: 5 },
      { text: "Stormy", points: 7, rank: 6 },
    ],
  },
  {
    question: "Name a type of candy",
    answers: [
      { text: "Chocolate bar", points: 28, rank: 1 },
      { text: "Gummy bears", points: 22, rank: 2 },
      { text: "Lollipop", points: 18, rank: 3 },
      { text: "Skittles", points: 14, rank: 4 },
      { text: "Jelly beans", points: 10, rank: 5 },
      { text: "Cotton candy", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you see in the sky at night",
    answers: [
      { text: "Stars", points: 35, rank: 1 },
      { text: "Moon", points: 30, rank: 2 },
      { text: "Airplane", points: 15, rank: 3 },
      { text: "Clouds", points: 10, rank: 4 },
      { text: "Satellite", points: 5, rank: 5 },
      { text: "Shooting star", points: 5, rank: 6 },
    ],
  },
  {
    question: "Name something you play with at recess",
    answers: [
      { text: "Ball", points: 28, rank: 1 },
      { text: "Jump rope", points: 22, rank: 2 },
      { text: "Tag", points: 18, rank: 3 },
      { text: "Swings", points: 14, rank: 4 },
      { text: "Frisbee", points: 10, rank: 5 },
      { text: "Hula hoop", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a superhero",
    answers: [
      { text: "Spider-Man", points: 28, rank: 1 },
      { text: "Batman", points: 25, rank: 2 },
      { text: "Superman", points: 20, rank: 3 },
      { text: "Wonder Woman", points: 12, rank: 4 },
      { text: "Iron Man", points: 10, rank: 5 },
      { text: "Captain America", points: 5, rank: 6 },
    ],
  },
  {
    question: "Name something you build with",
    answers: [
      { text: "Legos", points: 30, rank: 1 },
      { text: "Blocks", points: 25, rank: 2 },
      { text: "Sand", points: 15, rank: 3 },
      { text: "Clay", points: 12, rank: 4 },
      { text: "Cardboard", points: 10, rank: 5 },
      { text: "Sticks", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a breakfast food",
    answers: [
      { text: "Cereal", points: 28, rank: 1 },
      { text: "Pancakes", points: 22, rank: 2 },
      { text: "Eggs", points: 18, rank: 3 },
      { text: "Toast", points: 14, rank: 4 },
      { text: "Waffles", points: 10, rank: 5 },
      { text: "Bacon", points: 8, rank: 6 },
    ],
  },
];

export const STANDARD_SURVEYS: Survey[] = [
  {
    question: "Name something people do before bed",
    answers: [
      { text: "Brush teeth", points: 28, rank: 1 },
      { text: "Watch TV", points: 22, rank: 2 },
      { text: "Read", points: 18, rank: 3 },
      { text: "Check phone", points: 14, rank: 4 },
      { text: "Shower", points: 10, rank: 5 },
      { text: "Set alarm", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a reason someone might be late to work",
    answers: [
      { text: "Traffic", points: 30, rank: 1 },
      { text: "Overslept", points: 25, rank: 2 },
      { text: "Car trouble", points: 15, rank: 3 },
      { text: "Kids", points: 12, rank: 4 },
      { text: "Weather", points: 10, rank: 5 },
      { text: "Lost keys", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something people lose",
    answers: [
      { text: "Keys", points: 28, rank: 1 },
      { text: "Phone", points: 22, rank: 2 },
      { text: "Wallet", points: 18, rank: 3 },
      { text: "Remote control", points: 14, rank: 4 },
      { text: "Glasses", points: 10, rank: 5 },
      { text: "Socks", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you find in a kitchen junk drawer",
    answers: [
      { text: "Batteries", points: 25, rank: 1 },
      { text: "Tape", points: 20, rank: 2 },
      { text: "Scissors", points: 18, rank: 3 },
      { text: "Rubber bands", points: 14, rank: 4 },
      { text: "Pens", points: 12, rank: 5 },
      { text: "Takeout menus", points: 6, rank: 6 },
      { text: "Matches", points: 5, rank: 7 },
    ],
  },
  {
    question: "Name something you do on a first date",
    answers: [
      { text: "Dinner", points: 30, rank: 1 },
      { text: "Movie", points: 22, rank: 2 },
      { text: "Coffee", points: 18, rank: 3 },
      { text: "Walk in the park", points: 12, rank: 4 },
      { text: "Drinks", points: 10, rank: 5 },
      { text: "Mini golf", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a place people go on vacation",
    answers: [
      { text: "Beach", points: 30, rank: 1 },
      { text: "Disney World", points: 22, rank: 2 },
      { text: "Las Vegas", points: 15, rank: 3 },
      { text: "Europe", points: 12, rank: 4 },
      { text: "Cruise", points: 10, rank: 5 },
      { text: "Camping", points: 6, rank: 6 },
      { text: "Mountains", points: 5, rank: 7 },
    ],
  },
  {
    question: "Name something people are afraid of",
    answers: [
      { text: "Spiders", points: 28, rank: 1 },
      { text: "Heights", points: 22, rank: 2 },
      { text: "Snakes", points: 18, rank: 3 },
      { text: "Public speaking", points: 14, rank: 4 },
      { text: "The dark", points: 10, rank: 5 },
      { text: "Flying", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you see at a wedding",
    answers: [
      { text: "Cake", points: 28, rank: 1 },
      { text: "Flowers", points: 22, rank: 2 },
      { text: "Bride", points: 18, rank: 3 },
      { text: "Dancing", points: 14, rank: 4 },
      { text: "Rings", points: 10, rank: 5 },
      { text: "Photographer", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you do at the gym",
    answers: [
      { text: "Lift weights", points: 28, rank: 1 },
      { text: "Run on treadmill", points: 25, rank: 2 },
      { text: "Stretch", points: 16, rank: 3 },
      { text: "Take a class", points: 12, rank: 4 },
      { text: "Use elliptical", points: 10, rank: 5 },
      { text: "Swim", points: 9, rank: 6 },
    ],
  },
  {
    question: "Name a type of TV show",
    answers: [
      { text: "Sitcom", points: 25, rank: 1 },
      { text: "Drama", points: 22, rank: 2 },
      { text: "Reality", points: 18, rank: 3 },
      { text: "News", points: 14, rank: 4 },
      { text: "Game show", points: 12, rank: 5 },
      { text: "Documentary", points: 9, rank: 6 },
    ],
  },
  {
    question: "Name something people do on their phone while waiting",
    answers: [
      { text: "Social media", points: 30, rank: 1 },
      { text: "Play games", points: 22, rank: 2 },
      { text: "Text", points: 18, rank: 3 },
      { text: "Read news", points: 12, rank: 4 },
      { text: "Watch videos", points: 10, rank: 5 },
      { text: "Check email", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you find in a hotel room",
    answers: [
      { text: "Bed", points: 28, rank: 1 },
      { text: "TV", points: 22, rank: 2 },
      { text: "Bible", points: 16, rank: 3 },
      { text: "Mini fridge", points: 14, rank: 4 },
      { text: "Towels", points: 12, rank: 5 },
      { text: "Coffee maker", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a reason to call in sick to work",
    answers: [
      { text: "Flu", points: 28, rank: 1 },
      { text: "Headache", points: 20, rank: 2 },
      { text: "Stomach bug", points: 18, rank: 3 },
      { text: "Mental health day", points: 14, rank: 4 },
      { text: "Doctor appointment", points: 12, rank: 5 },
      { text: "Back pain", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you put in coffee",
    answers: [
      { text: "Sugar", points: 30, rank: 1 },
      { text: "Cream", points: 28, rank: 2 },
      { text: "Milk", points: 18, rank: 3 },
      { text: "Honey", points: 10, rank: 4 },
      { text: "Flavored syrup", points: 8, rank: 5 },
      { text: "Ice", points: 6, rank: 6 },
    ],
  },
  {
    question: "Name something people collect",
    answers: [
      { text: "Stamps", points: 25, rank: 1 },
      { text: "Coins", points: 22, rank: 2 },
      { text: "Baseball cards", points: 18, rank: 3 },
      { text: "Vinyl records", points: 14, rank: 4 },
      { text: "Action figures", points: 12, rank: 5 },
      { text: "Shoes", points: 9, rank: 6 },
    ],
  },
  {
    question: "Name something that makes you sneeze",
    answers: [
      { text: "Dust", points: 28, rank: 1 },
      { text: "Pollen", points: 25, rank: 2 },
      { text: "Pepper", points: 18, rank: 3 },
      { text: "Cat hair", points: 12, rank: 4 },
      { text: "Cold air", points: 10, rank: 5 },
      { text: "Perfume", points: 7, rank: 6 },
    ],
  },
  {
    question: "Name something you do on a road trip",
    answers: [
      { text: "Listen to music", points: 28, rank: 1 },
      { text: "Stop for food", points: 22, rank: 2 },
      { text: "Play car games", points: 16, rank: 3 },
      { text: "Sleep", points: 14, rank: 4 },
      { text: "Take photos", points: 10, rank: 5 },
      { text: "Argue over directions", points: 10, rank: 6 },
    ],
  },
  {
    question: "Name something you associate with New Year's Eve",
    answers: [
      { text: "Countdown", points: 28, rank: 1 },
      { text: "Champagne", points: 22, rank: 2 },
      { text: "Fireworks", points: 18, rank: 3 },
      { text: "Kiss at midnight", points: 14, rank: 4 },
      { text: "Party", points: 10, rank: 5 },
      { text: "Resolutions", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you buy at a gas station",
    answers: [
      { text: "Gas", points: 35, rank: 1 },
      { text: "Snacks", points: 22, rank: 2 },
      { text: "Drinks", points: 18, rank: 3 },
      { text: "Lottery tickets", points: 10, rank: 4 },
      { text: "Cigarettes", points: 8, rank: 5 },
      { text: "Gum", points: 7, rank: 6 },
    ],
  },
  {
    question: "Name a chore nobody likes doing",
    answers: [
      { text: "Dishes", points: 28, rank: 1 },
      { text: "Laundry", points: 22, rank: 2 },
      { text: "Cleaning the bathroom", points: 18, rank: 3 },
      { text: "Vacuuming", points: 14, rank: 4 },
      { text: "Mowing the lawn", points: 10, rank: 5 },
      { text: "Taking out trash", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something people eat at a barbecue",
    answers: [
      { text: "Hamburgers", points: 28, rank: 1 },
      { text: "Hot dogs", points: 25, rank: 2 },
      { text: "Ribs", points: 18, rank: 3 },
      { text: "Corn on the cob", points: 12, rank: 4 },
      { text: "Coleslaw", points: 10, rank: 5 },
      { text: "Potato salad", points: 7, rank: 6 },
    ],
  },
];

export const ADVANCED_SURVEYS: Survey[] = [
  {
    question: "Name something associated with Wall Street",
    answers: [
      { text: "Stocks", points: 28, rank: 1 },
      { text: "Money", points: 22, rank: 2 },
      { text: "Bull", points: 16, rank: 3 },
      { text: "Brokers", points: 14, rank: 4 },
      { text: "Crash", points: 10, rank: 5 },
      { text: "Wolf of Wall Street", points: 10, rank: 6 },
    ],
  },
  {
    question: "Name a famous speech",
    answers: [
      { text: "I Have a Dream", points: 35, rank: 1 },
      { text: "Gettysburg Address", points: 22, rank: 2 },
      { text: "Ask not what your country can do", points: 16, rank: 3 },
      { text: "We shall fight on the beaches", points: 10, rank: 4 },
      { text: "Yes we can", points: 10, rank: 5 },
      { text: "Tear down this wall", points: 7, rank: 6 },
    ],
  },
  {
    question: "Name something people argue about at Thanksgiving",
    answers: [
      { text: "Politics", points: 30, rank: 1 },
      { text: "Sports", points: 20, rank: 2 },
      { text: "Cooking", points: 16, rank: 3 },
      { text: "Money", points: 14, rank: 4 },
      { text: "Relationships", points: 12, rank: 5 },
      { text: "Where to sit", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a movie that made people cry",
    answers: [
      { text: "Titanic", points: 30, rank: 1 },
      { text: "The Notebook", points: 22, rank: 2 },
      { text: "Marley and Me", points: 15, rank: 3 },
      { text: "Forrest Gump", points: 12, rank: 4 },
      { text: "Up", points: 10, rank: 5 },
      { text: "Schindler's List", points: 6, rank: 6 },
      { text: "The Lion King", points: 5, rank: 7 },
    ],
  },
  {
    question: "Name something people lie about on their resume",
    answers: [
      { text: "Experience", points: 28, rank: 1 },
      { text: "Skills", points: 22, rank: 2 },
      { text: "Education", points: 18, rank: 3 },
      { text: "Job title", points: 14, rank: 4 },
      { text: "Salary", points: 10, rank: 5 },
      { text: "References", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a sign that someone is lying",
    answers: [
      { text: "Avoiding eye contact", points: 28, rank: 1 },
      { text: "Fidgeting", points: 22, rank: 2 },
      { text: "Sweating", points: 16, rank: 3 },
      { text: "Changing their story", points: 14, rank: 4 },
      { text: "Talking too fast", points: 12, rank: 5 },
      { text: "Touching their face", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something you would find in a CEO's office",
    answers: [
      { text: "Big desk", points: 28, rank: 1 },
      { text: "Computer", points: 20, rank: 2 },
      { text: "Awards and diplomas", points: 16, rank: 3 },
      { text: "Leather chair", points: 14, rank: 4 },
      { text: "Family photos", points: 12, rank: 5 },
      { text: "View of the city", points: 10, rank: 6 },
    ],
  },
  {
    question: "Name something people do during a boring meeting",
    answers: [
      { text: "Check phone", points: 30, rank: 1 },
      { text: "Doodle", points: 22, rank: 2 },
      { text: "Daydream", points: 18, rank: 3 },
      { text: "Fall asleep", points: 12, rank: 4 },
      { text: "Send emails", points: 10, rank: 5 },
      { text: "Watch the clock", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a reason people get fired",
    answers: [
      { text: "Being late", points: 25, rank: 1 },
      { text: "Stealing", points: 22, rank: 2 },
      { text: "Poor performance", points: 18, rank: 3 },
      { text: "Lying", points: 14, rank: 4 },
      { text: "Insubordination", points: 12, rank: 5 },
      { text: "Gossiping", points: 9, rank: 6 },
    ],
  },
  {
    question: "Name something people regret saying in an argument",
    answers: [
      { text: "I hate you", points: 28, rank: 1 },
      { text: "Insults about appearance", points: 22, rank: 2 },
      { text: "Bringing up the past", points: 18, rank: 3 },
      { text: "Swear words", points: 14, rank: 4 },
      { text: "Comparing to someone else", points: 10, rank: 5 },
      { text: "Threatening to leave", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a city known for its nightlife",
    answers: [
      { text: "Las Vegas", points: 30, rank: 1 },
      { text: "New York", points: 22, rank: 2 },
      { text: "Miami", points: 16, rank: 3 },
      { text: "Los Angeles", points: 12, rank: 4 },
      { text: "Ibiza", points: 10, rank: 5 },
      { text: "Bangkok", points: 10, rank: 6 },
    ],
  },
  {
    question: "Name a famous brand everyone recognizes",
    answers: [
      { text: "Apple", points: 28, rank: 1 },
      { text: "Nike", points: 22, rank: 2 },
      { text: "Coca-Cola", points: 18, rank: 3 },
      { text: "McDonald's", points: 14, rank: 4 },
      { text: "Google", points: 10, rank: 5 },
      { text: "Amazon", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something associated with college life",
    answers: [
      { text: "Parties", points: 25, rank: 1 },
      { text: "Studying", points: 22, rank: 2 },
      { text: "Dorms", points: 18, rank: 3 },
      { text: "Student loans", points: 14, rank: 4 },
      { text: "Ramen noodles", points: 12, rank: 5 },
      { text: "All-nighters", points: 9, rank: 6 },
    ],
  },
  {
    question: "Name something people splurge on",
    answers: [
      { text: "Cars", points: 25, rank: 1 },
      { text: "Vacations", points: 22, rank: 2 },
      { text: "Shoes", points: 18, rank: 3 },
      { text: "Electronics", points: 14, rank: 4 },
      { text: "Jewelry", points: 12, rank: 5 },
      { text: "Food and dining", points: 9, rank: 6 },
    ],
  },
  {
    question: "Name something associated with a mid-life crisis",
    answers: [
      { text: "Sports car", points: 30, rank: 1 },
      { text: "Divorce", points: 20, rank: 2 },
      { text: "New haircut", points: 16, rank: 3 },
      { text: "Gym membership", points: 12, rank: 4 },
      { text: "Career change", points: 12, rank: 5 },
      { text: "Tattoo", points: 10, rank: 6 },
    ],
  },
  {
    question: "Name something people hide from their partner",
    answers: [
      { text: "Spending", points: 28, rank: 1 },
      { text: "Past relationships", points: 22, rank: 2 },
      { text: "Junk food habits", points: 16, rank: 3 },
      { text: "Phone messages", points: 14, rank: 4 },
      { text: "Bad habits", points: 12, rank: 5 },
      { text: "Surprise gifts", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name a TV show everyone has watched",
    answers: [
      { text: "Friends", points: 28, rank: 1 },
      { text: "Game of Thrones", points: 22, rank: 2 },
      { text: "The Office", points: 18, rank: 3 },
      { text: "Seinfeld", points: 12, rank: 4 },
      { text: "Breaking Bad", points: 10, rank: 5 },
      { text: "Stranger Things", points: 10, rank: 6 },
    ],
  },
  {
    question: "Name something you negotiate the price of",
    answers: [
      { text: "Car", points: 30, rank: 1 },
      { text: "House", points: 25, rank: 2 },
      { text: "Salary", points: 18, rank: 3 },
      { text: "Flea market items", points: 10, rank: 4 },
      { text: "Cable bill", points: 10, rank: 5 },
      { text: "Furniture", points: 7, rank: 6 },
    ],
  },
  {
    question: "Name something that gets better with age",
    answers: [
      { text: "Wine", points: 30, rank: 1 },
      { text: "Cheese", points: 22, rank: 2 },
      { text: "Wisdom", points: 16, rank: 3 },
      { text: "Confidence", points: 12, rank: 4 },
      { text: "Relationships", points: 10, rank: 5 },
      { text: "Whiskey", points: 10, rank: 6 },
    ],
  },
  {
    question: "Name a profession that requires a lot of trust",
    answers: [
      { text: "Doctor", points: 28, rank: 1 },
      { text: "Lawyer", points: 22, rank: 2 },
      { text: "Accountant", points: 16, rank: 3 },
      { text: "Therapist", points: 14, rank: 4 },
      { text: "Pilot", points: 12, rank: 5 },
      { text: "Babysitter", points: 8, rank: 6 },
    ],
  },
  {
    question: "Name something people do to procrastinate",
    answers: [
      { text: "Browse social media", points: 30, rank: 1 },
      { text: "Watch TV", points: 22, rank: 2 },
      { text: "Snack", points: 16, rank: 3 },
      { text: "Clean", points: 12, rank: 4 },
      { text: "Nap", points: 10, rank: 5 },
      { text: "Online shopping", points: 10, rank: 6 },
    ],
  },
];
