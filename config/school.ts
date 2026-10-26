import type { ThinkerId } from "@/lib/types";

// A beginner's guide to the people at the table. Plain language, dates are approximate where
// the sources are (most ancient dates are), and anything that is legend is called legend.

export interface Lesson {
  id: ThinkerId;
  dates: string;
  /** Sort key for the timeline: a rough birth year, negative for BC. */
  born: number;
  place: string;
  school: string;
  oneLine: string;
  ideas: { term: string; text: string }[];
  tryIt: string;
  read: string;
  note?: string;
}

export const LESSONS: Lesson[] = [
  {
    id: "pythagoras",
    dates: "c. 570 to 495 BC",
    born: -570,
    place: "Samos, then Croton (southern Italy)",
    school: "Led the Pythagoreans",
    oneLine: "The world is built on number, and a good life is in tune, like a well-strung lyre.",
    ideas: [
      { term: "Everything is numbers", text: "Behind everything there is a ratio. His followers noticed that pleasing musical intervals are simple fractions: the octave is 2:1, the fifth 3:2." },
      { term: "Balance", text: "A soul, a city or a cosmos is healthy when its parts are in the right proportion to each other." },
      { term: "A way of life", text: "Pythagoreans lived as a community with strict rules on diet, silence and self-examination." },
    ],
    tryIt: "Before a big choice, write the three numbers it depends on. If you can't, you're not ready to choose.",
    read: "Kahn, Pythagoras and the Pythagoreans: A Brief History (a modern introduction)",
    note: "He wrote nothing that survives, and much about him is legend. The theorem with his name was known in Babylon long before him.",
  },
  {
    id: "heraclitus",
    dates: "c. 535 to 475 BC",
    born: -535,
    place: "Ephesus (today's Turkey)",
    school: "Worked alone",
    oneLine: "Everything flows. Change is not a problem in the world; it is what the world is made of.",
    ideas: [
      { term: "Everything flows", text: "You cannot step into the same river twice: the water is new and so are you." },
      { term: "A hidden order (logos)", text: "Under all the change there is a pattern, a reason, that most people never notice." },
      { term: "Opposites belong together", text: "Day and night, war and peace, the road up and the road down: opposites belong together." },
    ],
    tryIt: "Name one thing you are holding on to because it was true five years ago. Is it still true?",
    read: "Heraclitus, Fragments (any translation with notes, e.g. Robin Waterfield, The First Philosophers)",
    note: "Only short fragments survive, quoted by later writers. The ancients already called him 'the Obscure'.",
  },
  {
    id: "socrates",
    dates: "c. 470 to 399 BC",
    born: -470,
    place: "Athens",
    school: "Taught in the streets of Athens",
    oneLine: "Wisdom starts with admitting what you don't know, and you find it by asking better questions.",
    ideas: [
      { term: "Keep asking why", text: "Ask someone what they mean, then test the answer with more questions until the hidden assumption shows." },
      { term: "Knowing that you don't know", text: "He said he was wise only because he didn't pretend to know what he didn't." },
      { term: "Think about your life", text: "At his trial he said the unexamined life is not worth living." },
    ],
    tryIt: "Take a belief you hold strongly and ask 'why?' five times in a row. Where do you get stuck?",
    read: "Plato, Apology (his trial speech, short and readable)",
    note: "He wrote nothing. We know him through his students, mainly Plato and Xenophon. Athens sentenced him to death by hemlock.",
  },
  {
    id: "thucydides",
    dates: "c. 460 to 400 BC",
    born: -460,
    place: "Athens",
    school: "General and historian",
    oneLine: "To understand what people will do, look at their interests, their fears and their pride.",
    ideas: [
      { term: "Follow the interests", text: "States, and people, act on power and self-interest more than on fairness. Plan for that." },
      { term: "Power talks", text: "Athens tells a small island that 'the strong do what they can and the weak suffer what they must'." },
      { term: "Evidence first", text: "He tried to separate what happened from what people liked to say happened." },
    ],
    tryIt: "In your next negotiation, write down what the other side fears losing. That's your leverage.",
    read: "Thucydides, History of the Peloponnesian War: Pericles' Funeral Oration (Book 2) and the Melian Dialogue (Book 5)",
    note: "He was an Athenian general, exiled after failing to save the city of Amphipolis, and wrote the war's history in exile.",
  },
  {
    id: "plato",
    dates: "c. 428 to 348 BC",
    born: -428,
    place: "Athens",
    school: "Founded the Academy",
    oneLine: "What we see is a shadow of what is real. Philosophy is turning around to face the light.",
    ideas: [
      { term: "The cave story", text: "Prisoners watch shadows on a wall and think they're reality. One escapes, sees the sun, and nobody believes him when he returns." },
      { term: "The perfect version (Forms)", text: "Behind every beautiful thing there is a perfect idea of Beauty itself. Real knowledge is knowing those ideas." },
      { term: "Head and heart", text: "Your soul is a driver with two horses, one noble and one unruly. Reason has to steer both." },
    ],
    tryIt: "Look at your phone screen for a minute and ask: what here is a shadow, and what is the thing itself?",
    read: "Plato, Symposium (the dinner party this app is named after) and Republic, Book 7 (the cave)",
    note: "Socrates' student and Aristotle's teacher. His Academy ran for centuries.",
  },
  {
    id: "diogenes",
    dates: "c. 412 to 323 BC",
    born: -412,
    place: "Sinope, then Athens and Corinth",
    school: "The Cynics (the 'dog' philosophers)",
    oneLine: "Most of what we chase is for show. Live simply, by nature, and you can't be bought.",
    ideas: [
      { term: "Need less", text: "Need as little as possible and nobody can control you. He lived in a large clay jar to prove the point." },
      { term: "Ignore the rules of status", text: "Rules about status, wealth and manners are mostly made up. He mocked them in public, on purpose." },
      { term: "Citizen of the world", text: "Asked where he came from, he said he was a citizen of the cosmos." },
    ],
    tryIt: "List three things you own or do mainly so others will see them. Which could you drop this month?",
    read: "Diogenes Laertius, Lives of the Eminent Philosophers, Book 6 (full of his stories)",
    note: "Most of what we know is anecdote, like the lantern he carried in daylight 'looking for an honest man' and telling Alexander the Great to stand out of his sunlight.",
  },
  {
    id: "aristotle",
    dates: "384 to 322 BC",
    born: -384,
    place: "Stagira, then Athens",
    school: "Founded the Lyceum",
    oneLine: "A good life is a craft: find what something is for, then practise the habits that get you there.",
    ideas: [
      { term: "Flourishing (eudaimonia)", text: "Not a happy mood, but a whole life that goes well." },
      { term: "The middle way", text: "Each virtue sits between two vices. Courage lies between recklessness and cowardice." },
      { term: "What is it for? (telos)", text: "Everything has a purpose. To judge a choice, ask what it is for." },
    ],
    tryIt: "Pick a habit you want. Do the smallest version of it today. You become what you repeatedly do.",
    read: "Aristotle, Nicomachean Ethics, Books 1 and 2",
    note: "Plato's student for twenty years and tutor to the young Alexander the Great. He wrote on almost everything, from biology to poetry.",
  },
  {
    id: "epicurus",
    dates: "341 to 270 BC",
    born: -341,
    place: "Samos, then Athens",
    school: "Founded the Garden",
    oneLine: "Pleasure is the goal, but the best pleasure is a calm mind, good friends and simple food.",
    ideas: [
      { term: "Peace of mind (ataraxia)", text: "Freedom from worry. Not partying: peace." },
      { term: "Three kinds of desire", text: "Natural and necessary (food, shelter, friends), natural but not necessary (fine food), and empty (fame, luxury). Feed the first, be careful with the second, ignore the third." },
      { term: "Don't fear death", text: "Where death is, we are not; where we are, death is not. So there's nothing to fear." },
    ],
    tryIt: "Sort this week's worries into necessary, unnecessary and empty desires. Drop one empty one.",
    read: "Epicurus, Letter to Menoeceus (a few pages, his whole philosophy in brief)",
    note: "His school met in a garden and, unusually for the time, welcomed women and slaves.",
  },
  {
    id: "epictetus",
    dates: "c. 50 to 135 AD",
    born: 50,
    place: "Hierapolis, Rome, then Nicopolis",
    school: "A Stoic teacher",
    oneLine: "Some things are up to you and some are not. Peace comes from knowing which is which.",
    ideas: [
      { term: "What's up to you", text: "Your judgements, choices and effort are up to you. Other people, your reputation and the weather are not." },
      { term: "It's how you see it", text: "Things don't upset us; our opinions about them do. Change the opinion and the fear changes." },
      { term: "Your roles", text: "You are a child, a friend, a citizen. Each role tells you what to do next." },
    ],
    tryIt: "Write a worry in two columns: what's up to me, what's not. Act on the first column only.",
    read: "Epictetus, Enchiridion (the Handbook, about 50 short sections)",
    note: "Born a slave, he studied philosophy, was freed and became one of the most influential teachers of Stoicism. His student Arrian wrote down his lessons.",
  },
  {
    id: "hypatia",
    dates: "c. 355 to 415 AD",
    born: 355,
    place: "Alexandria (Egypt)",
    school: "Teacher of philosophy and maths",
    oneLine: "Measure, calculate and test: careful thinking is a discipline, open to anyone willing to learn it.",
    ideas: [
      { term: "Maths and the stars", text: "She taught and worked on the great mathematical texts of her time, like Ptolemy's astronomy and Diophantus' arithmetic." },
      { term: "Teaching", text: "Students came from far away to learn philosophy from her, and she lectured in public." },
      { term: "Keep a cool head", text: "She stayed a respected, independent voice in a city torn by political and religious conflict." },
    ],
    tryIt: "Before you argue for a plan, design one cheap experiment that could prove it wrong.",
    read: "Edward Watts, Hypatia: The Life and Legend of an Ancient Philosopher",
    note: "She was murdered by a mob in 415. The famous line 'reserve your right to think' is not hers; it was written in 1908.",
  },
];

export const GLOSSARY: { term: string; text: string }[] = [
  { term: "Symposium", text: "A Greek drinking party after dinner, with wine mixed with water, music and serious conversation. Plato's Symposium is a dialogue set at one." },
  { term: "Kylix", text: "The wide, shallow two-handled cup used at a symposium. It's our logo." },
  { term: "Agora", text: "The public square of a Greek city: market, meeting place and where Socrates asked his questions." },
  { term: "Arete", text: "Excellence or virtue: being very good at being what you are." },
  { term: "Eudaimonia", text: "Flourishing; a life that goes well as a whole." },
  { term: "Ataraxia", text: "A mind at peace, free of anxiety (Epicurus, and in another way the Stoics)." },
  { term: "Logos", text: "Word, reason, account. For Heraclitus, the hidden order of the world." },
  { term: "Telos", text: "The end or purpose something is for (Aristotle)." },
];
