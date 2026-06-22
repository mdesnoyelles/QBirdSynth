import{SynthEngine}from '../engine/synth-engine.js';
import pData from '../presets.json' assert{type:'json'};

export class App{
  constructor(el){
    this.el=el;this.eng=new SynthEngine();this.mouseDown=false;this.curNote=null;
    this.seqPlay=false;this.seqStep=0;this.bpm=120;this.seqT=null;
    this.seq={};['Kick','Snare','HiHat','Bass','Lead','Pad'].forEach(function(r){this.seq[r]=Array(16).fill(false)}.bind(this));
    this._html();this._bind();
  }

  async start(){
    await this.eng.init();this.load(pData.presets[8]);
    var self=this;
    setTimeout(function(){var s=self.el.querySelector('.splash');if(s)s.classList.add('hide')},1500);
    this.eng.connectMIDI();
  }

  load(p){
    this.eng.loadPreset(p);
    for(const[k,v]of Object.entries(p.params)){
      const s=this.el.querySelector('[data-p="'+k+'"]');
      if(s){s.value=v;const d=s.parentElement.querySelector('.sld-v');if(d)d.textContent=this._f(k,v)}}
    this.el.querySelectorAll('.p-card').forEach(function(c){c.classList.toggle('active',c.dataset.name===p.name)});
  }

  _f(p,v){
    var F={
      cutoff:function(v){return v>=1e3?(v/1e3).toFixed(1)+'k':v.toFixed(0)},
      volume:function(v){return(v*100).toFixed(0)+'%'},
      reverb_mix:function(v){return(v*100).toFixed(0)+'%'},
      delay_mix:function(v){return(v*100).toFixed(0)+'%'},
      delay_time:function(v){return(v*1e3).toFixed(0)+'ms'},
      attack:function(v){return(v*1e3).toFixed(0)+'ms'},
      decay:function(v){return(v*1e3).toFixed(0)+'ms'},
      release:function(v){return(v*1e3).toFixed(0)+'ms'},
      sustain:function(v){return(v*100).toFixed(0)+'%'},
      lfo_rate:function(v){return v.toFixed(1)+'Hz'},
      voices:function(v){return Math.round(v)+''},
      detune:function(v){return v.toFixed(0)+'c'},
      resonance:function(v){return(v*100).toFixed(0)+'%'}
    };
    return F[p]?F[p](v):(+v).toFixed(2);
  }

  _sl(p,l,mn,mx,st,v){
    return '<div class="sld"><span class="sld-l">'+l+'</span>'+
      '<input type="range" class="sld-i" data-p="'+p+'" min="'+mn+'" max="'+mx+'" step="'+st+'" value="'+v+'">'+
      '<span class="sld-v">'+this._f(p,v)+'</span></div>';
  }

  _n2m(n,o){var N={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};return(o+1)*12+N[n]}

