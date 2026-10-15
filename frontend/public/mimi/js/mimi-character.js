/* Grounded continuous painted mesh with independent spring fields. */
(function(){
 'use strict';
 const defaults=new URL('../assets/',document.currentScript.src).href,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const expressions=['welcome','happy','excited','wink','sleepy'],motionGroups=['head','ears','hair','bows','sleeves','skirt'],aliases={thinking:'welcome',surprised:'excited'};let serial=0;const inlineLoads={};
 function sourceFor(assets,name,data){
  if(location.protocol!=='file:')return Promise.resolve({paint:assets+data.texture,heads:assets+data.headTexture});
  window.MimiTextureSources=window.MimiTextureSources||{};if(window.MimiTextureSources[name])return Promise.resolve(window.MimiTextureSources[name]);
  if(!inlineLoads[name])inlineLoads[name]=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=assets+'mimi/mesh-atlas/'+name+'.js';script.onload=()=>resolve(window.MimiTextureSources[name]);script.onerror=reject;document.head.append(script);});return inlineLoads[name];
 }
 class MimiCharacter{
  constructor(root,options={}){
   if(!root||!window.MimiPoseData)throw new TypeError('Mount element and MimiPoseData are required.');
   this.root=root;this.assets=options.assets||defaults;this.id='mimi-mesh-'+(++serial);this.paused=!!options.paused;this.destroyed=false;this.expression='welcome';this.eyeTracking=options.eyeTracking!==false;
   this.wind=clamp(Number(options.wind??.12)||0,0,1);this.strength=clamp(Number(options.motionStrength??.8)||0,0,1);this.gaze={x:0,y:0};this.look={x:0,y:0};this.clock=0;this.springs={};this.lids={left:0,right:0};this.mouthAmount=0;this.abort=new AbortController();this.media=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=this.media.matches;this.request=0;
   this.partMotion=Object.fromEntries(motionGroups.map(group=>[group,1]));for(const group of motionGroups)if(options.partMotion?.[group]!=null)this.setPartMotion(group,options.partMotion[group]);
   this.tick=this.tick.bind(this);root.classList.add('mimi-rig');root.setAttribute('role','group');root.innerHTML='<img class="mimi-static-fallback" alt="" draggable="false"><canvas class="mimi-mesh-canvas" aria-hidden="true"></canvas>'; /* MimiMMDart: sin el botón de la estrella (cielo de deseos). */
   this.canvas=root.querySelector('canvas');this.fallback=root.querySelector('.mimi-static-fallback');
   this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.mesh)this.mesh.ready=false;this.root.dataset.renderer='static';},{signal:this.abort.signal});this.canvas.addEventListener('webglcontextrestored',()=>{ /* Old GPU handles were invalidated by context loss. */ this.mesh=null;this.setPose(this.pose);},{signal:this.abort.signal});
   this.setPose(options.pose||'home');this.setExpression(options.expression||'welcome');
   const on=(target,type,callback)=>target.addEventListener(type,callback,{signal:this.abort.signal,passive:type==='pointermove'});
   this.pointer=e=>{if(e.pointerType==='touch'||this.paused||this.reduced)return;const r=root.getBoundingClientRect();this.setGaze((e.clientX-r.left-r.width*.53)/Math.max(240,r.width),(e.clientY-r.top-r.height*.32)/Math.max(240,r.width));};
   if(options.pointer!==false)on(document,'pointermove',this.pointer);on(document,'pointerleave',()=>this.setGaze());on(document,'mimi:motion',e=>this.setPaused(e.detail.paused));on(document,'mimi:wind',e=>this.setWind(e.detail.value));on(document,'mimi:eyes',e=>this.setEyeTracking(e.detail.active));
   on(document,'mimi:lighting',e=>this.setLighting(e.detail.value));on(document,'mimi:ambience',e=>this.setLighting(e.detail.value));on(document,'mimi:weather',e=>root.dataset.weather=e.detail.weather);on(document,'mimi:magic',e=>root.dataset.magic=String(e.detail.active));on(document,'mimi:flash',e=>root.dataset.flash=String(e.detail.active));on(document,'visibilitychange',()=>this.sync());
   this.mediaChange=()=>{this.reduced=this.media.matches;this.sync();};this.media.addEventListener('change',this.mediaChange);if(window.ResizeObserver){this.observer=new ResizeObserver(()=>this.mesh?.render(this));this.observer.observe(root);}
   root.dataset.weather=options.weather||window.mimiDemoScene?.weather||'clear';this.setLighting(Number(options.lighting??window.mimiDemoScene?.lighting??.5));this.sync();
  }
  setPose(name){
   if(this.destroyed)return false;if(!Object.prototype.hasOwnProperty.call(MimiPoseData,name))name='home';this.pose=name;this.data=MimiPoseData[name];const d=this.data,W=d.canvas[0],H=d.canvas[1],token=++this.request;
   this.root.style.aspectRatio=W+'/'+H;this.root.dataset.pose=name;this.root.dataset.renderer='loading';this.root.dataset.ready='false';this.fallback.src=this.assets+'mimi/poses/'+name+'.webp';this.springs=Object.fromEntries(d.deformers.map(p=>[p.id,{position:0,velocity:0,group:p.group}]));
   this.root.setAttribute('aria-label','Mimi, '+d.label.toLowerCase()+', feeling '+this.expression);
   this.ready=sourceFor(this.assets,name,d).then(sources=>Promise.all(['paint','heads'].map(key=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=sources[key];})))).then(images=>{if(this.destroyed||token!==this.request)return false;if(!this.mesh)this.mesh=new MimiMesh(this.canvas);this.mesh.setPose(d,images[0],images[1]);this.root.dataset.renderer='mesh';this.root.dataset.ready='true';this.renderFrame();this.applyMotion();this.root.dispatchEvent(new CustomEvent('mimi:ready',{bubbles:true,detail:{pose:name,renderer:'mesh'}}));return true;}).catch(error=>{if(this.destroyed||token!==this.request)return false;this.root.dataset.renderer='static';this.root.dataset.ready='true';this.root.dispatchEvent(new CustomEvent('mimi:renderer',{bubbles:true,detail:{mode:'static',reason:error.message||'Texture unavailable'}}));return false;});
   this.root.dispatchEvent(new CustomEvent('mimi:pose',{bubbles:true,detail:{pose:name}}));return name;
  }
  setExpression(name,options={}){
   name=aliases[name]||name;if(!expressions.includes(name))name='welcome';clearTimeout(this.expressionTimer);const previous=this.baseExpression||this.expression;this.expression=name;if(!options.duration)this.baseExpression=name;
   this.root.dataset.expression=name;this.root.setAttribute('aria-label','Mimi, '+this.data.label.toLowerCase()+', feeling '+name);if(name==='excited'||name==='happy')this.excite(.65);this.renderFrame();this.root.dispatchEvent(new CustomEvent('mimi:expression',{bubbles:true,detail:{expression:name}}));if(options.duration>0)this.expressionTimer=setTimeout(()=>{if(!this.destroyed)this.setExpression(previous);},options.duration);return name;
  }
  renderFrame(immediate=this.paused||this.reduced){
   if(!this.data||this.destroyed)return;let left=0,right=0;if(this.expression==='happy'||this.expression==='sleepy'||this.blinking)left=right=1;if(this.expression==='wink')right=1;this.lidTarget={left,right};if(immediate)this.lids={left,right};this.root.dataset.frame=this.blinking?'blink':this.expression;this.root.dataset.eyeTracking=String(this.eyeTracking&&!this.reduced);this.root.dataset.blink=String(!!this.blinking);this.mesh?.render(this);
  }
  excite(amount=1){if(this.paused||this.reduced)return false;for(const [id,s] of Object.entries(this.springs)){if(s.group==='ears')s.velocity+=(id.includes('Right')?-1:1)*amount*10;if(s.group==='hair'||s.group==='bows')s.velocity+=(id.includes('Right')?-1:1)*amount*3;}return true;}
  setGaze(x=0,y=0){this.gaze={x:clamp(Number(x)||0,-1,1),y:clamp(Number(y)||0,-1,1)};return {...this.gaze};}
  setEyeTracking(active){this.eyeTracking=!!active;if(!this.eyeTracking)this.look={x:0,y:0};this.renderFrame();return this.eyeTracking;}
  setWind(value){this.wind=clamp(Number(value)||0,0,1);return this.wind;}
  setMotionStrength(value){this.strength=clamp(Number(value)||0,0,1);return this.strength;}
  setPartMotion(group,value){if(!motionGroups.includes(group))return false;this.partMotion[group]=clamp(Number(value)||0,0,1);return this.partMotion[group];}
  setLighting(value){const v=clamp(Number(value)||0,0,1);this.root.style.setProperty('--mimi-night',Math.max(0,v*2-1));this.root.style.setProperty('--mimi-sunset',1-Math.abs(v*2-1));return v;}
  wish(){if(this.destroyed)return false;this.root.dataset.shine='true';clearTimeout(this.shineTimer);this.shineTimer=setTimeout(()=>this.root.dataset.shine='false',2600);this.excite(1);this.setExpression('wink',{duration:2000});document.dispatchEvent(new CustomEvent('mimi:wish',{detail:{pose:this.pose}}));this.root.dispatchEvent(new CustomEvent('mimi:star',{bubbles:true,detail:{pose:this.pose}}));return true;}
  blink(){if(this.paused||this.reduced||this.destroyed||document.hidden||['happy','sleepy'].includes(this.expression))return false;this.blinking=true;this.renderFrame();clearTimeout(this.blinkEnd);this.blinkEnd=setTimeout(()=>{this.blinking=false;this.renderFrame();},170);return true;}
  scheduleBlink(){clearTimeout(this.blinkTimer);if(this.paused||this.reduced||this.destroyed||document.hidden)return;this.blinkTimer=setTimeout(()=>{this.blink();this.scheduleBlink();},3500+Math.random()*3100);}
  speak(duration=2400){this.stopSpeech();if(this.paused||this.reduced||this.destroyed||document.hidden)return false;this.talking=true;this.root.classList.add('is-talking');this.speechTimer=setTimeout(()=>this.stopSpeech(),clamp(Number(duration)||2400,100,12000));return true;}
  stopSpeech(){clearTimeout(this.speechTimer);this.talking=false;this.mouthAmount=0;this.root.classList.remove('is-talking');this.renderFrame();}
  sync(){const still=this.paused||this.reduced||document.hidden;this.root.dataset.paused=String(this.paused||document.hidden);this.root.dataset.reduced=String(this.reduced);cancelAnimationFrame(this.frame);this.frame=0;this.last=0;
   if(still){clearTimeout(this.blinkTimer);clearTimeout(this.blinkEnd);this.blinking=false;this.stopSpeech();if(this.reduced){this.look={x:0,y:0};this.gaze={x:0,y:0};for(const s of Object.values(this.springs)){s.position=0;s.velocity=0;}this.applyMotion();}}else{this.scheduleBlink();this.start();}this.renderFrame();
  }
  setPaused(active){this.paused=!!active;this.sync();return this.paused;}
  start(){if(!this.destroyed&&!this.frame&&!this.paused&&!this.reduced&&!document.hidden)this.frame=requestAnimationFrame(this.tick);}
  tick(now){this.frame=0;if(this.destroyed||this.paused||this.reduced||document.hidden)return;const elapsed=this.last?Math.min(.5,Math.max(0,(now-this.last)/1000)):.016;this.last=now;this.clock+=elapsed;const w=this.wind,s=this.strength,blend=1-Math.exp(-elapsed*10);for(const key of ['x','y'])this.look[key]+=(this.gaze[key]-this.look[key])*blend;
   for(const key of ['left','right'])this.lids[key]+=(this.lidTarget[key]-this.lids[key])*(1-Math.exp(-elapsed*27));this.mouthAmount=this.talking?(.5+.5*Math.sin(this.clock*18))*.55:0;
   const steps=Math.max(1,Math.ceil(elapsed/.016)),dt=elapsed/steps;for(let step=0;step<steps;step++){const t=this.clock-elapsed+(step+1)*dt;
   const headV=this.springs.head?.velocity||0;for(const [id,a] of Object.entries(this.springs)){
    const side=id.includes('Right')?-1:1,tip=id.endsWith('Tip'),mid=id.endsWith('Mid');let target=0,k=22,damping=7,limit=2;
    if(a.group==='head'){target=this.look.x*(this.pose==='standing'?1.45:.38)+Math.sin(t*.7)*.08;k=40;damping=12;limit=this.pose==='standing'?1.8:.6;}
    else if(a.group==='ears'){target=Math.sin(t*(side===1?1.4:1.17)+side)*(.65+w*3.3)+this.look.x*.55-headV*.32;limit=tip?7.5:mid?5:3.8;k=tip?12:mid?16:22;damping=tip?4.8:6.7;const parent=id.replace(/Mid|Tip/,'Root');if(tip||mid)target+=(this.springs[parent]?.velocity||0)*-.4;}
    else if(a.group==='hair'){target=Math.sin(t*(tip?1.27:.9)+side*1.3)*(.35+w*1.7)+this.look.x*-.35-headV*.28;limit=tip?3.6:mid?2.6:1.8;k=tip?11:17;damping=tip?5:7;}
    else if(a.group==='skirt'){target=Math.sin(t*.85+side)*(.1+w*.5);limit=1.2;k=19;}
    else if(a.group==='bows'){target=Math.sin(t*1.6+side)*(.35+w*1.4)-headV*.1;limit=2.2;k=15;damping=5.7;}
    else{target=Math.sin(t*1.15+side)*.1;limit=.2;k=28;damping=9;}
    a.velocity+=(k*(target*s*this.partMotion[a.group]-a.position)-damping*a.velocity)*dt;a.position=clamp(a.position+a.velocity*dt,-limit,limit);
   }}this.applyMotion();this.start();
  }
  applyMotion(){this.root.style.setProperty('--look-x',this.look.x.toFixed(4));this.root.style.setProperty('--look-y',this.look.y.toFixed(4));this.root.style.setProperty('--body-y','0px');this.mesh?.render(this);}
  destroy(){if(this.destroyed)return;this.destroyed=true;this.request++;cancelAnimationFrame(this.frame);for(const key of ['blinkTimer','blinkEnd','speechTimer','expressionTimer','shineTimer'])clearTimeout(this[key]);this.abort.abort();this.observer?.disconnect();this.media.removeEventListener('change',this.mediaChange);this.mesh?.destroy();this.root.replaceChildren();this.root.classList.remove('mimi-rig','is-talking');this.root.removeAttribute('role');this.root.removeAttribute('aria-label');for(const key of ['pose','expression','frame','paused','reduced','eyeTracking','blink','weather','magic','flash','shine','renderer','ready'])delete this.root.dataset[key];for(const key of ['--look-x','--look-y','--body-y','--mimi-night','--mimi-sunset'])this.root.style.removeProperty(key);}
 }
 MimiCharacter.expressions=expressions;MimiCharacter.poses=Object.keys(MimiPoseData);MimiCharacter.motionGroups=motionGroups;window.MimiCharacter=MimiCharacter;
})();
