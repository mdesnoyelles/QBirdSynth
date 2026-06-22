import{SynthEngine}from '../engine/synth-engine.js';
import pData from '../presets.json' assert{type:'json'};

export class QBirdSynthApp{
  constructor(el){
    this.el=el;this.eng=new SynthEngine();this.mouseDown=false;this.curNote=null;
    this.seqPlay=false;this.seqStep=0;this.bpm=120;this.seqT=null;
    this.seq={};['Kick','Snare','HiHat','Bass','Lead','Pad'].forEach(r=>{this.seq[r]=Array(16).fill(false)});
    this._html();this._bind();
  }

  async start(){
    await this.eng.init();this.load(pData.presets[8]);
    setTimeout(()=>{const s=this.el.querySelector('.splash');if(s)s.classList.add('hide')},1500);
    this.eng.connectMIDI();
  }

  load(p){
    this.eng.loadPreset(p);
    for(const[k,v]of Object.entries(p.params)){
      const s=this.el.querySelector(`[data-p="${k}"]`);
      if(s){s.value=v;const d=s.parentElement.querySelector('.sld-v');if(d)d.textContent=this._f(k,v)}}
    this.el.querySelectorAll('.p-card').forEach(c=>c.classList.toggle('active',c.dataset.name===p.name));
  }

  _f(p,v){const F={cutoff:v=>v>=1e3?`${(v/1e3).toFixed(1)}k`:`${v.toFixed(0)}`,volume:v=>`${(v*100).toFixed(0)}%`,reverb_mix:v=>`${(v*100).toFixed(0)}%`,delay_mix:v=>`${(v*100).toFixed(0)}%`,delay_time:v=>`${(v*1e3).toFixed(0)}ms`,attack:v=>`${(v*1e3).toFixed(0)}ms`,decay:v=>`${(v*1e3).toFixed(0)}ms`,release:v=>`${(v*1e3).toFixed(0)}ms`,sustain:v=>`${(v*100).toFixed(0)}%`,lfo_rate:v=>`${v.toFixed(1)}Hz`,voices:v=>`${Math.round(v)}`,detune:v=>`${v.toFixed(0)}\u00A2`,resonance:v=>`${(v*100).toFixed(0)}%`};return(F[p]||((v=+v)=>v.toFixed(2)))(v)}

  _sl(p,l,mn,mx,st,v){return`<div class="sld"><span class="sld-l">${l}</span><input type="range" class="sld-i" data-p="${p}" min="${mn}" max="${mx}" step="${st}" value="${v}"><span class="sld-v">${this._f(p,v)}</span></div>`}

  _n2m(n,o){const N={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};return(o+1)*12+N[n]}

