import { useState, useRef, useCallback, useEffect } from "react";
import { jsPDF } from "jspdf";

/* ═══════════════════════════════════════════════════════════════
   PROPINSPECT ZA  –  Full PWA
   Screens: Auth → Dashboard → Inspection → Room → Report
   Features: Google/Apple/Email auth, saved reports, per-item
             condition+defects, working PDF export, signatures
═══════════════════════════════════════════════════════════════ */

// ── Constants ─────────────────────────────────────────────────
const ROOMS = [
  { id:"entrance", label:"Entrance / Hallway", icon:"🚪" },
  { id:"lounge",   label:"Lounge",             icon:"🛋️" },
  { id:"kitchen",  label:"Kitchen",            icon:"🍳" },
  { id:"master",   label:"Master Bedroom",     icon:"🛏️" },
  { id:"bed2",     label:"Bedroom 2",          icon:"🛏️" },
  { id:"bed3",     label:"Bedroom 3",          icon:"🛏️" },
  { id:"bathroom", label:"Bathroom",           icon:"🚿" },
  { id:"ensuite",  label:"En-suite",           icon:"🛁" },
  { id:"garage",   label:"Garage",             icon:"🚗" },
  { id:"garden",   label:"Garden / Exterior",  icon:"🌿" },
];

const COND  = ["Excellent","Good","Fair","Poor","Damaged"];
const CLEAN = ["Spotless","Clean","Dusty","Dirty","Very Dirty"];
const CCOLOR = {
  Excellent:"#22c55e", Good:"#86efac", Fair:"#fbbf24",
  Poor:"#f97316", Damaged:"#ef4444",
  Spotless:"#22c55e", Clean:"#86efac", Dusty:"#fbbf24",
  Dirty:"#f97316", "Very Dirty":"#ef4444",
};
const CRGB = {
  Excellent:[34,197,94], Good:[134,239,172], Fair:[251,191,36],
  Poor:[249,115,22], Damaged:[239,68,68],
};

// ── Helpers ───────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2,9);
const fmt  = d  => new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"});

// ── localStorage Persistence ──────────────────────────────────
const genReportId = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth()+1).padStart(2,"0"),
    String(d.getDate()).padStart(2,"0"),
  ].join("")+"_"+[
    String(d.getHours()).padStart(2,"0"),
    String(d.getMinutes()).padStart(2,"0"),
    String(d.getSeconds()).padStart(2,"0"),
  ].join("");
};

const saveProfileLS  = u => { try{ localStorage.setItem("user_profile", JSON.stringify(u)); }catch{} };
const loadProfileLS  = () => { try{ return JSON.parse(localStorage.getItem("user_profile")); }catch{ return null; } };
const saveAiPref     = v => { try{ localStorage.setItem("ai_enabled", JSON.stringify(v)); }catch{} };
const loadAiPref     = () => { try{ const v=localStorage.getItem("ai_enabled"); return v===null?true:JSON.parse(v); }catch{ return true; } };

const saveReportLS = report => {
  try {
    localStorage.setItem(`report_${report.id}`, JSON.stringify(report));
    let idx = [];
    try { idx = JSON.parse(localStorage.getItem("report_index")||"[]"); } catch{}
    const entry = { id:report.id, address:report.address, tenant:report.tenant, date:report.date };
    const pos = idx.findIndex(r=>r.id===report.id);
    if(pos>=0) idx[pos]=entry; else idx.unshift(entry);
    localStorage.setItem("report_index", JSON.stringify(idx.slice(0,50)));
  } catch(e){ console.error("Save failed",e); }
};

const loadReportsLS = () => {
  try {
    const idx = JSON.parse(localStorage.getItem("report_index")||"[]");
    return idx
      .map(e=>{ try{ return JSON.parse(localStorage.getItem(`report_${e.id}`)); }catch{ return null; } })
      .filter(Boolean)
      .sort((a,b)=>b.date>a.date?1:-1);
  } catch { return []; }
};

function resizeImg(dataUrl, maxW=1000) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxW/img.width);
      const c = document.createElement("canvas");
      c.width = img.width*s; c.height = img.height*s;
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      res(c.toDataURL("image/jpeg",0.82));
    };
    img.src = dataUrl;
  });
}

const AI_TIMEOUT_MS = 15000;

async function analyzePhoto(b64) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      signal: controller.signal,
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:1200,
        messages:[{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},
          {type:"text",text:`Expert property inventory clerk. Analyse this room photo. Return ONLY valid JSON, no markdown:
{"roomType":"string","overallCondition":"Excellent|Good|Fair|Poor|Damaged","cleanliness":"Spotless|Clean|Dusty|Dirty|Very Dirty","items":[{"name":"Item name","condition":"Excellent|Good|Fair|Poor|Damaged","defects":"string or empty"}],"generalNotes":"one professional sentence","flags":["urgent issues or empty"]}`}
        ]}]
      })
    });
    clearTimeout(timer);
    if(!r.ok) throw new Error(`API error ${r.status}`);
    const d = await r.json();
    const txt = d.content?.find(b=>b.type==="text")?.text||"{}";
    return { ...JSON.parse(txt.replace(/```[\s\S]*?```/g,"").trim()), aiError: false };
  } catch(e) {
    clearTimeout(timer);
    const timedOut = e?.name==="AbortError";
    return {
      aiError: true,
      aiErrorMsg: timedOut ? "AI timed out — fill manually" : "AI unavailable — fill manually",
      roomType:"Room", overallCondition:"", cleanliness:"",
      items:[], generalNotes:"", flags:[]
    };
  }
}