  _html(){
    this.el.innerHTML='<div class="scan">'+
      '<div class="splash"><img src="assets/QBirdSynth_Logo_Txt.svg" alt="QBirdSynth" class="splash-logo"><div class="splash-s">Initializing Engine...</div></div>'+
      '<div class="fc">'+
        '<header class="hdr">'+
          '<div class="hdr-sec">'+'<img src="assets/QBirdSynth_Logo.svg" alt="QBirdSynth" class="logo-img">'+'<span class="logo">QBirdSynth</span>'+'</div>'+
          '<div class="hdr-sec">'+
            '<button class="btn btn-o" data-act="demo">Demo</button>'+
            '<button class="btn btn-rec" data-act="rec" title="Record"></button>'+
            '<button class="btn" data-act="panic">Panic</button>'+
          '</div>'+
        '</header>'+
        '<div class="main">'+
          '<div class="tabs">'+
            '<button class="tab active" data-t="synth">Synth</button>'+
            '<button class="tab" data-t="fx">FX</button>'+
            '<button class="tab" data-t="seq">Sequencer</button>'+
            '<button class="tab" data-t="presets">Presets</button>'+
          '</div>'+
          '<div class="panel-wrap" data-pn="synth">'+
            '<div class="pnl"><div class="wf-box"><canvas class="wf-c" id="wf"></canvas></div></div>'+
            '<div class="pnl"><div class="pnl-t">Oscillator</div>'+
              '<div class="fr gs" style="margin-bottom:8px;justify-content:center;flex-wrap:wrap">'+
                '<button class="btn btn-o active" data-w="0">Saw</button>'+
                '<button class="btn btn-o" data-w="1">Square</button>'+
                '<button class="btn btn-o" data-w="2">Triangle</button>'+
                '<button class="btn btn-o" data-w="3">Sine</button>'+
              '</div>'+
              '<div class="fr gs" style="margin-bottom:6px;justify-content:center">'+
                '<button class="btn" data-sub="0">Sub Off</button>'+
                '<button class="btn active" data-sub="1">Sub On</button>'+
              '</div>'+
              this._sl('voices','Voices',1,8,1,4)+
              this._sl('detune','Detune',0,50,1,10)+
              this._sl('detune2','Spread',0,100,1,20)+
              this._sl('noise_mix','Noise',0,0.3,0.01,0)+
            '</div>'+
            '<div class="pnl"><div class="pnl-t">ADSR Envelope</div>'+
              this._sl('attack','Attack',0.001,3,0.001,0.05)+
              this._sl('decay','Decay',0.01,3,0.01,0.3)+
              this._sl('sustain','Sustain',0,1,0.01,0.7)+
              this._sl('release','Release',0.01,5,0.01,0.5)+
            '</div>'+
            '<div class="pnl"><div class="pnl-t">Filter</div>'+
              this._sl('cutoff','Cutoff',100,15000,10,4000)+
              this._sl('resonance','Resonance',0,1,0.01,0.3)+
            '</div>'+
            '<div class="pnl"><div class="pnl-t">LFO</div>'+
              this._sl('lfo_rate','Rate',0.01,20,0.1,1)+
              this._sl('lfo_depth','Depth',0,0.1,0.001,0.02)+
            '</div>'+
          '</div>'+
          '<div class="panel-wrap" data-pn="fx" hidden>'+
            '<div class="pnl"><div class="pnl-t">Reverb</div>'+
              this._sl('reverb_mix','Mix',0,1,0.01,0.25)+
              this._sl('reverb_size','Size',0,1,0.01,0.7)+
            '</div>'+
            '<div class="pnl"><div class="pnl-t">Delay</div>'+
              this._sl('delay_mix','Mix',0,1,0.01,0.1)+
              this._sl('delay_time','Time',0.01,2,0.01,0.375)+
              this._sl('delay_feedback','Feedback',0,0.9,0.01,0.3)+
            '</div>'+
            '<div class="pnl"><div class="pnl-t">Master</div>'+
              this._sl('volume','Volume',0,1,0.01,0.6)+
            '</div>'+
            '<div class="pnl"><div class="pnl-t">XY Pad (Filter x LFO)</div>'+
              '<div class="xy" data-xy="1"><div class="xy-g"></div><div class="xy-d"></div><span class="xy-lx">Cutoff</span><span class="xy-ly">LFO</span></div>'+
            '</div>'+
          '</div>'+
          '<div class="panel-wrap" data-pn="seq" hidden>'+
            '<div class="pnl"><div class="pnl-t">Step Sequencer</div>'+
              '<div class="fr gs" style="margin-bottom:10px">'+
                '<button class="btn btn-o" data-act="seq-play">Play</button>'+
                '<button class="btn" data-act="seq-stop">Stop</button>'+
                '<button class="btn" data-act="seq-clear">Clear</button>'+
                this._sl('seq-bpm','BPM',60,200,1,120)+
              '</div>'+
              '<div class="seq-g" id="sg"></div>'+
            '</div>'+
          '</div>'+
          '<div class="panel-wrap" data-pn="presets" hidden>'+
            '<div class="pnl"><div class="pnl-t">Presets</div>'+
              '<div class="p-grid" id="pgrid"></div>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="kb-wrap"><div class="kb" id="kb"></div></div>'+
      '</div>'+
    '</div>';
    this._mkKb();this._mkSeq();this._mkPresets();
  }

  _mkKb(){
    var kb=this.el.querySelector('#kb');if(!kb)return;var h='';
    var self=this;
    for(var o=3;o<5;o++){['C','D','E','F','G','A','B'].forEach(function(n){
      var m=self._n2m(n,o);h+='<div class="kw" data-n="'+m+'"><span class="kb-l">'+n+o+'</span></div>';
    });}
    var bk={0:'C#',1:'D#',3:'F#',4:'G#',5:'A#'};
    for(var o=3;o<5;o++){for(var s in bk){var n=bk[s];var m=this._n2m(n,o);var wi=+s+(o-3)*7;
      h+='<div class="kbk" data-n="'+m+'" style="left:'+((wi+1)*28-9)+'px"></div>';}}
    kb.innerHTML=h;
  }