  _html(){
    this.el.innerHTML=`<div class="scan">
      <div class="splash"><div class="splash-t">QBirdSynth</div><div class="splash-s">Initializing Engine...</div></div>
      <div class="fc">
        <header class="hdr">
          <div class="hdr-sec"><span class="logo">QBirdSynth</span></div>
          <div class="hdr-sec">
            <button class="btn btn-o" data-act="demo">\u25B6 Demo</button>
            <button class="btn btn-rec" data-act="rec" title="Record"></button>
            <button class="btn" data-act="panic">\u23F9 Panic</button>
          </div>
        </header>
        <div class="main">
          <div class="tabs">
            <button class="tab active" data-t="synth">Synth</button>
            <button class="tab" data-t="fx">FX</button>
            <button class="tab" data-t="seq">Sequencer</button>
            <button class="tab" data-t="presets">Presets</button>
          </div>
          <div class="panel-wrap" data-pn="synth">
            <div class="pnl"><div class="wf-box"><canvas class="wf-c" id="wf"></canvas></div></div>
            <div class="pnl"><div class="pnl-t">Oscillator</div>
              <div class="fr gs" style="margin-bottom:8px;justify-content:center;flex-wrap:wrap">
                <button class="btn btn-o active" data-w="0">Saw</button>
                <button class="btn btn-o" data-w="1">Square</button>
                <button class="btn btn-o" data-w="2">Triangle</button>
                <button class="btn btn-o" data-w="3">Sine</button>
              </div>
              <div class="fr gs" style="margin-bottom:6px;justify-content:center">
                <button class="btn" data-sub="0">Sub Off</button><button class="btn active" data-sub="1">Sub On</button>
              </div>
              ${this._sl('voices','Voices',1,8,1,4)}
              ${this._sl('detune','Detune',0,50,1,10)}
              ${this._sl('detune2','Spread',0,100,1,20)}
              ${this._sl('noise_mix','Noise',0,0.3,0.01,0)}
            </div>
            <div class="pnl"><div class="pnl-t">ADSR Envelope</div>
              ${this._sl('attack','Attack',0.001,3,0.001,0.05)}
              ${this._sl('decay','Decay',0.01,3,0.01,0.3)}
              ${this._sl('sustain','Sustain',0,1,0.01,0.7)}
              ${this._sl('release','Release',0.01,5,0.01,0.5)}
            </div>
            <div class="pnl"><div class="pnl-t">Filter</div>
              ${this._sl('cutoff','Cutoff',100,15000,10,4000)}
              ${this._sl('resonance','Resonance',0,1,0.01,0.3)}
            </div>
            <div class="pnl"><div class="pnl-t">LFO</div>
              ${this._sl('lfo_rate','Rate',0.01,20,0.1,1)}
              ${this._sl('lfo_depth','Depth',0,0.1,0.001,0.02)}
            </div>
          </div>
          <div class="panel-wrap" data-pn="fx" hidden>
            <div class="pnl"><div class="pnl-t">Reverb</div>
              ${this._sl('reverb_mix','Mix',0,1,0.01,0.25)}
              ${this._sl('reverb_size','Size',0,1,0.01,0.7)}
            </div>
            <div class="pnl"><div class="pnl-t">Delay</div>
              ${this._sl('delay_mix','Mix',0,1,0.01,0.1)}
              ${this._sl('delay_time','Time',0.01,2,0.01,0.375)}
              ${this._sl('delay_feedback','Feedback',0,0.9,0.01,0.3)}
            </div>
            <div class="pnl"><div class="pnl-t">Master</div>
              ${this._sl('volume','Volume',0,1,0.01,0.6)}
            </div>
            <div class="pnl"><div class="pnl-t">XY Pad (Filter \u00D7 LFO)</div>
              <div class="xy" data-xy="1"><div class="xy-g"></div><div class="xy-d"></div><span class="xy-lx">Cutoff</span><span class="xy-ly">LFO</span></div>
            </div>
          </div>
          <div class="panel-wrap" data-pn="seq" hidden>
            <div class="pnl"><div class="pnl-t">Step Sequencer</div>
              <div class="fr gs" style="margin-bottom:10px">
                <button class="btn btn-o" data-act="seq-play">\u25B6 Play</button>
                <button class="btn" data-act="seq-stop">\u23F9 Stop</button>
                <button class="btn" data-act="seq-clear">Clear</button>
                ${this._sl('seq-bpm','BPM',60,200,1,120)}
              </div>
              <div class="seq-g" id="sg"></div>
            </div>
          </div>
          <div class="panel-wrap" data-pn="presets" hidden>
            <div class="pnl"><div class="pnl-t">Presets</div>
              <div class="p-grid">${pData.presets.map(p=>`<div class="p-card" data-name="${p.name}" style="--pc:${p.color}"><div class="p-name">${p.name}</div><div class="p-cat">${p.category}</div></div>`).join('')}</div>
            </div>
          </div>
        </div>
        <div class="kb-wrap"><div class="kb" id="kb"></div></div>
      </div>
    </div>`;
    this._mkKb();this._mkSeq();
  }