// ── PDF Builder ───────────────────────────────────────────────
async function exportPDF(inspection, signatures) {
  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const W=210, M=16;
  let y=0;
  const G=[200,169,110], Dk=[12,12,22], Lt=[240,237,232], Gr=[120,120,135];

  const addPage = () => { doc.addPage(); y=20; };
  const checkY  = (need=30) => { if(y+need>272) addPage(); };

  // Header
  doc.setFillColor(...Dk); doc.rect(0,0,W,44,"F");
  doc.setFillColor(...G);  doc.rect(0,41,W,2.5,"F");
  doc.setTextColor(...G);  doc.setFontSize(8); doc.setFont("helvetica","bold");
  doc.text("PROPINSPECT ZA",M,13);
  doc.setTextColor(...Lt); doc.setFontSize(17);
  doc.text("Property Inspection Report",M,28);
  const done = Object.keys(inspection.rooms||{}).filter(r=>inspection.rooms[r]?.completed).length;
  doc.setTextColor(...G); doc.setFontSize(8);
  doc.text(`${done} of ${ROOMS.length} rooms · ${inspection.date||""}`,M,37);
  y=52;

  // Property box
  doc.setFillColor(244,244,250); doc.roundedRect(M,y,W-M*2,30,3,3,"F");
  doc.setTextColor(...Gr); doc.setFontSize(7); doc.setFont("helvetica","normal");
  doc.text("ADDRESS",M+4,y+7); doc.text("TENANT",M+90,y+7); doc.text("DATE",M+152,y+7);
  doc.setTextColor(...Dk); doc.setFontSize(10); doc.setFont("helvetica","bold");
  doc.text(inspection.address||"—",M+4,y+16,{maxWidth:78});
  doc.text(inspection.tenant||"—",M+90,y+16,{maxWidth:55});
  doc.text(inspection.date||"—",M+152,y+16);
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...Gr);
  doc.text(`Inspector: ${inspection.inspector||"—"}`,M+4,y+25);
  y+=38;

  // Condition summary
  doc.setTextColor(...G); doc.setFontSize(7.5); doc.setFont("helvetica","bold");
  doc.text("CONDITION SUMMARY",M,y); y+=6;
  let cx=M;
  COND.forEach(c=>{
    const cnt=Object.values(inspection.rooms||{}).filter(r=>r?.overallCondition===c).length;
    if(!cnt) return;
    doc.setFillColor(...(CRGB[c]||Gr)); doc.roundedRect(cx,y,33,8,2,2,"F");
    doc.setTextColor(...Dk); doc.setFontSize(7); doc.setFont("helvetica","bold");
    doc.text(`${cnt}× ${c}`,cx+2,y+5.5); cx+=36;
  });
  y+=16;

  // Flags
  const flagged = ROOMS.filter(r=>(inspection.rooms[r.id]?.flags||[]).length>0);
  if(flagged.length){
    const fh=12+flagged.length*7;
    checkY(fh+4);
    doc.setFillColor(255,238,238); doc.roundedRect(M,y,W-M*2,fh,3,3,"F");
    doc.setTextColor(160,40,40); doc.setFontSize(8); doc.setFont("helvetica","bold");
    doc.text("⚠  ITEMS REQUIRING ATTENTION",M+4,y+8); y+=12;
    flagged.forEach(room=>{
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(180,50,50);
      doc.text(`• ${room.label}: ${inspection.rooms[room.id].flags.join(", ")}`,M+5,y,{maxWidth:W-M*2-8}); y+=7;
    });
    y+=5;
  }

  // Room by room
  checkY(16);
  doc.setTextColor(...G); doc.setFontSize(8); doc.setFont("helvetica","bold");
  doc.text("ROOM BY ROOM",M,y); y+=8;

  for(const room of ROOMS.filter(r=>inspection.rooms[r.id]?.completed)){
    const d=inspection.rooms[room.id];
    const items=(d.items||[]).filter(it=>it.name?.trim());
    const bh=26+(items.length*8)+(d.generalNotes?7:0)+(d.defects?7:0);
    checkY(bh+4);

    doc.setFillColor(246,246,252); doc.roundedRect(M,y,W-M*2,bh,3,3,"F");
    const col=CRGB[d.overallCondition]||Gr;
    doc.setFillColor(...col); doc.circle(M+5,y+9,2.8,"F");
    doc.setTextColor(...Dk); doc.setFontSize(10.5); doc.setFont("helvetica","bold");
    doc.text(room.label,M+11,y+10);
    doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.setTextColor(...Gr);
    if(d.overallCondition) doc.text(`Overall: ${d.overallCondition}`,M+11,y+17);
    if(d.cleanliness) doc.text(`Cleanliness: ${d.cleanliness}`,M+60,y+17);

    // Photo thumb
    if(d.photos?.[0]){
      try{
        const thumb=await resizeImg(d.photos[0],200);
        doc.addImage(thumb,"JPEG",W-M-24,y+2,22,18,undefined,"FAST");
      }catch{}
    }

    let ry=y+24;
    // Items table
    if(items.length){
      doc.setFillColor(230,230,245); doc.roundedRect(M+4,ry-3,W-M*2-8,6,1,1,"F");
      doc.setTextColor(...Gr); doc.setFontSize(6.5); doc.setFont("helvetica","bold");
      doc.text("ITEM",M+6,ry+1); doc.text("CONDITION",M+90,ry+1); doc.text("DEFECTS/NOTES",M+120,ry+1);
      ry+=6;
      items.forEach(it=>{
        doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...Dk);
        doc.text(it.name||"",M+6,ry,{maxWidth:78});
        const ic=CRGB[it.condition]||Gr;
        doc.setFillColor(...ic); doc.roundedRect(M+88,ry-3.5,22,5.5,1,1,"F");
        doc.setTextColor(...Dk); doc.setFontSize(6.5); doc.setFont("helvetica","bold");
        doc.text(it.condition||"",M+89,ry);
        doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(120,80,60);
        if(it.defects) doc.text(it.defects,M+120,ry,{maxWidth:W-M*2-M-36});
        ry+=8;
      });
    }
    if(d.generalNotes){
      doc.setFont("helvetica","italic"); doc.setFontSize(7.5); doc.setTextColor(80,80,110);
      doc.text(d.generalNotes,M+6,ry,{maxWidth:W-M*2-8}); ry+=7;
    }
    y+=bh+4;
  }

  // Signatures
  if(signatures.tenant||signatures.landlord){
    checkY(55);
    y+=4;
    doc.setFillColor(...G); doc.rect(M,y,W-M*2,0.6,"F"); y+=8;
    doc.setTextColor(...G); doc.setFontSize(8); doc.setFont("helvetica","bold");
    doc.text("SIGNATURES",M,y); y+=8;
    const sy=y;
    for(const [role,lbl] of [["tenant","Tenant"],["landlord","Landlord / Agent"]]){
      const sx=role==="tenant"?M:W/2+4;
      const sig=signatures[role];
      doc.setTextColor(...Gr); doc.setFontSize(7.5); doc.setFont("helvetica","bold");
      doc.text(lbl.toUpperCase(),sx,sy);
      if(sig?.dataUrl){ try{ doc.addImage(sig.dataUrl,"PNG",sx,sy+3,64,22); }catch{} }
      doc.setFillColor(...Gr); doc.rect(sx,sy+29,64,0.4,"F");
      doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...Gr);
      doc.text(sig?.name||"—",sx,sy+34);
      doc.text(inspection.date||"",sx,sy+39);
    }
  }

  // Footer
  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i);
    doc.setFillColor(...Dk); doc.rect(0,285,W,12,"F");
    doc.setFillColor(...G);  doc.rect(0,284,W,0.8,"F");
    doc.setTextColor(...G);  doc.setFontSize(6.5); doc.setFont("helvetica","normal");
    doc.text("PropInspect ZA · Powered by Claude AI Vision",M,291);
    doc.text(`Page ${i} of ${pages}`,W-M,291,{align:"right"});
  }

  const fname=`PropInspect_${(inspection.address||"report").replace(/[^a-zA-Z0-9]/g,"_")}_${inspection.date||"undated"}.pdf`;
  doc.save(fname);
}

