export class SynthEngine {
  constructor() {
    this.ctx=null;this.masterGain=null;this.analyser=null;this.voices=new Map();
    this.params={wave_type:0,detune:10,detune2:20,attack:0.05,decay:0.3,sustain:0.7,
      release:0.5,cutoff:4000,resonance:0.3,lfo_rate:1,lfo_depth:0.02,volume:0.6,
      glide:0,voices:4,sub_osc:0,noise_mix:0,reverb_mix:0.25,reverb_size:0.7,
      delay_mix:0.1,delay_time:0.375,delay_feedback:0.3};
    this.isRecording=false;this.isInitialized=false;
    this.onNoteOn=null;this.onNoteOff=null;this.onData=null;
  }

  async init() {
    if (this.isInitialized) return;
    this.ctx = new (window.AudioContext||window.webkitAudioContext)({sampleRate:44100,latencyHint:'interactive'});
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.params.volume;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this._data = new Uint8Array(this.analyser.frequencyBinCount);
    // Compressor
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -12;
    // Reverb
    this.revGain = this.ctx.createGain(); this.revGain.gain.value = this.params.reverb_mix;
    this.dryGain = this.ctx.createGain(); this.dryGain.gain.value = 1;
    this.convolver = this.ctx.createConvolver();
    await this._makeIR(this.params.reverb_size);
    // Delay
    this.dlGain = this.ctx.createGain(); this.dlGain.gain.value = this.params.delay_mix;
    this.dlNode = this.ctx.createDelay(2); this.dlNode.delayTime.value = this.params.delay_time;
    this.dlFB = this.ctx.createGain(); this.dlFB.gain.value = this.params.delay_feedback;
    // LFO
    this.lfo = this.ctx.createOscillator(); this.lfoG = this.ctx.createGain();
    this.lfo.type='sine'; this.lfo.frequency.value=this.params.lfo_rate;
    this.lfoG.gain.value=this.params.lfo_depth;
    this.lfo.connect(this.lfoG); this.lfo.start();
    // Routing: master->comp->bus; send->reverb+delay
    this.bus = this.ctx.createGain();
    this.comp.connect(this.bus); this.dryGain.connect(this.bus);
    this.send = this.ctx.createGain();
    this.send.connect(this.convolver); this.convolver.connect(this.revGain); this.revGain.connect(this.bus);
    this.send.connect(this.dlNode); this.dlNode.connect(this.dlGain); this.dlGain.connect(this.bus);
    this.dlNode.connect(this.dlFB); this.dlFB.connect(this.dlNode);
    this.masterGain.connect(this.comp); this.masterGain.connect(this.send);
    this.bus.connect(this.analyser); this.analyser.connect(this.ctx.destination);
    this.isInitialized = true;
    this._loop();
  }

