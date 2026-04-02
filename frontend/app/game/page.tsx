"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://sortv2-1.onrender.com";
const QUESTION_TIME = 30;

async function apiCall(url: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem("session_token");
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(token ? { "X-Session-Token": token } : {}), ...(options.headers || {}) } });
  if (res.status === 401) { sessionStorage.removeItem("session_token"); window.location.href = "/"; }
  return res;
}

function playTone(type) {
  try {
    const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === "correct") { osc.frequency.setValueAtTime(523, ctx.currentTime); osc.frequency.setValueAtTime(659, ctx.currentTime+0.1); osc.frequency.setValueAtTime(784, ctx.currentTime+0.2); gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.5); osc.start(); osc.stop(ctx.currentTime+0.5); }
    else if (type === "wrong") { osc.type="sawtooth"; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.frequency.setValueAtTime(150, ctx.currentTime+0.15); gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.3); osc.start(); osc.stop(ctx.currentTime+0.3); }
    else { osc.type="triangle"; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.setValueAtTime(100, ctx.currentTime+0.4); gain.gain.setValueAtTime(0.4, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.7); osc.start(); osc.stop(ctx.currentTime+0.7); }
  } catch {}
}

const ALGO_LABELS = {
  numbers_asc:    { name:"Free Play",      icon:"🎮", color:"#22d3ee", glow:"rgba(34,211,238,0.4)" },
  numbers_desc:   { name:"Free Sort",      icon:"🔢", color:"#22d3ee", glow:"rgba(34,211,238,0.4)" },
  letters_asc:    { name:"Letters A-Z",    icon:"🔤", color:"#c084fc", glow:"rgba(192,132,252,0.4)" },
  letters_desc:   { name:"Letters Z-A",    icon:"🔤", color:"#c084fc", glow:"rgba(192,132,252,0.4)" },
  days:           { name:"Days of Week",   icon:"📅", color:"#fb923c", glow:"rgba(251,146,60,0.4)" },
};

const ALGO_ACTIONS = {
    numbers_asc:    { hint:"",                                   actionBtn:"🔄 Swap" },
    numbers_desc:   { hint:"",                                   actionBtn:"🔄 Swap" },
    letters_asc:    { hint:"",                                   actionBtn:"🔄 Swap" },
    letters_desc:   { hint:"",                                   actionBtn:"🔄 Swap" },
    days:           { hint:"",                                   actionBtn:"🔄 Swap" },
};


const ALL_CATEGORIES = [
  "numbers_asc","numbers_desc","letters_asc","letters_desc","days"
];
function randomCategory() { return ALL_CATEGORIES[Math.floor(Math.random()*ALL_CATEGORIES.length)]; }

function FloatScore({ x, y, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1000); return () => clearTimeout(t); }, [onDone]);
  return <div className="float-score" style={{ left:x, top:y }}>+10</div>;
}

export default function GamePage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a"}}><div style={{width:44,height:44,border:"3px solid rgba(96,165,250,0.2)",borderTopColor:"#60a5fa",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>}>
      <Game />
    </Suspense>
  );
}