// ── Signature Pad ─────────────────────────────────────────────
function SigPad({ label, onSave, onCancel }) {
  const cvs = useRef(); const last = useRef(null);
  const [drawing,setDrawing]=useState(false);
  const [hasDrawn,setHasDrawn]=useState(false);
  const [mode,setMode]=useState("draw");
  const [name,setName]=useState("");

  useEffect(()=>{
    if(mode!=="draw") return;
    const c=cvs.current; if(!c) return;
    const dpr=window.devicePixelRatio||1;
    c.width=c.offsetWidth*dpr; c.height=c.offsetHeight*dpr;
    const ctx=c.getContext("2d"); ctx.scale(dpr,dpr);
    ctx.fillStyle="#12121f"; ctx.fillRect(0,0,c.offsetWidth,c.offsetHeight);
  },[mode]);

  const pt=(e,c)=>{const r=c.getBoundingClientRect(),s=e.touches?.[0]||e;return{x:s.clientX-r.left,y:s.clientY-r.top};};
  const dn=e=>{e.preventDefault();setDrawing(true);last.current=pt(e,cvs.current);};
  const mv=e=>{
    e.preventDefault(); if(!drawing)return;
    const c=cvs.current,ctx=c.getContext("2d"),p=pt(e,c);
    ctx.beginPath();ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(p.x,p.y);
    ctx.strokeStyle="#c8a96e";ctx.lineWidth=2.5;ctx.lineCap="round";ctx.stroke();
    last.current=p; setHasDrawn(true);
  };
  const up=()=>setDrawing(false);
  const clr=()=>{
    const c=cvs.current,ctx=c.getContext("2d");
    ctx.fillStyle="#12121f";ctx.fillRect(0,0,c.offsetWidth,c.offsetHeight);
    setHasDrawn(false);
  };
  const confirm=()=>{
    if(mode==="type"){
      if(!name.trim())return;
      const c=document.createElement("canvas");c.width=440;c.height=120;
      const ctx=c.getContext("2d");
      ctx.fillStyle="#12121f";ctx.fillRect(0,0,440,120);
      ctx.font="italic 52px Georgia,serif";ctx.fillStyle="#c8a96e";
      ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(name,220,60);
      onSave(c.toDataURL("image/png"),name);
    } else {
      if(!hasDrawn)return;
      onSave(cvs.current.toDataURL("image/png"),"Signed");
    }
  };
  const ok=mode==="type"?name.trim().length>0:hasDrawn;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#0e0e1c",borderRadius:"22px 22px 0 0",padding:"24px 20px 48px",width:"100%",maxWidth:480}}>
        <div style={{fontSize:16,fontWeight:700,color:"#f0ede8",marginBottom:3}}>Sign — {label}</div>
        <div style={{fontSize:12,color:"#666",marginBottom:18}}>Embedded in the exported PDF</div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {["draw","type"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${mode===m?"rgba(200,169,110,0.45)":"rgba(255,255,255,0.1)"}`,background:mode===m?"rgba(200,169,110,0.12)":"transparent",color:mode===m?"#c8a96e":"#777",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {m==="draw"?"✍️ Draw":"⌨️ Type"}
            </button>
          ))}
        </div>
        {mode==="draw"?(
          <>
            <canvas ref={cvs} style={{width:"100%",height:130,borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",display:"block",touchAction:"none",cursor:"crosshair"}}
              onMouseDown={dn} onMouseMove={mv} onMouseUp={up} onMouseLeave={up}
              onTouchStart={dn} onTouchMove={mv} onTouchEnd={up}/>
            <div style={{fontSize:11,color:"#444",textAlign:"center",margin:"6px 0 10px"}}>Sign with finger or mouse</div>
            {hasDrawn&&<button onClick={clr} style={{display:"block",width:"100%",padding:"9px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#666",fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>Clear & Redo</button>}
          </>
        ):(
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"
            style={{display:"block",width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,color:"#f0ede8",fontSize:28,padding:"14px",marginBottom:14,boxSizing:"border-box",fontFamily:"Georgia,serif",fontStyle:"italic",outline:"none",textAlign:"center"}}/>
        )}
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={onCancel} style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:"rgba(255,255,255,0.07)",color:"#888",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={confirm} style={{flex:2,padding:"13px",borderRadius:12,border:"none",background:ok?"linear-gradient(135deg,#c8a96e,#a07840)":"rgba(200,169,110,0.15)",color:ok?"#0a0a0f":"#888",fontSize:14,fontWeight:700,cursor:ok?"pointer":"default",fontFamily:"inherit"}}>
            Confirm Signature
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Photo Strip ───────────────────────────────────────────────
function PhotoStrip({ photos=[], onAdd, onUpload, onRemove }) {
  const camRef=useRef(), upRef=useRef();
  return (
    <div style={{marginBottom:16}}>
      {photos.length>0&&(
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:10}}>
          {photos.map((p,i)=>(
            <div key={i} style={{position:"relative",flexShrink:0}}>
              <img src={p} style={{width:90,height:72,objectFit:"cover",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)"}} alt=""/>
              <button onClick={()=>onRemove(i)} style={{position:"absolute",top:-5,right:-5,width:20,height:20,borderRadius:"50%",background:"#ef4444",border:"2px solid #08080f",color:"#fff",fontSize:11,lineHeight:"16px",textAlign:"center",cursor:"pointer",padding:0,fontWeight:700}}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>camRef.current?.click()} style={photoBtn}>
          📷 {photos.length===0?"Take Photo":"Add Photo"}
        </button>
        <button onClick={()=>upRef.current?.click()} style={photoBtn}>
          🖼️ Upload Image
        </button>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{if(e.target.files[0])onAdd(e.target.files[0]);e.target.value="";}}/>
      <input ref={upRef}  type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])onUpload(e.target.files[0]);e.target.value="";}}/>
    </div>
  );
}
const photoBtn={flex:1,padding:"11px 8px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.05)",color:"#ccc",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6};

// ── Item Row Component ────────────────────────────────────────
function ItemRow({ item, onChange, onRemove }) {
  return (
    <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 14px 12px",marginBottom:10}}>
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
        <input
          value={item.name}
          onChange={e=>onChange({...item,name:e.target.value})}
          placeholder="Item name (e.g. Sofa, Carpet…)"
          style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#f0ede8",fontSize:14,padding:"9px 12px",fontFamily:"inherit",outline:"none"}}
        />
        <button onClick={onRemove} style={{width:30,height:30,borderRadius:"50%",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171",fontSize:14,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      <div style={{fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:"#666",marginBottom:7}}>Condition</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
        {COND.map(opt=>{
          const sel=item.condition===opt;
          return <div key={opt} onClick={()=>onChange({...item,condition:opt})} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",border:sel?"none":"1px solid rgba(255,255,255,0.1)",background:sel?CCOLOR[opt]:"rgba(255,255,255,0.03)",color:sel?"#0a0a0f":"#777"}}>{opt}</div>;
        })}
      </div>
      <input
        value={item.defects}
        onChange={e=>onChange({...item,defects:e.target.value})}
        placeholder="Defects / damage notes (optional)"
        style={{display:"block",width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:item.defects?"#f87171":"#888",fontSize:13,padding:"9px 12px",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen]   = useState("auth");       // auth|dashboard|inspection|room|report
  const [user,   setUser]     = useState(null);
  const [reports,setReports]  = useState([]);           // saved inspections
  const [insp,   setInsp]     = useState(null);         // current inspection
  const [activeRoom, setActiveRoom] = useState(null);
  const [analyzing,  setAnalyzing]  = useState(false);
  const [signatures, setSignatures] = useState({tenant:null,landlord:null});
  const [sigOpen,    setSigOpen]    = useState(null);
  const [pdfStatus,  setPdfStatus]  = useState("idle"); // idle|loading|done|error
  const [saveMsg,    setSaveMsg]    = useState("");
  const [headerErrors, setHeaderErrors] = useState({});
  const [roomCompleteErr, setRoomCompleteErr] = useState("");
  const [headerDraft, setHeaderDraft] = useState({address:"",tenant:"",date:""});
  const [aiEnabled, setAiEnabled] = useState(loadAiPref);

  // Auth form state
  const [authMode,setAuthMode]=useState("signin"); // signin|signup
  const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [name,setName]=useState("");
  const [authErr,setAuthErr]=useState("");

  const roomData    = insp?.rooms?.[activeRoom]||{};
  const completedIds= insp ? Object.keys(insp.rooms||{}).filter(r=>insp.rooms[r]?.completed) : [];
  const progress    = completedIds.length/ROOMS.length;

  // ── Auto-login from saved profile ──────────────────────────
  useEffect(()=>{
    const profile = loadProfileLS();
    if(profile){
      setUser(profile);
      setReports(loadReportsLS());
      setScreen("dashboard");
    }
  },[]);

  // ── Auth ────────────────────────────────────────────────────
  const handleAuth = (provider) => {
    let u;
    if(provider==="email"){
      if(!email||!pass){setAuthErr("Please enter email and password.");return;}
      u={name:name||email.split("@")[0], email, provider:"email"};
    } else {
      u={name:provider==="google"?"Google User":"Apple User", email:`user@${provider}.com`, provider};
    }
    setUser(u);
    saveProfileLS(u);
    setReports(loadReportsLS());
    setScreen("dashboard");
  };

  const startNewInspection = () => {
    const today=new Date().toISOString().split("T")[0];
    setInsp({
      id:genReportId(), address:"", tenant:"", date:today,
      inspector:user?.name||"", rooms:{}, completed:false
    });
    setHeaderDraft({address:"",tenant:"",date:today});
    setHeaderErrors({});
    setSignatures({tenant:null,landlord:null});
    setScreen("inspection");
  };

  const openReport = (r) => {
    setInsp(r); setSignatures({tenant:null,landlord:null}); setScreen("report");
  };

  const saveAndGoToReport = () => {
    const updated={...insp, completed:completedIds.length===ROOMS.length};
    setInsp(updated);
    setReports(prev=>{
      const idx=prev.findIndex(r=>r.id===updated.id);
      return idx>=0?prev.map(r=>r.id===updated.id?updated:r):[...prev,updated];
    });
    setScreen("report");
  };

  // ── Photo handling ─────────────────────────────────────────
  const processPhoto = useCallback(async(file, runAI)=>{
    const reader=new FileReader();
    reader.onload=async ev=>{
      const url=await resizeImg(ev.target.result,1200);
      setInsp(prev=>({
        ...prev,
        rooms:{...prev.rooms,[activeRoom]:{
          ...prev.rooms[activeRoom],
          photos:[...(prev.rooms[activeRoom]?.photos||[]),url]
        }}
      }));
      if(runAI&&aiEnabled&&!insp?.rooms?.[activeRoom]?.aiAnalysed){
        setAnalyzing(true);
        const ai=await analyzePhoto(url.split(",")[1]);
        setAnalyzing(false);
        setInsp(prev=>{
          const r=prev.rooms[activeRoom]||{};
          return {...prev,rooms:{...prev.rooms,[activeRoom]:{
            ...r,
            overallCondition:r.overallCondition||(ai.aiError?"":ai.overallCondition),
            cleanliness:r.cleanliness||(ai.aiError?"":ai.cleanliness),
            items:r.items?.length?r.items:(ai.aiError?[]:(ai.items||[]).map(it=>({...it,id:uid()}))),
            generalNotes:r.generalNotes||(ai.aiError?"":ai.generalNotes),
            flags:r.flags||(ai.aiError?[]:ai.flags),
            aiAnalysed:true,
            aiError:!!ai.aiError,
            aiErrorMsg:ai.aiErrorMsg||null,
          }}};
        });
      }
    };
    reader.readAsDataURL(file);
  },[activeRoom,insp]);

  const removePhoto=useCallback((idx)=>{
    setInsp(prev=>({...prev,rooms:{...prev.rooms,[activeRoom]:{
      ...prev.rooms[activeRoom],
      photos:(prev.rooms[activeRoom]?.photos||[]).filter((_,i)=>i!==idx)
    }}}));
  },[activeRoom]);

  const updateRoomField=(field,val)=>{
    setInsp(prev=>({...prev,rooms:{...prev.rooms,[activeRoom]:{...prev.rooms[activeRoom],[field]:val}}}));
  };

  const updateItem=(idx,val)=>{
    setInsp(prev=>{
      const items=[...(prev.rooms[activeRoom]?.items||[])];
      items[idx]=val;
      return {...prev,rooms:{...prev.rooms,[activeRoom]:{...prev.rooms[activeRoom],items}}};
    });
  };
  const addItem=()=>{
    setInsp(prev=>{
      const items=[...(prev.rooms[activeRoom]?.items||[]),{id:uid(),name:"",condition:"Good",defects:""}];
      return {...prev,rooms:{...prev.rooms,[activeRoom]:{...prev.rooms[activeRoom],items}}};
    });
  };
  const removeItem=(idx)=>{
    setInsp(prev=>{
      const items=(prev.rooms[activeRoom]?.items||[]).filter((_,i)=>i!==idx);
      return {...prev,rooms:{...prev.rooms,[activeRoom]:{...prev.rooms[activeRoom],items}}};
    });
  };

  const markRoomComplete=()=>{
    const hasItems=(roomData.items||[]).some(it=>it.name?.trim());
    const hasNotes=roomData.generalNotes?.trim();
    if(!hasItems&&!hasNotes){
      setRoomCompleteErr("Add at least one item or a general note before completing this room.");
      return;
    }
    setRoomCompleteErr("");
    setInsp(prev=>({...prev,rooms:{...prev.rooms,[activeRoom]:{...prev.rooms[activeRoom],completed:true}}}));
    setActiveRoom(null); setScreen("inspection");
  };

  const handleExportPDF=async()=>{
    setPdfStatus("loading");
    try{ await exportPDF(insp,signatures); setPdfStatus("done"); setTimeout(()=>setPdfStatus("idle"),3500); }
    catch(e){ console.error(e); setPdfStatus("error"); setTimeout(()=>setPdfStatus("idle"),4000); }
  };

  const handleSaveReport=()=>{
    const updated={...insp, completed:completedIds.length===ROOMS.length};
    setInsp(updated);
    saveReportLS(updated);
    setReports(loadReportsLS());
    setSaveMsg("Report saved successfully!");
    setTimeout(()=>setSaveMsg(""),3000);
  };

  // ── Global CSS ─────────────────────────────────────────────
  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    input::placeholder,textarea::placeholder{color:#3a3a50}
    input:focus,textarea:focus{border-color:rgba(200,169,110,0.55)!important;box-shadow:0 0 0 3px rgba(200,169,110,0.08)}
    button{transition:opacity 0.15s,transform 0.1s}
    button:active{opacity:0.8;transform:scale(0.97)}
    ::-webkit-scrollbar{width:0;height:0}
    html,body{background:#08080f;}
  `;

  // ── Style tokens ───────────────────────────────────────────
  const T={
    app:{fontFamily:"'Sora','DM Sans',system-ui,sans-serif",background:"#08080f",minHeight:"100vh",color:"#f0ede8",maxWidth:520,margin:"0 auto",position:"relative"},
    hd:{padding:"54px 24px 20px",background:"linear-gradient(180deg,#0d0d1e 0%,transparent 100%)"},
    logo:{fontSize:10,letterSpacing:"0.28em",textTransform:"uppercase",color:"#c8a96e",fontWeight:800,marginBottom:6},
    ttl:{fontSize:28,fontWeight:800,lineHeight:1.1},
    body:{padding:"0 22px 120px"},
    // Nav / back buttons — much more prominent
    backBtn:{display:"inline-flex",alignItems:"center",gap:8,color:"#f0ede8",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:22,padding:"10px 18px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:30,backdropFilter:"blur(8px)",letterSpacing:"0.01em"},
    navLink:{display:"inline-flex",alignItems:"center",gap:6,color:"#f0ede8",fontSize:14,fontWeight:700,cursor:"pointer",padding:"8px 16px",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:24},
    // Cards
    card:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:18,padding:"18px",marginBottom:14,cursor:"pointer"},
    cardDone:{background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.22)"},
    cardGold:{background:"rgba(200,169,110,0.06)",border:"1px solid rgba(200,169,110,0.2)"},
    // Inputs
    inp:{display:"block",width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,color:"#f0ede8",fontSize:15,padding:"13px 16px",marginBottom:12,fontFamily:"inherit",outline:"none"},
    lbl:{fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",color:"#888",marginBottom:7,display:"block",fontWeight:600},
    // Buttons
    btn:{display:"block",width:"100%",padding:"16px",borderRadius:14,border:"none",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:10,letterSpacing:"0.01em"},
    gold:{background:"linear-gradient(135deg,#c8a96e,#a07840)",color:"#0a0a0f"},
    ghost:{background:"rgba(255,255,255,0.07)",color:"#f0ede8",border:"1px solid rgba(255,255,255,0.15)"},
    dim:{background:"rgba(255,255,255,0.04)",color:"#aaa",border:"1px solid rgba(255,255,255,0.08)"},
    danger:{background:"rgba(239,68,68,0.1)",color:"#f87171",border:"1px solid rgba(239,68,68,0.2)"},
    // Misc
    prog:{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",marginBottom:20},
    progFill:{height:"100%",background:"linear-gradient(90deg,#c8a96e,#e8c87e)",borderRadius:2,transition:"width 0.5s ease"},
    chips:{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16},
    chip:{padding:"9px 16px",borderRadius:30,fontSize:13,fontWeight:600,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.04)",color:"#999",cursor:"pointer"},
    ta:{display:"block",width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,color:"#f0ede8",fontSize:14,padding:"12px 14px",marginBottom:12,fontFamily:"inherit",resize:"vertical",minHeight:76,outline:"none"},
    sec:{fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",color:"#c8a96e",fontWeight:800,marginBottom:12,marginTop:26},
    badge:{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:700},
    flagCard:{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,padding:"10px 14px",marginBottom:10,fontSize:13,color:"#fca5a5"},
    rSec:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"16px 18px",marginBottom:12},
    aiBar:{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"rgba(200,169,110,0.08)",border:"1px solid rgba(200,169,110,0.22)",borderRadius:12,marginBottom:14,fontSize:13,color:"#c8a96e",fontWeight:600},
    spin:{width:14,height:14,border:"2px solid rgba(200,169,110,0.25)",borderTopColor:"#c8a96e",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0},
    divider:{height:1,background:"rgba(255,255,255,0.07)",margin:"20px 0"},
  };

  // ════════════════════════════════════════════════════════════
  // AUTH SCREEN
  // ════════════════════════════════════════════════════════════
  if(screen==="auth") return (
    <div style={T.app}>
      <style>{CSS}</style>
      {/* Hero */}
      <div style={{...T.hd,paddingTop:64,textAlign:"center"}}>
        <div style={{...T.logo,justifyContent:"center",display:"flex"}}>PropInspect ZA</div>
        <div style={{...T.ttl,fontSize:32,marginBottom:10}}>
          Property <span style={{color:"#c8a96e"}}>Inspections</span><br/>Done Right
        </div>
        <div style={{color:"#555",fontSize:14,lineHeight:1.7,marginBottom:32}}>AI-powered inventory reports.<br/>Take photos. We fill the rest.</div>
      </div>

      <div style={T.body}>
        {/* Social auth */}
        <button onClick={()=>handleAuth("google")} style={{...T.btn,background:"#fff",color:"#222",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10}}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
        <button onClick={()=>handleAuth("apple")} style={{...T.btn,background:"#000",color:"#fff",border:"1px solid #333",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.56-1.32 3.1-2.54 4zm-3.1-17.6c.06 2.06-1.52 3.8-3.47 3.96-.22-1.96 1.53-3.81 3.47-3.96z"/></svg>
          Continue with Apple
        </button>

        <div style={{...T.divider,position:"relative"}}>
          <span style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#08080f",padding:"0 12px",color:"#555",fontSize:12}}>or</span>
        </div>

        {/* Toggle */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4,marginBottom:20}}>
          {["signin","signup"].map(m=>(
            <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");}}
              style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:authMode===m?"rgba(200,169,110,0.15)":"transparent",color:authMode===m?"#c8a96e":"#666",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {m==="signin"?"Sign In":"Sign Up"}
            </button>
          ))}
        </div>

        {authMode==="signup"&&(
          <><label style={T.lbl}>Your Name</label>
          <input style={T.inp} placeholder="Jane Smith" value={name} onChange={e=>setName(e.target.value)}/></>
        )}
        <label style={T.lbl}>Email Address</label>
        <input style={T.inp} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
        <label style={T.lbl}>Password</label>
        <input style={T.inp} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
        {authErr&&<div style={{color:"#f87171",fontSize:13,marginBottom:12,padding:"10px 14px",background:"rgba(239,68,68,0.08)",borderRadius:10}}>⚠ {authErr}</div>}
        <button style={{...T.btn,...T.gold}} onClick={()=>handleAuth("email")}>
          {authMode==="signin"?"Sign In →":"Create Account →"}
        </button>
        <div style={{textAlign:"center",fontSize:12,color:"#444",marginTop:8}}>
          {authMode==="signin"?"Don't have an account? ":"Already have an account? "}
          <span onClick={()=>setAuthMode(authMode==="signin"?"signup":"signin")} style={{color:"#c8a96e",cursor:"pointer",fontWeight:700}}>
            {authMode==="signin"?"Sign Up":"Sign In"}
          </span>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════════
  if(screen==="dashboard") return (
    <div style={T.app}>
      <style>{CSS}</style>
      <div style={T.hd}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={T.logo}>PropInspect ZA</div>
            <div style={{...T.ttl,fontSize:24}}>
              Welcome, <span style={{color:"#c8a96e"}}>{user?.name?.split(" ")[0]}</span>
            </div>
            <div style={{color:"#555",fontSize:13,marginTop:4}}>{reports.length} report{reports.length!==1?"s":""} on file</div>
          </div>
          <button onClick={()=>{setUser(null);setScreen("auth");}} style={{...T.navLink,fontSize:12,marginTop:4}}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={T.body}>
        {/* CTA */}
        <button style={{...T.btn,...T.gold,fontSize:16,padding:"18px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"center",gap:10}} onClick={startNewInspection}>
          <span style={{fontSize:20}}>＋</span> New Inspection
        </button>

        {/* Saved reports */}
        {reports.length>0&&(
          <>
            <div style={T.sec}>Recent Reports</div>
            {reports.map((r,i)=>(
              <div key={r.id} style={{...T.card,animation:`fadeUp 0.3s ease ${i*0.06}s both`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:3}}>{r.address}</div>
                    <div style={{fontSize:13,color:"#888"}}>{r.tenant} · {fmt(r.date)}</div>
                  </div>
                  <span style={{...T.badge,background:r.completed?"rgba(34,197,94,0.14)":"rgba(251,191,36,0.14)",color:r.completed?"#4ade80":"#fbbf24"}}>
                    {r.completed?"Complete":"In Progress"}
                  </span>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>openReport(r)} style={{...T.btn,...T.ghost,marginBottom:0,flex:1,padding:"10px",fontSize:13}}>
                    View Report
                  </button>
                  <button onClick={async()=>{setInsp(r);setSignatures({tenant:null,landlord:null});setPdfStatus("loading");try{await exportPDF(r,{tenant:null,landlord:null});setPdfStatus("idle");}catch{setPdfStatus("idle");}}} style={{...T.btn,...T.dim,marginBottom:0,flex:1,padding:"10px",fontSize:13}}>
                    📄 Export PDF
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {reports.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:"#333"}}>
            <div style={{fontSize:48,marginBottom:12}}>📋</div>
            <div style={{fontSize:16,fontWeight:600,color:"#555",marginBottom:6}}>No reports yet</div>
            <div style={{fontSize:13}}>Start your first inspection above</div>
          </div>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // INSPECTION SETUP + ROOM LIST
  // ════════════════════════════════════════════════════════════
  if(screen==="inspection") return (
    <div style={T.app}>
      <style>{CSS}</style>
      <div style={T.hd}>
        <button style={T.backBtn} onClick={()=>setScreen("dashboard")}>← Dashboard</button>
        {!insp?.address?(
          <>
            <div style={T.logo}>New Inspection</div>
            <div style={T.ttl}>Property <span style={{color:"#c8a96e"}}>Details</span></div>
          </>
        ):(
          <>
            <div style={T.logo}>{insp.address}</div>
            <div style={T.ttl}><span style={{color:"#c8a96e"}}>{completedIds.length}</span> / {ROOMS.length} rooms</div>
          </>
        )}
      </div>

      <div style={T.body}>
        {/* Property form if address not yet set */}
        {!insp?.address?(
          <div style={T.card}>
            <label style={T.lbl}>Property Address *</label>
            <input style={{...T.inp,...(headerErrors.address?{borderColor:"#f87171"}:{})}}
              placeholder="e.g. 14 Bree Street, Cape Town"
              value={headerDraft.address}
              onChange={e=>{setHeaderDraft(p=>({...p,address:e.target.value}));setHeaderErrors(p=>({...p,address:""}));}}/>
            {headerErrors.address&&<div style={{color:"#f87171",fontSize:12,marginTop:-8,marginBottom:8}}>{headerErrors.address}</div>}
            <label style={T.lbl}>Tenant Name *</label>
            <input style={{...T.inp,...(headerErrors.tenant?{borderColor:"#f87171"}:{})}}
              placeholder="e.g. Sipho Ndlovu"
              value={headerDraft.tenant}
              onChange={e=>{setHeaderDraft(p=>({...p,tenant:e.target.value}));setHeaderErrors(p=>({...p,tenant:""}));}}/>
            {headerErrors.tenant&&<div style={{color:"#f87171",fontSize:12,marginTop:-8,marginBottom:8}}>{headerErrors.tenant}</div>}
            <label style={T.lbl}>Inspection Date *</label>
            <input style={{...T.inp,...(headerErrors.date?{borderColor:"#f87171"}:{})}}
              type="date" value={headerDraft.date}
              onChange={e=>{setHeaderDraft(p=>({...p,date:e.target.value}));setHeaderErrors(p=>({...p,date:""}));}}/>
            {headerErrors.date&&<div style={{color:"#f87171",fontSize:12,marginTop:-8,marginBottom:8}}>{headerErrors.date}</div>}
            <button style={{...T.btn,...T.gold}} onClick={()=>{
              const errs={};
              if(!headerDraft.address.trim()) errs.address="Property address is required.";
              if(!headerDraft.tenant.trim()) errs.tenant="Tenant name is required.";
              if(!headerDraft.date) errs.date="Inspection date is required.";
              if(Object.keys(errs).length){setHeaderErrors(errs);return;}
              setHeaderErrors({});
              setInsp(p=>({...p,address:headerDraft.address,tenant:headerDraft.tenant,date:headerDraft.date}));
            }}>Begin Inspection →</button>
          </div>
        ):(
          <>
            <div style={T.prog}><div style={{...T.progFill,width:`${progress*100}%`}}/></div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:12,color:"#555",fontWeight:500}}>Tap any room — complete in any order</div>
              <button onClick={()=>{const v=!aiEnabled;setAiEnabled(v);saveAiPref(v);}}
                style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:20,border:`1px solid ${aiEnabled?"rgba(200,169,110,0.4)":"rgba(255,255,255,0.1)"}`,background:aiEnabled?"rgba(200,169,110,0.1)":"rgba(255,255,255,0.04)",color:aiEnabled?"#c8a96e":"#555",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:aiEnabled?"#c8a96e":"#444",display:"inline-block"}}/>
                AI {aiEnabled?"ON":"OFF"}
              </button>
            </div>

            {ROOMS.map((room,i)=>{
              const done=insp.rooms[room.id]?.completed;
              const d=insp.rooms[room.id]||{};
              const photoCount=(d.photos||[]).length;
              return (
                <div key={room.id} style={{...T.card,...(done?T.cardDone:{}),animation:`fadeUp 0.25s ease ${i*0.03}s both`}}
                  onClick={()=>{setActiveRoom(room.id);setScreen("room");}}>
                  <div style={{display:"flex",alignItems:"center"}}>
                    <span style={{fontSize:24,marginRight:14}}>{room.icon}</span>
                    <span style={{fontSize:15,fontWeight:700,flex:1}}>{room.label}</span>
                    {done
                      ?<span style={{...T.badge,background:"rgba(34,197,94,0.15)",color:"#4ade80"}}>✓ Done</span>
                      :<span style={{...T.badge,background:"rgba(255,255,255,0.05)",color:"#555"}}>Tap →</span>}
                  </div>
                  {done&&(
                    <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
                      {d.overallCondition&&<span style={{...T.badge,background:CCOLOR[d.overallCondition]+"22",color:CCOLOR[d.overallCondition]}}>{d.overallCondition}</span>}
                      {d.cleanliness&&<span style={{...T.badge,background:CCOLOR[d.cleanliness]+"22",color:CCOLOR[d.cleanliness]}}>{d.cleanliness}</span>}
                      {(d.flags||[]).length>0&&<span style={{...T.badge,background:"rgba(239,68,68,0.15)",color:"#f87171"}}>⚠ {d.flags.length} flag</span>}
                      {photoCount>0&&<span style={{...T.badge,background:"rgba(255,255,255,0.07)",color:"#777"}}>📷 {photoCount}</span>}
                    </div>
                  )}
                </div>
              );
            })}

            {completedIds.length>0&&(
              <button style={{...T.btn,...T.gold,marginTop:16}} onClick={saveAndGoToReport}>
                {completedIds.length===ROOMS.length?"Generate Full Report →":`Preview Report (${completedIds.length} rooms) →`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // ROOM SCREEN
  // ════════════════════════════════════════════════════════════
  const currentRoom=ROOMS.find(r=>r.id===activeRoom);
  if(screen==="room") return (
    <div style={T.app}>
      <style>{CSS}</style>
      <div style={T.hd}>
        <button style={T.backBtn} onClick={()=>{setScreen("inspection");setAnalyzing(false);}}>← Back to Rooms</button>
        <div style={T.logo}>{currentRoom?.icon} {currentRoom?.label}</div>
        <div style={{...T.ttl,fontSize:22}}>Room <span style={{color:"#c8a96e"}}>Inspection</span></div>
        {roomData.aiAnalysed&&(roomData.aiError
          ?<div style={{fontSize:11,color:"#f97316",marginTop:6,fontWeight:600,letterSpacing:"0.05em"}}>⚠ {roomData.aiErrorMsg||"AI unavailable"} · Fill manually</div>
          :<div style={{fontSize:11,color:"#c8a96e",marginTop:6,fontWeight:600,letterSpacing:"0.05em"}}>✦ AI-FILLED · Review &amp; Confirm</div>
        )}
      </div>

      <div style={T.body}>
        {/* Room navigation */}
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:4,WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
          {ROOMS.map(r=>{
            const done=insp?.rooms?.[r.id]?.completed;
            const active=r.id===activeRoom;
            return (
              <button key={r.id} onClick={()=>{setRoomCompleteErr("");setActiveRoom(r.id);}}
                style={{flexShrink:0,padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:700,fontFamily:"inherit",cursor:"pointer",whiteSpace:"nowrap",
                  background: active?"#c8a96e":done?"rgba(34,197,94,0.15)":"rgba(255,255,255,0.06)",
                  color: active?"#0a0a0f":done?"#4ade80":"#888",
                  border: active?"none":done?"1px solid rgba(34,197,94,0.3)":"1px solid rgba(255,255,255,0.1)"}}>
                {r.icon} {r.label}
              </button>
            );
          })}
        </div>

        {analyzing&&(
          <div style={T.aiBar}><div style={T.spin}/>Analysing room with Claude AI…</div>
        )}

        {/* Photos */}
        <PhotoStrip
          photos={roomData.photos||[]}
          onAdd={f=>processPhoto(f,true)}
          onUpload={f=>processPhoto(f,false)}
          onRemove={removePhoto}
        />

        {/* Flags */}
        {(roomData.flags||[]).length>0&&(
          <>{<div style={T.sec}>⚠ Flags Detected</div>}{roomData.flags.map((f,i)=><div key={i} style={T.flagCard}>⚠ {f}</div>)}</>
        )}

        {/* Overall condition */}
        <div style={T.sec}>Overall Room Condition</div>
        <div style={T.chips}>
          {COND.map(opt=>{
            const sel=roomData.overallCondition===opt;
            return <div key={opt} style={{...T.chip,...(sel?{background:CCOLOR[opt],color:"#0a0a0f",border:"none",fontWeight:800}:{})}} onClick={()=>updateRoomField("overallCondition",opt)}>{opt}</div>;
          })}
        </div>

        {/* Cleanliness */}
        <div style={T.sec}>Cleanliness</div>
        <div style={T.chips}>
          {CLEAN.map(opt=>{
            const sel=roomData.cleanliness===opt;
            return <div key={opt} style={{...T.chip,...(sel?{background:CCOLOR[opt],color:"#0a0a0f",border:"none",fontWeight:800}:{})}} onClick={()=>updateRoomField("cleanliness",opt)}>{opt}</div>;
          })}
        </div>

        {/* Items with per-item condition + defects */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",...{marginTop:26,marginBottom:12}}}>
          <div style={{fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",color:"#c8a96e",fontWeight:800}}>Items Observed</div>
          <button onClick={addItem} style={{padding:"7px 14px",borderRadius:20,background:"rgba(200,169,110,0.12)",border:"1px solid rgba(200,169,110,0.3)",color:"#c8a96e",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            + Add Item
          </button>
        </div>
        {(roomData.items||[]).map((item,i)=>(
          <ItemRow key={item.id||i} item={item} onChange={v=>updateItem(i,v)} onRemove={()=>removeItem(i)}/>
        ))}
        {(roomData.items||[]).length===0&&(
          <div style={{textAlign:"center",padding:"18px",color:"#444",fontSize:13,border:"1px dashed rgba(255,255,255,0.1)",borderRadius:12,marginBottom:12}}>
            No items yet — take a photo for AI auto-fill, or tap "+ Add Item"
          </div>
        )}

        {/* Notes */}
        <div style={T.sec}>General Notes</div>
        <textarea style={T.ta} placeholder="Additional observations…" value={roomData.generalNotes||""} onChange={e=>updateRoomField("generalNotes",e.target.value)}/>

        {roomCompleteErr&&(
          <div style={{background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.35)",borderRadius:10,padding:"10px 14px",color:"#f87171",fontSize:13,marginTop:12,marginBottom:4}}>
            ⚠ {roomCompleteErr}
          </div>
        )}
        <button style={{...T.btn,...T.gold,marginTop:8}} onClick={markRoomComplete}>✓ Mark Room Complete</button>
        <button style={{...T.btn,...T.ghost}} onClick={()=>{setRoomCompleteErr("");setScreen("inspection");}}>Save &amp; Return to Rooms</button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // REPORT SCREEN
  // ════════════════════════════════════════════════════════════
  if(screen==="report") return (
    <div style={T.app}>
      <style>{CSS}</style>
      <div style={T.hd}>
        <div style={{display:"flex",gap:10,marginBottom:22,flexWrap:"wrap"}}>
          <button style={T.backBtn} onClick={()=>setScreen(insp?.completed?"dashboard":"inspection")}>
            ← {insp?.completed?"Dashboard":"Back to Rooms"}
          </button>
          <button style={T.navLink} onClick={()=>setScreen("dashboard")}>🏠 Dashboard</button>
        </div>
        <div style={T.logo}>Inspection Report</div>
        <div style={{...T.ttl,fontSize:22}}>{insp?.address}</div>
      </div>

      <div style={T.body}>
        {/* Summary card */}
        <div style={T.rSec}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div><div style={{fontSize:11,color:"#666",marginBottom:2}}>Tenant</div><div style={{fontSize:15,fontWeight:700}}>{insp?.tenant||"—"}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#666",marginBottom:2}}>Date</div><div style={{fontSize:15,fontWeight:700}}>{insp?.date}</div></div>
          </div>
          <div style={{fontSize:11,color:"#555"}}>{completedIds.length} of {ROOMS.length} rooms inspected · {insp?.inspector}</div>
        </div>

        {/* Condition summary */}
        <div style={T.sec}>Summary</div>
        <div style={T.chips}>
          {COND.map(c=>{
            const cnt=Object.values(insp?.rooms||{}).filter(r=>r?.overallCondition===c).length;
            if(!cnt) return null;
            return <div key={c} style={{...T.chip,background:CCOLOR[c]+"18",color:CCOLOR[c],border:"none"}}>{cnt} × {c}</div>;
          })}
        </div>

        {/* Flags */}
        {Object.values(insp?.rooms||{}).some(r=>(r?.flags||[]).length>0)&&(
          <>
            <div style={T.sec}>⚠ Items Requiring Attention</div>
            {ROOMS.filter(r=>(insp.rooms[r.id]?.flags||[]).length>0).map(room=>(
              <div key={room.id} style={T.flagCard}><strong>{room.label}:</strong> {insp.rooms[room.id].flags.join(", ")}</div>
            ))}
          </>
        )}

        {/* Room by room */}
        <div style={T.sec}>Room by Room</div>
        {ROOMS.filter(r=>insp?.rooms[r.id]?.completed).map((room,i)=>{
          const d=insp.rooms[room.id];
          const items=(d.items||[]).filter(it=>it.name?.trim());
          return (
            <div key={room.id} style={{...T.rSec,cursor:"pointer",animation:`fadeUp 0.28s ease ${i*0.04}s both`}}
              onClick={()=>{setActiveRoom(room.id);setScreen("room");}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:700,fontSize:15}}>{room.icon} {room.label}</div>
                <div style={{display:"flex",gap:6}}>
                  {(d.photos||[]).length>0&&<span style={{...T.badge,background:"rgba(255,255,255,0.07)",color:"#666"}}>📷{(d.photos||[]).length}</span>}
                  {d.overallCondition&&<span style={{...T.badge,background:CCOLOR[d.overallCondition]+"22",color:CCOLOR[d.overallCondition]}}>{d.overallCondition}</span>}
                </div>
              </div>
              {d.cleanliness&&<div style={{fontSize:12,color:"#666",marginBottom:6}}>Cleanliness: {d.cleanliness}</div>}
              {items.length>0&&(
                <div style={{marginBottom:6}}>
                  {items.map((it,j)=>(
                    <div key={j} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:13,color:"#ccc",flex:1}}>{it.name}</span>
                      <span style={{...T.badge,background:CCOLOR[it.condition]+"22",color:CCOLOR[it.condition],fontSize:10}}>{it.condition}</span>
                      {it.defects&&<span style={{fontSize:11,color:"#f97316"}}>⚠ {it.defects}</span>}
                    </div>
                  ))}
                </div>
              )}
              {d.generalNotes&&<div style={{fontSize:13,color:"#666",lineHeight:1.55,fontStyle:"italic"}}>{d.generalNotes}</div>}
              {d.aiAnalysed&&<div style={{fontSize:10,color:"#c8a96e",marginTop:6,fontWeight:600}}>✦ AI-assisted</div>}
            </div>
          );
        })}

        {/* Signatures */}
        <div style={T.sec}>Signatures</div>
        <div style={{fontSize:12,color:"#555",marginBottom:16}}>Signatures are embedded in the exported PDF</div>
        {["tenant","landlord"].map(role=>{
          const lbl=role==="tenant"?"Tenant":"Landlord / Agent";
          const sig=signatures[role];
          return (
            <div key={role} onClick={()=>setSigOpen(role)}
              style={{...(sig?{...T.rSec,border:"1px solid rgba(200,169,110,0.3)",background:"rgba(200,169,110,0.05)"}:T.rSec),cursor:"pointer",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,color:"#777",marginBottom:5,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{lbl}</div>
                  {sig
                    ?<><img src={sig.dataUrl} style={{height:40,maxWidth:180,display:"block"}} alt="sig"/><div style={{fontSize:11,color:"#c8a96e",marginTop:5,fontWeight:600}}>✓ {sig.name}</div></>
                    :<div style={{fontSize:14,color:"#555",fontWeight:600}}>Tap to sign ✍️</div>}
                </div>
                {sig&&<button onClick={e=>{e.stopPropagation();setSignatures(s=>({...s,[role]:null}));}} style={{background:"none",border:"none",color:"#555",fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:"4px 8px"}}>Clear</button>}
              </div>
            </div>
          );
        })}

        {/* Save Report */}
        {saveMsg&&(
          <div style={{padding:"12px 16px",background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:12,color:"#4ade80",fontSize:14,fontWeight:600,marginTop:16,textAlign:"center"}}>
            ✓ {saveMsg}
          </div>
        )}
        <button
          style={{...T.btn,...T.gold,marginTop:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
          onClick={handleSaveReport}
        >
          💾 Save Report
        </button>

        {/* PDF Export */}
        <button
          style={{...T.btn,...(pdfStatus==="done"?{...T.gold,background:"#22c55e"}:T.ghost),marginTop:0,display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:pdfStatus==="loading"?0.7:1,cursor:pdfStatus==="loading"?"not-allowed":"pointer"}}
          onClick={pdfStatus==="idle"||pdfStatus==="error"?handleExportPDF:undefined}
          disabled={pdfStatus==="loading"}
        >
          {pdfStatus==="idle"&&<>📄 Export PDF Report</>}
          {pdfStatus==="loading"&&<><div style={{...T.spin,width:17,height:17}}/>Building PDF…</>}
          {pdfStatus==="done"&&<>✓ PDF Downloaded!</>}
          {pdfStatus==="error"&&<>⚠ Failed — Tap to Retry</>}
        </button>

        <button style={{...T.btn,...T.ghost}}>✉️ Email Report</button>
        <button style={{...T.btn,...T.dim}} onClick={()=>setScreen("dashboard")}>← Back to Dashboard</button>
      </div>

      {sigOpen&&(
        <SigPad
          label={sigOpen==="tenant"?"Tenant":"Landlord / Agent"}
          onSave={(url,n)=>{setSignatures(s=>({...s,[sigOpen]:{dataUrl:url,name:n}}));setSigOpen(null);}}
          onCancel={()=>setSigOpen(null)}
        />
      )}
    </div>
  );

  return null;
}