  async _makeIR(sz) {
    const len = this.ctx.sampleRate*(1+sz*3);
    const buf = this.ctx.createBuffer(2,len,this.ctx.sampleRate);
    for (let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2+sz*3);}
    this.convolver.buffer = buf;
  }

  noteOn(note, vel=0.8) {
    if (!this.isInitialized) return;
    if (this.ctx.state==='suspended') this.ctx.resume();
    if (this.voices.has(note)) this.noteOff(note);
    const now=this.ctx.currentTime;
    const freq=440*Math.pow(2,(note-69)/12);
    const wt=['sawtooth','square','triangle','sine'][Math.round(this.params.wave_type)%4]||'sawtooth';
    const nv=Math.round(this.params.voices);
    const ds=this.params.detune;
    const vg=1/Math.sqrt(nv+(this.params.sub_osc>0.5?1:0));
    const v={note,osc:[],filter:null,env:null};
    v.filter=this.ctx.createBiquadFilter();v.filter.type='lowpass';
    v.filter.frequency.value=this.params.cutoff;v.filter.Q.value=this.params.resonance*25;
    v.env=this.ctx.createGain();v.env.gain.setValueAtTime(0,now);
    v.env.gain.linearRampToValueAtTime(vel*vg,now+this.params.attack);
    v.env.gain.linearRampToValueAtTime(vel*vg*this.params.sustain,now+this.params.attack+this.params.decay);
    this.lfoG.connect(v.filter.frequency);
    for(let i=0;i<nv;i++){
      const o=this.ctx.createOscillator();o.type=wt;o.frequency.value=freq;
      let d=nv>1?ds*(i/(nv-1)-.5)*2:0;
      if(i>=2&&this.params.detune2>0)d+=this.params.detune2*(i%2===0?.5:-.5);
      o.detune.value=d;const g=this.ctx.createGain();g.gain.value=vg;
      o.connect(g);g.connect(v.filter);o.start(now);v.osc.push({o,g});
    }
    if(this.params.sub_osc>0.5){
      const so=this.ctx.createOscillator();so.type=wt==='sine'?'sine':'sawtooth';so.frequency.value=freq/2;
      const sg=this.ctx.createGain();sg.gain.value=vg*0.5;
      so.connect(sg);sg.connect(v.filter);so.start(now);v.osc.push({o:so,g:sg});
    }
    v.filter.connect(v.env);v.env.connect(this.masterGain);
    this.voices.set(note,v);if(this.onNoteOn)this.onNoteOn(note);
  }

  noteOff(note) {
    const v=this.voices.get(note);if(!v)return;
    const now=this.ctx.currentTime;const r=this.params.release;
    v.env.gain.cancelScheduledValues(now);
    v.env.gain.setValueAtTime(v.env.gain.value,now);
    v.env.gain.linearRampToValueAtTime(0,now+r);
    setTimeout(()=>{v.osc.forEach(({o,g})=>{try{o.stop();o.disconnect();g.disconnect()}catch(e){}});v.filter.disconnect();v.env.disconnect()},r*1e3+100);
    this.voices.delete(note);if(this.onNoteOff)this.onNoteOff(note);
  }

  allNotesOff(){for(const n of this.voices.keys())this.noteOff(n)}

  setParam(name,value){
    this.params[name]=value;if(!this.isInitialized)return;const now=this.ctx.currentTime;
    switch(name){
      case'volume':this.masterGain.gain.setTargetAtTime(value,now,.01);break;
      case'cutoff':for(const v of this.voices.values())if(v.filter)v.filter.frequency.setTargetAtTime(value,now,.01);break;
      case'resonance':for(const v of this.voices.values())if(v.filter)v.filter.Q.setTargetAtTime(value*25,now,.01);break;
      case'lfo_rate':this.lfo.frequency.setTargetAtTime(value,now,.01);break;
      case'lfo_depth':this.lfoG.gain.setTargetAtTime(value,now,.01);break;
      case'reverb_mix':this.revGain.gain.setTargetAtTime(value,now,.01);break;
      case'reverb_size':this._makeIR(value);break;
      case'delay_mix':this.dlGain.gain.setTargetAtTime(value,now,.01);break;
      case'delay_time':this.dlNode.delayTime.setTargetAtTime(value,now,.01);break;
      case'delay_feedback':this.dlFB.gain.setTargetAtTime(value,now,.01);break;
    }
  }

  loadPreset(p){for(const[k,v]of Object.entries(p.params))this.setParam(k,v)}

  startRecording(){
    if(!this.isInitialized||this.isRecording)return;
    const d=this.ctx.createMediaStreamDestination();this.analyser.connect(d);
    this._rec=new MediaRecorder(d.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:128000});
    this._chunks=[];this.isRecording=true;
    this._rec.ondataavailable=e=>{if(e.data.size>0)this._chunks.push(e.data)};
    this._rec.onstop=()=>{const b=new Blob(this._chunks,{type:'audio/webm'});const u=URL.createObjectURL(b);
      const a=document.createElement('a');a.href=u;a.download=`qbirdsynth-${Date.now()}.webm`;a.click();URL.revokeObjectURL(u);this.isRecording=false};
    this._rec.start();
  }
  stopRecording(){if(this._rec&&this.isRecording)this._rec.stop()}

  _loop(){const u=()=>{if(!this.isInitialized)return;this.analyser.getByteTimeDomainData(this._data);if(this.onData)this.onData(this._data);requestAnimationFrame(u)};u()}

  async connectMIDI(){
    if(!navigator.requestMIDIAccess)return false;
    try{const m=await navigator.requestMIDIAccess();
      for(const i of m.inputs.values())i.onmidimessage=msg=>{
        const[st,n,v]=msg.data;const c=st&0xf0;
        if(c===0x90&&v>0)this.noteOn(n,v/127);else if(c===0x80||(c===0x90&&v===0))this.noteOff(n)};
      return true}catch(e){return false}
  }

  destroy(){this.allNotesOff();if(this.ctx)this.ctx.close();this.isInitialized=false}
}