  _mkKb(){
    const kb=this.el.querySelector('#kb');if(!kb)return;let h='';
    for(let o=3;o<5;o++)['C','D','E','F','G','A','B'].forEach(n=>{const m=this._n2m(n,o);h+=`<div class="kw" data-n="${m}"><span class="kb-l">${n}${o}</span></div>`});
    const bk={0:'C#',1:'D#',3:'F#',4:'G#',5:'A#'};
    for(let o=3;o<5;o++)for(const[s,n]of Object.entries(bk)){const m=this._n2m(n,o);const wi=+s+(o-3)*7;h+=`<div class="kbk" data-n="${m}" style="left:${(wi+1)*28-9}px"></div>`}
    kb.innerHTML=h;
  }

  _mkSeq(){
    const g=this.el.querySelector('#sg');if(!g)return;let h='';
    ['Kick','Snare','HiHat','Bass','Lead','Pad'].forEach(r=>{h+=`<div class="seq-l">${r}</div>`;for(let s=0;s<16;s++)h+=`<div class="seq-s" data-s="${r}:${s}"></div>`});
    g.innerHTML=h;
  }

  _bind(){
    const e=this.el;
    // Tabs
    e.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{e.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');e.querySelectorAll('.panel-wrap').forEach(p=>p.hidden=p.dataset.pn!==t.dataset.t)}));
    // Sliders
    e.querySelectorAll('.sld-i[data-p]').forEach(s=>s.addEventListener('input',()=>{const p=s.dataset.p,v=parseFloat(s.value);if(p==='seq-bpm'){this.bpm=v;return}this.eng.setParam(p,v);const d=s.parentElement.querySelector('.sld-v');if(d)d.textContent=this._f(p,v)}));
    // Wave type
    e.querySelectorAll('[data-w]').forEach(b=>b.addEventListener('click',()=>{e.querySelectorAll('[data-w]').forEach(x=>x.classList.remove('active'));b.classList.add('active');this.eng.setParam('wave_type',+b.dataset.w)}));
    // Sub osc
    e.querySelectorAll('[data-sub]').forEach(b=>b.addEventListener('click',()=>{e.querySelectorAll('[data-sub]').forEach(x=>x.classList.remove('active'));b.classList.add('active');this.eng.setParam('sub_osc',+b.dataset.sub)}));
    // Keyboard
    const kb=e.querySelector('#kb');
    const kh=ev=>{const k=ev.target.closest('[data-n]');if(!k)return;const n=+k.dataset.n;
      if(ev.type==='pointerdown'){k.classList.add('on');this.eng.noteOn(n,.7);this.curNote=n;this.mouseDown=true}
      else{k.classList.remove('on');if(this.curNote===n){this.eng.noteOff(n);this.curNote=null;this.mouseDown=false}}};
    kb.addEventListener('pointerdown',kh);kb.addEventListener('pointerup',kh);kb.addEventListener('pointerleave',kh);
    // Computer keyboard
    const km={a:60,w:61,s:62,e:63,d:64,f:65,t:66,g:67,y:68,h:69,u:70,j:71,k:72,o:73,l:74};
    const pr=new Set();
    document.addEventListener('keydown',ev=>{if(ev.repeat||ev.target.matches('input,button,textarea'))return;const n=km[ev.key.toLowerCase()];if(n&&!pr.has(n)){pr.add(n);this.eng.noteOn(n,.7);const k=kb.querySelector(`[data-n="${n}"]`);if(k)k.classList.add('on')}});
    document.addEventListener('keyup',ev=>{const n=km[ev.key.toLowerCase()];if(n&&pr.has(n)){pr.delete(n);this.eng.noteOff(n);const k=kb.querySelector(`[data-n="${n}"]`);if(k)k.classList.remove('on')}});
    // XY pad
    const xy=e.querySelector('.xy');
    if(xy){const dot=xy.querySelector('.xy-d');const hX=ev=>{const r=xy.getBoundingClientRect();const x=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));const y=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));dot.style.left=`${x*100}%`;dot.style.top=`${y*100}%`;this.eng.setParam('cutoff',100+x*14900);this.eng.setParam('lfo_depth',(1-y)*0.1)};
      xy.addEventListener('pointerdown',ev=>{this.mouseDown=true;hX(ev)});
      xy.addEventListener('pointermove',ev=>{if(this.mouseDown)hX(ev)});
      xy.addEventListener('pointerup',()=>{this.mouseDown=false})}
    // Presets
    e.querySelectorAll('.p-card').forEach(c=>c.addEventListener('click',()=>{const p=pData.presets.find(x=>x.name===c.dataset.name);if(p)this.load(p)}));
    // Sequencer steps
    e.querySelectorAll('.seq-s').forEach(s=>s.addEventListener('click',()=>{const[r,c]=s.dataset.s.split(':');this.seq[r][+c]=!s.classList.contains('on');s.classList.toggle('on')}));
    // Actions
    e.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{switch(b.dataset.act){
      case'rec':if(this.eng.isRecording){this.eng.stopRecording();b.classList.remove('on')}else{this.eng.startRecording();b.classList.add('on')}break;
      case'panic':this.eng.allNotesOff();break;
      case'seq-play':this._seqStart();break;
      case'seq-stop':this._seqStop();break;
      case'seq-clear':this._seqClear();break;
      case'demo':this._demo();break}}));
    // Waveform
    this.eng.onData=d=>this._draw(d);
    window.addEventListener('resize',()=>this._rsz());setTimeout(()=>this._rsz(),100);
  }

  _draw(data){
    const c=this.el.querySelector('#wf');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height;
    ctx.fillStyle='#0A0A0A';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#1E1E1E';ctx.lineWidth=1;
    for(let i=1;i<4;i++){const y=h/4*i;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    const g=ctx.createLinearGradient(0,0,w,0);g.addColorStop(0,'#7B1FA2');g.addColorStop(.5,'#FF6D00');g.addColorStop(1,'#CE93D8');
    ctx.strokeStyle=g;ctx.lineWidth=2;ctx.beginPath();
    const sw=w/data.length;let x=0;
    for(let i=0;i<data.length;i++){const y=data[i]/128*h/2;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);x+=sw}
    ctx.stroke();ctx.globalAlpha=.3;ctx.lineWidth=6;ctx.stroke();ctx.globalAlpha=1;
  }

  _rsz(){const c=this.el.querySelector('#wf');if(!c)return;const p=c.parentElement;c.width=p.clientWidth;c.height=p.clientHeight}

  _seqStart(){if(this.seqPlay)return;this.seqPlay=true;this.seqStep=0;
    const tick=()=>{if(!this.seqPlay)return;this.el.querySelectorAll('.seq-s').forEach(s=>s.classList.remove('cur'));
      this.el.querySelectorAll(`[data-s$=":${this.seqStep}"]`).forEach(s=>{s.classList.add('cur');if(s.classList.contains('on')){const[r]=s.dataset.s.split(':');this._seqPlay(r)}});
      this.seqStep=(this.seqStep+1)%16;this.seqT=setTimeout(tick,60/this.bpm/4*1e3)};tick()}
  _seqStop(){this.seqPlay=false;clearTimeout(this.seqT);this.el.querySelectorAll('.seq-s').forEach(s=>s.classList.remove('cur'))}
  _seqClear(){Object.values(this.seq).forEach(a=>a.fill(false));this.el.querySelectorAll('.seq-s').forEach(s=>s.classList.remove('on'))}
  _seqPlay(r){const n={Kick:36,Snare:40,HiHat:42,Bass:36,Lead:60,Pad:48}[r]||60;this.eng.noteOn(n,.6);setTimeout(()=>this.eng.noteOff(n),200)}

  async _demo(){const ns=[60,64,67,72,67,64,60,55,60,64,67,72,76,72,67,64];for(const n of ns){this.eng.noteOn(n,.6);await new Promise(r=>setTimeout(r,250));this.eng.noteOff(n);await new Promise(r=>setTimeout(r,50))}}
}