function Game() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "numbers_asc";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [pivotIndex, setPivotIndex] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [correctOrder, setCorrectOrder] = useState([]);
  const [showReveal, setShowReveal] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [floatScore, setFloatScore] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(mode);
  const algoInfo = ALGO_LABELS[currentCategory] || ALGO_LABELS[mode] || { name:"Sorting", icon:"🎯", color:"#6366f1", glow:"rgba(99,102,241,0.4)" };
  const algoAction = ALGO_ACTIONS[currentCategory] || ALGO_ACTIONS["numbers_asc"];
  const submitRef = useRef(null);
  const submitBtnRef = useRef(null);

  useEffect(() => { setMounted(true); setHighScore(Number(sessionStorage.getItem("highScore")||"0")); setStreak(Number(sessionStorage.getItem("streak")||"0")); const saved=localStorage.getItem("soundEnabled"); if(saved!==null)setSoundEnabled(saved==="true"); }, []);
  useEffect(() => { localStorage.setItem("soundEnabled",String(soundEnabled)); }, [soundEnabled]);
  useEffect(() => { if(!sessionStorage.getItem("session_token"))router.replace("/"); }, [router]);

  const fetchQuestion = useCallback(async () => {
    setQuestionLoading(true);
    try {
      const res = await apiCall(API+"/api/game/questions?limit=1&category="+currentCategory);
      const data = await res.json();
      const qs = data.questions||[];
      if(!qs.length){setError("No questions for "+currentCategory);return;}
      const q=qs[0];
      
      // Handle random category selection
      if (data.was_randomized) {
        console.log("Category was randomized to:", data.selected_category);
      }
      
      setCurrentQuestion(q);setItems([...q.items]);setFeedback(null);
      setCorrectOrder([]);setShowReveal(false);setTimeLeft(QUESTION_TIME);
      setSelectedIndex(null);setPivotIndex(null);setActionMsg("");
    } catch { setError("Cannot connect to backend."); }
    finally { setQuestionLoading(false); setLoading(false); }
  }, [mode, currentCategory]);

  useEffect(() => { if(!mounted)return; if(!sessionStorage.getItem("session_token"))return; fetchQuestion(); }, [mounted,mode,fetchQuestion]);
  useEffect(() => { 
    if(!mounted || currentIndex === 0) return; // Don't fetch on initial load
    fetchQuestion(); 
  }, [currentIndex,fetchQuestion,mounted,currentCategory]);

  const submit = useCallback(() => {
    if(!currentQuestion||feedback)return;
    apiCall(API+"/api/game/submit",{method:"POST",body:JSON.stringify({category:currentQuestion.category,original_items:currentQuestion.items,answer:items,session_token:sessionStorage.getItem("session_token")})})
    .then(r=>r.json()).then(data=>{
      const isCorrect=data.correct;
      setFeedback(isCorrect?"correct":"wrong");setCorrectOrder(data.correct_order||[]);
      if(isCorrect){
        setTotalAnswered(p=>p+1); // Only increment for correct answers
        setScore(s=>{const ns=s+10;if(ns>Number(sessionStorage.getItem("highScore")||"0")){sessionStorage.setItem("highScore",String(ns));setHighScore(ns);}return ns;});
        setStreak(p=>{const n=p+1;sessionStorage.setItem("streak",String(n));return n;});
        confetti({particleCount:180,spread:100,origin:{y:0.6}});
        if(soundEnabled)playTone("correct");
        if(submitBtnRef.current){const r=submitBtnRef.current.getBoundingClientRect();setFloatScore({x:r.left+r.width/2-20,y:r.top-20});}
      } else {
        setLives(p=>p-1);setStreak(0);sessionStorage.setItem("streak","0");
        if(soundEnabled)playTone("wrong");
        setTimeout(()=>setShowReveal(true),700);
      }
      setTimeout(()=>{setLives(cl=>{if(cl<=0){setGameOver(true);if(soundEnabled)playTone("gameover");}else{const next=randomCategory();setCurrentCategory(next);setCurrentIndex(p=>p+1);setTimeout(fetchQuestion,0);}return cl;});},3000);
    }).catch(()=>setFeedback(null));
  },[currentQuestion,feedback,items,soundEnabled,fetchQuestion,currentCategory]);

  useEffect(()=>{submitRef.current=submit;},[submit]);
  useEffect(()=>{
    if(feedback||gameOver)return;
    if(timeLeft<=0){submitRef.current?.();return;}
    const t=setTimeout(()=>setTimeLeft(p=>p-1),1000);
    return()=>clearTimeout(t);
  },[timeLeft,feedback,gameOver]);

  const handleItemClick=(index)=>{
    if(feedback)return;
    const freeModes=["numbers_asc","numbers_desc","letters_asc","letters_desc","days"];
    if(freeModes.includes(mode)){
      if(selectedIndex===null){setSelectedIndex(index);setActionMsg(items[index]+" selected");}
      else if(selectedIndex===index){setSelectedIndex(null);setActionMsg("");}
      else{const next=[...items];[next[selectedIndex],next[index]]=[next[index],next[selectedIndex]];setItems(next);setActionMsg("Swapped!");setSelectedIndex(null);}
    } else {
      if(selectedIndex===index){setSelectedIndex(null);setActionMsg("");}
      else{setSelectedIndex(index);setActionMsg(items[index]+" selected");}
    }
  };

  const handleAction=()=>{
    if(feedback||selectedIndex===null)return;
    if(mode==="selection_sort"){const next=[...items];const[picked]=next.splice(selectedIndex,1);next.unshift(picked);setItems(next);setActionMsg(picked+" moved to front");setSelectedIndex(null);}
    else if(mode==="insertion_sort"){if(selectedIndex>0){const next=[...items];[next[selectedIndex-1],next[selectedIndex]]=[next[selectedIndex],next[selectedIndex-1]];setItems(next);setActionMsg("Inserted left");setSelectedIndex(selectedIndex-1);}else{setActionMsg("Already at front!");}}
    else if(mode==="merge_sort"){const next=[...items].sort((a,b)=>Number(a)-Number(b)||a.localeCompare(b));setItems(next);setActionMsg("Merged & sorted!");setSelectedIndex(null);}
    else if(mode==="quick_sort"){const pivot=items[selectedIndex];const less=items.filter((_,i)=>i!==selectedIndex&&Number(items[i])<=Number(pivot));const greater=items.filter((_,i)=>i!==selectedIndex&&Number(items[i])>Number(pivot));setItems([...less,pivot,...greater]);setPivotIndex(less.length);setActionMsg("Partitioned around "+pivot);setSelectedIndex(null);}
  };

  const exitGame=()=>{sessionStorage.removeItem("session_token");router.replace("/");};
  const shareScore=()=>{navigator.clipboard.writeText("I scored "+score+" on Sorting Quest!");alert("Copied!");};

  const timerPct=(timeLeft/QUESTION_TIME)*100;
  const timerColor=timeLeft>15?"#4ade80":timeLeft>7?"#facc15":"#f87171";
  const isLocked=!!feedback;
  const R=28,circ=2*Math.PI*R;

  if(loading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f172a"}}><div style={{width:44,height:44,border:"3px solid rgba(96,165,250,0.2)",borderTopColor:"#60a5fa",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>);
  if(error||!currentQuestion)return(<div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0f172a",color:"white",gap:16}}><p style={{fontSize:"1.2rem",color:"#f87171"}}>{error||"No questions found"}</p><button onClick={()=>router.push("/select")} style={{padding:"10px 28px",borderRadius:50,border:"1px solid #60a5fa",background:"transparent",color:"#60a5fa",cursor:"pointer"}}>Back</button></div>);

  if(gameOver)return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0f172a",padding:24}}>
      <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} style={{background:"#1e293b",border:"2px solid "+algoInfo.color,borderRadius:24,padding:"48px 40px",textAlign:"center",maxWidth:440,width:"100%",boxShadow:"0 0 60px "+algoInfo.glow}}>
        <div style={{fontSize:"3rem",marginBottom:8}}>💀</div>
        <h2 style={{color:"#f87171",fontSize:"2rem",fontWeight:900,marginBottom:24,fontFamily:"Orbitron,sans-serif"}}>GAME OVER</h2>
        <div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:24}}>
          <div><div style={{fontSize:"0.6rem",color:"#64748b",letterSpacing:"0.2em",marginBottom:4}}>SCORE</div><div style={{fontSize:"2rem",fontWeight:900,color:"#4ade80",fontFamily:"Orbitron,sans-serif"}}>{score}</div></div>
          <div><div style={{fontSize:"0.6rem",color:"#64748b",letterSpacing:"0.2em",marginBottom:4}}>BEST</div><div style={{fontSize:"2rem",fontWeight:900,color:"#facc15",fontFamily:"Orbitron,sans-serif"}}>{highScore}</div></div>
          <div><div style={{fontSize:"0.6rem",color:"#64748b",letterSpacing:"0.2em",marginBottom:4}}>ROUNDS</div><div style={{fontSize:"2rem",fontWeight:900,color:"#60a5fa",fontFamily:"Orbitron,sans-serif"}}>{totalAnswered}</div></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>window.location.reload()} style={{padding:"13px",borderRadius:50,border:"none",background:"linear-gradient(135deg,"+algoInfo.color+",#60a5fa)",color:"white",fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>PLAY AGAIN</button>
          <div style={{display:"flex",gap:10}}>
            <button onClick={shareScore} style={{flex:1,padding:"10px",borderRadius:50,border:"1px solid "+algoInfo.color,background:"transparent",color:algoInfo.color,fontFamily:"Orbitron,sans-serif",fontSize:"0.68rem",cursor:"pointer"}}>SHARE</button>
            <button onClick={()=>router.push("/select")} style={{flex:1,padding:"10px",borderRadius:50,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"#94a3b8",fontFamily:"Orbitron,sans-serif",fontSize:"0.68rem",cursor:"pointer"}}>MODES</button>
            <button onClick={exitGame} style={{flex:1,padding:"10px",borderRadius:50,border:"1px solid #f87171",background:"transparent",color:"#f87171",fontFamily:"Orbitron,sans-serif",fontSize:"0.68rem",cursor:"pointer"}}>🚪 Logout</button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div style={{ 
      minHeight:"100vh", 
      background:"#f5f5f5", 
      color:"#00FFFF", 
      fontFamily:"'Courier New', monospace", 
      display:"flex", 
      flexDirection:"column", 
      alignItems:"center", 
      justifyContent:"center", 
      padding:"20px 10px", 
      position:"relative", 
      overflow:"hidden" 
    }}>
      {/* Animated background particles */}
      <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, zIndex:0 }}>
        {[...Array(25)].map((_,i) => (
          <div key={i} style={{
            position:"absolute",
            width:Math.random()*4+1,
            height:Math.random()*4+1,
            background:"#00FFFF",
            left:Math.random()*100+"%",
            top:Math.random()*100+"%",
            opacity:Math.random()*0.8+0.2,
            animation:`float ${Math.random()*10+10}s linear infinite`,
            boxShadow:"0 0 6px #00FFFF"
          }} />
        ))}
      </div>

      {/* Header */}
      <div style={{ 
        display:"flex", 
        justifyContent:"space-between", 
        alignItems:"center", 
        width:"100%", 
        maxWidth:"1200px", 
        marginBottom:20, 
        position:"relative", 
        zIndex:1,
        flexWrap:"wrap",
        gap:15
      }}>
        {/* Main Title */}
        <div style={{ 
          textAlign:"center", 
          width:"100%", 
          marginBottom:15,
          order:0
        }}>
          <h1 style={{ 
            fontSize:"clamp(1.5rem, 4vw, 2.5rem)", 
            fontWeight:"bold", 
            color:"#0066FF", 
            fontFamily:"'Courier New', monospace",
            textShadow:"0 0 20px rgba(0,102,255,0.5)",
            margin:"0",
            padding:"10px 0",
            letterSpacing:"2px"
          }}>
            SORTING QUIZ
          </h1>
        </div>
        
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", order:1 }}>
          <div style={{ 
            background:"#000", 
            border:"2px solid #00FFFF", 
            borderRadius:0, 
            padding:"10px 20px", 
            fontSize:"clamp(0.9rem, 3vw, 1.3rem)", 
            fontWeight:"bold", 
            color:"#00FFFF", 
            fontFamily:"'Courier New', monospace",
            boxShadow:"0 0 20px rgba(0,255,255,0.6)"
          }}>
            {algoInfo.icon} {algoInfo.name}
          </div>
          <div style={{ 
            background:"#000", 
            border:"2px solid #FF00FF", 
            borderRadius:0, 
            padding:"8px 15px", 
            fontSize:"clamp(0.8rem, 2.5vw, 1rem)", 
            fontWeight:"bold", 
            color:"#FF00FF", 
            fontFamily:"'Courier New', monospace",
            boxShadow:"0 0 15px rgba(255,0,255,0.5)"
          }}>
            Level: {Math.floor(totalAnswered / 5) + 1}
          </div>
        </div>
        
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", order:2 }}>
          <button onClick={()=>router.push("/select")} style={{ 
            background:"#FFFF00", 
            border:"3px solid #FFFF00", 
            borderRadius:0, 
            padding:"10px 20px", 
            fontSize:"clamp(0.8rem, 2.5vw, 1.2rem)", 
            fontWeight:"bold", 
            color:"#000", 
            fontFamily:"'Courier New', monospace",
            boxShadow:"0 0 20px rgba(255,255,0,0.6)",
            cursor:"pointer",
            minWidth:"120px"
          }}>🚪 FREE PLAY</button>
          <button onClick={exitGame} style={{ 
            padding:"8px 15px", 
            borderRadius:0, 
            border:"2px solid #FF0000", 
            background:"#000", 
            color:"#FF0000", 
            fontWeight:"bold", 
            fontSize:"clamp(0.7rem, 2vw, 0.9rem)", 
            cursor:"pointer", 
            fontFamily:"'Courier New', monospace",
            boxShadow:"0 0 15px rgba(255,0,0,0.5)",
            transition:"all 0.3s ease"
          }}>🚪 LOGOUT</button>
        </div>
      </div>

      {/* Main game area */}
      <div style={{ 
        display:"flex", 
        alignItems:"flex-start", 
        gap:20, 
        position:"relative", 
        zIndex:1, 
        width:"100%", 
        maxWidth:"1200px", 
        justifyContent:"center",
        flexDirection:"row",
        flexWrap:"wrap"
      }}>
          
          {/* CRT Monitor Container */}
          <div style={{ 
            background:"#0a0a2e", 
            border:"3px solid #00FFFF", 
            borderRadius:10, 
            padding:"15px", 
            width:"100%", 
            maxWidth:"700px", 
            minHeight:"500px", 
            display:"flex", 
            flexDirection:"column", 
            justifyContent:"center",
            boxShadow:"0 0 30px rgba(0,255,255,0.5), inset 0 0 20px rgba(0,255,255,0.1)",
            position:"relative",
            order:1
          }}>
            {/* Scanline Effect */}
            <div style={{ 
              position:"absolute", 
              top:0, 
              left:0, 
              right:0, 
              bottom:0, 
              background:"linear-gradient(transparent 50%, rgba(0,255,255,0.03) 50%)", 
              pointerEvents:"none", 
              zIndex:1 
            }} />
            {/* Question at top */}
            <div style={{ textAlign:"center", marginBottom:20, position:"relative", zIndex:2 }}>
              <motion.div key={currentQuestion.id} initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}>
                <div style={{ 
                  display:"inline-block", 
                  background:"#000", 
                  border:"2px solid #00FFFF", 
                  borderRadius:0, 
                  padding:"12px 20px", 
                  maxWidth:"90%", 
                  fontSize:"clamp(0.8rem, 2.5vw, 1rem)", 
                  fontWeight:"bold", 
                  color:"#00FFFF", 
                  fontFamily:"'Courier New', monospace",
                  boxShadow:"0 0 15px rgba(0,255,255,0.5)",
                  textShadow:"0 0 5px #00FFFF",
                  wordBreak:"break-word"
                }}>
                  <span style={{ marginRight:8 }}>{algoInfo.icon}</span>
                  {questionLoading ? "LOADING..." : currentQuestion.question.toUpperCase()}
                </div>
                {!isLocked && (
                  <div style={{ 
                    marginTop:15, 
                    display:"inline-flex", 
                    alignItems:"center", 
                    gap:10, 
                    background:"#000", 
                    border:"1px solid #00FFFF", 
                    borderRadius:0, 
                    padding:"8px 20px", 
                    fontSize:"0.8rem", 
                    color:"#00FFFF",
                    fontFamily:"'Courier New', monospace"
                  }}>
                    {actionMsg
                      ? <span style={{ color:"#00FF00", fontWeight:"bold" }}>► {actionMsg.toUpperCase()}</span>
                      : <span>Sort the items in correct order</span>}
                    {selectedIndex !== null && (
                      <button onClick={() => { setSelectedIndex(null); setActionMsg(""); }} style={{ background:"none", border:"1px solid #FF0000", color:"#FF0000", cursor:"pointer", fontSize:"1rem", padding:"5px", fontFamily:"'Courier New', monospace" }}>✕</button>
                    )}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Cards in center - cyber style */}
            <div style={{ marginBottom:30, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:10, maxWidth:450 }}>
                <AnimatePresence mode="popLayout">
                {items.map((item, index) => {
                  const isSelected = selectedIndex === index;
                  const isPivot    = mode === "quick_sort" && pivotIndex === index && !isSelected;
                  const isReveal   = feedback === "wrong" && showReveal;
                  const isCorrect  = feedback === "correct";
                  const isWrong    = feedback === "wrong" && !showReveal;
                  const displayItem = isReveal ? (correctOrder[index] ?? item) : item;

                  let bg = "#000";
                  let border = "2px solid #00FFFF";
                  let textColor = "#00FFFF";
                  let shadow = "0 0 10px rgba(0,255,255,0.3)";

                  if (isSelected)      { bg = "#00FFFF"; border = "2px solid #00FFFF"; shadow = "0 0 15px rgba(0,255,255,0.8)"; textColor = "#000"; }
                  else if (isCorrect)  { bg = "#000"; border = "2px solid #00FF00"; shadow = "0 0 15px rgba(0,255,0,0.8)"; textColor = "#00FF00"; }
                  else if (isWrong)    { bg = "#000"; border = "2px solid #FF0000"; shadow = "0 0 15px rgba(255,0,0,0.8)"; textColor = "#FF0000"; }
                  else if (isReveal)   { bg = "#000"; border = "2px solid #FF00FF"; shadow = "0 0 15px rgba(255,0,255,0.8)"; textColor = "#FF00FF"; }
                  else if (isPivot)    { bg = "#FF00FF"; border = "2px solid #FF00FF"; shadow = "0 0 15px rgba(255,0,255,0.8)"; textColor = "#000"; }

                  return (
                    <motion.div key={isReveal ? `rev-${index}` : `item-${index}`} layout
                      initial={{ opacity:0, y:30, scale:0.8 }} animate={{ opacity:1, y:0, scale:1 }}
                      exit={{ opacity:0, scale:0.6 }} transition={{ duration:0.25, delay:index * 0.04 }}
                      onClick={() => handleItemClick(index)}
                      style={{ 
                        position:"relative", 
                        background:bg, 
                        border, 
                        borderRadius:0, 
                        padding:"10px 15px", 
                        minWidth:50, 
                        textAlign:"center", 
                        cursor: feedback ? "default" : "pointer", 
                        userSelect:"none", 
                        boxShadow:shadow, 
                        transition:"all 0.2s", 
                        fontSize:"1rem", 
                        fontWeight:"bold",
                        fontFamily:"'Courier New', monospace",
                        color:textColor
                      }}>
                      {/* position badge */}
                      <div style={{ 
                        position:"absolute", 
                        top:-8, 
                        left:-8, 
                        width:16, 
                        height:16, 
                        borderRadius:0, 
                        background:"#FF00FF", 
                        color:"#000", 
                        fontSize:"0.6rem", 
                        fontWeight:900, 
                        display:"flex", 
                        alignItems:"center", 
                        justifyContent:"center", 
                        fontFamily:"'Courier New', monospace",
                        border:"1px solid #FF00FF"
                      }}>{index + 1}</div>
                      <span style={{ fontSize:"1.1rem", fontWeight:900, fontFamily:"'Courier New', monospace" }}>{displayItem}</span>
                      {isPivot && <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:"#FFFF00", color:"#000", fontSize:"0.6rem", fontWeight:900, padding:"2px 4px", borderRadius:0, fontFamily:"'Courier New', monospace", border:"1px solid #FFFF00" }}>PIVOT</div>}
                      {isCorrect && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", background:"rgba(0,255,0,0.8)", color:"#00FF00", fontFamily:"'Courier New', monospace", fontWeight:"bold" }}>✓</div>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              </div>
            </div>

            {/* All buttons together - cyber style */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, marginTop:15 }}>
              {/* Action buttons */}
              {!isLocked && (
                <div style={{ display:"flex", justifyContent:"center", gap:15, flexWrap:"wrap" }}>
                  {mode === "bubble_sort" ? (
                    <>
                      <button disabled={selectedIndex === null}
                        onClick={() => { if (selectedIndex === null) return; const next = [...items]; const sw = selectedIndex < items.length - 1 ? selectedIndex + 1 : selectedIndex - 1; [next[selectedIndex], next[sw]] = [next[sw], next[selectedIndex]]; setItems(next); setActionMsg("SWAPPED!"); setSelectedIndex(null); }}
                        style={{ 
                          padding:"10px 20px", 
                          borderRadius:0, 
                          border:"2px solid #00FFFF", 
                          background:selectedIndex !== null ? "#00FFFF" : "#000", 
                          color:selectedIndex !== null ? "#000" : "#00FFFF", 
                          fontWeight:"bold", 
                          fontSize:"0.9rem", 
                          cursor: selectedIndex !== null ? "pointer" : "default", 
                          transition:"all 0.2s", 
                          fontFamily:"'Courier New', monospace",
                          boxShadow:selectedIndex !== null ? "0 0 15px rgba(0,255,255,0.8)" : "0 0 10px rgba(0,255,255,0.3)"
                        }}>🔄 SWAP</button>
                      <button disabled={selectedIndex === null}
                        onClick={() => { if (selectedIndex === null) return; setActionMsg("PASSED!"); setSelectedIndex(null); }}
                        style={{ 
                          padding:"10px 20px", 
                          borderRadius:0, 
                          border:"2px solid #FF00FF", 
                          background:selectedIndex !== null ? "#FF00FF" : "#000", 
                          color:selectedIndex !== null ? "#000" : "#FF00FF", 
                          fontWeight:"bold", 
                          fontSize:"0.9rem", 
                          cursor: selectedIndex !== null ? "pointer" : "default", 
                          transition:"all 0.2s", 
                          fontFamily:"'Courier New', monospace",
                          boxShadow:selectedIndex !== null ? "0 0 15px rgba(255,0,255,0.8)" : "0 0 10px rgba(255,0,255,0.3)"
                        }}>⏭ PASS</button>
                    </>
                  ) : (
                    <button disabled={selectedIndex === null} onClick={handleAction}
                      style={{ 
                        padding:"10px 20px", 
                        borderRadius:0, 
                        border:"2px solid #00FFFF", 
                        background:selectedIndex !== null ? "#00FFFF" : "#000", 
                        color:selectedIndex !== null ? "#000" : "#00FFFF", 
                        fontWeight:"bold", 
                        fontSize:"0.9rem", 
                        cursor: selectedIndex !== null ? "pointer" : "default", 
                        transition:"all 0.2s", 
                        fontFamily:"'Courier New', monospace",
                        boxShadow:selectedIndex !== null ? "0 0 15px rgba(0,255,255,0.8)" : "0 0 10px rgba(0,255,255,0.3)"
                      }}>{algoAction.actionBtn}</button>
                  )}
                </div>
              )}

              {/* Submit buttons */}
              <div style={{ 
                display:"flex", 
                justifyContent:"center", 
                alignItems:"center", 
                gap:10, 
                flexWrap:"nowrap",
                overflowX:"auto",
                padding:"0 10px"
              }}>
                <button disabled={currentIndex === 0 || isLocked}
                  onClick={() => { if (currentIndex > 0 && !isLocked) setCurrentIndex((p: number) => p - 1); }}
                  style={{ 
                    padding:"clamp(8px, 2vw, 12px) clamp(15px, 4vw, 25px)", 
                    borderRadius:0, 
                    border:"2px solid rgb(30, 231, 30)", 
                    background:currentIndex === 0 || isLocked ? "#333" : "#000", 
                    color:currentIndex === 0 || isLocked ? "#666" : "#00FF00", 
                    fontWeight:"bold", 
                    fontSize:"clamp(0.7rem, 2.5vw, 0.9rem)", 
                    cursor: currentIndex === 0 || isLocked ? "default" : "pointer", 
                    transition:"all 0.2s", 
                    fontFamily:"'Courier New', monospace",
                    boxShadow:currentIndex === 0 || isLocked ? "none" : "0 0 15px rgba(0,255,0,0.8)",
                    flex:"0 0 auto",
                    minWidth:"80px"
                  }}>◄ PREV</button>
                <button ref={submitBtnRef} disabled={isLocked} onClick={submit}
                  style={{ 
                    padding:"clamp(10px, 2.5vw, 15px) clamp(25px, 6vw, 50px)", 
                    borderRadius:0, 
                    border:"2px solid #FFFF00", 
                    background:isLocked ? "#333" : "#FFFF00", 
                    color:isLocked ? "#666" : "#000", 
                    fontWeight:"bold", 
                    fontSize:"clamp(0.8rem, 3vw, 1rem)", 
                    cursor:isLocked ? "default" : "pointer", 
                    fontFamily:"'Courier New', monospace",
                    boxShadow:isLocked ? "none" : "0 0 20px rgba(255,255,0,0.8)",
                    textShadow:isLocked ? "none" : "0 0 10px rgba(255,255,0,0.5)",
                    flex:"0 0 auto",
                    minWidth:"100px"
                  }}>
                  {isLocked ? (feedback === "correct" ? "✓ CORRECT" : "✗ WRONG") : "SUBMIT"}
                </button>
                <button 
                  onClick={() => { 
                    setFeedback(null); // Clear feedback to unlock next question
                    const nextCategory = randomCategory(); // Get random category
                    setCurrentCategory(nextCategory); // Set new category
                    setCurrentIndex((p: number) => p + 1); 
                  }}
                  style={{ 
                    padding:"clamp(8px, 2vw, 12px) clamp(15px, 4vw, 25px)", 
                    borderRadius:0, 
                    border:"2px solid #FF00FF", 
                    background:"#000", 
                    color:"#FF00FF", 
                    fontWeight:"bold", 
                    fontSize:"clamp(0.7rem, 2.5vw, 0.9rem)", 
                    cursor:"pointer", 
                    transition:"all 0.2s", 
                    fontFamily:"'Courier New', monospace",
                    boxShadow:"0 0 15px rgba(255,0,255,0.8)",
                    flex:"0 0 auto",
                    minWidth:"80px"
                  }}>NEXT ►</button>
              </div>
            </div>
          </div>
          
          {/* Cyber Timer and Score on right side */}
          <div style={{ 
            display:"flex", 
            flexDirection:"column", 
            gap:15, 
            minWidth:"fit-content", 
            marginLeft:"0px", 
            paddingTop:"20px",
            order:2,
            flex:"0 0 auto"
          }}>
            <div style={{ 
              width: "clamp(50px, 8vw, 60px)", 
              height: "clamp(50px, 8vw, 60px)", 
              background:"#000", 
              border:"2px solid #00FFFF", 
              borderRadius:0, 
              display:"flex", 
              alignItems:"center", 
              justifyContent:"center", 
              position:"relative", 
              boxShadow:"0 0 20px rgba(0,255,255,0.5)",
              margin:"0 auto"
            }}>
              <div style={{ 
                position:"absolute", 
                bottom:0, 
                left:0, 
                right:0, 
                background:timerColor, 
                height:timerPct+"%", 
                transition:"height 1s linear"
              }} />
              <div style={{ 
                position:"relative", 
                zIndex:1, 
                fontSize: "clamp(1rem, 3vw, 1.2rem)", 
                fontWeight:"bold", 
                color:timerColor,
                fontFamily:"'Courier New', monospace",
                textShadow:`0 0 10px ${timerColor}`
              }}>{timeLeft}</div>
            </div>
            <div style={{ 
              fontSize: "clamp(0.7rem, 2vw, 0.8rem)", 
              color:"#00FFFF", 
              fontFamily:"'Courier New', monospace", 
              textAlign:"center",
              fontWeight:"bold"
            }}>TIMER</div>
            <div style={{ 
              background:"#000", 
              border:"2px solid #FF00FF", 
              borderRadius:0, 
              padding:"10px 20px", 
              fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)", 
              fontWeight:"bold", 
              color:"#FF00FF", 
              fontFamily:"'Courier New', monospace",
              boxShadow:"0 0 20px rgba(255,0,255,0.6)",
              textAlign:"center",
              minWidth: "clamp(150px, 25vw, 200px)"
            }}>
              SCORE: {score}
            </div>
            
            {/* ── GAME STATUS ── */}
            <div style={{ 
              textAlign:"center", 
              padding:"8px 12px", 
              margin:"10px 0",
              background:"rgba(0,0,0,0.8)", 
              border:"2px solid #00FFFF", 
              borderRadius:0,
              boxShadow:"0 0 15px rgba(0,255,255,0.3)",
              minWidth: "clamp(150px, 25vw, 200px)"
            }}>
              <div style={{ 
                fontSize: "clamp(0.7rem, 2vw, 0.8rem)", 
                fontWeight:"bold", 
                color:"#00FFFF", 
                fontFamily:"'Courier New', monospace",
                marginBottom:"3px"
              }}>
                STATUS: {gameOver ? "🏁 GAME OVER" : loading ? "⏳ LOADING" : questionLoading ? "🔄 PROCESSING" : "🎮 PLAYING"}
              </div>
              <div style={{ 
                fontSize: "clamp(0.6rem, 1.8vw, 0.7rem)", 
                color:"#FF00FF", 
                fontFamily:"'Courier New', monospace"
              }}>
                Q{currentIndex + 1} • Answered: {totalAnswered} • Lives: {lives}
              </div>
            </div>
          </div>
        </div>

      {/* ── FEEDBACK BANNER ── */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
            style={{ 
              position:"relative", 
              zIndex:1, 
              margin:"0 10px 15px", 
              padding:"12px 20px", 
              borderRadius:0, 
              textAlign:"center", 
              fontWeight:800, 
              fontSize:"clamp(0.9rem, 3vw, 1.05rem)", 
              color: feedback === "correct" ? "white" : "#FF0000", 
              background: feedback === "correct" ? "rgba(0,255,0,0.3)" : "rgba(0,0,0,0.9)", 
              border: feedback === "correct" ? "2px solid #00FF00" : "2px solid #FF0000", 
              boxShadow: feedback === "correct" ? "0 0 30px rgba(0,255,0,0.4)" : "0 0 30px rgba(255,0,0,0.6)",
              maxWidth:"90%"
            }}>
            {feedback === "correct" ? "🎉 CORRECT! +10 POINTS" : "❌ WRONG — CORRECT ORDER SHOWN ABOVE ↑"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
