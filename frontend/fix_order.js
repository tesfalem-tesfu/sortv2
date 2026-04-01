const fs = require('fs');
let c = fs.readFileSync('app/game/page.tsx', 'utf8');

// Remove currentCategory from where it was incorrectly placed (after mounted)
c = c.replace(
  'const [mounted, setMounted] = useState(false);\n  const [currentCategory, setCurrentCategory] = useState(mode);',
  'const [mounted, setMounted] = useState(false);'
);

// Move algoInfo and algoAction AFTER currentCategory is declared
// First, remove them from their current position at the top of Game()
c = c.replace(
  `  const algoInfo = ALGO_LABELS[currentCategory] || ALGO_LABELS[mode] || { name:"Sorting", icon:"🎯", color:"#6366f1", glow:"rgba(99,102,241,0.4)" };
  const algoAction = ALGO_ACTIONS[currentCategory] || ALGO_ACTIONS["numbers_asc"];
  const [currentIndex, setCurrentIndex] = useState(0);`,
  `  const [currentIndex, setCurrentIndex] = useState(0);`
);

// Now insert currentCategory state + algoInfo + algoAction right after mounted state
c = c.replace(
  'const [mounted, setMounted] = useState(false);',
  `const [mounted, setMounted] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(mode);
  const algoInfo = ALGO_LABELS[currentCategory] || ALGO_LABELS[mode] || { name:"Sorting", icon:"🎯", color:"#6366f1", glow:"rgba(99,102,241,0.4)" };
  const algoAction = ALGO_ACTIONS[currentCategory] || ALGO_ACTIONS["numbers_asc"];`
);

fs.writeFileSync('app/game/page.tsx', c, 'utf8');
console.log('fixed, size:', fs.statSync('app/game/page.tsx').size);
