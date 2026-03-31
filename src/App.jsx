import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Timer, User, Trophy, Palette, Rocket, History, Music, 
  BookOpen, MapPin, Cross, Zap, ChevronRight, RefreshCw, 
  Star, ShieldCheck, Flame, Film, Tv, Award, PawPrint, Ghost
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, limit, orderBy 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';

// --- CONFIGURATION FIREBASE ---
let app, auth, db;
try {
  const firebaseConfigString = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
  if (firebaseConfigString) {
    const firebaseConfig = JSON.parse(firebaseConfigString);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Firebase init error", e);
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'quiz-greece-hollywood-v2';

// --- BASE DE DONNÉES ÉTENDUE ---
const QUESTIONS_DB = [
  // SÉRIES AMÉRICAINES
  { cat: "Series", qFr: "Dans la série 'Friends', combien y a-t-il d'amis principaux ?", qEn: "In the show 'Friends', how many main friends are there?", options: [{fr: "5", en: "5"}, {fr: "6", en: "6"}, {fr: "7", en: "7"}], correct: 1 },
  { cat: "Series", qFr: "Quelle série suit un professeur de chimie produisant de la méthamphétamine ?", qEn: "Which series follows a chemistry teacher producing methamphetamine?", options: [{fr: "The Wire", en: "The Wire"}, {fr: "Breaking Bad", en: "Breaking Bad"}, {fr: "Dexter", en: "Dexter"}], correct: 1 },
  { cat: "Series", qFr: "De quelle série vient la réplique 'Winter is Coming' ?", qEn: "Which series features the line 'Winter is Coming'?", options: [{fr: "The Witcher", en: "The Witcher"}, {fr: "Vikings", en: "Vikings"}, {fr: "Game of Thrones", en: "Game of Thrones"}], correct: 2 },
  { cat: "Series", qFr: "Dans 'Stranger Things', comment s'appelle le monde parallèle ?", qEn: "In 'Stranger Things', what is the name of the parallel world?", options: [{fr: "Le Monde à l'Envers", en: "The Upside Down"}, {fr: "Le Néant", en: "The Void"}, {fr: "L'Abîme", en: "The Abyss"}], correct: 0 },
  
  // FILMS AMÉRICAINS
  { cat: "Cinema", qFr: "Quel film détient le record du plus grand nombre d'Oscars (11) avec Ben-Hur et le Seigneur des Anneaux ?", qEn: "Which movie holds the record for most Oscars (11) along with Ben-Hur and Lord of the Rings?", options: [{fr: "Titanic", en: "Titanic"}, {fr: "Avatar", en: "Avatar"}, {fr: "Forrest Gump", en: "Forrest Gump"}], correct: 0 },
  { cat: "Cinema", qFr: "Qui a réalisé le film 'Pulp Fiction' ?", qEn: "Who directed the movie 'Pulp Fiction'?", options: [{fr: "Steven Spielberg", en: "Steven Spielberg"}, {fr: "Quentin Tarantino", en: "Quentin Tarantino"}, {fr: "Martin Scorsese", en: "Martin Scorsese"}], correct: 1 },
  { cat: "Cinema", qFr: "Dans 'Star Wars', qui est le père de Luke Skywalker ?", qEn: "In 'Star Wars', who is Luke Skywalker's father?", options: [{fr: "Obi-Wan Kenobi", en: "Obi-Wan Kenobi"}, {fr: "Dark Vador", en: "Darth Vader"}, {fr: "Yoda", en: "Yoda"}], correct: 1 },
  { cat: "Cinema", qFr: "Quel film d'animation met en scène un ogre vert ?", qEn: "Which animated movie features a green ogre?", options: [{fr: "Toy Story", en: "Toy Story"}, {fr: "Shrek", en: "Shrek"}, {fr: "Le Roi Lion", en: "The Lion King"}], correct: 1 },

  // MYTHOLOGIE & ÉGYPTE
  { cat: "Mythology", qFr: "Qui est le dieu grec de la guerre ?", qEn: "Who is the Greek god of war?", options: [{fr: "Arès", en: "Ares"}, {fr: "Apollon", en: "Apollo"}, {fr: "Hermès", en: "Hermes"}], correct: 0 },
  { cat: "Mythology", qFr: "Quel héros a accompli 12 travaux ?", qEn: "Which hero accomplished 12 labors?", options: [{fr: "Persée", en: "Perseus"}, {fr: "Héraclès (Hercule)", en: "Heracles (Hercules)"}, {fr: "Thésée", en: "Theseus"}], correct: 1 },
  { cat: "Mythology", qFr: "Quel dieu égyptien a une tête de faucon ?", qEn: "Which Egyptian god has the head of a falcon?", options: [{fr: "Anubis", en: "Anubis"}, {fr: "Horus", en: "Horus"}, {fr: "Sobek", en: "Sobek"}], correct: 1 },

  // RELIGION
  { cat: "Religion", qFr: "Quel est le nom de la montagne où Moïse a reçu les commandements ?", qEn: "What is the name of the mountain where Moses received the commandments?", options: [{fr: "Mont Olympe", en: "Mount Olympus"}, {fr: "Mont Sinaï", en: "Mount Sinai"}, {fr: "Mont Ararat", en: "Mount Ararat"}], correct: 1 },

  // CAPITALES
  { cat: "Geography", qFr: "Quelle est la capitale de l'Italie ?", qEn: "What is the capital of Italy?", options: [{fr: "Milan", en: "Milan"}, {fr: "Venise", en: "Venice"}, {fr: "Rome", en: "Rome"}], correct: 2 },
  { cat: "Geography", qFr: "Quelle ville est la capitale de la Corée du Sud ?", qEn: "Which city is the capital of South Korea?", options: [{fr: "Tokyo", en: "Tokyo"}, {fr: "Séoul", en: "Seoul"}, {fr: "Pékin", en: "Beijing"}], correct: 1 },

  // MUSIQUE
  { cat: "Music", qFr: "Quel duo français d'électro cachait son visage sous des casques de robots ?", qEn: "Which French electro duo hid their faces under robot helmets?", options: [{fr: "Justice", en: "Justice"}, {fr: "Cassius", en: "Cassius"}, {fr: "Daft Punk", en: "Daft Punk"}], correct: 2 },
  { cat: "Music", qFr: "De quel instrument jouait le célèbre musicien Jimi Hendrix ?", qEn: "What instrument did the famous musician Jimi Hendrix play?", options: [{fr: "Guitare", en: "Guitar"}, {fr: "Piano", en: "Piano"}, {fr: "Batterie", en: "Drums"}], correct: 0 },

  // JEUX VIDÉO
  { cat: "Gaming", qFr: "Quel célèbre jeu nous fait empiler des blocs qui tombent du ciel ?", qEn: "Which famous game makes us stack blocks falling from the sky?", options: [{fr: "Minecraft", en: "Minecraft"}, {fr: "Tetris", en: "Tetris"}, {fr: "Pac-Man", en: "Pac-Man"}], correct: 1 },
  { cat: "Gaming", qFr: "Dans quel jeu doit-on attraper des créatures avec des Poké Balls ?", qEn: "In which game do we catch creatures with Poké Balls?", options: [{fr: "Digimon", en: "Digimon"}, {fr: "Zelda", en: "Zelda"}, {fr: "Pokémon", en: "Pokémon"}], correct: 2 },

  // ANECDOTES INSOLITES (TRIVIA)
  { cat: "Trivia", qFr: "Comment l'ananas pousse-t-il ?", qEn: "How does a pineapple grow?", options: [{fr: "Sur un arbre", en: "On a tree"}, {fr: "Au ras du sol", en: "Close to the ground"}, {fr: "Sous terre", en: "Underground"}], correct: 1 },
  { cat: "Trivia", qFr: "Quel mammifère est le seul capable de voler ?", qEn: "Which mammal is the only one capable of flying?", options: [{fr: "L'écureuil volant", en: "Flying squirrel"}, {fr: "La chauve-souris", en: "Bat"}, {fr: "Le lémurien", en: "Lemur"}], correct: 1 },
  { cat: "Trivia", qFr: "Combien de temps dure la mémoire d'un poisson rouge ? (Mythe ou réalité)", qEn: "How long does a goldfish's memory last?", options: [{fr: "3 secondes", en: "3 seconds"}, {fr: "Plusieurs mois", en: "Several months"}, {fr: "Une journée", en: "A day"}], correct: 1 },
  { cat: "Trivia", qFr: "Quel aliment naturel ne périme littéralement jamais, même après 3000 ans ?", qEn: "Which natural food literally never expires, even after 3000 years?", options: [{fr: "Le sel", en: "Salt"}, {fr: "Le miel", en: "Honey"}, {fr: "L'huile d'olive", en: "Olive oil"}], correct: 1 },
  { cat: "Trivia", qFr: "Aux États-Unis, que trouve-t-on dans la composition de la dynamite ?", qEn: "In the United States, what do we find in the composition of dynamite?", options: [{fr: "De la farine de maïs", en: "Corn starch"}, {fr: "Du beurre de cacahuète", en: "Peanut butter"}, {fr: "Du sucre glace", en: "Icing sugar"}], correct: 1 },

  // ANIMAUX ÉTRANGES ET DRÔLES
  { cat: "Animals", qFr: "Quelle est la particularité très étonnante des crottes du wombat (un marsupial) ?", qEn: "What is the very surprising particularity of Wombat poop?", options: [{fr: "Elles sont cubiques", en: "They are cubic"}, {fr: "Elles brillent dans le noir", en: "They glow in the dark"}, {fr: "Elles sentent la lavande", en: "They smell like lavender"}], correct: 0 },
  { cat: "Animals", qFr: "Combien de cœurs possède une pieuvre ?", qEn: "How many hearts does an octopus have?", options: [{fr: "Un seul", en: "One"}, {fr: "Trois", en: "Three"}, {fr: "Neuf", en: "Nine"}], correct: 1 },
  { cat: "Animals", qFr: "Est-il vrai que les vaches ont des 'meilleures amies' ?", qEn: "Is it true that cows have 'best friends'?", options: [{fr: "100% Vrai, elles stressent si on les sépare", en: "100% True, they stress out if separated"}, {fr: "Faux, ce sont des animaux très solitaires", en: "False, they are very solitary animals"}, {fr: "Vrai, mais seulement chez les veaux", en: "True, but only in calves"}], correct: 0 },
  { cat: "Animals", qFr: "Pourquoi les flamants roses sont-ils de couleur rose ?", qEn: "Why are flamingos pink?", options: [{fr: "À cause du soleil", en: "Because of the sun"}, {fr: "C'est génétique", en: "It's genetic"}, {fr: "À cause des crevettes qu'ils mangent", en: "Because of the shrimp they eat"}], correct: 2 }
];

// --- FOND DRAPEAU GREC ---
const GreekFlagBackground = () => (
  <div className="fixed inset-0 z-[-1] bg-[#050816] overflow-hidden">
    <div className="absolute inset-0 flex flex-col opacity-10">
      {[...Array(9)].map((_, i) => (
        <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-[#005bae]' : 'bg-white'}`} />
      ))}
    </div>
    <div className="absolute top-0 left-0 w-[45vw] h-[44.4vh] bg-[#005bae] opacity-20">
      <div className="absolute top-1/2 left-0 w-full h-[20%] bg-white -translate-y-1/2" />
      <div className="absolute top-0 left-1/2 h-full w-[20%] bg-white -translate-x-1/2" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-transparent to-slate-950" />
  </div>
);

const ConfettiLayer = () => (
  <div className="absolute inset-0 pointer-events-none z-50">
    {[...Array(50)].map((_, i) => (
      <div key={i} className="absolute w-2 h-4 rounded-sm animate-bounce opacity-70" style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        backgroundColor: ['#005bae', '#ffffff', '#6366f1'][Math.floor(Math.random() * 3)],
        animationDelay: `${Math.random() * 2}s`
      }} />
    ))}
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('menu'); 
  const [players, setPlayers] = useState([
    { name: "Eirini", score: 0, jokers: { skip: true, double: true } },
    { name: "Danai", score: 0, jokers: { skip: true, double: true } },
    { name: "Dany", score: 0, jokers: { skip: true, double: true } }
  ]);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isDoubleActive, setIsDoubleActive] = useState(false);
  const [history, setHistory] = useState([]);

  // Auth & Stats
  useEffect(() => {
    const init = async () => {
      try {
        if (!auth) return;
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth error", e); }
    };
    init();
    if (auth) {
      const unsub = onAuthStateChanged(auth, setUser);
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'), limit(5));
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => d.data());
        setHistory(data.sort((a,b) => b.score - a.score));
      });
      return () => unsub();
    } catch (e) { console.error("fetch score error", e); }
  }, [user]);

  // Game Handlers
  const startNewGame = () => {
    const gameQuestions = [...QUESTIONS_DB].sort(() => Math.random() - 0.5).slice(0, 15);
    setQuestions(gameQuestions);
    setPlayers(p => p.map(player => ({ ...player, score: 0, jokers: { skip: true, double: true } })));
    setCurrentIdx(0);
    setCurrentPlayerIdx(0);
    setGameState('playing');
    resetTurn();
  };

  const resetTurn = useCallback(() => {
    setTimeLeft(30);
    setIsAnswered(false);
    setSelectedOpt(null);
    setIsDoubleActive(false);
  }, []);

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && !isAnswered && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && !isAnswered) {
      submitAnswer(-1);
    }
    return () => clearInterval(timer);
  }, [gameState, isAnswered, timeLeft]);

  const submitAnswer = async (idx) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOpt(idx);

    const correct = questions[currentIdx].correct;
    if (idx === correct) {
      const basePoints = 10 + timeLeft;
      const finalPoints = isDoubleActive ? basePoints * 2 : basePoints;
      const updated = [...players];
      updated[currentPlayerIdx].score += finalPoints;
      setPlayers(updated);
    }

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(prev => prev + 1);
        setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
        resetTurn();
      } else {
        finishGame();
      }
    }, 2500);
  };

  const finishGame = async () => {
    setGameState('results');
    const winner = [...players].sort((a,b) => b.score - a.score)[0];
    if (!db) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'scores'), {
        winner: winner.name,
        score: winner.score,
        date: new Date().toISOString()
      });
    } catch (e) { console.error("Save error", e); }
  };

  const useJoker = (type) => {
    if (isAnswered) return;
    const updated = [...players];
    const p = updated[currentPlayerIdx];
    if (!p.jokers[type]) return;

    if (type === 'skip') {
      p.jokers.skip = false;
      submitAnswer(questions[currentIdx].correct);
    } else if (type === 'double') {
      p.jokers.double = false;
      setIsDoubleActive(true);
    }
    setPlayers(updated);
  };

  const CategoryIcon = ({ cat }) => {
    switch (cat) {
      case "Series": return <Tv size={16} />;
      case "Cinema": return <Film size={16} />;
      case "Art": return <Palette size={16} />;
      case "History": return <History size={16} />;
      case "Science": return <Rocket size={16} />;
      case "Mythology": return <BookOpen size={16} />;
      case "Geography": return <MapPin size={16} />;
      case "Religion": return <Cross size={16} />;
      case "Music": return <Music size={16} />;
      case "Gaming": return <Ghost size={16} />;
      case "Trivia": return <Star size={16} />;
      case "Animals": return <PawPrint size={16} />;
      default: return <Zap size={16} />;
    }
  };

  // Views
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen w-full text-slate-100 flex flex-col items-center justify-center p-4 py-12 md:p-6 relative">
        <GreekFlagBackground />
        <div className="max-w-4xl w-full z-10 animate-in fade-in zoom-in duration-700 text-center flex flex-col items-center">
          <div className="inline-block bg-slate-900/60 backdrop-blur-xl p-6 md:p-10 rounded-[3rem] md:rounded-[4rem] border border-slate-800 shadow-2xl mb-8 md:mb-12 mx-auto w-full max-w-[90%] md:max-w-none">
            <Trophy className="w-16 h-16 md:w-24 md:h-24 text-yellow-500 mx-auto drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] mb-4 md:mb-6" />
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black italic tracking-tighter text-white mb-2 break-words">QUIZ HELLAS</h1>
            <p className="text-blue-400 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] text-[10px] md:text-xs break-words">Eirini • Danai • Dany</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-[90%] md:max-w-none mx-auto w-full">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] text-left">
              <h3 className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 tracking-widest mb-4 flex-wrap">
                <Award size={14} className="text-blue-400 shrink-0" /> RECORDS CLOUD
              </h3>
              <div className="space-y-4">
                {history?.map((h, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2 gap-4">
                    <span className="text-slate-200 font-bold truncate">{h.winner}</span>
                    <span className="text-blue-400 font-mono font-black whitespace-nowrap">{h.score} pts</span>
                  </div>
                ))}
                {history?.length === 0 && (
                  <div className="text-slate-400 italic text-sm text-center py-4">Aucun record</div>
                )}
              </div>
            </div>

            <button 
              onClick={startNewGame}
              className="bg-white hover:bg-blue-50 text-slate-950 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 font-black text-4xl md:text-5xl transition-all hover:scale-105 shadow-2xl flex items-center justify-center gap-4 group cursor-pointer border-0 mt-2 lg:mt-0"
            >
              JOUER <ChevronRight className="group-hover:translate-x-3 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && questions[currentIdx]) {
    const q = questions[currentIdx];
    const player = players[currentPlayerIdx];

    return (
      <div className="min-h-screen w-full text-slate-100 p-4 py-8 md:p-8 flex flex-col items-center relative overflow-x-hidden">
        <GreekFlagBackground />
        
        {/* Header UI */}
        <div className="w-full max-w-6xl flex flex-col md:flex-row flex-wrap justify-between items-center gap-8 md:gap-6 mb-8 md:mb-12 z-10 mx-auto">
          <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4 w-full md:w-auto">
            {players.map((p, i) => (
              <div key={i} className={`relative px-4 py-3 sm:px-6 sm:py-4 md:px-10 md:py-6 rounded-[1.5rem] md:rounded-[3rem] border-2 transition-all duration-700 flex-1 min-w-[30%] sm:min-w-0 ${
                i === currentPlayerIdx 
                ? 'bg-blue-600 border-blue-400 scale-[1.05] md:scale-110 shadow-2xl ring-4 ring-blue-500/20' 
                : 'bg-slate-950/60 border-slate-900 opacity-40'
              }`}>
                <div className="text-[8px] sm:text-[10px] font-black uppercase opacity-60 mb-1 truncate">{p.name}</div>
                <div className="text-xl sm:text-2xl md:text-4xl font-mono font-black">{p.score}</div>
                <div className="flex gap-1.5 md:gap-2 mt-2 md:mt-4">
                  <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${p.jokers.skip ? 'bg-yellow-400' : 'bg-slate-800'}`} />
                  <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${p.jokers.double ? 'bg-emerald-400' : 'bg-slate-800'}`} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 md:gap-6 w-full md:w-auto pb-4 md:pb-0 border-b border-white/5 md:border-0">
            <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center bg-slate-900 rounded-full border-4 border-slate-800 overflow-hidden shadow-2xl shrink-0 ${timeLeft < 10 ? 'animate-pulse border-red-500' : ''}`}>
              <div 
                className={`absolute bottom-0 left-0 w-full bg-blue-600 transition-all duration-1000 ease-linear ${timeLeft < 10 ? 'bg-red-600' : ''}`}
                style={{ height: `${(timeLeft/30)*100}%` }}
              />
              <span className="relative text-2xl sm:text-3xl md:text-4xl font-mono font-black z-10">{timeLeft}</span>
            </div>
            
            <div className="flex md:flex-col gap-2 md:gap-3 shrink-0">
              <button 
                onClick={() => useJoker('skip')}
                disabled={!player.jokers.skip || isAnswered}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center ${player.jokers.skip && !isAnswered ? 'bg-yellow-500 border-yellow-300 text-slate-950 hover:scale-110' : 'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed'}`}
              >
                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <button 
                onClick={() => useJoker('double')}
                disabled={!player.jokers.double || isAnswered}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center ${player.jokers.double && !isAnswered ? 'bg-emerald-500 border-emerald-300 text-slate-950 hover:scale-110' : 'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed'} ${isDoubleActive ? 'ring-4 ring-emerald-400 shadow-xl shadow-emerald-500/50' : ''}`}
              >
                <Flame className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-2 gap-8 md:gap-12 items-center lg:items-start z-10 animate-in slide-in-from-bottom-10 duration-500 flex-1 mx-auto">
          <div className="space-y-6 md:space-y-8 w-full">
            <div className="flex items-center gap-3 text-blue-400 font-black uppercase text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.4em]">
              <div className="bg-blue-600/20 p-2 md:p-3 rounded-xl md:rounded-2xl"><CategoryIcon cat={q.cat} /></div>
              <span>{q.cat}</span>
            </div>
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black text-white leading-tight md:leading-none tracking-tight break-words">
                {q.qFr}
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl font-bold italic text-slate-500 border-l-4 border-blue-600/30 pl-4 md:pl-8 leading-tight">
                {q.qEn}
              </p>
            </div>
            {isDoubleActive && (
              <div className="inline-flex items-center gap-2 md:gap-3 bg-emerald-500/20 border border-emerald-500/40 px-4 md:px-6 py-2 md:py-3 rounded-full text-emerald-400 font-black text-[10px] md:text-xs uppercase animate-pulse">
                <Zap className="w-4 h-4 md:w-4 md:h-4" /> Joker Double Points Actif !
              </div>
            )}
          </div>

          <div className="space-y-3 md:space-y-4 w-full mt-2 lg:mt-0">
            {q.options.map((opt, idx) => {
              let btnStyle = "bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 cursor-pointer";
              if (isAnswered) {
                if (idx === q.correct) btnStyle = "bg-emerald-600 border-emerald-400 text-white scale-[1.02] md:scale-[1.04] shadow-xl shadow-emerald-600/30";
                else if (idx === selectedOpt) btnStyle = "bg-red-600 border-red-400 text-white opacity-80";
                else btnStyle = "bg-slate-950/90 border-slate-900 opacity-20 grayscale";
              }
              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => submitAnswer(idx)}
                  className={`w-full p-6 sm:p-8 md:p-10 rounded-[1.5rem] md:rounded-[3rem] border-2 text-left transition-all duration-300 flex flex-col gap-1 ${btnStyle} ${isAnswered ? 'cursor-default' : ''}`}
                >
                  <div className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight break-words">{opt.fr}</div>
                  <div className="text-xs md:text-sm opacity-50 italic font-medium break-words">{opt.en}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:block mt-auto pt-16 text-slate-900 font-black italic uppercase text-[80px] md:text-[120px] select-none pointer-events-none opacity-5 tracking-tighter whitespace-nowrap overflow-hidden max-w-full">
          {q.cat} QUESTION {currentIdx + 1}
        </div>
      </div>
    );
  }

  if (gameState === 'results') {
    const sorted = [...players].sort((a,b) => b.score - a.score);
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6 py-12 relative overflow-hidden bg-[#050811]">
        <GreekFlagBackground />
        <ConfettiLayer />
        
        <div className="max-w-3xl w-full bg-slate-900/40 backdrop-blur-3xl border border-slate-800 rounded-[3rem] md:rounded-[5rem] p-6 sm:p-8 md:p-16 text-center z-10 shadow-2xl animate-in zoom-in duration-500 mx-auto">
          <div className="inline-block bg-gradient-to-tr from-yellow-400 to-orange-500 p-6 md:p-10 rounded-full mb-6 md:mb-10 shadow-2xl rotate-12">
            <Trophy className="w-12 h-12 md:w-20 md:h-20 text-slate-950" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-2 md:mb-4 tracking-tighter uppercase break-words">{sorted[0].name} TRIOMPHE !</h1>
          <p className="text-blue-400 font-black uppercase tracking-widest text-[10px] md:text-xs mb-8 md:mb-12">Fin de la partie / Game Over</p>
          
          <div className="space-y-4 md:space-y-6 mb-10 md:mb-16">
            {sorted.map((p, i) => (
              <div key={i} className={`flex items-center justify-between p-5 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border-2 ${i === 0 ? 'bg-blue-600 border-blue-400 scale-[1.02] md:scale-105 shadow-2xl shadow-blue-500/20' : 'bg-slate-950/60 border-slate-800 opacity-60'}`}>
                <div className="flex items-center gap-4 md:gap-8 min-w-0">
                  <span className="text-3xl md:text-5xl font-mono font-black opacity-40 shrink-0">#{i+1}</span>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black truncate">{p.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-black">{p.score}</span>
                  <span className="block text-[8px] md:text-[10px] font-black opacity-40 uppercase tracking-widest">Points</span>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setGameState('menu')} 
            className="w-full bg-white text-slate-950 font-black py-6 md:py-10 rounded-[2rem] md:rounded-[3.5rem] text-xl md:text-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-3 md:gap-4 group shadow-xl cursor-pointer border-0"
          >
            <RefreshCw className="w-6 h-6 md:w-8 md:h-8 group-hover:rotate-180 transition-transform duration-1000" /> REJOUER
          </button>
        </div>
      </div>
    );
  }

  return null;
}