  _mkSeq(){
    var g=this.el.querySelector('#sg');if(!g)return;var h='';
    ['Kick','Snare','HiHat','Bass','Lead','Pad'].forEach(function(r){
      h+='<div class="seq-l">'+r+'</div>';
      for(var s=0;s<16;s++)h+='<div class="seq-s" data-s="'+r+':'+s+'"></div>';
    });
    g.innerHTML=h;
  }

  _mkPresets(){
    var grid=this.el.querySelector('#pgrid');if(!grid)return;var h='';
    pData.presets.forEach(function(p){
      h+='<div class="p-card" data-name="'+p.name+'" style="--pc:'+p.color+'"><div class="p-name">'+p.name+'</div><div class="p-cat">'+p.category+'</div></div>';
    });
    grid.innerHTML=h;
    var self=this;
    grid.querySelectorAll('.p-card').forEach(function(c){
      c.addEventListener('click',function(){
        var p=pData.presets.find(function(x){return x.name===c.dataset.name});
        if(p)self.load(p);
      });
    });
  }

  _bind(){
    var e=this.el;var self=this;

    e.querySelectorAll('.tab').forEach(function(t){
      t.addEventListener('click',function(){
        e.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});
        t.classList.add('active');
        e.querySelectorAll('.panel-wrap').forEach(function(p){p.hidden=p.dataset.pn!==t.dataset.t});
      });
    });

    e.querySelectorAll('.sld-i[data-p]').forEach(function(s){
      s.addEventListener('input',function(){
        var p=s.dataset.p;var v=parseFloat(s.value);
        if(p==='seq-bpm'){self.bpm=v;return}
        self.eng.setParam(p,v);
        var d=s.parentElement.querySelector('.sld-v');
        if(d)d.textContent=self._f(p,v);
      });
    });

    e.querySelectorAll('[data-w]').forEach(function(b){
      b.addEventListener('click',function(){
        e.querySelectorAll('[data-w]').forEach(function(x){x.classList.remove('active')});
        b.classList.add('active');
        self.eng.setParam('wave_type',+b.dataset.w);
      });
    });

    e.querySelectorAll('[data-sub]').forEach(function(b){
      b.addEventListener('click',function(){
        e.querySelectorAll('[data-sub]').forEach(function(x){x.classList.remove('active')});
        b.classList.add('active');
        self.eng.setParam('sub_osc',+b.dataset.sub);
      });
    });

    var kb=e.querySelector('#kb');
    var kh=function(ev){
      var k=ev.target.closest('[data-n]');if(!k)return;var n=+k.dataset.n;
      if(ev.type==='pointerdown'){k.classList.add('on');self.eng.noteOn(n,.7);self.curNote=n;self.mouseDown=true}
      else{k.classList.remove('on');if(self.curNote===n){self.eng.noteOff(n);self.curNote=null;self.mouseDown=false}}
    };
    kb.addEventListener('pointerdown',kh);
    kb.addEventListener('pointerup',kh);
    kb.addEventListener('pointerleave',kh);

    var km={a:60,w:61,s:62,e:63,d:64,f:65,t:66,g:67,y:68,h:69,u:70,j:71,k:72,o:73,l:74};
    var pr=new Set();
    document.addEventListener('keydown',function(ev){
      if(ev.repeat||ev.target.matches('input,button,textarea'))return;
      var n=km[ev.key.toLowerCase()];
      if(n&&!pr.has(n)){pr.add(n);self.eng.noteOn(n,.7);var k=kb.querySelector('[data-n="'+n+'"]');if(k)k.classList.add('on')}
    });
    document.addEventListener('keyup',function(ev){
      var n=km[ev.key.toLowerCase()];
      if(n&&pr.has(n)){pr.delete(n);self.eng.noteOff(n);var k=kb.querySelector('[data-n="'+n+'"]');if(k)k.classList.remove('on')}
    });

    var xy=e.querySelector('.xy');
    if(xy){
      var dot=xy.querySelector('.xy-d');
      var hX=function(ev){
        var r=xy.getBoundingClientRect();
        var x=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));
        var y=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));
        dot.style.left=(x*100)+'%';dot.style.top=(y*100)+'%';
        self.eng.setParam('cutoff',100+x*14900);
        self.eng.setParam('lfo_depth',(1-y)*0.1);
      };
      xy.addEventListener('pointerdown',function(ev){self.mouseDown=true;hX(ev)});
      xy.addEventListener('pointermove',function(ev){if(self.mouseDown)hX(ev)});
      xy.addEventListener('pointerup',function(){self.mouseDown=false});
    }

    e.querySelectorAll('.seq-s').forEach(function(s){
      s.addEventListener('click',function(){
        var parts=s.dataset.s.split(':');var r=parts[0];var c=+parts[1];
        self.seq[r][c]=!s.classList.contains('on');s.classList.toggle('on');
      });
    });

    e.querySelectorAll('[data-act]').forEach(function(b){
      b.addEventListener('click',function(){
        switch(b.dataset.act){
          case'rec':
            if(self.eng.isRecording){self.eng.stopRecording();b.classList.remove('on')}
            else{self.eng.startRecording();b.classList.add('on')}break;
          case'panic':self.eng.allNotesOff();break;
          case'seq-play':self._seqStart();break;
          case'seq-stop':self._seqStop();break;
          case'seq-clear':self._seqClear();break;
          case'demo':self._demo();break;
        }
      });
    });

    this.eng.onData=function(d){self._draw(d)};
    window.addEventListener('resize',function(){self._rsz()});
    setTimeout(function(){self._rsz()},100);
  }

  _draw(data){
    var c=this.el.querySelector('#wf');if(!c)return;
    var ctx=c.getContext('2d');var w=c.width;var h=c.height;
    ctx.fillStyle='#0A0A0A';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#1E1E1E';ctx.lineWidth=1;
    for(var i=1;i<4;i++){var y=h/4*i;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    var g=ctx.createLinearGradient(0,0,w,0);
    g.addColorStop(0,'#7B1FA2');g.addColorStop(0.5,'#FF6D00');g.addColorStop(1,'#CE93D8');
    ctx.strokeStyle=g;ctx.lineWidth=2;ctx.beginPath();
    var sw=w/data.length;var x=0;
    for(var i=0;i<data.length;i++){var y=data[i]/128*h/2;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);x+=sw}
    ctx.stroke();ctx.globalAlpha=0.3;ctx.lineWidth=6;ctx.stroke();ctx.globalAlpha=1;
  }

  _rsz(){var c=this.el.querySelector('#wf');if(!c)return;var p=c.parentElement;c.width=p.clientWidth;c.height=p.clientHeight}

  _seqStart(){
    if(this.seqPlay)return;this.seqPlay=true;this.seqStep=0;
    var self=this;
    var tick=function(){
      if(!self.seqPlay)return;
      self.el.querySelectorAll('.seq-s').forEach(function(s){s.classList.remove('cur')});
      self.el.querySelectorAll('[data-s$=":'+self.seqStep+'"]').forEach(function(s){
        s.classList.add('cur');
        if(s.classList.contains('on')){var r=s.dataset.s.split(':')[0];self._seqPlay(r)}
      });
      self.seqStep=(self.seqStep+1)%16;
      self.seqT=setTimeout(tick,60/self.bpm/4*1e3);
    };tick();
  }

  _seqStop(){this.seqPlay=false;clearTimeout(this.seqT);this.el.querySelectorAll('.seq-s').forEach(function(s){s.classList.remove('cur')})}

  _seqClear(){
    var self=this;
    Object.values(this.seq).forEach(function(a){a.fill(false)});
    this.el.querySelectorAll('.seq-s').forEach(function(s){s.classList.remove('on')});
  }

  _seqPlay(r){
    var noteMap={Kick:36,Snare:40,HiHat:42,Bass:36,Lead:60,Pad:48};
    var n=noteMap[r]||60;this.eng.noteOn(n,.6);
    var self=this;
    setTimeout(function(){self.eng.noteOff(n)},200);
  }

  async _demo(){
    var ns=[60,64,67,72,67,64,60,55,60,64,67,72,76,72,67,64];
    var self=this;
    for(var i=0;i<ns.length;i++){
      this.eng.noteOn(ns[i],.6);
      await new Promise(function(r){setTimeout(r,250)});
      this.eng.noteOff(ns[i]);
      await new Promise(function(r){setTimeout(r,50)});
    }
  }
}
